// @ts-check
import { html } from '../../symbiote.js';
import { CancelError, uploadFile } from '@uploadcare/upload-client';
import { shrinkFile } from '@uploadcare/image-shrink';
import { ActivityBlock } from '../../abstract/ActivityBlock.js';
import { UploaderBlock } from '../../abstract/UploaderBlock.js';
import { createCdnUrl, createCdnUrlModifiers, createOriginalUrl } from '../../utils/cdn-utils.js';
import { fileCssBg } from '../svg-backgrounds/svg-backgrounds.js';
import { debounce } from '../utils/debounce.js';
import { generateThumb } from '../utils/resizeImage.js';
import { parseShrink } from '../../utils/parseShrink.js';

const FileItemState = Object.freeze({
  FINISHED: Symbol(0),
  FAILED: Symbol(1),
  UPLOADING: Symbol(2),
  IDLE: Symbol(3),
});

export class FileItem extends UploaderBlock {
  couldBeCtxOwner = true;
  pauseRender = true;

  /** @private */
  _entrySubs = new Set();
  /**
   * @private
   * @type {any} TODO: Add types for upload entry
   */
  _entry = null;
  /** @private */
  _isIntersecting = false;
  /** @private */
  _debouncedGenerateThumb = debounce(this._generateThumbnail.bind(this), 100);
  /** @private */
  _debouncedCalculateState = debounce(this._calculateState.bind(this), 100);

  /** @private */
  _renderedOnce = false;

  constructor() {
    super();

    this.init$ = {
      ...this.init$,
      uid: '',
      itemName: '',
      errorText: '',
      thumbUrl: '',
      progressValue: 0,
      progressVisible: false,
      badgeIcon: '',
      isFinished: false,
      isFailed: false,
      isUploading: false,
      isFocused: false,
      isEditable: false,
      state: FileItemState.IDLE,
      onEdit: () => {
        this.set$({
          '*focusedEntry': this._entry,
        });
        if (this.hasBlockInCtx((b) => b.activityType === ActivityBlock.activities.DETAILS)) {
          this.$['*currentActivity'] = ActivityBlock.activities.DETAILS;
        } else {
          this.$['*currentActivity'] = ActivityBlock.activities.CLOUD_IMG_EDIT;
        }
      },
      onRemove: () => {
        this.uploadCollection.remove(this.$.uid);
      },
      onUpload: () => {
        this.upload();
      },
    };
  }

  _reset() {
    for (let sub of this._entrySubs) {
      sub.remove();
    }

    this._debouncedGenerateThumb.cancel();
    this._debouncedCalculateState.cancel();
    this._entrySubs = new Set();
    this._entry = null;
  }

  /**
   * @private
   * @param {IntersectionObserverEntry[]} entries
   */
  _observerCallback(entries) {
    let [entry] = entries;
    this._isIntersecting = entry.isIntersecting;

    if (entry.isIntersecting && !this._renderedOnce) {
      this.render();
      this._renderedOnce = true;
    }
    if (entry.intersectionRatio === 0) {
      this._debouncedGenerateThumb.cancel();
    } else {
      this._debouncedGenerateThumb();
    }
  }

  /** @private */
  _calculateState() {
    if (!this._entry) {
      return;
    }
    let entry = this._entry;
    let state = FileItemState.IDLE;

    if (entry.getValue('errors').length > 0) {
      state = FileItemState.FAILED;
    } else if (entry.getValue('isUploading')) {
      state = FileItemState.UPLOADING;
    } else if (entry.getValue('fileInfo')) {
      state = FileItemState.FINISHED;
    }

    this.$.state = state;
  }

  /** @private */
  async _generateThumbnail() {
    if (!this._entry) {
      return;
    }
    let entry = this._entry;

    if (entry.getValue('fileInfo') && entry.getValue('isImage')) {
      let size = this.cfg.thumbSize;
      let thumbUrl = await this.proxyUrl(
        createCdnUrl(
          createOriginalUrl(this.cfg.cdnCname, this._entry.getValue('uuid')),
          createCdnUrlModifiers(entry.getValue('cdnUrlModifiers'), `scale_crop/${size}x${size}/center`),
        ),
      );
      let currentThumbUrl = entry.getValue('thumbUrl');
      if (currentThumbUrl !== thumbUrl) {
        entry.setValue('thumbUrl', thumbUrl);
        currentThumbUrl?.startsWith('blob:') && URL.revokeObjectURL(currentThumbUrl);
      }
      return;
    }

    if (entry.getValue('thumbUrl')) {
      return;
    }

    if (entry.getValue('file')?.type.includes('image')) {
      try {
        let thumbUrl = await generateThumb(entry.getValue('file'), this.cfg.thumbSize);
        entry.setValue('thumbUrl', thumbUrl);
      } catch (err) {
        let color = window.getComputedStyle(this).getPropertyValue('--uc-muted-foreground');
        entry.setValue('thumbUrl', fileCssBg(color));
      }
    } else {
      let color = window.getComputedStyle(this).getPropertyValue('--uc-muted-foreground');
      entry.setValue('thumbUrl', fileCssBg(color));
    }
  }

  /**
   * @private
   * @param {string} prop
   * @param {(value: any) => void} handler
   */
  _subEntry(prop, handler) {
    let sub = this._entry.subscribe(
      prop,
      /** @param {any} value */ (value) => {
        if (this.isConnected) {
          handler(value);
        }
      },
    );
    this._entrySubs.add(sub);
  }

  /**
   * @private
   * @param {String} id
   */
  _handleEntryId(id) {
    this._reset();

    /** @type {import('../../abstract/TypedData.js').TypedData} */
    let entry = this.uploadCollection?.read(id);
    this._entry = entry;

    if (!entry) {
      return;
    }

    this._subEntry('uploadProgress', (uploadProgress) => {
      this.$.progressValue = uploadProgress;
    });

    this._subEntry('fileName', (name) => {
      this.$.itemName = name || entry.getValue('externalUrl') || this.l10n('file-no-name');
      this._debouncedCalculateState();
    });

    this._subEntry('externalUrl', (externalUrl) => {
      this.$.itemName = entry.getValue('fileName') || externalUrl || this.l10n('file-no-name');
    });

    this._subEntry('fileInfo', (fileInfo) => {
      this._debouncedCalculateState();
      if (fileInfo && this._isIntersecting) {
        this._debouncedGenerateThumb();
      }
    });

    this._subEntry('cdnUrlModifiers', () => {
      if (this._isIntersecting) {
        this._debouncedGenerateThumb();
      }
    });

    this._subEntry('thumbUrl', (thumbUrl) => {
      this.$.thumbUrl = thumbUrl ? `url(${thumbUrl})` : '';
    });

    this._subEntry('errors', () => this._debouncedCalculateState());
    this._subEntry('isUploading', () => this._debouncedCalculateState());
    this._subEntry('fileSize', () => this._debouncedCalculateState());
    this._subEntry('mimeType', () => this._debouncedCalculateState());
    this._subEntry('isImage', () => this._debouncedCalculateState());

    if (this._isIntersecting) {
      this._debouncedGenerateThumb();
    }
  }

  initCallback() {
    super.initCallback();

    this.sub('uid', (uid) => {
      this._handleEntryId(uid);
    });

    this.sub('state', (state) => {
      this._handleState(state);
    });

    this.subConfigValue('useCloudImageEditor', () => this._debouncedCalculateState());

    this.onclick = () => {
      FileItem.activeInstances.forEach((inst) => {
        if (inst === this) {
          inst.setAttribute('focused', '');
        } else {
          inst.removeAttribute('focused');
        }
      });
    };

    this.sub(
      '*uploadTrigger',
      /** @param {Set<string>} itemsToUpload */
      (itemsToUpload) => {
        if (!itemsToUpload.has(this._entry.uid)) {
          return;
        }
        setTimeout(() => this.isConnected && this.upload());
      },
    );
    FileItem.activeInstances.add(this);
  }

  /** @param {(typeof FileItemState)[keyof typeof FileItemState]} state */
  _handleState(state) {
    if (state === FileItemState.FAILED) {
      this.$.badgeIcon = 'badge-error';
    } else if (state === FileItemState.FINISHED) {
      this.$.badgeIcon = 'badge-success';
    }

    if (state === FileItemState.UPLOADING) {
      this.$.isFocused = false;
    } else {
      this.$.progressValue = 0;
    }

    this.set$({
      isFailed: state === FileItemState.FAILED,
      isUploading: state === FileItemState.UPLOADING,
      isFinished: state === FileItemState.FINISHED,
      progressVisible: state === FileItemState.UPLOADING,
      isEditable: this.cfg.useCloudImageEditor && this._entry?.getValue('isImage') && this._entry?.getValue('cdnUrl'),
      errorText: this._entry.getValue('errors')?.[0]?.message ?? '',
    });
  }

  destroyCallback() {
    super.destroyCallback();

    FileItem.activeInstances.delete(this);

    this._reset();
  }

  connectedCallback() {
    super.connectedCallback();

    /** @private */
    this._observer = new window.IntersectionObserver(this._observerCallback.bind(this), {
      threshold: [0, 1],
    });
    this._observer.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this._debouncedGenerateThumb.cancel();
    this._observer?.disconnect();
  }

  _settingsOfShrink() {
    return parseShrink(this.cfg.imageShrink);
  }

  /**
   * @private
   * @param {File} file
   */
  _processShrink(file) {
    return shrinkFile(file, this._settingsOfShrink());
  }

  async upload() {
    let entry = this._entry;

    if (!this.uploadCollection.read(entry.uid)) {
      return;
    }

    if (entry.getValue('fileInfo') || entry.getValue('isUploading') || entry.getValue('errors').length > 0) {
      return;
    }
    const multipleMax = this.cfg.multiple ? this.cfg.multipleMax : 1;
    if (multipleMax && this.uploadCollection.size > multipleMax) {
      return;
    }

    this._debouncedCalculateState();
    entry.setValue('isUploading', true);
    entry.setValue('errors', []);

    try {
      let abortController = new AbortController();
      entry.setValue('abortController', abortController);

      const uploadTask = async () => {
        let file = entry.getValue('file');
        if (file && this.cfg.imageShrink) {
          file = await this._processShrink(file).catch(() => file);
        }

        const fileInput = file || entry.getValue('externalUrl') || entry.getValue('uuid');
        const baseUploadClientOptions = await this.getUploadClientOptions();
        /** @type {import('@uploadcare/upload-client').FileFromOptions} */
        const uploadClientOptions = {
          ...baseUploadClientOptions,
          fileName: entry.getValue('fileName'),
          source: entry.getValue('source'),
          onProgress: (progress) => {
            if (progress.isComputable) {
              let percentage = progress.value * 100;
              entry.setValue('uploadProgress', percentage);
            }
          },
          signal: abortController.signal,
          metadata: await this.getMetadataFor(entry.uid),
        };
        this.debugPrint('upload options', fileInput, uploadClientOptions);
        return uploadFile(fileInput, uploadClientOptions);
      };

      /** @type {import('@uploadcare/upload-client').UploadcareFile} */
      let fileInfo = await this.$['*uploadQueue'].add(uploadTask);
      entry.setMultipleValues({
        fileInfo,
        isUploading: false,
        fileName: fileInfo.originalFilename,
        fileSize: fileInfo.size,
        isImage: fileInfo.isImage,
        mimeType: fileInfo.contentInfo?.mime?.mime ?? fileInfo.mimeType,
        uuid: fileInfo.uuid,
        cdnUrl: entry.getValue('cdnUrl') ?? fileInfo.cdnUrl,
        cdnUrlModifiers: entry.getValue('cdnUrlModifiers') ?? '',
        uploadProgress: 100,
      });

      if (entry === this._entry) {
        this._debouncedCalculateState();
      }
    } catch (cause) {
      if (cause instanceof CancelError && cause.isCancel) {
        entry.setMultipleValues({
          isUploading: false,
          uploadProgress: 0,
        });
      } else {
        entry.setMultipleValues({
          isUploading: false,
          uploadProgress: 0,
          uploadError: cause,
        });
      }

      if (entry === this._entry) {
        this._debouncedCalculateState();
      }
    }
  }
}

FileItem.template = html`
  <div class="uc-inner" set="@finished: isFinished; @uploading: isUploading; @failed: isFailed; @focused: isFocused">
    <div class="uc-thumb" set="style.backgroundImage: thumbUrl">
      <div class="uc-badge">
        <uc-icon set="@name: badgeIcon"></uc-icon>
      </div>
    </div>
    <div class="uc-file-name-wrapper">
      <span class="uc-file-name" set="@title: itemName">{{itemName}}</span>
      <span class="uc-file-error" set="@hidden: !errorText">{{errorText}}</span>
    </div>
    <div class="uc-file-actions">
      <button
        type="button"
        l10n="@title:file-item-edit-button"
        class="uc-edit-btn uc-mini-btn"
        set="onclick: onEdit; @hidden: !isEditable"
      >
        <uc-icon name="edit-file"></uc-icon>
      </button>
      <button
        type="button"
        l10n="@title:file-item-remove-button"
        class="uc-remove-btn uc-mini-btn"
        set="onclick: onRemove;"
      >
        <uc-icon name="remove-file"></uc-icon>
      </button>
      <button type="button" class="uc-upload-btn uc-mini-btn" set="onclick: onUpload;">
        <uc-icon name="upload"></uc-icon>
      </button>
    </div>
    <uc-progress-bar class="uc-progress-bar" set="value: progressValue; visible: progressVisible;"> </uc-progress-bar>
  </div>
`;
FileItem.activeInstances = new Set();
