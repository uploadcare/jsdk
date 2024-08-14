// @ts-check
import { html } from '@symbiotejs/symbiote';
import { ActivityBlock } from '../../../abstract/ActivityBlock.js';
import { SolutionBlock } from '../../../abstract/SolutionBlock.js';

export class FileUploaderInline extends SolutionBlock {
  static styleAttrs = [...super.styleAttrs, 'uc-file-uploader-inline'];

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
      this.$['couldCancel'] = this.couldHistoryBack || this.couldShowList;
    });
  }
}

FileUploaderInline.template = html` <uc-start-from>
    <uc-drop-area with-icon clickable></uc-drop-area>
    <uc-source-list wrap></uc-source-list>
    <button
      type="button"
      l10n="start-from-cancel"
      class="uc-cancel-btn uc-secondary-btn"
      set="onclick: cancel; @hidden: !couldCancel"
    ></button>
    <uc-copyright></uc-copyright>
  </uc-start-from>
  <uc-upload-list ref="uBlock"></uc-upload-list>
  <uc-camera-source></uc-camera-source>
  <uc-url-source></uc-url-source>
  <uc-external-source></uc-external-source>
  <uc-cloud-image-editor-activity></uc-cloud-image-editor-activity>`;
