// @ts-check
import { debounce } from '../blocks/utils/debounce.js';

const WINDOW_HEIGHT_TRACKER_PROPERTY = '--uploadcare-blocks-window-height';

// biome-ignore lint/complexity/noStaticOnlyClass: Let's keep it. Don't want to refactor it now.
export class WindowHeightTracker {
  /**
   * @private
   * @type {Set<unknown>}
   */
  static clientsRegistry = new Set();

  /** @private */
  static flush = debounce(() => {
    document.documentElement.style.setProperty(WINDOW_HEIGHT_TRACKER_PROPERTY, `${window.innerHeight}px`);
  }, 100);

  /**
   * @param {unknown} client
   * @public
   */
  static registerClient(client) {
    if (WindowHeightTracker.clientsRegistry.size === 0) {
      WindowHeightTracker.attachTracker();
    }
    WindowHeightTracker.clientsRegistry.add(client);
  }

  /**
   * @param {unknown} client
   * @public
   */
  static unregisterClient(client) {
    WindowHeightTracker.clientsRegistry.delete(client);
    if (WindowHeightTracker.clientsRegistry.size === 0) {
      WindowHeightTracker.detachTracker();
    }
  }

  /** @private */
  static attachTracker() {
    window.addEventListener('resize', WindowHeightTracker.flush, { passive: true, capture: true });
    WindowHeightTracker.flush();
  }

  /** @private */
  static detachTracker() {
    window.removeEventListener('resize', WindowHeightTracker.flush, { capture: true });
    document.documentElement.style.removeProperty(WINDOW_HEIGHT_TRACKER_PROPERTY);
  }
}
