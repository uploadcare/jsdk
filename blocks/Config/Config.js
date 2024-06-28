// @ts-check
import { Block } from '../../abstract/Block.js';
import { sharedConfigKey } from '../../abstract/sharedConfigKey.js';
import { toKebabCase } from '../../utils/toKebabCase.js';
import { initialConfig } from './initialConfig.js';
import { normalizeConfigValue } from './normalizeConfigValue.js';

const allConfigKeys = /** @type {(keyof import('../../types').ConfigType)[]} */ ([
  // "debug" option should go first to be able to print debug messages from the very beginning
  ...new Set(['debug', ...Object.keys(initialConfig)]),
]);

/**
 * Config keys that can't be passed as attribute (because they are object or function)
 *
 * @type {[
 *   'metadata',
 *   'localeDefinitionOverride',
 *   'secureUploadsSignatureResolver',
 *   'secureDeliveryProxyUrlResolver',
 *   'iconHrefResolver',
 *   'fileValidators',
 *   'collectionValidators'
 * ]}
 */
export const complexConfigKeys = [
  'metadata',
  'localeDefinitionOverride',
  'secureUploadsSignatureResolver',
  'secureDeliveryProxyUrlResolver',
  'iconHrefResolver',
  'fileValidators',
  'collectionValidators',
];

/** @type {(key: keyof import('../../types').ConfigType) => key is keyof import('../../types').ConfigComplexType} */
const isComplexKey = (key) => complexConfigKeys.includes(key);

/** Config keys that can be passed as attribute */
const plainConfigKeys = /** @type {(keyof import('../../types').ConfigPlainType)[]} */ (
  allConfigKeys.filter((key) => !isComplexKey(key))
);

/**
 * Mapping of attribute names to config keys Kebab-case and lowercase are supported. lowercase could be used by
 * frameworks like vue and react.
 */
const attrKeyMapping =
  /** @type {Record<keyof import('../../types').ConfigAttributesType, keyof import('../../types').ConfigPlainType>} */ ({
    ...Object.fromEntries(plainConfigKeys.map((key) => [toKebabCase(key), key])),
    ...Object.fromEntries(plainConfigKeys.map((key) => [key.toLowerCase(), key])),
  });

/** Mapping of attribute names to state */
const attrStateMapping = /** @type {Record<keyof import('../../types').ConfigAttributesType, string>} */ ({
  ...Object.fromEntries(plainConfigKeys.map((key) => [toKebabCase(key), sharedConfigKey(key)])),
  ...Object.fromEntries(plainConfigKeys.map((key) => [key.toLowerCase(), sharedConfigKey(key)])),
});

/** @param {string} key */
const getLocalPropName = (key) => `__${key}`;

class ConfigClass extends Block {
  requireCtxName = true;

  constructor() {
    super();

    /** @type {Block['init$'] & import('../../types').ConfigType} */
    this.init$ = {
      ...this.init$,
      ...Object.fromEntries(
        Object.entries(initialConfig).map(([key, value]) => [
          sharedConfigKey(/** @type {keyof import('../../types').ConfigType} */ (key)),
          value,
        ]),
      ),
    };
  }

  /**
   * @private
   * @param {keyof import('../../types').ConfigType} key
   * @param {unknown} value
   */
  _flushValueToAttribute(key, value) {
    if (plainConfigKeys.includes(key)) {
      // Flush the value to the DOM attributes
      const attrs = [...new Set([toKebabCase(key), key.toLowerCase()])];
      for (const attr of attrs) {
        if (typeof value === 'undefined' || value === null) {
          this.removeAttribute(attr);
        } else if (this.getAttribute(attr) !== value.toString()) {
          this.setAttribute(attr, value.toString());
        }
      }
    }
  }

  /**
   * @private
   * @param {keyof import('../../types').ConfigType} key
   * @param {unknown} value
   */
  _flushValueToState(key, value) {
    if (this.$[sharedConfigKey(key)] !== value) {
      if (typeof value === 'undefined' || value === null) {
        this.$[sharedConfigKey(key)] = initialConfig[key];
      } else {
        this.$[sharedConfigKey(key)] = value;
      }
    }
  }

  /**
   * @private
   * @param {keyof import('../../types').ConfigType} key
   * @param {unknown} value
   */
  _setValue(key, value) {
    // biome-ignore lint/complexity/noUselessThisAlias: <explanation>
    const anyThis = /** @type {typeof this & any} */ (this);

    const normalizedValue = normalizeConfigValue(key, value);

    const localPropName = getLocalPropName(key);
    if (anyThis[localPropName] === normalizedValue) return;

    this._assertSameValueDifferentReference(key, anyThis[localPropName], normalizedValue);

    anyThis[localPropName] = normalizedValue;

    // Flush the value to the state
    this._flushValueToAttribute(key, normalizedValue);
    this._flushValueToState(key, normalizedValue);

    this.debugPrint(`[lr-config] "${key}"`, normalizedValue);
  }

  /**
   * @private
   * @param {keyof import('../../types').ConfigType} key
   */
  _getValue(key) {
    // biome-ignore lint/complexity/noUselessThisAlias: <explanation>
    const anyThis = /** @type {typeof this & any} */ (this);
    const localPropName = getLocalPropName(key);
    return anyThis[localPropName];
  }

  /**
   * @param {string} key
   * @param {unknown} previousValue
   * @param {unknown} nextValue
   */
  _assertSameValueDifferentReference(key, previousValue, nextValue) {
    if (this.cfg.debug) {
      if (
        nextValue !== previousValue &&
        typeof nextValue === 'object' &&
        typeof previousValue === 'object' &&
        JSON.stringify(nextValue) === JSON.stringify(previousValue)
      ) {
        console.warn(
          `[lr-config] Option "${key}" value is the same as the previous one but the reference is different`,
        );
        console.warn(
          '[lr-config] You should avoid changing the reference of the object to prevent unnecessary calculations',
        );
        console.warn(`[lr-config] "${key}" previous value:`, previousValue);
        console.warn(`[lr-config] "${key}" new value:`, nextValue);
      }
    }
  }

  initCallback() {
    super.initCallback();
    // biome-ignore lint/complexity/noUselessThisAlias: <explanation>
    const anyThis = /** @type {typeof this & any} */ (this);

    // Subscribe to the state changes and update the local properties and attributes.
    // Initial callback call is disabled to prevent the initial value to be set here.
    // Initial value will be set below, skipping the default values.
    for (const key of plainConfigKeys) {
      this.sub(
        sharedConfigKey(key),
        (value) => {
          this._setValue(key, value);
        },
        false,
      );
    }

    for (const key of allConfigKeys) {
      // Flush the initial value to the state.
      // Initial value is taken from the DOM property if it was set before the element was initialized.
      // If no DOM property was set, the initial value is taken from the initialConfig.
      const initialValue = anyThis[key] ?? this.$[sharedConfigKey(key)];
      if (initialValue !== initialConfig[key]) {
        this._setValue(key, initialValue);
      }

      // Define DOM property setters and getters
      // They will be used in the userland directly or by the frameworks
      Object.defineProperty(this, key, {
        /** @param {unknown} value */
        set: (value) => {
          this._setValue(key, value);
        },
        get: () => {
          return this._getValue(key);
        },
      });
    }
  }

  /**
   * @param {keyof typeof attrStateMapping} name
   * @param {string} oldVal
   * @param {string} newVal
   */
  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;

    // biome-ignore lint/complexity/noUselessThisAlias: <explanation>
    const anyThis = /** @type {typeof this & any} */ (this);
    const key = attrKeyMapping[name];
    // attributeChangedCallback could be called before the initCallback
    // so we set the DOM property instead of calling this._setValue.
    // If the block was initialized, the value will be handled by the setter.
    // If the block was not initialized, the value will be set to the DOM property
    // and handled on initialization.
    anyThis[key] = newVal;
  }
}

ConfigClass.bindAttributes(attrStateMapping);

/**
 * Define empty DOM properties for all config keys on the Custom Element class prototype to make them checkable using
 * `key in element` syntax. This is required for the frameworks DOM property bindings to work.
 */
for (const key of allConfigKeys) {
  /** @type {any} */ (ConfigClass.prototype)[key] = undefined;
}

/** @typedef {import('../../utils/mixinClass.js').MixinClass<typeof ConfigClass, import('../../types').ConfigType>} Config */

// This is workaround for jsdoc that allows us to export extended class type along with the class itself
export const Config = /** @type {Config} */ (/** @type {unknown} */ (ConfigClass));
