// @ts-check
import { ActivityBlock } from '../../../abstract/ActivityBlock.js';
import { SolutionBlock } from '../../../abstract/SolutionBlock.js';

export class FileUploaderInline extends SolutionBlock {
  static styleAttrs = [...super.styleAttrs, 'lr-file-uploader-inline'];

  constructor() {
    super();

    this.init$ = {
      ...this.init$,
      couldCancel: false,
      cancel: () => {
        if (this.couldHistoryBack) {
          this.$['*historyBack']();
        } else if (this.couldShowList) {
          this.$['*currentActivity'] = ActivityBlock.activities.UPLOAD_LIST;
        }
      },
    };
  }

  get couldHistoryBack() {
    const history = this.$['*history'];
    return history.length > 1 && history[history.length - 1] !== ActivityBlock.activities.START_FROM;
  }

  get couldShowList() {
    return this.cfg.showEmptyList || this.$['*uploadList'].length > 0;
  }

  initCallback() {
    super.initCallback();

    /** @type {import('../../../abstract/UploaderBlock.js').UploaderBlock} */
    const uBlock = this.ref.uBlock;
    this.sub('*currentActivity', (val) => {
      if (!val) {
        this.$['*currentActivity'] = uBlock.initActivity || ActivityBlock.activities.START_FROM;
      }
    });

    this.sub('*uploadList', (list) => {
      if (
        list?.length > 0 &&
        this.$['*currentActivity'] === (uBlock.initActivity || ActivityBlock.activities.START_FROM)
      ) {
        this.$['*currentActivity'] = ActivityBlock.activities.UPLOAD_LIST;
      }
    });

    this.sub('*history', () => {
      this.$.couldCancel = this.couldHistoryBack || this.couldShowList;
    });
  }
}

FileUploaderInline.template = /* HTML */ ` <lr-start-from>
    <lr-drop-area with-icon clickable></lr-drop-area>
    <lr-source-list wrap></lr-source-list>
    <button
      type="button"
      l10n="start-from-cancel"
      class="cancel-btn secondary-btn"
      set="onclick: cancel; @hidden: !couldCancel"
    ></button>
    <lr-copyright></lr-copyright>
  </lr-start-from>
  <lr-upload-list ref="uBlock"></lr-upload-list>
  <lr-camera-source></lr-camera-source>
  <lr-url-source></lr-url-source>
  <lr-external-source></lr-external-source>
  <lr-progress-bar></lr-progress-bar>
  <lr-cloud-image-editor-activity></lr-cloud-image-editor-activity>`;
