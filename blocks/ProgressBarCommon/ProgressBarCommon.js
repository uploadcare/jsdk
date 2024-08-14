import { html } from '../../symbiote.js';
import { UploaderBlock } from '../../abstract/UploaderBlock.js';

export class ProgressBarCommon extends UploaderBlock {
  init$ = {
    ...this.init$,
    visible: false,
    value: 0,

    '*commonProgress': 0,
  };

  initCallback() {
    super.initCallback();
    /** @private */
    this._unobserveCollection = this.uploadCollection.observeProperties(() => {
      let anyUploading = this.uploadCollection.items().some((id) => {
        let item = this.uploadCollection.read(id);
        return item.getValue('isUploading');
      });

      this.$.visible = anyUploading;
    });

    this.sub('visible', (visible) => {
      if (visible) {
        this.setAttribute('active', '');
      } else {
        this.removeAttribute('active');
      }
    });

    this.sub('*commonProgress', (progress) => {
      this.$.value = progress;
    });
  }

  destroyCallback() {
    super.destroyCallback();

    this._unobserveCollection?.();
  }
}

ProgressBarCommon.template = html` <uc-progress-bar set="visible: visible; value: value"></uc-progress-bar> `;
