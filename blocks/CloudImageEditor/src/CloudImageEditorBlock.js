// @ts-check
import { Block } from '../../../abstract/Block.js';
import {
  createCdnUrl,
  createCdnUrlModifiers,
  createOriginalUrl,
  extractOperations,
  extractUuid,
} from '../../../utils/cdn-utils.js';
import { TRANSPARENT_PIXEL_SRC } from '../../../utils/transparentPixelSrc.js';
import { debounce } from '../../utils/debounce.js';
import { classNames } from './lib/classNames.js';
import { parseCropPreset } from './lib/parseCropPreset.js';
import { parseTabs } from './lib/parseTabs.js';
import { operationsToTransformations, transformationsToOperations } from './lib/transformationUtils.js';
import { initState } from './state.js';
import { TEMPLATE } from './template.js';
import { TabId } from './toolbar-constants.js';

export class CloudImageEditorBlock extends Block {
  ctxOwner = true;
  static styleAttrs = ['lr-cloud-image-editor'];

  constructor() {
    super();

    this.init$ = {
      ...this.init$,
      ...initState(this),
    };
  }

  /** @private */
  _debouncedShowLoader = debounce(this._showLoader.bind(this), 300);

  /**
   * @private
   * @param {boolean} show
   */
  _showLoader(show) {
    this.$.showLoader = show;
  }

  /**
   * To proper work, we need non-zero size the element. So, we'll wait for it.
   *
   * @private
   * @returns {Promise<void>}
   */
  _waitForSize() {
    const TIMEOUT = 3000;
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('[cloud-image-editor] timeout waiting for non-zero container size'));
      }, TIMEOUT);
      const resizeObserver = new ResizeObserver(([element]) => {
        if (element.contentRect.width > 0 && element.contentRect.height > 0) {
          resolve();
          clearTimeout(timeoutId);
          resizeObserver.disconnect();
        }
      });
      resizeObserver.observe(this);
    });
  }

  initCallback() {
    super.initCallback();

    this.$['*faderEl'] = this.ref['fader-el'];
    this.$['*cropperEl'] = this.ref['cropper-el'];
    this.$['*imgContainerEl'] = this.ref['img-container-el'];

    this.initEditor();
  }

  async updateImage() {
    if (!this.isConnected) {
      return;
    }
    await this._waitForSize();

    if (this.$.cdnUrl) {
      const uuid = extractUuid(this.$.cdnUrl);
      const originalUrl = createOriginalUrl(this.$.cdnUrl, uuid);
      if (originalUrl === this.$['*originalUrl']) {
        return;
      }
      this.$['*originalUrl'] = originalUrl;
      const operations = extractOperations(this.$.cdnUrl);
      const transformations = operationsToTransformations(operations);
      this.$['*editorTransformations'] = transformations;
    } else if (this.$.uuid) {
      const originalUrl = createOriginalUrl(this.cfg.cdnCname, this.$.uuid);
      if (originalUrl === this.$['*originalUrl']) {
        return;
      }
      this.$['*originalUrl'] = originalUrl;
      this.$['*editorTransformations'] = {};
    } else {
      throw new Error('No UUID nor CDN URL provided');
    }

    if (this.$['*tabId'] === TabId.CROP) {
      this.$['*cropperEl'].deactivate({ reset: true });
    } else {
      this.$['*faderEl'].deactivate();
    }

    try {
      const cdnUrl = createCdnUrl(this.$['*originalUrl'], createCdnUrlModifiers('json'));
      const json = await fetch(cdnUrl).then((response) => response.json());

      const { width, height } = /** @type {{ width: number; height: number }} */ (json);
      this.$['*imageSize'] = { width, height };

      if (this.$['*tabId'] === TabId.CROP) {
        this.$['*cropperEl'].activate(this.$['*imageSize']);
      } else {
        this.$['*faderEl'].activate({ url: this.$['*originalUrl'] });
      }
    } catch (err) {
      if (err) {
        console.error('Failed to load image info', err);
      }
    }
  }

  async initEditor() {
    try {
      await this._waitForSize();
    } catch (err) {
      if (this.isConnected) {
        // @ts-ignore TODO: fix this
        console.error(err.message);
      }
      return;
    }

    this.ref['img-el'].addEventListener('load', () => {
      this._imgLoading = false;
      this._debouncedShowLoader(false);

      if (this.$.src !== TRANSPARENT_PIXEL_SRC) {
        this.$['*networkProblems'] = false;
      }
    });

    this.ref['img-el'].addEventListener('error', () => {
      this._imgLoading = false;
      this._debouncedShowLoader(false);

      this.$['*networkProblems'] = true;
    });

    this.sub('src', (src) => {
      const el = this.ref['img-el'];
      if (el.src !== src) {
        this._imgLoading = true;
        el.src = src || TRANSPARENT_PIXEL_SRC;
      }
    });

    this.sub('cropPreset', (val) => {
      this.$['*cropPresetList'] = parseCropPreset(val);
    });

    this.sub(
      'tabs',
      /** @param {string} val */ (val) => {
        this.$['*tabList'] = parseTabs(val);
      },
    );

    this.sub('*tabId', (tabId) => {
      this.ref['img-el'].className = classNames('image', {
        image_hidden_to_cropper: tabId === TabId.CROP,
        image_hidden_effects: tabId !== TabId.CROP,
      });
    });

    this.classList.add('editor_ON');

    this.sub('*networkProblems', (networkProblems) => {
      this.$['presence.networkProblems'] = networkProblems;
      this.$['presence.modalCaption'] = !networkProblems;
    });

    this.sub(
      '*editorTransformations',
      (transformations) => {
        if (Object.keys(transformations).length === 0) {
          return;
        }
        const originalUrl = this.$['*originalUrl'];
        const cdnUrlModifiers = createCdnUrlModifiers(transformationsToOperations(transformations), 'preview');
        const cdnUrl = createCdnUrl(originalUrl, cdnUrlModifiers);

        /** @type {import('./types.js').ApplyResult} */
        const eventData = {
          originalUrl,
          cdnUrlModifiers,
          cdnUrl,
          transformations,
        };
        this.dispatchEvent(
          new CustomEvent('change', {
            detail: eventData,
            bubbles: true,
            composed: true,
          }),
        );
      },
      false,
    );

    this.sub('uuid', (val) => val && this.updateImage());
    this.sub('cdnUrl', (val) => val && this.updateImage());
  }
}

CloudImageEditorBlock.template = TEMPLATE;
CloudImageEditorBlock.bindAttributes({
  uuid: 'uuid',
  'cdn-url': 'cdnUrl',
  'crop-preset': 'cropPreset',
  tabs: 'tabs',
});
