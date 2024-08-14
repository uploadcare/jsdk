// @ts-check
import { html } from '../../symbiote.js';
import { Block } from '../../abstract/Block.js';

export class Modal extends Block {
  static styleAttrs = [...super.styleAttrs, 'uc-modal'];
  static StateConsumerScope = 'modal';

  constructor() {
    super();
    this.init$ = {
      ...this.init$,
      '*modalActive': false,
      isOpen: false,
      closeClicked: this._handleDialogClose,
    };
  }

  _handleBackdropClick = () => {
    this._closeDialog();
  };

  _closeDialog = () => {
    this.setOrAddState('*modalActive', false);
  };

  _handleDialogClose = () => {
    this._closeDialog();
  };

  /** @param {Event} e */
  _handleDialogMouseDown = (e) => {
    /** @private */
    this._mouseDownTarget = e.target;
  };

  /** @param {Event} e */
  _handleDialogMouseUp = (e) => {
    if (e.target === this.ref.dialog && e.target === this._mouseDownTarget) {
      this._closeDialog();
    }
  };

  show() {
    if (this.ref.dialog.showModal) {
      this.ref.dialog.showModal();
    } else {
      this.ref.dialog.setAttribute('open', '');
    }
  }

  hide() {
    if (this.ref.dialog.close) {
      this.ref.dialog.close();
    } else {
      this.ref.dialog.removeAttribute('open');
    }
  }

  initCallback() {
    super.initCallback();
    if (typeof HTMLDialogElement === 'function') {
      this.ref.dialog.addEventListener('close', this._handleDialogClose);
      this.ref.dialog.addEventListener('mousedown', this._handleDialogMouseDown);
      this.ref.dialog.addEventListener('mouseup', this._handleDialogMouseUp);
    } else {
      this.setAttribute('dialog-fallback', '');
      let backdrop = document.createElement('div');
      backdrop.className = 'uc-backdrop';
      this.appendChild(backdrop);
      backdrop.addEventListener('click', this._handleBackdropClick);
    }

    this.sub('*modalActive', (modalActive) => {
      if (this.$.isOpen !== modalActive) {
        this.$.isOpen = modalActive;
      }

      if (modalActive && this.cfg.modalScrollLock) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    this.subConfigValue('modalBackdropStrokes', (val) => {
      if (val) {
        this.setAttribute('strokes', '');
      } else {
        this.removeAttribute('strokes');
      }
    });

    this.sub('isOpen', (isOpen) => {
      if (isOpen) {
        this.show();
      } else {
        this.hide();
      }
    });
  }

  destroyCallback() {
    super.destroyCallback();
    document.body.style.overflow = '';
    this._mouseDownTarget = undefined;
    this.ref.dialog.removeEventListener('close', this._handleDialogClose);
    this.ref.dialog.removeEventListener('mousedown', this._handleDialogMouseDown);
    this.ref.dialog.removeEventListener('mouseup', this._handleDialogMouseUp);
  }
}

Modal.template = html`
  <dialog ref="dialog">
    <slot></slot>
  </dialog>
`;
