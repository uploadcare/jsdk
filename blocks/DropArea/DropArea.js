// @ts-check

import { Data } from '@symbiotejs/symbiote';
import { ActivityBlock } from '../../abstract/ActivityBlock.js';
import { UploaderBlock } from '../../abstract/UploaderBlock.js';
import { stringToArray } from '../../utils/stringToArray.js';
import { asBoolean } from '../Config/normalizeConfigValue.js';
import { UploadSource } from '../utils/UploadSource.js';
import { DropzoneState, addDropzone } from './addDropzone.js';

const GLOBAL_CTX_NAME = 'lr-drop-area';
const REGISTRY_KEY = `${GLOBAL_CTX_NAME}/registry`;

export class DropArea extends UploaderBlock {
  static styleAttrs = [...super.styleAttrs, 'lr-drop-area'];
  constructor() {
    super();

    this.init$ = {
      ...this.init$,
      state: DropzoneState.INACTIVE,
      withIcon: false,
      isClickable: false,
      isFullscreen: false,
      isEnabled: true,
      isVisible: true,
      text: '',
      [REGISTRY_KEY]: null,
    };
  }

  isActive() {
    if (!this.$.isEnabled) {
      return false;
    }
    const bounds = this.getBoundingClientRect();
    const hasSize = bounds.width > 0 && bounds.height > 0;
    const isInViewport =
      bounds.top >= 0 &&
      bounds.left >= 0 &&
      bounds.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      bounds.right <= (window.innerWidth || document.documentElement.clientWidth);

    const style = window.getComputedStyle(this);
    const visible = style.visibility !== 'hidden' && style.display !== 'none';

    return hasSize && visible && isInViewport;
  }

  initCallback() {
    super.initCallback();

    this.bindL10n('text', () => this.l10n('drop-files-here'));

    if (!this.$[REGISTRY_KEY]) {
      this.$[REGISTRY_KEY] = new Set();
    }
    this.$[REGISTRY_KEY].add(this);

    this.defineAccessor(
      'disabled',
      /** @param {unknown} value */ (value) => {
        this.set$({ isEnabled: !asBoolean(value) });
      },
    );
    this.defineAccessor(
      'clickable',
      /** @param {unknown} value */ (value) => {
        this.set$({ isClickable: asBoolean(value) });
      },
    );
    this.defineAccessor(
      'with-icon',
      /** @param {unknown} value */ (value) => {
        this.set$({ withIcon: asBoolean(value) });
      },
    );
    this.defineAccessor(
      'fullscreen',
      /** @param {unknown} value */ (value) => {
        this.set$({ isFullscreen: asBoolean(value) });
      },
    );

    this.defineAccessor(
      'text',
      /** @param {unknown} value */ (value) => {
        if (typeof value === 'string') {
          this.bindL10n('text', () => this.l10n(value) || value);
        } else {
          this.bindL10n('text', () => this.l10n('drop-files-here'));
        }
      },
    );

    /** @private */
    this._destroyDropzone = addDropzone({
      element: this,
      shouldIgnore: () => this._shouldIgnore(),
      /** @param {DropzoneState} state */
      onChange: (state) => {
        this.$.state = state;
      },
      /** @param {import('./getDropItems.js').DropItem[]} items */
      onItems: (items) => {
        if (!items.length) {
          return;
        }

        for (const item of items) {
          if (item.type === 'url') {
            this.addFileFromUrl(item.url, { source: UploadSource.DROP_AREA });
          } else if (item.type === 'file') {
            this.addFileFromObject(item.file, { source: UploadSource.DROP_AREA, fullPath: item.fullPath });
          }
        }
        if (this.uploadCollection.size) {
          this.set$({
            '*currentActivity': ActivityBlock.activities.UPLOAD_LIST,
          });
          this.setOrAddState('*modalActive', true);
        }
      },
    });

    const contentWrapperEl = this.ref['content-wrapper'];
    if (contentWrapperEl) {
      this._destroyContentWrapperDropzone = addDropzone({
        element: contentWrapperEl,
        /** @param {DropzoneState} state */
        onChange: (state) => {
          const stateText = Object.entries(DropzoneState)
            .find(([, value]) => value === state)?.[0]
            .toLowerCase();
          stateText && contentWrapperEl.setAttribute('drag-state', stateText);
        },
        onItems: () => {},
        shouldIgnore: () => this._shouldIgnore(),
      });
    }

    this.sub('state', (state) => {
      const stateText = Object.entries(DropzoneState)
        .find(([, value]) => value === state)?.[0]
        .toLowerCase();
      if (stateText) {
        this.setAttribute('drag-state', stateText);
      }
    });

    this.subConfigValue('sourceList', (value) => {
      const list = stringToArray(value);
      // Enable drop area if local files are allowed
      this.$.isEnabled = list.includes(UploaderBlock.sourceTypes.LOCAL);
      // Show drop area if it's enabled or default slot is overrided
      this.$.isVisible = this.$.isEnabled || !this.querySelector('[data-default-slot]');
    });

    this.sub('isVisible', (value) => {
      this.toggleAttribute('hidden', !value);
    });

    this.sub('isClickable', (value) => {
      this.toggleAttribute('clickable', value);
    });

    if (this.$.isClickable) {
      /**
       * @private
       * @param {KeyboardEvent | Event} event
       */
      this._onAreaClicked = (event) => {
        if (event.type === 'keydown') {
          // @ts-ignore
          if (event.code === 'Space' || event.code === 'Enter') {
            this.openSystemDialog();
          }
        } else if (event.type === 'click') {
          this.openSystemDialog();
        }
      };

      this.addEventListener('keydown', this._onAreaClicked);
      this.addEventListener('click', this._onAreaClicked);
    }
  }

  /**
   * Ignore drop events if there are other visible drop areas on the page
   *
   * @private
   * @returns {Boolean}
   */
  _shouldIgnore() {
    if (!this.$.isEnabled) {
      return true;
    }
    if (!this._couldHandleFiles()) {
      return true;
    }
    if (!this.$.isFullscreen) {
      return false;
    }
    const otherTargets = [...this.$[REGISTRY_KEY]].filter((el) => el !== this);
    const activeTargets = otherTargets.filter((/** @type {typeof this} */ el) => {
      return el.isActive();
    });
    return activeTargets.length > 0;
  }

  /** @private */
  _couldHandleFiles() {
    const isMultiple = this.cfg.multiple;
    const multipleMax = this.cfg.multipleMax;
    const currentFilesCount = this.uploadCollection.size;

    if (isMultiple && multipleMax && currentFilesCount >= multipleMax) {
      return false;
    }

    if (!isMultiple && currentFilesCount > 0) {
      return false;
    }

    return true;
  }

  destroyCallback() {
    super.destroyCallback();

    /** @type {Set<DropArea>} */
    const registry = this.$[REGISTRY_KEY];
    if (registry) {
      registry.delete(this);
      if (registry.size === 0) {
        Data.deleteCtx(GLOBAL_CTX_NAME);
      }
    }

    this._destroyDropzone?.();
    this._destroyContentWrapperDropzone?.();
    if (this._onAreaClicked) {
      this.removeEventListener('keydown', this._onAreaClicked);
      this.removeEventListener('click', this._onAreaClicked);
    }
  }
}

DropArea.template = /* HTML */ `
  <slot>
    <div data-default-slot hidden></div>
    <div ref="content-wrapper" class="content-wrapper" set="@hidden: !isVisible">
      <div class="icon-container" set="@hidden: !withIcon">
        <lr-icon name="default"></lr-icon>
        <lr-icon name="arrow-down"></lr-icon>
      </div>
      <span class="text">{{text}}</span>
    </div>
  </slot>
`;

DropArea.bindAttributes({
  // @ts-expect-error TODO: fix types inside symbiote
  'with-icon': null,
  // @ts-expect-error TODO: fix types inside symbiote
  clickable: null,
  // @ts-expect-error TODO: fix types inside symbiote
  text: null,
  // @ts-expect-error TODO: fix types inside symbiote
  fullscreen: null,
  // @ts-expect-error TODO: fix types inside symbiote
  disabled: null,
});
