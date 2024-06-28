import { Block } from '../../../../../abstract/Block.js';

export class SliderUi extends Block {
  init$ = {
    ...this.init$,
    disabled: false,
    min: 0,
    max: 100,
    onInput: null,
    onChange: null,
    defaultValue: null,
    'on.sliderInput': () => {
      const value = Number.parseInt(this.ref['input-el'].value, 10);
      this._updateValue(value);
      this.$.onInput?.(value);
    },
    'on.sliderChange': () => {
      const value = Number.parseInt(this.ref['input-el'].value, 10);
      this.$.onChange?.(value);
    },
  };

  constructor() {
    super();
    this.setAttribute('with-effects', '');
  }

  initCallback() {
    super.initCallback();

    this.defineAccessor('disabled', (disabled) => {
      this.$.disabled = disabled;
    });

    this.defineAccessor('min', (min) => {
      this.$.min = min;
    });

    this.defineAccessor('max', (max) => {
      this.$.max = max;
    });

    this.defineAccessor('defaultValue', (defaultValue) => {
      this.$.defaultValue = defaultValue;
      this.ref['input-el'].value = defaultValue;
      this._updateValue(defaultValue);
    });

    this.defineAccessor('zero', (zero) => {
      this._zero = zero;
    });

    this.defineAccessor('onInput', (onInput) => {
      if (!onInput) return;
      this.$.onInput = onInput;
    });

    this.defineAccessor('onChange', (onChange) => {
      if (!onChange) return;
      this.$.onChange = onChange;
    });

    this._updateSteps();

    this._observer = new ResizeObserver(() => {
      this._updateSteps();
      const value = Number.parseInt(this.ref['input-el'].value, 10);
      this._updateValue(value);
    });
    this._observer.observe(this);

    this._thumbSize = Number.parseInt(window.getComputedStyle(this).getPropertyValue('--l-thumb-size'), 10);

    setTimeout(() => {
      const value = Number.parseInt(this.ref['input-el'].value, 10);
      this._updateValue(value);
    }, 0);

    this.sub('disabled', (disabled) => {
      const el = this.ref['input-el'];
      if (disabled) {
        el.setAttribute('disabled', 'disabled');
      } else {
        el.removeAttribute('disabled');
      }
    });

    const inputEl = this.ref['input-el'];
    inputEl.addEventListener('focus', () => {
      this.style.setProperty('--color-effect', 'var(--hover-color-rgb)');
    });
    inputEl.addEventListener('blur', () => {
      this.style.setProperty('--color-effect', 'var(--idle-color-rgb)');
    });
  }

  _updateValue(value) {
    this._updateZeroDot(value);

    const { width } = this.getBoundingClientRect();
    const slope = 100 / (this.$.max - this.$.min);
    const mappedValue = slope * (value - this.$.min);
    const offset = (mappedValue * (width - this._thumbSize)) / 100;

    window.requestAnimationFrame(() => {
      this.ref['thumb-el'].style.transform = `translateX(${offset}px)`;
    });
  }

  _updateZeroDot(value) {
    if (!this._zeroDotEl) {
      return;
    }
    if (value === this._zero) {
      this._zeroDotEl.style.opacity = '0';
    } else {
      this._zeroDotEl.style.opacity = '0.2';
    }
    const { width } = this.getBoundingClientRect();
    const slope = 100 / (this.$.max - this.$.min);
    const mappedValue = slope * (this._zero - this.$.min);
    const offset = (mappedValue * (width - this._thumbSize)) / 100;
    window.requestAnimationFrame(() => {
      this._zeroDotEl.style.transform = `translateX(${offset}px)`;
    });
  }

  _updateSteps() {
    const STEP_GAP = 15;

    const stepsEl = this.ref['steps-el'];
    const { width } = stepsEl.getBoundingClientRect();
    const half = Math.ceil(width / 2);
    const count = Math.ceil(half / STEP_GAP) - 2;

    if (this._stepsCount === count) {
      return;
    }

    const fr = document.createDocumentFragment();
    const minorStepEl = document.createElement('div');
    const borderStepEl = document.createElement('div');
    minorStepEl.className = 'minor-step';
    borderStepEl.className = 'border-step';
    fr.appendChild(borderStepEl);
    for (let i = 0; i < count; i++) {
      fr.appendChild(minorStepEl.cloneNode());
    }
    fr.appendChild(borderStepEl.cloneNode());
    for (let i = 0; i < count; i++) {
      fr.appendChild(minorStepEl.cloneNode());
    }
    fr.appendChild(borderStepEl.cloneNode());

    const zeroDotEl = document.createElement('div');
    zeroDotEl.className = 'zero-dot';
    fr.appendChild(zeroDotEl);
    this._zeroDotEl = zeroDotEl;

    stepsEl.innerHTML = '';
    stepsEl.appendChild(fr);
    this._stepsCount = count;
  }

  destroyCallback() {
    this._observer?.disconnect();
  }
}
SliderUi.template = /* HTML */ `
  <div class="steps" ref="steps-el"></div>
  <div ref="thumb-el" class="thumb"></div>
  <input
    class="input"
    type="range"
    ref="input-el"
    set="oninput: on.sliderInput; onchange: on.sliderChange; @min: min; @max: max; @value: defaultValue;"
  />
`;
