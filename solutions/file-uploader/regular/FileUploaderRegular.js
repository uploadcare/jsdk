// @ts-check
import { html } from '@symbiotejs/symbiote';
import { SolutionBlock } from '../../../abstract/SolutionBlock.js';
import { asBoolean } from '../../../blocks/Config/normalizeConfigValue.js';
import { EventType } from '../../../blocks/UploadCtxProvider/EventEmitter.js';

export class FileUploaderRegular extends SolutionBlock {
  static styleAttrs = [...super.styleAttrs, 'uc-file-uploader-regular'];

  constructor() {
    super();

    this.init$ = {
      ...this.init$,
      isHidden: false,
    };
  }

  initCallback() {
    super.initCallback();

    this.defineAccessor(
      'headless',
      /** @param {unknown} value */ (value) => {
        this.set$({ isHidden: asBoolean(value) });
      },
    );

    this.sub(
      '*modalActive',
      (modalActive) => {
        if (this._lastModalActive !== modalActive) {
          this.emit(modalActive ? EventType.MODAL_OPEN : EventType.MODAL_CLOSE, undefined, { debounce: true });
        }

        /** @private */
        this._lastModalActive = modalActive;
      },
      false,
    );
  }
}

FileUploaderRegular.template = html`
  <uc-simple-btn set="@hidden: isHidden"></uc-simple-btn>

  <uc-modal strokes block-body-scrolling>
    <uc-start-from>
      <uc-drop-area with-icon clickable></uc-drop-area>
      <uc-source-list wrap></uc-source-list>
      <button type="button" l10n="start-from-cancel" class="uc-secondary-btn" set="onclick: *historyBack"></button>
      <uc-copyright></uc-copyright>
    </uc-start-from>
    <uc-upload-list></uc-upload-list>
    <uc-camera-source></uc-camera-source>
    <uc-url-source></uc-url-source>
    <uc-external-source></uc-external-source>
    <uc-cloud-image-editor-activity></uc-cloud-image-editor-activity>
  </uc-modal>
`;

FileUploaderRegular.bindAttributes({
  // @ts-expect-error TODO: fix types inside symbiote
  headless: null,
});
