import { html } from '../../symbiote.js';
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

      let url = this.ref.input['value'];
      this.api.addFileFromUrl(url, { source: UploadSource.URL_TAB });
      this.$['*currentActivity'] = ActivityBlock.activities.UPLOAD_LIST;
    },
    onCancel: () => {
      this.historyBack();
    },
    onInput: (e) => {
      let value = /** @type {HTMLInputElement} */ (e.target).value;
      this.set$({ importDisabled: !value });
    },
  };

  initCallback() {
    super.initCallback();
    this.registerActivity(this.activityType, {
      onActivate: () => {
        this.ref.input['value'] = '';
        this.ref.input.focus();
      },
    });
  }
}

UrlSource.template = html`
  <uc-activity-header>
    <button type="button" class="uc-mini-btn" set="onclick: *historyBack">
      <uc-icon name="back"></uc-icon>
    </button>
    <div>
      <uc-icon name="url"></uc-icon>
      <span l10n="caption-from-url"></span>
    </div>
    <button type="button" class="uc-mini-btn uc-close-btn" set="onclick: *closeModal">
      <uc-icon name="close"></uc-icon>
    </button>
  </uc-activity-header>
  <form class="uc-content">
    <input placeholder="https://" class="uc-url-input" type="text" ref="input" set="oninput: onInput" />
    <button
      type="submit"
      class="uc-url-upload-btn uc-primary-btn"
      set="onclick: onUpload; @disabled: importDisabled"
      l10n="upload-url"
    ></button>
  </form>
`;
