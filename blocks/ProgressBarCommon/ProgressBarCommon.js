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
      const anyUploading = this.uploadCollection.items().some((id) => {
        const item = this.uploadCollection.read(id);
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

ProgressBarCommon.template = /* HTML */ ` <lr-progress-bar set="visible: visible; value: value"></lr-progress-bar> `;
