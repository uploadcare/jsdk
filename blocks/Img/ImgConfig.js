import { Symbiote, PubSub } from '../../symbiote.js';
import { PROPS_MAP } from './props-map.js';
import { CSS_PREF } from './configurations.js';
import { PACKAGE_NAME, PACKAGE_VERSION } from '../../env.js';

const CSS_PROPS = Object.create(null);
for (let prop in PROPS_MAP) {
  CSS_PROPS[CSS_PREF + prop] = PROPS_MAP[prop]?.default || '';
}

export class ImgConfig extends Symbiote {
  cssInit$ = CSS_PROPS;

  /**
   * @param {String} key
   * @returns {any}
   */
  $$(key) {
    return this.$[CSS_PREF + key];
  }

  /** @param {Object<String, String | Number>} kvObj */
  set$$(kvObj) {
    for (let key in kvObj) {
      this.$[CSS_PREF + key] = kvObj[key];
    }
  }

  /**
   * @param {String} key
   * @param {(val: any) => void} kbFn
   */
  sub$$(key, kbFn) {
    this.sub(CSS_PREF + key, (val) => {
      // null comes from CSS context property
      // empty string comes from attribute value
      if (val === null || val === '') {
        return;
      }
      kbFn(val);
    });
  }

  analyticsParams() {
    return `-/@clib/${PACKAGE_NAME}/${PACKAGE_VERSION}/uc-img/`;
  }

  initAttributes(el) {
    [...this.attributes].forEach((attr) => {
      if (!PROPS_MAP[attr.name]) {
        el.setAttribute(attr.name, attr.value);
      }
    });
  }

  /**
   * @param {HTMLElement} el
   * @param {() => void} cbkFn
   */
  initIntersection(el, cbkFn) {
    let opts = {
      root: null,
      rootMargin: '0px',
    };
    /** @private */
    this._isnObserver = new IntersectionObserver((entries) => {
      entries.forEach((ent) => {
        if (ent.isIntersecting) {
          cbkFn();
          this._isnObserver.unobserve(el);
        }
      });
    }, opts);
    this._isnObserver.observe(el);
    if (!this._observed) {
      /** @private */
      this._observed = new Set();
    }
    this._observed.add(el);
  }

  destroyCallback() {
    super.destroyCallback();
    if (this._isnObserver) {
      this._observed.forEach((el) => {
        this._isnObserver.unobserve(el);
      });
      this._isnObserver = null;
    }
    PubSub.deleteCtx(this);
  }

  static get observedAttributes() {
    return Object.keys(PROPS_MAP);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    window.setTimeout(() => {
      this.$[CSS_PREF + name] = newVal;
    });
  }
}
