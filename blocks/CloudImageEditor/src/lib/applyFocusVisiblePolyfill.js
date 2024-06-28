/**
 * Helper function for legacy browsers and iframes which sometimes focus on elements like document, body, and
 * non-interactive SVG.
 *
 * @param {EventTarget} el
 */
function isValidFocusTarget(el) {
  if (
    el &&
    el !== document &&
    /** @type {Element} */ (el).nodeName !== 'HTML' &&
    /** @type {Element} */ (el).nodeName !== 'BODY' &&
    'classList' in el &&
    'contains' in /** @type {Element} */ (el).classList
  ) {
    return true;
  }
  return false;
}

/**
 * Computes whether the given element should automatically trigger the `focus-visible` class being added, i.e., whether
 * it should always match `:focus-visible` when focused.
 *
 * @param {EventTarget} el
 * @returns {boolean}
 */
function focusTriggersKeyboardModality(el) {
  const { tagName } = /** @type {Element} */ (el);

  if (tagName === 'INPUT' && !(/** @type {HTMLInputElement} */ (el).readOnly)) {
    return true;
  }

  if (tagName === 'TEXTAREA' && !(/** @type {HTMLTextAreaElement} */ (el).readOnly)) {
    return true;
  }

  if (/** @type {HTMLElement} */ (el).isContentEditable) {
    return true;
  }

  return false;
}

let hadKeyboardEvent = true;
let hadFocusVisibleRecently = false;

/**
 * Applies the :focus-visible polyfill at the given scope. A scope, in this case, is either the top-level Document or a
 * Shadow Root.
 *
 * @param {Document | ShadowRoot} scope
 * @param {(focusVisible: boolean, el: EventTarget) => void} [callback]
 * @see https://github.com/WICG/focus-visible
 */
export function applyFocusVisiblePolyfill(scope, callback) {
  let hadFocusVisibleRecentlyTimeout = null;

  /**
   * Add the `focus-visible` class to the given element if the author did not add it.
   *
   * @param {EventTarget} el
   */
  function addFocusVisibleClass(el) {
    /** @type {Element} */ (el).setAttribute('focus-visible', '');
    callback(true, el);
  }

  /**
   * Remove the `focus-visible` class from the given element if the author did not originally add it.
   *
   * @param {EventTarget} el
   */
  function removeFocusVisibleClass(el) {
    if (!(/** @type {Element} */ (el).hasAttribute('focus-visible'))) {
      return;
    }
    /** @type {Element} */ (el).removeAttribute('focus-visible');
    callback(false, el);
  }

  /**
   * If the most recent user interaction was via the keyboard, and the keypress did not include a meta, alt/option, or
   * control key, then the keyboard's modality. Otherwise, the modality is not the keyboard.Apply `focus-visible` to any
   * current active element and keep track of our keyboard modality state with `hadKeyboardEvent`.
   *
   * @param {KeyboardEvent} e
   */
  function onKeyDown(e) {
    if (e.metaKey || e.altKey || e.ctrlKey) {
      return;
    }

    if (isValidFocusTarget(scope.activeElement)) {
      addFocusVisibleClass(scope.activeElement);
    }

    hadKeyboardEvent = true;
  }

  /**
   * If at any point a user clicks with a pointing device, ensure that we change the modality away from the keyboard.
   * This avoids the situation where a user presses a key on an already focused element, and then clicks on a different
   * element focusing it with a pointing device while we still think we're in keyboard modality.
   *
   * @param {Event} e
   */
  function onPointerDown(e) {
    hadKeyboardEvent = false;
  }

  /**
   * On `focus`, add the `focus-visible` class to the target if: - the target received focus as a result of keyboard
   * navigation or - the event target is an element that will likely require interaction via the keyboard (e.g., a text
   * box).
   *
   * @param {Event} e
   */
  function onFocus(e) {
    // Prevent IE from focusing the document or HTML element.
    if (!isValidFocusTarget(e.target)) {
      return;
    }

    if (hadKeyboardEvent || focusTriggersKeyboardModality(e.target)) {
      addFocusVisibleClass(e.target);
    }
  }

  /**
   * On `blur`, remove the `focus-visible` class from the target.
   *
   * @param {Event} e
   */
  function onBlur(e) {
    if (!isValidFocusTarget(e.target)) {
      return;
    }

    if (/** @type {Element} */ (e.target).hasAttribute('focus-visible')) {
      // To detect a tab/window switch, we look for a blur event followed
      // rapidly by a visibility change.
      // If we don't see a visibility change within 100ms, it's probably a
      // regular focus change.
      hadFocusVisibleRecently = true;
      window.clearTimeout(hadFocusVisibleRecentlyTimeout);
      hadFocusVisibleRecentlyTimeout = window.setTimeout(() => {
        hadFocusVisibleRecently = false;
      }, 100);
      removeFocusVisibleClass(e.target);
    }
  }

  /**
   * Add a group of listeners to detect usage of any pointing devices. These listeners will be added when the polyfill
   * first loads and anytime the window is blurred so that they are active when the window regains focus.
   */
  function addInitialPointerMoveListeners() {
    document.addEventListener('mousemove', onInitialPointerMove);
    document.addEventListener('mousedown', onInitialPointerMove);
    document.addEventListener('mouseup', onInitialPointerMove);
    document.addEventListener('pointermove', onInitialPointerMove);
    document.addEventListener('pointerdown', onInitialPointerMove);
    document.addEventListener('pointerup', onInitialPointerMove);
    document.addEventListener('touchmove', onInitialPointerMove);
    document.addEventListener('touchstart', onInitialPointerMove);
    document.addEventListener('touchend', onInitialPointerMove);
  }

  function removeInitialPointerMoveListeners() {
    document.removeEventListener('mousemove', onInitialPointerMove);
    document.removeEventListener('mousedown', onInitialPointerMove);
    document.removeEventListener('mouseup', onInitialPointerMove);
    document.removeEventListener('pointermove', onInitialPointerMove);
    document.removeEventListener('pointerdown', onInitialPointerMove);
    document.removeEventListener('pointerup', onInitialPointerMove);
    document.removeEventListener('touchmove', onInitialPointerMove);
    document.removeEventListener('touchstart', onInitialPointerMove);
    document.removeEventListener('touchend', onInitialPointerMove);
  }

  /**
   * If the user changes tabs, keep track of whether or not the previously focused element had .focus-visible.
   *
   * @param {Event} e
   */
  function onVisibilityChange(e) {
    if (document.visibilityState === 'hidden') {
      // If the tab becomes active again, the browser will handle calling focus
      // on the element (Safari actually calls it twice).
      // If this tab change caused a blur on an element with focus-visible,
      // re-apply the class when the user switches back to the tab.
      if (hadFocusVisibleRecently) {
        hadKeyboardEvent = true;
      }
      addInitialPointerMoveListeners();
    }
  }

  /**
   * When the polyfill first loads, assume the user is in keyboard modality. If any event is received from a pointing
   * device (e.g., mouse, pointer, touch), turn off keyboard modality. This accounts for situations where focus enters
   * the page from the URL bar.
   *
   * @param {Event} e
   */
  function onInitialPointerMove(e) {
    // Work around a Safari quirk that fires a mousemove on <html> whenever the
    // window blurs, even if you're tabbing out of the page. ¯\_(ツ)_/¯
    if (
      /** @type {Element} */ (e.target).nodeName &&
      /** @type {Element} */ (e.target).nodeName.toLowerCase() === 'html'
    ) {
      return;
    }

    hadKeyboardEvent = false;
    removeInitialPointerMoveListeners();
  }

  // We are interested in changes at the global scope only for some kinds of states.
  // For example, global pointer input, global key presses, and global
  // visibility change should affect the state at every scope:
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('mousedown', onPointerDown, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('touchstart', onPointerDown, true);
  document.addEventListener('visibilitychange', onVisibilityChange, true);

  addInitialPointerMoveListeners();

  // We specifically care about state changes in the local scope for focus and blur.
  // This is because focus/blur events that originate from within a
  // shadow root are not re-dispatched from the host element if it was already
  // the active element in its own scope:
  scope.addEventListener('focus', onFocus, true);
  scope.addEventListener('blur', onBlur, true);

  return () => {
    removeInitialPointerMoveListeners();

    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('mousedown', onPointerDown, true);
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('touchstart', onPointerDown, true);
    document.removeEventListener('visibilitychange', onVisibilityChange, true);

    scope.removeEventListener('focus', onFocus, true);
    scope.removeEventListener('blur', onBlur, true);
  };
}
