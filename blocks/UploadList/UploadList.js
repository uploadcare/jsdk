// @ts-check
import { ActivityBlock } from '../../abstract/ActivityBlock.js';
import { UploaderBlock } from '../../abstract/UploaderBlock.js';
import { EventType } from '../UploadCtxProvider/EventEmitter.js';
import { throttle } from '../utils/throttle.js';

/**
 * @typedef {{
 *   total: number;
 *   succeed: number;
 *   uploading: number;
 *   failed: number;
 * }} Summary
 */

export class UploadList extends UploaderBlock {
  // Context owner should have access to CSS l10n
  // TODO: We need to move away l10n from CSS
  couldBeCtxOwner = true;
  historyTracked = true;
  activityType = ActivityBlock.activities.UPLOAD_LIST;

  constructor() {
    super();

    this.init$ = {
      ...this.init$,
      doneBtnVisible: false,
      doneBtnEnabled: false,
      uploadBtnVisible: false,
      addMoreBtnVisible: false,
      addMoreBtnEnabled: false,
      headerText: '',
      commonErrorMessage: '',

      hasFiles: false,
      onAdd: () => {
        this.initFlow(true);
      },
      onUpload: () => {
        this.emit(EventType.UPLOAD_CLICK);
        this.uploadAll();
        this._throttledHandleCollectionUpdate();
      },
      onDone: () => {
        this.emit(EventType.DONE_CLICK, this.getOutputCollectionState());
        this.doneFlow();
      },
      onCancel: () => {
        this.uploadCollection.clearAll();
      },
    };
  }

  /** @private */
  _throttledHandleCollectionUpdate = throttle(() => {
    if (!this.isConnected) {
      return;
    }
    this._updateUploadsState();

    if (!this.couldOpenActivity && this.$['*currentActivity'] === this.activityType) {
      this.historyBack();
    }
  }, 300);

  /** @private */
  _updateUploadsState() {
    const collectionState = this.getOutputCollectionState();
    /** @type {Summary} */
    const summary = {
      total: collectionState.totalCount,
      succeed: collectionState.successCount,
      uploading: collectionState.uploadingCount,
      failed: collectionState.failedCount,
    };
    const fitCountRestrictions = !collectionState.errors.some(
      (err) => err.type === 'TOO_MANY_FILES' || err.type === 'TOO_FEW_FILES',
    );
    const tooMany = collectionState.errors.some((err) => err.type === 'TOO_MANY_FILES');
    const exact = collectionState.totalCount === (this.cfg.multiple ? this.cfg.multipleMax : 1);
    const validationOk = summary.failed === 0;
    let uploadBtnVisible = false;
    let allDone = false;
    let doneBtnEnabled = false;

    const readyToUpload = summary.total - summary.succeed - summary.uploading - summary.failed;
    if (readyToUpload > 0 && fitCountRestrictions) {
      uploadBtnVisible = true;
    } else {
      allDone = true;
      doneBtnEnabled = summary.total === summary.succeed && fitCountRestrictions && validationOk;
    }

    this.set$({
      doneBtnVisible: allDone,
      doneBtnEnabled: doneBtnEnabled,

      uploadBtnVisible,

      addMoreBtnEnabled: summary.total === 0 || (!tooMany && !exact),
      addMoreBtnVisible: !exact || this.cfg.multiple,

      headerText: this._getHeaderText(summary),
    });
  }

  /**
   * @private
   * @param {Summary} summary
   */
  _getHeaderText(summary) {
    /** @param {keyof Summary} status */
    const localizedText = (status) => {
      const count = summary[status];
      return this.l10n(`header-${status}`, {
        count: count,
      });
    };
    if (summary.uploading > 0) {
      return localizedText('uploading');
    }
    if (summary.failed > 0) {
      return localizedText('failed');
    }
    if (summary.succeed > 0) {
      return localizedText('succeed');
    }

    return localizedText('total');
  }

  get couldOpenActivity() {
    return this.cfg.showEmptyList || this.uploadCollection.size > 0;
  }

  initCallback() {
    super.initCallback();

    this.registerActivity(this.activityType);

    this.subConfigValue('multiple', this._throttledHandleCollectionUpdate);
    this.subConfigValue('multipleMin', this._throttledHandleCollectionUpdate);
    this.subConfigValue('multipleMax', this._throttledHandleCollectionUpdate);
    this.subConfigValue('defaultValue', () => {
      this.getDefaultValue();
    });

    this.sub('*currentActivity', (currentActivity) => {
      if (!this.couldOpenActivity && currentActivity === this.activityType) {
        this.$['*currentActivity'] = this.initActivity;
      }
    });

    // TODO: could be performance issue on many files
    // there is no need to update buttons state on every progress tick
    this.uploadCollection.observeProperties(this._throttledHandleCollectionUpdate);

    this.sub(
      '*uploadList',
      (list) => {
        this._throttledHandleCollectionUpdate();

        this.set$({
          hasFiles: list.length > 0,
        });

        if (!this.cfg.confirmUpload) {
          this.uploadAll();
        }
      },
      false,
    );

    this.sub(
      '*collectionErrors',
      /** @param {import('../../types').OutputError<import('../../types').OutputCollectionErrorType>[]} errors */
      (errors) => {
        const firstError = errors.filter((err) => err.type !== 'SOME_FILES_HAS_ERRORS')[0];
        if (!firstError) {
          this.set$({
            commonErrorMessage: null,
          });
          return;
        }
        this.set$({
          commonErrorMessage: firstError.message,
        });
      },
    );
  }

  destroyCallback() {
    super.destroyCallback();
    this.uploadCollection.unobserveProperties(this._throttledHandleCollectionUpdate);
  }
}

UploadList.template = /* HTML */ `
  <lr-activity-header>
    <span class="header-text">{{headerText}}</span>
    <button type="button" class="mini-btn close-btn" set="onclick: *closeModal">
      <lr-icon name="close"></lr-icon>
    </button>
  </lr-activity-header>

  <div class="no-files" set="@hidden: hasFiles">
    <slot name="empty"><span l10n="no-files"></span></slot>
  </div>

  <div class="files" repeat="*uploadList" repeat-item-tag="lr-file-item"></div>

  <div class="common-error" set="@hidden: !commonErrorMessage; textContent: commonErrorMessage;"></div>

  <div class="toolbar">
    <button type="button" class="cancel-btn secondary-btn" set="onclick: onCancel;" l10n="clear"></button>
    <div class="toolbar-spacer"></div>
    <button
      type="button"
      class="add-more-btn secondary-btn"
      set="onclick: onAdd; @disabled: !addMoreBtnEnabled; @hidden: !addMoreBtnVisible"
    >
      <lr-icon name="add"></lr-icon><span l10n="add-more"></span>
    </button>
    <button
      type="button"
      class="upload-btn primary-btn"
      set="@hidden: !uploadBtnVisible; onclick: onUpload;"
      l10n="upload"
    ></button>
    <button
      type="button"
      class="done-btn primary-btn"
      set="@hidden: !doneBtnVisible; onclick: onDone;  @disabled: !doneBtnEnabled"
      l10n="done"
    ></button>
  </div>

  <lr-drop-area ghost></lr-drop-area>
`;
