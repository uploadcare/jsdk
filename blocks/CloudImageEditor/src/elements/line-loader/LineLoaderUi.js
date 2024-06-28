import { Block } from '../../../../../abstract/Block.js';

export class LineLoaderUi extends Block {
  constructor() {
    super();

    this._active = false;

    this._handleTransitionEndRight = () => {
      const lineEl = this.ref['line-el'];
      lineEl.style.transition = 'initial';
      lineEl.style.opacity = '0';
      lineEl.style.transform = 'translateX(-101%)';
      this._active && this._start();
    };
  }

  initCallback() {
    super.initCallback();
    this.defineAccessor('active', (active) => {
      if (typeof active === 'boolean') {
        if (active) {
          this._start();
        } else {
          this._stop();
        }
      }
    });
  }

  _start() {
    this._active = true;
    const { width } = this.getBoundingClientRect();
    const lineEl = this.ref['line-el'];
    lineEl.style.transition = 'transform 1s';
    lineEl.style.opacity = '1';
    lineEl.style.transform = `translateX(${width}px)`;
    lineEl.addEventListener('transitionend', this._handleTransitionEndRight, {
      once: true,
    });
  }

  _stop() {
    this._active = false;
  }
}

LineLoaderUi.template = /* HTML */ `
  <div class="inner">
    <div class="line" ref="line-el"></div>
  </div>
`;
