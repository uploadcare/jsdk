// @ts-check
import { DICT, PubSub, Symbiote, slotProcessor } from '../symbiote.js';
import { initialConfig } from '../blocks/Config/initialConfig.js';
import { EventEmitter } from '../blocks/UploadCtxProvider/EventEmitter.js';
import { WindowHeightTracker } from '../utils/WindowHeightTracker.js';
import { extractCdnUrlModifiers, extractFilename, extractUuid } from '../utils/cdn-utils.js';
import { getLocaleDirection } from '../utils/getLocaleDirection.js';
import { getPluralForm } from '../utils/getPluralForm.js';
import { applyTemplateData, getPluralObjects } from '../utils/template-utils.js';
import { waitForAttribute } from '../utils/waitForAttribute.js';
import { blockCtx } from './CTX.js';
import { LocaleManager, localeStateKey } from './LocaleManager.js';
import { A11y } from './a11y.js';
import { l10nProcessor } from './l10nProcessor.js';
import { sharedConfigKey } from './sharedConfigKey.js';

const TAG_PREFIX = 'uc-';
const CTX_NAME_FALLBACK_ATTR = 'ctx-name';

// @ts-ignore TODO: fix this
export class Block extends Symbiote {
  /** @type {string | null} */
  static StateConsumerScope = null;

  /** @type {string[]} */
  static styleAttrs = [];

  /** @protected */
  requireCtxName = false;

  /** @type {import('./ActivityBlock.js').ActivityType} */
  activityType = null;

  init$ = blockCtx();

  /**
   * @param {String} str
   * @param {{ [key: string]: string | number }} variables
   * @returns {String}
   */
  l10n(str, variables = {}) {
    if (!str) {
      return '';
    }
    let template = this.$[localeStateKey(str)] || str;
    let pluralObjects = getPluralObjects(template);
    for (let pluralObject of pluralObjects) {
      variables[pluralObject.variable] = this.pluralize(
        pluralObject.pluralKey,
        Number(variables[pluralObject.countVariable]),
      );
    }
    let result = applyTemplateData(template, variables);
    return result;
  }

  /**
   * @private
   * @param {string} key
   * @param {number} count
   * @returns {string}
   */
  pluralize(key, count) {
    const locale = this.l10n('locale-id') || 'en';
    const pluralForm = getPluralForm(locale, count);
    return this.l10n(`${key}__${pluralForm}`);
  }

  /**
   * @param {string} key
   * @param {() => void} resolver
   * @protected
   */
  bindL10n(key, resolver) {
    this.localeManager?.bindL10n(this, key, resolver);
  }

  constructor() {
    super();
    /** @type {Map<string, Set<{ remove: () => void }>>} */
    this.l10nProcessorSubs = new Map();
    // @ts-expect-error TODO: fix this
    this.addTemplateProcessor(l10nProcessor);
    this.addTemplateProcessor(slotProcessor);
  }

  /**
   * @param {Parameters<import('../blocks/UploadCtxProvider/EventEmitter.js').EventEmitter['emit']>[0]} type
   * @param {Parameters<import('../blocks/UploadCtxProvider/EventEmitter.js').EventEmitter['emit']>[1]} [payload]
   * @param {Parameters<import('../blocks/UploadCtxProvider/EventEmitter.js').EventEmitter['emit']>[2]} [options]
   */
  emit(type, payload, options) {
    /** @type {import('../blocks/UploadCtxProvider/EventEmitter.js').EventEmitter} */
    const eventEmitter = this.has('*eventEmitter') && this.$['*eventEmitter'];
    if (!eventEmitter) {
      return;
    }
    eventEmitter.emit(type, payload, options);
  }

  /**
   * @param {(block: Block) => boolean} callback
   * @returns {Boolean}
   */
  hasBlockInCtx(callback) {
    for (let block of this.blocksRegistry) {
      if (callback(block)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param {String} prop
   * @param {any} newVal
   */
  setOrAddState(prop, newVal) {
    this.add$(
      {
        [prop]: newVal,
      },
      true,
    );
  }

  /** @protected */
  connectedCallback() {
    const styleAttrs = /** @type {typeof Block} */ (this.constructor).styleAttrs;
    styleAttrs.forEach((attr) => {
      this.setAttribute(attr, '');
    });

    if (this.hasAttribute('retpl')) {
      // @ts-ignore TODO: fix this
      this.constructor['template'] = null;
      this.processInnerHtml = true;
    }
    if (this.requireCtxName) {
      Promise.race([
        waitForAttribute({
          element: this,
          attribute: DICT.CTX_NAME_ATTR,
        }),
        waitForAttribute({
          element: this,
          attribute: CTX_NAME_FALLBACK_ATTR,
        }),
      ]).then((result) => {
        if (result.success) {
          if (result.attribute === CTX_NAME_FALLBACK_ATTR) {
            const ctxName = result.value;
            this.style.setProperty(DICT.CSS_CTX_PROP, `'${ctxName}'`);
          }
          // async wait for ctx attribute to be set, needed for Angular because it sets attributes after mount
          // TODO: should be moved to the symbiote core
          super.connectedCallback();
        } else {
          console.error(
            `Attribute "${DICT.CTX_NAME_ATTR}" or "${CTX_NAME_FALLBACK_ATTR}" is required and it is not set.`,
          );
        }
      });
    } else {
      super.connectedCallback();
    }

    WindowHeightTracker.registerClient(this);
  }

  /** @protected */
  disconnectedCallback() {
    super.disconnectedCallback();
    WindowHeightTracker.unregisterClient(this);
  }

  /** @protected */
  initCallback() {
    if (!this.has('*blocksRegistry')) {
      this.add('*blocksRegistry', new Set());
    }

    let blocksRegistry = this.$['*blocksRegistry'];
    blocksRegistry.add(this);

    if (!this.has('*eventEmitter')) {
      this.add('*eventEmitter', new EventEmitter(this.debugPrint.bind(this)));
    }
    if (!this.has('*localeManager')) {
      this.add('*localeManager', new LocaleManager(this));
    }

    if (!this.has('*a11y')) {
      this.add('*a11y', new A11y());
    }

    this.sub(localeStateKey('locale-id'), (localeId) => {
      const direction = getLocaleDirection(localeId);
      this.style.direction = direction === 'ltr' ? '' : direction;
    });
  }

  /**
   * @private
   * @returns {LocaleManager | null}
   */
  get localeManager() {
    return this.has('*localeManager') ? this.$['*localeManager'] : null;
  }

  /**
   * @returns {A11y | null}
   * @protected
   */
  get a11y() {
    return this.has('*a11y') ? this.$['*a11y'] : null;
  }

  /** @type {Set<Block>} */
  get blocksRegistry() {
    return this.$['*blocksRegistry'];
  }

  /** @protected */
  destroyCallback() {
    let blocksRegistry = this.blocksRegistry;
    blocksRegistry?.delete(this);

    this.localeManager?.destroyL10nBindings(this);
    this.l10nProcessorSubs = new Map();

    // Destroy local context
    // TODO: this should be done inside symbiote
    PubSub.deleteCtx(this.localCtx.uid);

    if (blocksRegistry?.size === 0) {
      setTimeout(() => {
        // Destroy global context after all blocks are destroyed and all callbacks are run
        this.destroyCtxCallback();
      }, 0);
    }
  }

  /**
   * Called when the last block is removed from the context. Note that inheritors must run their callback before that.
   *
   * @protected
   */
  destroyCtxCallback() {
    PubSub.deleteCtx(this.ctxName);

    this.localeManager?.destroy();
  }

  /**
   * @param {String} url
   * @returns {Promise<String>}
   * @protected
   */
  async proxyUrl(url) {
    if (this.cfg.secureDeliveryProxy && this.cfg.secureDeliveryProxyUrlResolver) {
      console.warn(
        'Both secureDeliveryProxy and secureDeliveryProxyUrlResolver are set. The secureDeliveryProxyUrlResolver will be used.',
      );
    }
    if (this.cfg.secureDeliveryProxyUrlResolver) {
      try {
        return await this.cfg.secureDeliveryProxyUrlResolver(url, {
          uuid: extractUuid(url),
          cdnUrlModifiers: extractCdnUrlModifiers(url),
          fileName: extractFilename(url),
        });
      } catch (err) {
        console.error('Failed to resolve secure delivery proxy URL. Falling back to the default URL.', err);
        return url;
      }
    }
    if (this.cfg.secureDeliveryProxy) {
      return applyTemplateData(
        this.cfg.secureDeliveryProxy,
        { previewUrl: url },
        { transform: (value) => window.encodeURIComponent(value) },
      );
    }
    return url;
  }

  /** @returns {import('../types').ConfigType} } */
  get cfg() {
    if (!this.__cfgProxy) {
      let o = Object.create(null);
      /** @private */
      this.__cfgProxy = new Proxy(o, {
        set: (obj, key, value) => {
          if (typeof key !== 'string') {
            return false;
          }
          const sharedKey = sharedConfigKey(/** @type {keyof import('../types').ConfigType} */ (key));
          if (!this.has(sharedKey)) {
            this.add(sharedKey, initialConfig[/** @type {keyof import('../types').ConfigType} */ (key)]);
          }
          this.$[sharedKey] = value;
          return true;
        },
        /**
         * @param {never} obj
         * @param {keyof import('../types').ConfigType} key
         */
        get: (obj, key) => {
          const sharedKey = sharedConfigKey(key);
          if (!this.has(sharedKey)) {
            this.add(sharedKey, initialConfig[key]);
          }
          return this.$[sharedConfigKey(key)];
        },
      });
    }
    return this.__cfgProxy;
  }

  /**
   * @template {keyof import('../types').ConfigType} T
   * @param {T} key
   * @param {(value: import('../types').ConfigType[T]) => void} callback
   */
  subConfigValue(key, callback) {
    const sharedKey = sharedConfigKey(key);
    if (!this.has(sharedKey)) {
      this.add(sharedKey, initialConfig[key]);
    }
    this.sub(sharedKey, callback);
  }

  /** @param {unknown[]} args */
  debugPrint(...args) {
    if (!this.cfg.debug) {
      return;
    }
    let consoleArgs = args;
    if (typeof args?.[0] === 'function') {
      const resolver = args[0];
      consoleArgs = resolver();
    }

    console.log(`[${this.ctxName}]`, ...consoleArgs);
  }

  /** @param {String} [name] */
  static reg(name) {
    if (!name) {
      super.reg();
      return;
    }
    if (name.startsWith(TAG_PREFIX)) {
      super.reg(name);
    }
  }
}
