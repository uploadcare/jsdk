import { EditorButtonControl } from './EditorButtonControl.js';
import { COLOR_OPERATIONS_CONFIG } from './toolbar-constants.js';

export class EditorOperationControl extends EditorButtonControl {
  /**
   * @private
   * @type {String}
   */
  _operation = '';

  initCallback() {
    super.initCallback();

    this.$['on.click'] = () => {
      this.$['*sliderEl'].setOperation(this._operation);
      this.$['*showSlider'] = true;
      this.$['*currentOperation'] = this._operation;
    };

    this.defineAccessor('operation', (operation) => {
      if (operation) {
        this._operation = operation;
        this.$['icon'] = operation;
        this.bindL10n('title', () => this.l10n(operation));
      }
    });

    this.sub('*editorTransformations', (editorTransformations) => {
      if (!this._operation) {
        return;
      }

      let { zero } = COLOR_OPERATIONS_CONFIG[this._operation];
      let value = editorTransformations[this._operation];
      let isActive = typeof value !== 'undefined' ? value !== zero : false;
      this.$.active = isActive;
    });
  }
}
