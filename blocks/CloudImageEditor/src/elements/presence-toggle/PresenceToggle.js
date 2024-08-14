import { html } from '../../../../../symbiote.js';
import { Block } from '../../../../../abstract/Block.js';
import { applyClassNames } from '../../lib/classNames.js';

/**
 * @typedef {Object} Style
 * @property {String} [transition]
 * @property {String} [visible]
 * @property {String} [hidden]
 */

/** @type {Style} */
const DEFAULT_STYLE = {
  transition: 'uc-transition',
  visible: 'uc-visible',
  hidden: 'uc-hidden',
};

export class PresenceToggle extends Block {
  constructor() {
    super();

    this._visible = false;
    this._visibleStyle = DEFAULT_STYLE.visible;
    this._hiddenStyle = DEFAULT_STYLE.hidden;
    this._externalTransitions = false;

    this.defineAccessor('styles', (styles) => {
      if (!styles) {
        return;
      }
      this._externalTransitions = true;
      this._visibleStyle = styles.visible;
      this._hiddenStyle = styles.hidden;
    });

    this.defineAccessor('visible', (visible) => {
      if (typeof visible !== 'boolean') {
        return;
      }

      this._visible = visible;
      this._handleVisible();
    });
  }

  _handleVisible() {
    this.style.visibility = this._visible ? 'inherit' : 'hidden';
    applyClassNames(this, {
      [DEFAULT_STYLE.transition]: !this._externalTransitions,
      [this._visibleStyle]: this._visible,
      [this._hiddenStyle]: !this._visible,
    });
    this.setAttribute('aria-hidden', this._visible ? 'false' : 'true');
  }

  initCallback() {
    super.initCallback();

    this.classList.toggle('uc-initial', true);

    if (!this._externalTransitions) {
      this.classList.add(DEFAULT_STYLE.transition);
    }

    this._handleVisible();
    setTimeout(() => {
      this.classList.toggle('uc-initial', false);
    }, 0);
  }
}
PresenceToggle.template = html` <slot></slot> `;
