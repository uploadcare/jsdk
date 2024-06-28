import { ActivityBlock } from '../../abstract/ActivityBlock.js';
import { UploaderBlock } from '../../abstract/UploaderBlock.js';
import { UploadSource } from '../utils/UploadSource.js';

export class UrlSource extends UploaderBlock {
  couldBeCtxOwner = true;
  activityType = ActivityBlock.activities.URL;

  init$ = {
    ...this.init$,
    importDisabled: true,
    onUpload: (e) => {
      e.preventDefault();

      const url = this.ref.input.value;
      this.addFileFromUrl(url, { source: UploadSource.URL_TAB });
      this.$['*currentActivity'] = ActivityBlock.activities.UPLOAD_LIST;
    },
    onCancel: () => {
      this.historyBack();
    },
    onInput: (e) => {
      const value = /** @type {HTMLInputElement} */ (e.target).value;
      this.set$({ importDisabled: !value });
    },
  };

  initCallback() {
    super.initCallback();
    this.registerActivity(this.activityType, {
      onActivate: () => {
        this.ref.input.value = '';
        this.ref.input.focus();
      },
    });
  }
}

UrlSource.template = /* HTML */ `
  <lr-activity-header>
    <button type="button" class="mini-btn" set="onclick: *historyBack">
      <lr-icon name="back"></lr-icon>
    </button>
    <div>
      <lr-icon name="url"></lr-icon>
      <span l10n="caption-from-url"></span>
    </div>
    <button type="button" class="mini-btn close-btn" set="onclick: *closeModal">
      <lr-icon name="close"></lr-icon>
    </button>
  </lr-activity-header>
  <form class="content">
    <input placeholder="https://" class="url-input" type="text" ref="input" set="oninput: onInput" />
    <button
      type="submit"
      class="url-upload-btn primary-btn"
      set="onclick: onUpload; @disabled: importDisabled"
      l10n="upload-url"
    ></button>
  </form>
`;
