import { html } from '../../symbiote.js';
import { Block } from '../../abstract/Block.js';

export class ProgressBar extends Block {
  /** @type {Number} */
  _value = 0;

  init$ = {
    ...this.init$,
    width: 0,
    opacity: 0,
  };

  initCallback() {
    super.initCallback();
    this.defineAccessor('value', (value) => {
      if (value === undefined) {
        return;
      }
      const prevValue = this._value;
      this._value = value;

      if (value === 0 && prevValue > 0) {
        this.ref.line.addEventListener('transitionend', () => {
          this.style.setProperty('--l-width', this._value.toString());
        });
        return;
      }

      this.style.setProperty('--l-width', this._value.toString());
    });

    this.defineAccessor('visible', (visible) => {
      this.ref.line.classList.toggle('uc-progress--hidden', !visible);
    });
  }
}

ProgressBar.template = html` <div ref="line" class="uc-progress"></div> `;
