// @ts-check
import { ActivityBlock } from './ActivityBlock.js';

import { PubSub } from '../symbiote.js';
import { EventType } from '../blocks/UploadCtxProvider/EventEmitter.js';
import { UploadSource } from '../blocks/utils/UploadSource.js';
import { serializeCsv } from '../blocks/utils/comma-separated.js';
import { IMAGE_ACCEPT_LIST, fileIsImage, mergeFileTypes } from '../utils/fileTypes.js';
import { parseCdnUrl } from '../utils/parseCdnUrl.js';
import { stringToArray } from '../utils/stringToArray.js';
import { buildOutputCollectionState } from './buildOutputCollectionState.js';

export class UploaderPublicApi {
  /**
   * @private
   * @type {import('./UploaderBlock.js').UploaderBlock}
   */
  _ctx;

  /** @param {import('./UploaderBlock.js').UploaderBlock} ctx */
  constructor(ctx) {
    this._ctx = ctx;
  }

  /** @private */
  get _uploadCollection() {
    return this._ctx.uploadCollection;
  }

  get cfg() {
    return this._ctx.cfg;
  }

  get l10n() {
    return this._ctx.l10n.bind(this._ctx);
  }

  /**
   * TODO: Probably we should not allow user to override `source` property
   *
   * @param {string} url
   * @param {{ silent?: boolean; fileName?: string; source?: string }} [options]
   * @returns {import('../types').OutputFileEntry<'idle'>}
   */
  addFileFromUrl = (url, { silent, fileName, source } = {}) => {
    const internalId = this._uploadCollection.add({
      externalUrl: url,
      fileName: fileName ?? null,
      silent: silent ?? false,
      source: source ?? UploadSource.API,
    });
    return this.getOutputItem(internalId);
  };

  /**
   * @param {string} uuid
   * @param {{ silent?: boolean; fileName?: string; source?: string }} [options]
   * @returns {import('../types').OutputFileEntry<'idle'>}
   */
  addFileFromUuid = (uuid, { silent, fileName, source } = {}) => {
    const internalId = this._uploadCollection.add({
      uuid,
      fileName: fileName ?? null,
      silent: silent ?? false,
      source: source ?? UploadSource.API,
    });
    return this.getOutputItem(internalId);
  };

  /**
   * @param {string} cdnUrl
   * @param {{ silent?: boolean; fileName?: string; source?: string }} [options]
   * @returns {import('../types').OutputFileEntry<'idle'>}
   */
  addFileFromCdnUrl = (cdnUrl, { silent, fileName, source } = {}) => {
    const parsedCdnUrl = parseCdnUrl({ url: cdnUrl, cdnBase: this.cfg.cdnCname });
    if (!parsedCdnUrl) {
      throw new Error('Invalid CDN URL');
    }
    const internalId = this._uploadCollection.add({
      uuid: parsedCdnUrl.uuid,
      cdnUrl,
      cdnUrlModifiers: parsedCdnUrl.cdnUrlModifiers,
      fileName: fileName ?? parsedCdnUrl.filename ?? null,
      silent: silent ?? false,
      source: source ?? UploadSource.API,
    });
    return this.getOutputItem(internalId);
  };

  /**
   * @param {File} file
   * @param {{ silent?: boolean; fileName?: string; source?: string; fullPath?: string }} [options]
   * @returns {import('../types').OutputFileEntry<'idle'>}
   */
  addFileFromObject = (file, { silent, fileName, source, fullPath } = {}) => {
    const internalId = this._uploadCollection.add({
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
  };

  /** @param {string} internalId */
  removeFileByInternalId = (internalId) => {
    if (!this._uploadCollection.read(internalId)) {
      throw new Error(`File with internalId ${internalId} not found`);
    }
    this._uploadCollection.remove(internalId);
  };

  removeAllFiles() {
    this._uploadCollection.clearAll();
  }

  uploadAll = () => {
    const itemsToUpload = this._uploadCollection.items().filter((id) => {
      const entry = this._uploadCollection.read(id);
      return !entry.getValue('isRemoved') && !entry.getValue('isUploading') && !entry.getValue('fileInfo');
    });

    if (itemsToUpload.length === 0) {
      return;
    }

    this._ctx.$['*uploadTrigger'] = new Set(itemsToUpload);
    this._ctx.emit(
      EventType.COMMON_UPLOAD_START,
      /** @type {import('../types').OutputCollectionState<'uploading'>} */ (this.getOutputCollectionState()),
    );
  };

  /** @param {{ captureCamera?: boolean }} options */
  openSystemDialog = (options = {}) => {
    let accept = serializeCsv(mergeFileTypes([this.cfg.accept ?? '', ...(this.cfg.imgOnly ? IMAGE_ACCEPT_LIST : [])]));

    if (this.cfg.accept && !!this.cfg.imgOnly) {
      console.warn(
        'There could be a mistake.\n' +
          'Both `accept` and `imgOnly` parameters are set.\n' +
          'The value of `accept` will be concatenated with the internal image mime types list.',
      );
    }
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = this.cfg.multiple;
    if (options.captureCamera) {
      fileInput.capture = this.cfg.cameraCapture;
      fileInput.accept = 'image/*';
    } else {
      fileInput.accept = accept;
    }
    fileInput.dispatchEvent(new MouseEvent('click'));
    fileInput.onchange = () => {
      // @ts-ignore TODO: fix this
      [...fileInput['files']].forEach((file) =>
        this.addFileFromObject(file, { source: options.captureCamera ? UploadSource.CAMERA : UploadSource.LOCAL }),
      );
      // To call uploadTrigger UploadList should draw file items first:
      this._ctx.$['*currentActivity'] = ActivityBlock.activities.UPLOAD_LIST;
      this._ctx.setOrAddState('*modalActive', true);
      // @ts-ignore TODO: fix this
      fileInput['value'] = '';
    };
  };

  /**
   * @template {import('../types').OutputFileStatus} TStatus
   * @param {string} entryId
   * @returns {import('../types/exported.js').OutputFileEntry<TStatus>}
   */
  getOutputItem = (entryId) => {
    const uploadEntryData = /** @type {import('./uploadEntrySchema.js').UploadEntry} */ (PubSub.getCtx(entryId).store);

    /** @type {import('@uploadcare/upload-client').UploadcareFile?} */
    const fileInfo = uploadEntryData.fileInfo;

    /** @type {import('../types').OutputFileEntry['status']} */
    let status = uploadEntryData.isRemoved
      ? 'removed'
      : uploadEntryData.errors.length > 0
        ? 'failed'
        : !!uploadEntryData.fileInfo
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
  };

  /** @template {import('../types').OutputCollectionStatus} TStatus */
  getOutputCollectionState = () => {
    return /** @type {ReturnType<typeof buildOutputCollectionState<TStatus>>} */ (
      buildOutputCollectionState(this._ctx)
    );
  };

  /** @param {Boolean} [force] */
  initFlow = (force = false) => {
    if (this._uploadCollection.size > 0 && !force) {
      this._ctx.set$({
        '*currentActivity': ActivityBlock.activities.UPLOAD_LIST,
      });
      this._ctx.setOrAddState('*modalActive', true);
    } else {
      if (this._sourceList?.length === 1) {
        const srcKey = this._sourceList[0];

        // TODO: We should refactor those handlers
        if (srcKey === 'local') {
          this._ctx.$['*currentActivity'] = ActivityBlock.activities.UPLOAD_LIST;
          this.openSystemDialog();
          return;
        }

        /** @type {Set<import('./Block').Block>} */
        const blocksRegistry = this._ctx.$['*blocksRegistry'];
        /**
         * @param {import('./Block').Block} block
         * @returns {block is import('../blocks/SourceBtn/SourceBtn.js').SourceBtn}
         */
        const isSourceBtn = (block) => 'type' in block && block.type === srcKey;
        const sourceBtnBlock = [...blocksRegistry].find(isSourceBtn);
        // TODO: This is weird that we have this logic inside UI component, we should consider to move it somewhere else
        sourceBtnBlock?.activate();
        if (this._ctx.$['*currentActivity']) {
          this._ctx.setOrAddState('*modalActive', true);
        }
      } else {
        // Multiple sources case:
        this._ctx.set$({
          '*currentActivity': ActivityBlock.activities.START_FROM,
        });
        this._ctx.setOrAddState('*modalActive', true);
      }
    }
  };

  doneFlow = () => {
    this._ctx.set$({
      '*currentActivity': this._ctx.doneActivity,
      '*history': this._ctx.doneActivity ? [this._ctx.doneActivity] : [],
    });
    if (!this._ctx.$['*currentActivity']) {
      this._ctx.setOrAddState('*modalActive', false);
    }
  };

  /**
   * @param {import('./ActivityBlock.js').ActivityType} activityType
   * @param {import('../blocks/ExternalSource/ExternalSource.js').ActivityParams | {}} [params]
   */
  setCurrentActivity = (activityType, params = {}) => {
    if (this._ctx.hasBlockInCtx((b) => b.activityType === activityType)) {
      this._ctx.set$({
        '*currentActivityParams': params,
        '*currentActivity': activityType,
      });
      return;
    }
    console.warn(`Activity type "${activityType}" not found in the context`);
  };

  /** @param {boolean} opened */
  setModalState = (opened) => {
    if (opened && !this._ctx.$['*currentActivity']) {
      console.warn(`Can't open modal without current activity. Please use "setCurrentActivity" method first.`);
      return;
    }
    this._ctx.setOrAddState('*modalActive', opened);
  };

  /**
   * @private
   * @type {string[]}
   */
  get _sourceList() {
    /** @type {string[]} */
    let list = [];
    if (this.cfg.sourceList) {
      list = stringToArray(this.cfg.sourceList);
    }
    return list;
  }
}
