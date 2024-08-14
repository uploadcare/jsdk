// @ts-check

import { withResolvers } from './withResolvers.js';

/**
 * @template {string} T
 * @typedef {{
 *       success: true;
 *       attribute: T;
 *       value: string;
 *     }
 *   | {
 *       success: false;
 *       attribute: T;
 *     }} ReturnType
 */

/**
 * @template {string} T
 * @param {{
 *   element: HTMLElement;
 *   attribute: T;
 *   timeout?: number;
 * }} options
 * @returns {Promise<ReturnType<T>>}
 */
export const waitForAttribute = async ({ element, attribute, timeout = 300 }) => {
  const { promise, resolve } = /** @type {typeof withResolvers<ReturnType<T>>} */ (withResolvers)();

  const currentAttrValue = element.getAttribute(attribute);
  if (currentAttrValue !== null) {
    resolve({
      success: true,
      value: currentAttrValue,
      attribute,
    });
    return promise;
  }

  const observer = new MutationObserver((mutations) => {
    const mutation = mutations[mutations.length - 1];
    handleMutation(mutation);
  });

  observer.observe(element, {
    attributes: true,
    attributeFilter: [attribute],
  });

  const timeoutId = setTimeout(() => {
    observer.disconnect();
    resolve({
      success: false,
      attribute,
    });
  }, timeout);

  /** @param {MutationRecord} mutation */
  const handleMutation = (mutation) => {
    const attrValue = element.getAttribute(attribute);
    if (mutation.type === 'attributes' && mutation.attributeName === attribute && attrValue !== null) {
      clearTimeout(timeoutId);
      observer.disconnect();
      resolve({
        success: true,
        value: attrValue,
        attribute,
      });
    }
  };

  return promise;
};
