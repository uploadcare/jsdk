// @ts-check
import { DICT } from '../../symbiote.js';
import { ActivityBlock } from '../../abstract/ActivityBlock.js';
import { UploaderBlock } from '../../abstract/UploaderBlock.js';
import { CloudImageEditorBlock } from '../CloudImageEditor/index.js';

export class CloudImageEditorActivity extends UploaderBlock {
  couldBeCtxOwner = true;
  activityType = ActivityBlock.activities.CLOUD_IMG_EDIT;

  constructor() {
    super();

    this.init$ = {
      ...this.init$,
      cdnUrl: null,
    };
  }

  initCallback() {
    super.initCallback();

    this.registerActivity(this.activityType, {
      onActivate: () => this.mountEditor(),
      onDeactivate: () => this.unmountEditor(),
    });

    this.sub('*focusedEntry', (/** @type {import('../../abstract/TypedData.js').TypedData} */ entry) => {
      if (!entry) {
        return;
      }
      this.entry = entry;

      this.entry.subscribe('cdnUrl', (cdnUrl) => {
        if (cdnUrl) {
          this.$.cdnUrl = cdnUrl;
        }
      });
    });

    this.subConfigValue('cropPreset', (cropPreset) => {
      if (this._instance && this._instance.getAttribute('crop-preset') !== cropPreset) {
        this._instance.setAttribute('crop-preset', cropPreset);
      }
    });

    this.subConfigValue('cloudImageEditorTabs', (tabs) => {
      if (this._instance && this._instance.getAttribute('tabs') !== tabs) {
        this._instance.setAttribute('tabs', tabs);
      }
    });
  }

  /** @param {CustomEvent<import('../CloudImageEditor/src/types.js').ApplyResult>} e */
  handleApply(e) {
    if (!this.entry) {
      return;
    }
    let result = e.detail;
    this.entry.setMultipleValues({
      cdnUrl: result.cdnUrl,
      cdnUrlModifiers: result.cdnUrlModifiers,
    });
    this.historyBack();
  }

  handleCancel() {
    this.historyBack();
  }

  mountEditor() {
    const instance = new CloudImageEditorBlock();
    const cdnUrl = this.$.cdnUrl;
    const cropPreset = this.cfg.cropPreset;
    const tabs = this.cfg.cloudImageEditorTabs;

    instance.setAttribute(DICT.CTX_NAME_ATTR, this.ctxName);
    instance.setAttribute('cdn-url', cdnUrl);

    if (cropPreset) {
      instance.setAttribute('crop-preset', cropPreset);
    }
    if (tabs) {
      instance.setAttribute('tabs', tabs);
    }

    instance.addEventListener('apply', (e) => {
      const customEvent = /** @type {CustomEvent<import('../CloudImageEditor/src/types.js').ApplyResult>} */ (e);
      this.handleApply(customEvent);
      this.debugPrint(`editor event "apply"`, customEvent.detail);
    });
    instance.addEventListener('cancel', (e) => {
      const customEvent = /** @type {CustomEvent<void>} */ (e);
      this.handleCancel();
      this.debugPrint(`editor event "cancel"`, customEvent.detail);
    });
    instance.addEventListener('change', (e) => {
      const customEvent = /** @type {CustomEvent<import('../CloudImageEditor/src/types.js').ChangeResult>} */ (e);
      this.debugPrint(`editor event "change"`, customEvent.detail);
    });

    this.innerHTML = '';
    this.appendChild(instance);
    this._mounted = true;

    /** @private */
    this._instance = instance;
  }

  unmountEditor() {
    this._instance = undefined;
    this.innerHTML = '';
  }
}
