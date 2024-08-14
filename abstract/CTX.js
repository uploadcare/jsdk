// @ts-check
import { Queue } from '@uploadcare/upload-client';

export const blockCtx = () => ({});

/** @param {import('./Block').Block} fnCtx */
export const activityBlockCtx = (fnCtx) => ({
  ...blockCtx(),
  '*currentActivity': null,
  '*currentActivityParams': {},
  '*history': [],
  '*historyBack': null,
  '*closeModal': () => {
    fnCtx.set$({
      '*currentActivity': null,
      '*modalActive': false,
    });
  },
});

/** @param {import('./Block').Block} fnCtx */
export const uploaderBlockCtx = (fnCtx) => ({
  ...activityBlockCtx(fnCtx),
  '*commonProgress': 0,
  '*uploadList': [],
  '*focusedEntry': null,
  '*uploadQueue': new Queue(1),
  /** @type {import('../types').OutputErrorCollection[]} */
  '*collectionErrors': [],
  /** @type {import('../types').OutputCollectionState | null} */
  '*collectionState': null,
  /** @type {import('@uploadcare/upload-client').UploadcareGroup | null} */
  '*groupInfo': null,
  /** @type {Set<string>} */
  '*uploadTrigger': new Set(),
  /** @type {import('./SecureUploadsManager.js').SecureUploadsManager | null} */
  '*secureUploadsManager': null,
});
