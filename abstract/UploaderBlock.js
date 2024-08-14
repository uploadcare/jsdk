// @ts-check
import { ActivityBlock } from './ActivityBlock.js';

import { PubSub } from '../symbiote.js';
import { uploadFileGroup } from '@uploadcare/upload-client';
import { calculateMaxCenteredCropFrame } from '../blocks/CloudImageEditor/src/crop-utils.js';
import { parseCropPreset } from '../blocks/CloudImageEditor/src/lib/parseCropPreset.js';
import { EventType } from '../blocks/UploadCtxProvider/EventEmitter.js';
import { debounce } from '../blocks/utils/debounce.js';
import { customUserAgent } from '../blocks/utils/userAgent.js';
import { createCdnUrl, createCdnUrlModifiers } from '../utils/cdn-utils.js';
import { uploaderBlockCtx } from './CTX.js';
import { SecureUploadsManager } from './SecureUploadsManager.js';
import { TypedCollection } from './TypedCollection.js';
import { UploaderPublicApi } from './UploaderPublicApi.js';
import { ValidationManager } from './ValidationManager.js';
import { uploadEntrySchema } from './uploadEntrySchema.js';

export class UploaderBlock extends ActivityBlock {
  /** @protected */
  couldBeCtxOwner = false;

  /** @private */
  isCtxOwner = false;

  init$ = uploaderBlockCtx(this);

  /** @private */
  get hasCtxOwner() {
    return this.hasBlockInCtx((block) => {
      if (block instanceof UploaderBlock) {
        return block.isCtxOwner && block.isConnected && block !== this;
      }
      return false;
    });
  }

  /** @protected */
  initCallback() {
    super.initCallback();

    if (!this.has('*uploadCollection')) {
      let uploadCollection = new TypedCollection({
        typedSchema: uploadEntrySchema,
        watchList: ['uploadProgress', 'uploadError', 'fileInfo', 'errors', 'cdnUrl', 'isUploading'],
      });
      this.add('*uploadCollection', uploadCollection);
    }

    if (!this.has('*publicApi')) {
      this.add('*publicApi', new UploaderPublicApi(this));
    }

    if (!this.has('*validationManager')) {
      this.add('*validationManager', new ValidationManager(this));
    }

    if (!this.hasCtxOwner && this.couldBeCtxOwner) {
      this.initCtxOwner();
    }
  }

  /**
   * @returns {ValidationManager}
   * @protected
   */
  get validationManager() {
    if (!this.has('*validationManager')) {
      throw new Error('Unexpected error: ValidationManager is not initialized');
    }
    return this.$['*validationManager'];
  }

  /** @returns {UploaderPublicApi} */
  get api() {
    if (!this.has('*publicApi')) {
      throw new Error('Unexpected error: UploaderPublicApi is not initialized');
    }
    return this.$['*publicApi'];
  }

  getAPI() {
    return this.api;
  }

  /** @returns {TypedCollection} */
  get uploadCollection() {
    if (!this.has('*uploadCollection')) {
      throw new Error('Unexpected error: TypedCollection is not initialized');
    }
    return this.$['*uploadCollection'];
  }

  /** @protected */
  destroyCtxCallback() {
    this._unobserveCollectionProperties?.();
    this._unobserveCollection?.();
    this.uploadCollection.destroy();
    this.$['*uploadCollection'] = null;

    super.destroyCtxCallback();
  }

  /** @private */
  initCtxOwner() {
    this.isCtxOwner = true;

    /** @private */
    this._unobserveCollection = this.uploadCollection.observeCollection(this._handleCollectionUpdate);

    /** @private */
    this._unobserveCollectionProperties = this.uploadCollection.observeProperties(
      this._handleCollectionPropertiesUpdate,
    );

    this.subConfigValue('maxConcurrentRequests', (value) => {
      this.$['*uploadQueue'].concurrency = Number(value) || 1;
    });

    if (!this.$['*secureUploadsManager']) {
      this.$['*secureUploadsManager'] = new SecureUploadsManager(this);
    }

    if (this.has('*modalActive')) {
      this.sub('*modalActive', (modalActive) => {
        if (modalActive && !this.$['*currentActivity']) {
          this.$['*modalActive'] = false;
        }
      });
    }
  }

  /**
   * @private
   * @param {import('../types').OutputCollectionState} collectionState
   */
  async _createGroup(collectionState) {
    const uploadClientOptions = await this.getUploadClientOptions();
    const uuidList = collectionState.allEntries.map((entry) => {
      return entry.uuid + (entry.cdnUrlModifiers ? `/${entry.cdnUrlModifiers}` : '');
    });
    const abortController = new AbortController();
    const resp = await uploadFileGroup(uuidList, { ...uploadClientOptions, signal: abortController.signal });
    if (this.$['*collectionState'] !== collectionState) {
      abortController.abort();
      return;
    }
    this.$['*groupInfo'] = resp;
    const collectionStateWithGroup = /** @type {import('../types').OutputCollectionState<'success', 'has-group'>} */ (
      this.api.getOutputCollectionState()
    );
    this.emit(EventType.GROUP_CREATED, collectionStateWithGroup);
    this.emit(EventType.CHANGE, () => this.api.getOutputCollectionState(), { debounce: true });
    this.$['*collectionState'] = collectionStateWithGroup;
  }

  /** @private */
  _flushOutputItems = debounce(async () => {
    const data = this.getOutputData();
    if (data.length !== this.uploadCollection.size) {
      return;
    }
    const collectionState = this.api.getOutputCollectionState();
    this.$['*collectionState'] = collectionState;
    this.emit(EventType.CHANGE, () => this.api.getOutputCollectionState(), { debounce: true });

    if (this.cfg.groupOutput && collectionState.totalCount > 0 && collectionState.status === 'success') {
      this._createGroup(collectionState);
    }
  }, 300);

  /**
   * @private
   * @type {Parameters<import('./TypedCollection.js').TypedCollection['observeCollection']>[0]}
   * @param {Set<import('./TypedData.js').TypedData>} removed
   */
  _handleCollectionUpdate = (entries, added, removed) => {
    if (added.size || removed.size) {
      this.$['*groupInfo'] = null;
    }
    this.validationManager.runFileValidators();
    this.validationManager.runCollectionValidators();

    for (const entry of added) {
      if (!entry.getValue('silent')) {
        this.emit(EventType.FILE_ADDED, this.api.getOutputItem(entry.uid));
      }
    }

    for (const entry of removed) {
      /** @type {Set<string>} */ (this.$['*uploadTrigger']).delete(entry.uid);

      entry.getValue('abortController')?.abort();
      entry.setMultipleValues({
        isRemoved: true,
        abortController: null,
        isUploading: false,
        uploadProgress: 0,
      });
      URL.revokeObjectURL(entry?.getValue('thumbUrl'));
      this.emit(EventType.FILE_REMOVED, this.api.getOutputItem(entry.uid));
    }

    this.$['*uploadList'] = entries.map((uid) => {
      return { uid };
    });

    this._flushCommonUploadProgress();
    this._flushOutputItems();
  };

  /**
   * @private
   * @param {Record<keyof import('./uploadEntrySchema.js').UploadEntry, Set<string>>} changeMap
   */
  _handleCollectionPropertiesUpdate = (changeMap) => {
    this._flushOutputItems();

    const uploadCollection = this.uploadCollection;
    const entriesToRunValidation = [
      ...new Set(
        Object.entries(changeMap)
          .filter(([key]) => ['uploadError', 'fileInfo'].includes(key))
          .map(([, ids]) => [...ids])
          .flat(),
      ),
    ];

    entriesToRunValidation.length > 0 &&
      setTimeout(() => {
        // We can't modify entry properties in the same tick, so we need to wait a bit
        this.validationManager.runFileValidators(entriesToRunValidation);
      });

    if (changeMap.uploadProgress) {
      for (const entryId of changeMap.uploadProgress) {
        const { isUploading, silent } = PubSub.getCtx(entryId).store;
        if (isUploading && !silent) {
          this.emit(EventType.FILE_UPLOAD_PROGRESS, this.api.getOutputItem(entryId));
        }
      }

      this._flushCommonUploadProgress();
    }
    if (changeMap.isUploading) {
      for (const entryId of changeMap.isUploading) {
        const { isUploading, silent } = PubSub.getCtx(entryId).store;
        if (isUploading && !silent) {
          this.emit(EventType.FILE_UPLOAD_START, this.api.getOutputItem(entryId));
        }
      }
    }
    if (changeMap.fileInfo) {
      for (const entryId of changeMap.fileInfo) {
        const { fileInfo, silent } = PubSub.getCtx(entryId).store;
        if (fileInfo && !silent) {
          this.emit(EventType.FILE_UPLOAD_SUCCESS, this.api.getOutputItem(entryId));
        }
      }
      if (this.cfg.cropPreset) {
        this.setInitialCrop();
      }
    }
    if (changeMap.errors) {
      for (const entryId of changeMap.errors) {
        const { errors } = PubSub.getCtx(entryId).store;
        if (errors.length > 0) {
          this.emit(EventType.FILE_UPLOAD_FAILED, this.api.getOutputItem(entryId));
          this.emit(
            EventType.COMMON_UPLOAD_FAILED,
            () =>
              /** @type {import('../types').OutputCollectionState<'failed'>} */ (this.api.getOutputCollectionState()),
            { debounce: true },
          );
        }
      }
      const loadedItems = uploadCollection.findItems((entry) => {
        return !!entry.getValue('fileInfo');
      });
      const errorItems = uploadCollection.findItems((entry) => {
        return entry.getValue('errors').length > 0;
      });
      if (
        uploadCollection.size > 0 &&
        errorItems.length === 0 &&
        uploadCollection.size === loadedItems.length &&
        this.$['*collectionErrors'].length === 0
      ) {
        this.emit(
          EventType.COMMON_UPLOAD_SUCCESS,
          /** @type {import('../types').OutputCollectionState<'success'>} */ (this.api.getOutputCollectionState()),
        );
      }
    }
    if (changeMap.cdnUrl) {
      const uids = [...changeMap.cdnUrl].filter((uid) => {
        return !!this.uploadCollection.read(uid)?.getValue('cdnUrl');
      });
      uids.forEach((uid) => {
        this.emit(EventType.FILE_URL_CHANGED, this.api.getOutputItem(uid));
      });

      this.$['*groupInfo'] = null;
    }
  };

  /** @private */
  _flushCommonUploadProgress = () => {
    let commonProgress = 0;
    /** @type {Set<string>} */
    const uploadTrigger = this.$['*uploadTrigger'];
    const items = [...uploadTrigger].filter((id) => !!this.uploadCollection.read(id));
    items.forEach((id) => {
      const uploadProgress = this.uploadCollection.readProp(id, 'uploadProgress');
      commonProgress += uploadProgress;
    });
    const progress = items.length ? Math.round(commonProgress / items.length) : 0;

    if (this.$['*commonProgress'] === progress) {
      return;
    }

    this.$['*commonProgress'] = progress;
    this.emit(
      EventType.COMMON_UPLOAD_PROGRESS,
      /** @type {import('../types').OutputCollectionState<'uploading'>} */ (this.api.getOutputCollectionState()),
    );
  };

  /** @private */
  setInitialCrop() {
    const cropPreset = parseCropPreset(this.cfg.cropPreset);
    if (cropPreset) {
      const [aspectRatioPreset] = cropPreset;

      const entries = this.uploadCollection
        .findItems(
          (entry) =>
            entry.getValue('fileInfo') &&
            entry.getValue('isImage') &&
            !entry.getValue('cdnUrlModifiers')?.includes('/crop/'),
        )
        .map((id) => this.uploadCollection.read(id));

      for (const entry of entries) {
        const fileInfo = entry.getValue('fileInfo');
        const { width, height } = fileInfo.imageInfo;
        const expectedAspectRatio = aspectRatioPreset.width / aspectRatioPreset.height;
        const crop = calculateMaxCenteredCropFrame(width, height, expectedAspectRatio);
        const cdnUrlModifiers = createCdnUrlModifiers(
          `crop/${crop.width}x${crop.height}/${crop.x},${crop.y}`,
          'preview',
        );
        entry.setMultipleValues({
          cdnUrlModifiers,
          cdnUrl: createCdnUrl(entry.getValue('cdnUrl'), cdnUrlModifiers),
        });
        if (
          this.uploadCollection.size === 1 &&
          this.cfg.useCloudImageEditor &&
          this.hasBlockInCtx((block) => block.activityType === ActivityBlock.activities.CLOUD_IMG_EDIT)
        ) {
          this.$['*focusedEntry'] = entry;
          this.$['*currentActivity'] = ActivityBlock.activities.CLOUD_IMG_EDIT;
        }
      }
    }
  }

  /**
   * @param {string} entryId
   * @protected
   */
  async getMetadataFor(entryId) {
    const configValue = this.cfg.metadata || undefined;
    if (typeof configValue === 'function') {
      const outputFileEntry = this.api.getOutputItem(entryId);
      const metadata = await configValue(outputFileEntry);
      return metadata;
    }
    return configValue;
  }

  /**
   * @returns {Promise<import('@uploadcare/upload-client').FileFromOptions>}
   * @protected
   */
  async getUploadClientOptions() {
    /** @type {SecureUploadsManager} */
    const secureUploadsManager = this.$['*secureUploadsManager'];
    const secureToken = await secureUploadsManager.getSecureToken().catch(() => null);

    let options = {
      store: this.cfg.store,
      publicKey: this.cfg.pubkey,
      baseCDN: this.cfg.cdnCname,
      baseURL: this.cfg.baseUrl,
      userAgent: customUserAgent,
      integration: this.cfg.userAgentIntegration,
      secureSignature: secureToken?.secureSignature,
      secureExpire: secureToken?.secureExpire,
      retryThrottledRequestMaxTimes: this.cfg.retryThrottledRequestMaxTimes,
      multipartMinFileSize: this.cfg.multipartMinFileSize,
      multipartChunkSize: this.cfg.multipartChunkSize,
      maxConcurrentRequests: this.cfg.multipartMaxConcurrentRequests,
      multipartMaxAttempts: this.cfg.multipartMaxAttempts,
      checkForUrlDuplicates: !!this.cfg.checkForUrlDuplicates,
      saveUrlForRecurrentUploads: !!this.cfg.saveUrlForRecurrentUploads,
    };

    return options;
  }

  /** @returns {import('../types/exported.js').OutputFileEntry[]} */
  getOutputData() {
    const entriesIds = this.uploadCollection.items();
    const data = entriesIds.map((itemId) => this.api.getOutputItem(itemId));
    return data;
  }
}

/** @enum {String} */
UploaderBlock.extSrcList = Object.freeze({
  FACEBOOK: 'facebook',
  DROPBOX: 'dropbox',
  GDRIVE: 'gdrive',
  GPHOTOS: 'gphotos',
  INSTAGRAM: 'instagram',
  FLICKR: 'flickr',
  VK: 'vk',
  EVERNOTE: 'evernote',
  BOX: 'box',
  ONEDRIVE: 'onedrive',
  HUDDLE: 'huddle',
});

/** @enum {String} */
UploaderBlock.sourceTypes = Object.freeze({
  LOCAL: 'local',
  URL: 'url',
  CAMERA: 'camera',
  DRAW: 'draw',
  ...UploaderBlock.extSrcList,
});
