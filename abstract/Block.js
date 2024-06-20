// @ts-check
import { BaseComponent, Data } from '@symbiotejs/symbiote';
import { initialConfig } from '../blocks/Config/initialConfig.js';
import { EventEmitter } from '../blocks/UploadCtxProvider/EventEmitter.js';
import { WindowHeightTracker } from '../utils/WindowHeightTracker.js';
import { extractFilename, extractCdnUrlModifiers, extractUuid } from '../utils/cdn-utils.js';
import { getLocaleDirection } from '../utils/getLocaleDirection.js';
import { getPluralForm } from '../utils/getPluralForm.js';
import { applyTemplateData, getPluralObjects } from '../utils/template-utils.js';
import { waitForAttribute } from '../utils/waitForAttribute.js';
import { blockCtx } from './CTX.js';
import { LocaleManager, localeStateKey } from './LocaleManager.js';
import { l10nProcessor } from './l10nProcessor.js';
import { sharedConfigKey } from './sharedConfigKey.js';

const TAG_PREFIX = 'lr-';

// @ts-ignore TODO: fix this
export class Block extends BaseComponent {
  /** @type {string | null} */
  static StateConsumerScope = null;
  static className = '';
  requireCtxName = false;
  allowCustomTemplate = true;
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
   */
  bindL10n(key, resolver) {
    this.localeManager?.bindL10n(this, key, resolver);
  }

  constructor() {
    super();
    /** @type {Map<string, Set<{ remove: () => void }>>} */
    this.l10nProcessorSubs = new Map();
    // @ts-ignore TODO: fix this
    this.addTemplateProcessor(l10nProcessor);
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
    // @ts-ignore TODO: fix this
    /** @type {Set} */
    let blocksRegistry = this.$['*blocksRegistry'];
    for (let block of blocksRegistry) {
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

  /** @param {import('./ActivityBlock.js').ActivityType} activityType */
  setActivity(activityType) {
    if (this.hasBlockInCtx((b) => b.activityType === activityType)) {
      this.$['*currentActivity'] = activityType;
      return;
    }
    console.warn(`Activity type "${activityType}" not found in the context`);
  }

  connectedCallback() {
    const className = /** @type {typeof Block} */ (this.constructor).className;
    if (className) {
      this.classList.toggle(`${TAG_PREFIX}${className}`, true);
    }

    if (this.hasAttribute('retpl')) {
      // @ts-ignore TODO: fix this
      this.constructor['template'] = null;
      this.processInnerHtml = true;
    }
    if (this.requireCtxName) {
      waitForAttribute({
        element: this,
        attribute: 'ctx-name',
        onSuccess: () => {
          // async wait for ctx-name attribute to be set, needed for Angular because it sets attributes after mount
          // TODO: should be moved to the symbiote core
          super.connectedCallback();
        },
        onTimeout: () => {
          console.error('Attribute `ctx-name` is required and it is not set.');
        },
      });
    } else {
      super.connectedCallback();
    }

    WindowHeightTracker.registerClient(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    WindowHeightTracker.unregisterClient(this);
  }

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

    this.sub(localeStateKey('locale-id'), (localeId) => {
      this.style.direction = getLocaleDirection(localeId);
    });
  }

  /** @returns {LocaleManager | null} */
  get localeManager() {
    return this.has('*localeManager') ? this.$['*localeManager'] : null;
  }

  destroyCallback() {
    /** @type {Set<Block>} */
    let blocksRegistry = this.$['*blocksRegistry'];
    blocksRegistry.delete(this);

    this.localeManager?.destroyL10nBindings(this);
    this.l10nProcessorSubs = new Map();

    // Destroy local context
    // TODO: this should be done inside symbiote
    Data.deleteCtx(this);

    if (blocksRegistry.size === 0) {
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
    Data.deleteCtx(this.ctxName);

    this.localeManager?.destroy();
  }

  /**
   * @param {Number} bytes
   * @param {Number} [decimals]
   */
  fileSizeFmt(bytes, decimals = 2) {
    let units = ['B', 'KB', 'MB', 'GB', 'TB'];
    /**
     * @param {String} str
     * @returns {String}
     */
    if (bytes === 0) {
      return `0 ${units[0]}`;
    }
    let k = 1024;
    let dm = decimals < 0 ? 0 : decimals;
    let i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / k ** i).toFixed(dm)) + ' ' + units[i];
  }

  /**
   * @param {String} url
   * @returns {String}
   */
  proxyUrl(url) {
    if (this.cfg.secureDeliveryProxy && this.cfg.secureDeliveryProxyUrlResolver) {
      console.warn(
        'Both secureDeliveryProxy and secureDeliveryProxyUrlResolver are set. The secureDeliveryProxyUrlResolver will be used.',
      );
    }
    if (this.cfg.secureDeliveryProxyUrlResolver) {
      return this.cfg.secureDeliveryProxyUrlResolver(url, {
        uuid: extractUuid(url),
        cdnUrlModifiers: extractCdnUrlModifiers(url),
        fileName: extractFilename(url),
      });
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
          this.$[sharedKey] = value;
          return true;
        },
        /**
         * @param {never} obj
         * @param {keyof import('../types').ConfigType} key
         */
        get: (obj, key) => {
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
    this.sub(sharedConfigKey(key), callback);
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
    super.reg(name.startsWith(TAG_PREFIX) ? name : TAG_PREFIX + name);
  }
}

export { BaseComponent };
