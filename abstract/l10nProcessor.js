// @ts-check

import { localeStateKey } from './LocaleManager.js';

/**
 * @template {import('./Block.js').Block} T
 * @param {DocumentFragment} fr
 * @param {T} fnCtx
 */
export function l10nProcessor(fr, fnCtx) {
  for (const el of fr.querySelectorAll('[l10n]')) {
    let key = el.getAttribute('l10n');
    if (!key) {
      return;
    }
    let elProp = 'textContent';
    let useAttribute = false;
    if (key.includes(':')) {
      const arr = key.split(':');
      elProp = arr[0];
      key = arr[1];
      if (elProp.startsWith('@')) {
        elProp = elProp.slice(1);
        useAttribute = true;
      }
    }

    // Check if the key is present in the local context
    const localCtxKey = key;
    if (fnCtx.has(localCtxKey)) {
      fnCtx.sub(localCtxKey, (mappedKey) => {
        if (!mappedKey) {
          return;
        }
        // Store the subscription in a temporary map to be able to unsubscribe later
        if (!fnCtx.l10nProcessorSubs.has(localCtxKey)) {
          fnCtx.l10nProcessorSubs.set(localCtxKey, new Set());
        }
        const keySubs = fnCtx.l10nProcessorSubs.get(localCtxKey) ?? new Set();
        for (const sub of keySubs) {
          sub.remove();
          keySubs.delete(sub);
          fnCtx.allSubs.delete(sub);
        }
        // We don't need the leading * in the key because we use the key as a local context key relative to the global state
        const nodeStateKey = localeStateKey(mappedKey).replace('*', '');
        // If the key is not present in the node context, add it
        if (!fnCtx.nodeCtx.has(nodeStateKey)) {
          fnCtx.nodeCtx.add(nodeStateKey, mappedKey);
        }
        // Subscribe on the global l10n key change
        const sub = fnCtx.nodeCtx.sub(nodeStateKey, () => {
          el[/** @type {'textContent'} */ (elProp)] = fnCtx.l10n(mappedKey);
        });
        keySubs?.add(sub);
        // Store the subscription in the global context to make able Symbiote to unsubscribe it on destroy
        fnCtx.allSubs.add(sub);
        el.removeAttribute('l10n');
      });
    }

    // Otherwise, assume the key is in the global context
    const stateKey = localeStateKey(key);
    if (!fnCtx.has(stateKey)) {
      fnCtx.add(stateKey, '');
    }
    fnCtx.sub(stateKey, () => {
      key = /** @type {string} */ (key);
      if (useAttribute) {
        el.setAttribute(elProp, fnCtx.l10n(key));
      } else {
        el[/** @type {'textContent'} */ (elProp)] = fnCtx.l10n(key);
      }
    });
    el.removeAttribute('l10n');
  }
}
