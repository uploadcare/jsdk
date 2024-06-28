// @ts-check
import { debounce } from '../blocks/utils/debounce.js';
import { default as en } from '../locales/file-uploader/en.js';
import { resolveLocaleDefinition } from './localeRegistry.js';

/** @param {string} key */
export const localeStateKey = (key) => `*l10n/${key}`;
export const DEFAULT_LOCALE = 'en';

export class LocaleManager {
  /**
   * @private
   * @type {import('./Block.js').Block | null}
   */
  _blockInstance = null;

  /** @private */
  _localeName = '';

  /**
   * @private
   * @type {Set<() => void>}
   */
  _callbacks = new Set();

  /**
   * @private
   * @type {Map<import('./Block.js').Block, Map<string, () => void>>}
   */
  _boundBlocks = new Map();

  /** @param {import('./Block.js').Block} blockInstance */
  constructor(blockInstance) {
    this._blockInstance = blockInstance;

    for (const [key, value] of Object.entries(en)) {
      this._blockInstance.add(localeStateKey(key), value, false);
    }

    setTimeout(() => {
      blockInstance.subConfigValue('localeName', async (localeName) => {
        if (!this._blockInstance || !localeName) {
          return;
        }
        this._localeName = localeName;
        const definition = await resolveLocaleDefinition(localeName);
        if (localeName !== DEFAULT_LOCALE && this._localeName !== localeName) {
          return;
        }

        const overrides = this._blockInstance.cfg.localeDefinitionOverride?.[localeName];
        for (const [key, value] of Object.entries(definition)) {
          const overriddenValue = overrides?.[key];
          this._blockInstance.add(localeStateKey(key), overriddenValue ?? value, true);
          for (const callback of this._callbacks) {
            callback();
          }
        }
      });

      blockInstance.subConfigValue('localeDefinitionOverride', (localeDefinitionOverride) => {
        if (!localeDefinitionOverride) {
          return;
        }
        const definition = localeDefinitionOverride[this._localeName];
        if (!definition) {
          return;
        }
        for (const [key, value] of Object.entries(definition)) {
          this._blockInstance?.add(localeStateKey(key), value, true);
          for (const callback of this._callbacks) {
            callback();
          }
        }
      });
    });
  }

  /**
   * @param {() => void} callback
   * @returns {() => void}
   */
  onLocaleChange(callback) {
    const debouncedCb = debounce(callback, 0);
    this._callbacks.add(debouncedCb);
    return () => {
      this._callbacks.delete(debouncedCb);
    };
  }

  /**
   * @param {import('./Block.js').Block} block
   * @param {string} key
   * @param {() => void} resolver
   */
  bindL10n(block, key, resolver) {
    block.$[key] = resolver();

    if (!this._boundBlocks.has(block)) {
      this._boundBlocks.set(block, new Map());
    }

    this._boundBlocks.get(block)?.get(key)?.();

    const destroyCallback = this.onLocaleChange(() => {
      block.$[key] = resolver();
    });

    this._boundBlocks.get(block)?.set(key, destroyCallback);
  }

  /** @param {import('./Block.js').Block} block */
  destroyL10nBindings(block) {
    const callbacks = this._boundBlocks.get(block);
    if (!callbacks) {
      return;
    }
    for (const callback of callbacks.values()) {
      callback();
    }
    this._boundBlocks.delete(block);
  }

  destroy() {
    this._callbacks.clear();
  }
}
