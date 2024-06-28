// @ts-check
import { applyStyles } from '@symbiotejs/symbiote';
import { UploaderBlock } from '../../abstract/UploaderBlock.js';

export class FormInput extends UploaderBlock {
  requireCtxName = true;

  _createValidationInput() {
    const validationInput = document.createElement('input');
    validationInput.type = 'text';
    validationInput.name = this.ctxName;
    validationInput.required = this.cfg.multipleMin > 0;
    validationInput.tabIndex = -1;
    applyStyles(validationInput, {
      opacity: 0,
      height: 0,
      width: 0,
    });
    return validationInput;
  }

  initCallback() {
    super.initCallback();

    this._validationInputElement = this._createValidationInput();
    this.appendChild(this._validationInputElement);

    this.sub(
      '*collectionState',
      (/** @type {import('../../types/index.js').OutputCollectionState} */ collectionState) => {
        {
          if (!this._dynamicInputsContainer) {
            this._dynamicInputsContainer = document.createElement('div');
            this.appendChild(this._dynamicInputsContainer);
          }
          if (!this._validationInputElement) {
            const input = this._createValidationInput();
            this.appendChild(input);
            this._validationInputElement = input;
          }

          this._dynamicInputsContainer.innerHTML = '';

          if (collectionState.status === 'uploading' || collectionState.status === 'idle') {
            this._validationInputElement.value = '';
            this._validationInputElement.setCustomValidity('');
            return;
          }

          if (collectionState.status === 'failed') {
            const errorMsg = collectionState.errors[0]?.message;
            this._validationInputElement.value = '';
            this._validationInputElement.setCustomValidity(errorMsg);
            return;
          }

          const group = collectionState.group ? collectionState.group : null;
          if (group) {
            this._validationInputElement.value = group.cdnUrl;
            this._validationInputElement.setCustomValidity('');
            return;
          }

          const cdnUrls = collectionState.allEntries.map((entry) => entry.cdnUrl);

          if (!this.cfg.multiple && cdnUrls.length === 1) {
            this._validationInputElement.value = cdnUrls[0];
            this._validationInputElement.setCustomValidity('');
            return;
          }

          // Remove validation input to prevent it from being submitted
          this._validationInputElement.remove();
          this._validationInputElement = null;

          const fr = new DocumentFragment();

          for (const value of cdnUrls) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = `${this.ctxName}[]`;
            input.value = value;
            fr.appendChild(input);
          }

          this._dynamicInputsContainer.replaceChildren(fr);
        }
      },
      false,
    );
  }
}
