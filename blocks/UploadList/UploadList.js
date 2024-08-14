// @ts-check
import { html } from '../../symbiote.js';
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
        this.api.initFlow(true);
      },
      onUpload: () => {
        this.emit(EventType.UPLOAD_CLICK);
        this.api.uploadAll();
        this._throttledHandleCollectionUpdate();
      },
      onDone: () => {
        this.emit(EventType.DONE_CLICK, this.api.getOutputCollectionState());
        this.api.doneFlow();
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
    const collectionState = this.api.getOutputCollectionState();
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
    const validationOk = summary.failed === 0 && collectionState.errors.length === 0;
    let uploadBtnVisible = false;
    let allDone = false;
    let doneBtnEnabled = false;

    const readyToUpload = summary.total - summary.succeed - summary.uploading - summary.failed;
    if (readyToUpload > 0 && fitCountRestrictions) {
      uploadBtnVisible = true;
    } else {
      allDone = true;
      const groupOk = this.cfg.groupOutput ? !!collectionState.group : true;
      doneBtnEnabled = summary.total === summary.succeed && fitCountRestrictions && validationOk && groupOk;
    }

    this.set$({
      doneBtnVisible: allDone,
      doneBtnEnabled: doneBtnEnabled,

      uploadBtnVisible,

      addMoreBtnEnabled: summary.total === 0 || (!tooMany && !exact),
      addMoreBtnVisible: !exact || this.cfg.multiple,
    });

    this.bindL10n('headerText', () => this._getHeaderText(summary));
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
    this.sub('*groupInfo', (groupInfo) => {
      if (groupInfo) {
        this._throttledHandleCollectionUpdate();
      }
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
          this.api.uploadAll();
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

UploadList.template = html`
  <uc-activity-header>
    <span class="uc-header-text">{{headerText}}</span>
    <button type="button" class="uc-mini-btn uc-close-btn" set="onclick: *closeModal">
      <uc-icon name="close"></uc-icon>
    </button>
  </uc-activity-header>

  <div class="uc-no-files" set="@hidden: hasFiles">
    <slot name="empty"><span l10n="no-files"></span></slot>
  </div>

  <div class="uc-files" itemize="*uploadList" item-tag="uc-file-item"></div>

  <div class="uc-common-error" set="@hidden: !commonErrorMessage; textContent: commonErrorMessage;"></div>

  <div class="uc-toolbar">
    <button type="button" class="uc-cancel-btn uc-secondary-btn" set="onclick: onCancel;" l10n="clear"></button>
    <div class="uc-toolbar-spacer"></div>
    <button
      type="button"
      class="uc-add-more-btn uc-secondary-btn"
      set="onclick: onAdd; @disabled: !addMoreBtnEnabled; @hidden: !addMoreBtnVisible"
    >
      <uc-icon name="add"></uc-icon><span l10n="add-more"></span>
    </button>
    <button
      type="button"
      class="uc-upload-btn uc-primary-btn"
      set="@hidden: !uploadBtnVisible; onclick: onUpload;"
      l10n="upload"
    ></button>
    <button
      type="button"
      class="uc-done-btn uc-primary-btn"
      set="@hidden: !doneBtnVisible; onclick: onDone;  @disabled: !doneBtnEnabled"
      l10n="done"
    ></button>
  </div>

  <uc-drop-area ghost></uc-drop-area>
`;
