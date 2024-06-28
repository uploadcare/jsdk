import { applyFocusVisiblePolyfill } from './applyFocusVisiblePolyfill.js';

// biome-ignore lint/complexity/noStaticOnlyClass: It will be removed soon
export class FocusVisible {
  /**
   * @param {boolean} focusVisible
   * @param {HTMLElement} element
   */
  static handleFocusVisible(focusVisible, element) {
    if (focusVisible) {
      const customOutline = element.style.getPropertyValue('--focus-visible-outline');
      element.style.outline = customOutline || '2px solid var(--color-focus-ring)';
    } else {
      element.style.outline = 'none';
    }
  }

  /** @param {ShadowRoot | Document} scope */
  static register(scope) {
    FocusVisible._destructors.set(scope, applyFocusVisiblePolyfill(scope, FocusVisible.handleFocusVisible));
  }

  /** @param {Document | ShadowRoot} scope */
  static unregister(scope) {
    if (!FocusVisible._destructors.has(scope)) {
      return;
    }
    const removeFocusVisiblePolyfill = FocusVisible._destructors.get(scope);
    removeFocusVisiblePolyfill();
    FocusVisible._destructors.delete(scope);
  }
}

FocusVisible._destructors = new WeakMap();
