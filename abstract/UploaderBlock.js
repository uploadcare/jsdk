// @ts-check
import { ActivityBlock } from './ActivityBlock.js';

import { Data } from '@symbiotejs/symbiote';
import { uploadFileGroup } from '@uploadcare/upload-client';
import { calculateMaxCenteredCropFrame } from '../blocks/CloudImageEditor/src/crop-utils.js';
import { parseCropPreset } from '../blocks/CloudImageEditor/src/lib/parseCropPreset.js';
import { EventType } from '../blocks/UploadCtxProvider/EventEmitter.js';
import { UploadSource } from '../blocks/utils/UploadSource.js';
import { serializeCsv } from '../blocks/utils/comma-separated.js';
import { debounce } from '../blocks/utils/debounce.js';
import { customUserAgent } from '../blocks/utils/userAgent.js';
import { createCdnUrl, createCdnUrlModifiers } from '../utils/cdn-utils.js';
import { IMAGE_ACCEPT_LIST, fileIsImage, mergeFileTypes } from '../utils/fileTypes.js';
import { parseCdnUrl } from '../utils/parseCdnUrl.js';
import { stringToArray } from '../utils/stringToArray.js';
import { uploaderBlockCtx } from './CTX.js';
import { SecureUploadsManager } from './SecureUploadsManager.js';
import { TypedCollection } from './TypedCollection.js';
import { ValidationManager } from './ValidationManager.js';
import { buildOutputCollectionState } from './buildOutputCollectionState.js';
import { uploadEntrySchema } from './uploadEntrySchema.js';

export class UploaderBlock extends ActivityBlock {
  couldBeCtxOwner = false;
  isCtxOwner = false;

  init$ = uploaderBlockCtx(this);

  get hasCtxOwner() {
    return this.hasBlockInCtx((block) => {
      if (block instanceof UploaderBlock) {
        return block.isCtxOwner && block.isConnected && block !== this;
      }
      return false;
    });
  }

  initCallback() {
    super.initCallback();

    if (!this.$['*uploadCollection']) {
      const uploadCollection = new TypedCollection({
        typedSchema: uploadEntrySchema,
        watchList: ['uploadProgress', 'uploadError', 'fileInfo', 'errors', 'cdnUrl', 'isUploading'],
      });
      this.$['*uploadCollection'] = uploadCollection;
    }
    //
    if (!this.has('*validationManager')) {
      this.add('*validationManager', new ValidationManager(this));
    }

    if (!this.hasCtxOwner && this.couldBeCtxOwner) {
      this.initCtxOwner();
    }
  }

  /** @returns {ValidationManager | null} */
  get validationManager() {
    return this.has('*validationManager') ? this.$['*validationManager'] : null;
  }

  destroyCtxCallback() {
    this._unobserveCollectionProperties?.();
    this._unobserveCollection?.();
    this.uploadCollection.destroy();
    this.$['*uploadCollection'] = null;

    super.destroyCtxCallback();
  }

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
  }

  // TODO: Probably we should not allow user to override `source` property

  /**
   * @param {string} url
   * @param {{ silent?: boolean; fileName?: string; source?: string }} [options]
   * @returns {import('../types').OutputFileEntry<'idle'>}
   */
  addFileFromUrl(url, { silent, fileName, source } = {}) {
    const internalId = this.uploadCollection.add({
      externalUrl: url,
      fileName: fileName ?? null,
      silent: silent ?? false,
      source: source ?? UploadSource.API,
    });
    return this.getOutputItem(internalId);
  }

  /**
   * @param {string} uuid
   * @param {{ silent?: boolean; fileName?: string; source?: string }} [options]
   * @returns {import('../types').OutputFileEntry<'idle'>}
   */
  addFileFromUuid(uuid, { silent, fileName, source } = {}) {
    const internalId = this.uploadCollection.add({
      uuid,
      fileName: fileName ?? null,
      silent: silent ?? false,
      source: source ?? UploadSource.API,
    });
    return this.getOutputItem(internalId);
  }

  /**
   * @param {string} cdnUrl
   * @param {{ silent?: boolean; fileName?: string; source?: string }} [options]
   * @returns {import('../types').OutputFileEntry<'idle'>}
   */
  addFileFromCdnUrl(cdnUrl, { silent, fileName, source } = {}) {
    const parsedCdnUrl = parseCdnUrl({ url: cdnUrl, cdnBase: this.cfg.cdnCname });
    if (!parsedCdnUrl) {
      throw new Error('Invalid CDN URL');
    }
    const internalId = this.uploadCollection.add({
      uuid: parsedCdnUrl.uuid,
      cdnUrl,
      cdnUrlModifiers: parsedCdnUrl.cdnUrlModifiers,
      fileName: fileName ?? parsedCdnUrl.filename ?? null,
      silent: silent ?? false,
      source: source ?? UploadSource.API,
    });
    return this.getOutputItem(internalId);
  }

  /**
   * @param {File} file
   * @param {{ silent?: boolean; fileName?: string; source?: string; fullPath?: string }} [options]
   * @returns {import('../types').OutputFileEntry<'idle'>}
   */
  addFileFromObject(file, { silent, fileName, source, fullPath } = {}) {
    const internalId = this.uploadCollection.add({
      file,
      isImage: fileIsImage(file),
      mimeType: file.type,
      fileName: fileName ?? file.name,
      fileSize: file.size,
      silent: silent ?? false,
      source: source ?? UploadSource.API,
      fullPath: fullPath ?? null,
    });
    return this.getOutputItem(internalId);
  }

  /** @param {string} internalId */
  removeFileByInternalId(internalId) {
    if (!this.uploadCollection.read(internalId)) {
      throw new Error(`File with internalId ${internalId} not found`);
    }
    this.uploadCollection.remove(internalId);
  }

  removeAllFiles() {
    this.uploadCollection.clearAll();
  }

  uploadAll = () => {
    const itemsToUpload = this.uploadCollection.items().filter((id) => {
      const entry = this.uploadCollection.read(id);
      return !entry.getValue('isRemoved') && !entry.getValue('isUploading') && !entry.getValue('fileInfo');
    });

    if (itemsToUpload.length === 0) {
      return;
    }

    this.$['*uploadTrigger'] = new Set(itemsToUpload);
    this.emit(
      EventType.COMMON_UPLOAD_START,
      /** @type {import('../types').OutputCollectionState<'uploading'>} */ (this.getOutputCollectionState()),
    );
  };

  /** @param {{ captureCamera?: boolean }} options */
  openSystemDialog(options = {}) {
    const accept = serializeCsv(
      mergeFileTypes([this.cfg.accept ?? '', ...(this.cfg.imgOnly ? IMAGE_ACCEPT_LIST : [])]),
    );

    if (this.cfg.accept && !!this.cfg.imgOnly) {
      console.warn(
        'There could be a mistake.\n' +
          'Both `accept` and `imgOnly` parameters are set.\n' +
          'The value of `accept` will be concatenated with the internal image mime types list.',
      );
    }
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.multiple = this.cfg.multiple;
    if (options.captureCamera) {
      this.fileInput.capture = this.cfg.cameraCapture;
      this.fileInput.accept = 'image/*';
    } else {
      this.fileInput.accept = accept;
    }
    this.fileInput.dispatchEvent(new MouseEvent('click'));
    this.fileInput.onchange = () => {
      // @ts-ignore TODO: fix this
      for (const file of [...this.fileInput.files]) {
        this.addFileFromObject(file, { source: options.captureCamera ? UploadSource.CAMERA : UploadSource.LOCAL });
      }

      // To call uploadTrigger UploadList should draw file items first:
      this.$['*currentActivity'] = ActivityBlock.activities.UPLOAD_LIST;
      this.setOrAddState('*modalActive', true);
      // @ts-ignore TODO: fix this
      this.fileInput.value = '';
      this.fileInput = null;
    };
  }

  /** @type {string[]} */
  get sourceList() {
    /** @type {string[]} */
    let list = [];
    if (this.cfg.sourceList) {
      list = stringToArray(this.cfg.sourceList);
    }
    // @ts-ignore TODO: fix this
    return list;
  }

  /** @param {Boolean} [force] */
  initFlow(force = false) {
    if (this.uploadCollection.size > 0 && !force) {
      this.set$({
        '*currentActivity': ActivityBlock.activities.UPLOAD_LIST,
      });
      this.setOrAddState('*modalActive', true);
    } else {
      if (this.sourceList?.length === 1) {
        const srcKey = this.sourceList[0];

        // TODO: We should refactor those handlers
        if (srcKey === 'local') {
          this.$['*currentActivity'] = ActivityBlock.activities.UPLOAD_LIST;
          this?.openSystemDialog();
          return;
        }

        const blocksRegistry = this.blocksRegistry;
        /**
         * @param {import('./Block').Block} block
         * @returns {block is import('../blocks/SourceBtn/SourceBtn.js').SourceBtn}
         */
        const isSourceBtn = (block) => 'type' in block && block.type === srcKey;
        const sourceBtnBlock = [...blocksRegistry].find(isSourceBtn);
        // TODO: This is weird that we have this logic inside UI component, we should consider to move it somewhere else
        sourceBtnBlock?.activate();
        if (this.$['*currentActivity']) {
          this.setOrAddState('*modalActive', true);
        }
      } else {
        // Multiple sources case:
        this.set$({
          '*currentActivity': ActivityBlock.activities.START_FROM,
        });
        this.setOrAddState('*modalActive', true);
      }
    }
  }

  doneFlow() {
    this.set$({
      '*currentActivity': this.doneActivity,
      '*history': this.doneActivity ? [this.doneActivity] : [],
    });
    if (!this.$['*currentActivity']) {
      this.setOrAddState('*modalActive', false);
    }
  }

  /** @returns {TypedCollection} */
  get uploadCollection() {
    return this.$['*uploadCollection'];
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
      this.getOutputCollectionState()
    );
    this.emit(EventType.GROUP_CREATED, collectionStateWithGroup);
    this.emit(EventType.CHANGE, () => this.getOutputCollectionState(), { debounce: true });
    this.$['*collectionState'] = collectionStateWithGroup;
  }

  /** @private */
  _flushOutputItems = debounce(async () => {
    const data = this.getOutputData();
    if (data.length !== this.uploadCollection.size) {
      return;
    }
    const collectionState = this.getOutputCollectionState();
    this.$['*collectionState'] = collectionState;
    this.emit(EventType.CHANGE, () => this.getOutputCollectionState(), { debounce: true });

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
    if (this.validationManager) {
      this.validationManager.runFileValidators();
      this.validationManager.runCollectionValidators();
    }

    for (const entry of added) {
      if (!entry.getValue('silent')) {
        this.emit(EventType.FILE_ADDED, this.getOutputItem(entry.uid));
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
      this.emit(EventType.FILE_REMOVED, this.getOutputItem(entry.uid));
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
          .flatMap(([, ids]) => [...ids]),
      ),
    ];

    entriesToRunValidation.length > 0 &&
      setTimeout(() => {
        // We can't modify entry properties in the same tick, so we need to wait a bit
        if (this.validationManager) this.validationManager.runFileValidators(entriesToRunValidation);
      });

    if (changeMap.uploadProgress) {
      for (const entryId of changeMap.uploadProgress) {
        const { isUploading, silent } = Data.getCtx(entryId).store;
        if (isUploading && !silent) {
          this.emit(EventType.FILE_UPLOAD_PROGRESS, this.getOutputItem(entryId));
        }
      }

      this._flushCommonUploadProgress();
    }
    if (changeMap.isUploading) {
      for (const entryId of changeMap.isUploading) {
        const { isUploading, silent } = Data.getCtx(entryId).store;
        if (isUploading && !silent) {
          this.emit(EventType.FILE_UPLOAD_START, this.getOutputItem(entryId));
        }
      }
    }
    if (changeMap.fileInfo) {
      for (const entryId of changeMap.fileInfo) {
        const { fileInfo, silent } = Data.getCtx(entryId).store;
        if (fileInfo && !silent) {
          this.emit(EventType.FILE_UPLOAD_SUCCESS, this.getOutputItem(entryId));
        }
      }
      if (this.cfg.cropPreset) {
        this.setInitialCrop();
      }
      const loadedItems = uploadCollection.findItems((entry) => {
        return !!entry.getValue('fileInfo');
      });
      const errorItems = uploadCollection.findItems((entry) => {
        return entry.getValue('errors').length > 0;
      });
      if (uploadCollection.size > 0 && errorItems.length === 0 && uploadCollection.size === loadedItems.length) {
        this.emit(
          EventType.COMMON_UPLOAD_SUCCESS,
          /** @type {import('../types').OutputCollectionState<'success'>} */ (this.getOutputCollectionState()),
        );
      }
    }
    if (changeMap.errors) {
      for (const entryId of changeMap.errors) {
        const { errors } = Data.getCtx(entryId).store;
        if (errors.length > 0) {
          this.emit(EventType.FILE_UPLOAD_FAILED, this.getOutputItem(entryId));
          this.emit(
            EventType.COMMON_UPLOAD_FAILED,
            () => /** @type {import('../types').OutputCollectionState<'failed'>} */ (this.getOutputCollectionState()),
            { debounce: true },
          );
        }
      }
    }
    if (changeMap.cdnUrl) {
      const uids = [...changeMap.cdnUrl].filter((uid) => {
        return !!this.uploadCollection.read(uid)?.getValue('cdnUrl');
      });
      for (const uid of uids) {
        this.emit(EventType.FILE_URL_CHANGED, this.getOutputItem(uid));
      }

      this.$['*groupInfo'] = null;
    }
  };

  /** @private */
  _flushCommonUploadProgress = () => {
    let commonProgress = 0;
    /** @type {Set<string>} */
    const uploadTrigger = this.$['*uploadTrigger'];
    const items = [...uploadTrigger].filter((id) => !!this.uploadCollection.read(id));
    for (const id of items) {
      const uploadProgress = this.uploadCollection.readProp(id, 'uploadProgress');
      commonProgress += uploadProgress;
    }
    const progress = items.length ? Math.round(commonProgress / items.length) : 0;

    if (this.$['*commonProgress'] === progress) {
      return;
    }

    this.$['*commonProgress'] = progress;
    this.emit(
      EventType.COMMON_UPLOAD_PROGRESS,
      /** @type {import('../types').OutputCollectionState<'uploading'>} */ (this.getOutputCollectionState()),
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
      const outputFileEntry = this.getOutputItem(entryId);
      const metadata = await configValue(outputFileEntry);
      return metadata;
    }
    return configValue;
  }

  /** @returns {Promise<import('@uploadcare/upload-client').FileFromOptions>} */
  async getUploadClientOptions() {
    /** @type {SecureUploadsManager} */
    const secureUploadsManager = this.$['*secureUploadsManager'];
    const secureToken = await secureUploadsManager.getSecureToken().catch(() => null);

    const options = {
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

  /**
   * @template {import('../types').OutputFileStatus} TStatus
   * @param {string} entryId
   * @returns {import('../types/exported.js').OutputFileEntry<TStatus>}
   */
  getOutputItem(entryId) {
    const uploadEntryData = /** @type {import('./uploadEntrySchema.js').UploadEntry} */ (Data.getCtx(entryId).store);

    /** @type {import('@uploadcare/upload-client').UploadcareFile?} */
    const fileInfo = uploadEntryData.fileInfo;

    /** @type {import('../types').OutputFileEntry['status']} */
    const status = uploadEntryData.isRemoved
      ? 'removed'
      : uploadEntryData.errors.length > 0
        ? 'failed'
        : uploadEntryData.fileInfo
          ? 'success'
          : uploadEntryData.isUploading
            ? 'uploading'
            : 'idle';

    /** @type {unknown} */
    const outputItem = {
      uuid: fileInfo?.uuid ?? uploadEntryData.uuid ?? null,
      internalId: entryId,
      name: fileInfo?.originalFilename ?? uploadEntryData.fileName,
      size: fileInfo?.size ?? uploadEntryData.fileSize,
      isImage: fileInfo?.isImage ?? uploadEntryData.isImage,
      mimeType: fileInfo?.mimeType ?? uploadEntryData.mimeType,
      file: uploadEntryData.file,
      externalUrl: uploadEntryData.externalUrl,
      cdnUrlModifiers: uploadEntryData.cdnUrlModifiers,
      cdnUrl: uploadEntryData.cdnUrl ?? fileInfo?.cdnUrl ?? null,
      fullPath: uploadEntryData.fullPath,
      uploadProgress: uploadEntryData.uploadProgress,
      fileInfo: fileInfo ?? null,
      metadata: uploadEntryData.metadata ?? fileInfo?.metadata ?? null,
      isSuccess: status === 'success',
      isUploading: status === 'uploading',
      isFailed: status === 'failed',
      isRemoved: status === 'removed',
      errors: /** @type {import('../types/exported.js').OutputFileEntry['errors']} */ (uploadEntryData.errors),
      status,
    };

    return /** @type {import('../types/exported.js').OutputFileEntry<TStatus>} */ (outputItem);
  }

  /**
   * @param {(item: import('./TypedData.js').TypedData) => Boolean} [checkFn]
   * @returns {import('../types/exported.js').OutputFileEntry[]}
   */
  getOutputData(checkFn) {
    const entriesIds = checkFn ? this.uploadCollection.findItems(checkFn) : this.uploadCollection.items();
    const data = entriesIds.map((itemId) => this.getOutputItem(itemId));
    return data;
  }

  /** @template {import('../types').OutputCollectionStatus} TStatus */
  getOutputCollectionState() {
    return /** @type {ReturnType<typeof buildOutputCollectionState<TStatus>>} */ (buildOutputCollectionState(this));
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
