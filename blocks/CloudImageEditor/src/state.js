// @ts-check

import { createCdnUrl, createCdnUrlModifiers } from '../../../utils/cdn-utils.js';
import { TRANSPARENT_PIXEL_SRC } from '../../../utils/transparentPixelSrc.js';
import { serializeCsv } from '../../utils/comma-separated.js';
import { transformationsToOperations } from './lib/transformationUtils.js';
import { ALL_TABS, TabId } from './toolbar-constants.js';

/** @param {import('./CloudImageEditorBlock.js').CloudImageEditorBlock} fnCtx */
export function initState(fnCtx) {
  return {
    '*originalUrl': null,
    '*faderEl': null,
    '*cropperEl': null,
    '*imgEl': null,
    '*imgContainerEl': null,
    '*networkProblems': false,
    '*imageSize': null,
    /** @type {import('./types.js').Transformations} */
    '*editorTransformations': {},
    /** @type {import('./types.js').CropPresetList} */
    '*cropPresetList': [],
    '*tabList': ALL_TABS,
    '*tabId': TabId.CROP,

    entry: null,
    extension: null,
    editorMode: false,
    modalCaption: '',
    isImage: false,
    msg: '',
    src: TRANSPARENT_PIXEL_SRC,
    fileType: '',
    showLoader: false,

    // options
    uuid: null,
    cdnUrl: null,
    cropPreset: '',
    tabs: serializeCsv(ALL_TABS),

    'presence.networkProblems': false,
    'presence.modalCaption': true,
    'presence.editorToolbar': false,
    'presence.viewerToolbar': true,
    // TODO: beware of wrong ctx in case of element re-creation:
    '*on.retryNetwork': () => {
      const images = fnCtx.querySelectorAll('img');
      for (const img of images) {
        const originalSrc = img.src;
        img.src = TRANSPARENT_PIXEL_SRC;
        img.src = originalSrc;
      }
      fnCtx.$['*networkProblems'] = false;
    },
    /** @param {import('./types.js').Transformations} transformations */
    '*on.apply': (transformations) => {
      if (!transformations) {
        return;
      }
      const originalUrl = fnCtx.$['*originalUrl'];
      const cdnUrlModifiers = createCdnUrlModifiers(transformationsToOperations(transformations), 'preview');
      const cdnUrl = createCdnUrl(originalUrl, cdnUrlModifiers);

      /** @type {import('./types.js').ApplyResult} */
      const eventData = {
        originalUrl,
        cdnUrlModifiers,
        cdnUrl,
        transformations,
      };
      fnCtx.dispatchEvent(
        new CustomEvent('apply', {
          detail: eventData,
          bubbles: true,
          composed: true,
        }),
      );
      fnCtx.remove();
    },
    '*on.cancel': () => {
      fnCtx.remove();

      fnCtx.dispatchEvent(
        new CustomEvent('cancel', {
          bubbles: true,
          composed: true,
        }),
      );
    },
  };
}
