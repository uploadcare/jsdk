import { Block } from '../../../abstract/Block.js';
import { html } from '../../../symbiote.js';
import { COLOR_OPERATIONS_CONFIG } from './toolbar-constants.js';

const ControlType = {
  FILTER: 'filter',
  COLOR_OPERATION: 'color_operation',
};

export const FAKE_ORIGINAL_FILTER = 'original';

export class EditorSlider extends Block {
  init$ = {
    ...this.init$,
    disabled: false,
    min: 0,
    max: 100,
    value: 0,
    defaultValue: 0,
    zero: 0,
    'on.input': (value) => {
      this.$['*faderEl'].set(value);
      this.$.value = value;
    },
  };

  /**
   * @param {String} operation
   * @param {String} [filter]
   */
  setOperation(operation, filter) {
    this._controlType = operation === 'filter' ? ControlType.FILTER : ControlType.COLOR_OPERATION;
    this._operation = operation;
    this._iconName = operation;
    this._title = operation.toUpperCase();
    this._filter = filter;

    this._initializeValues();

    this.$['*faderEl'].activate({
      url: this.$['*originalUrl'],
      operation: this._operation,
      value: this._filter === FAKE_ORIGINAL_FILTER ? undefined : this.$.value,
      filter: this._filter === FAKE_ORIGINAL_FILTER ? undefined : this._filter,
      fromViewer: false,
    });
  }

  /** @private */
  _initializeValues() {
    let { range, zero } = COLOR_OPERATIONS_CONFIG[this._operation];
    let [min, max] = range;

    this.$.min = min;
    this.$.max = max;
    this.$.zero = zero;

    let transformation = this.$['*editorTransformations'][this._operation];
    if (this._controlType === ControlType.FILTER) {
      let value = max;
      if (transformation) {
        let { name, amount } = transformation;
        value = name === this._filter ? amount : max;
      }
      this.$.value = value;
      this.$.defaultValue = value;
    }
    if (this._controlType === ControlType.COLOR_OPERATION) {
      let value = typeof transformation !== 'undefined' ? transformation : zero;
      this.$.value = value;
      this.$.defaultValue = value;
    }
  }

  apply() {
    let operationValue;
    if (this._controlType === ControlType.FILTER) {
      if (this._filter === FAKE_ORIGINAL_FILTER) {
        operationValue = null;
      } else {
        operationValue = { name: this._filter, amount: this.$.value };
      }
    } else {
      operationValue = this.$.value;
    }

    /** @type {import('./types.js').Transformations} */
    let transformations = {
      ...this.$['*editorTransformations'],
      [this._operation]: operationValue,
    };

    this.$['*editorTransformations'] = transformations;
  }

  cancel() {
    this.$['*faderEl'].deactivate({ hide: false });
  }

  initCallback() {
    super.initCallback();

    this.sub('*originalUrl', (originalUrl) => {
      this._originalUrl = originalUrl;
    });

    this.sub('value', (value) => {
      let tooltip = `${this._filter || this._operation} ${value}`;
      this.$['*operationTooltip'] = tooltip;
    });
  }
}

EditorSlider.template = html`
  <uc-slider-ui
    ref="slider-el"
    set="disabled: disabled; min: min; max: max; defaultValue: defaultValue; zero: zero; onInput: on.input;"
  ></uc-slider-ui>
`;
