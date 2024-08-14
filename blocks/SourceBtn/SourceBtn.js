// @ts-check
import { html } from '../../symbiote.js';
import { ActivityBlock } from '../../abstract/ActivityBlock.js';
import { UploaderBlock } from '../../abstract/UploaderBlock.js';

const L10N_PREFIX = 'src-type-';

/**
 * @typedef {{
 *   type: string;
 *   activity?: string;
 *   textKey?: string;
 *   icon?: string;
 *   activate?: () => boolean;
 *   activityParams?: Record<string, unknown>;
 * }} TConfig
 */

export class SourceBtn extends UploaderBlock {
  couldBeCtxOwner = true;
  /** @type {string | undefined} */
  type = undefined;
  /**
   * @private
   * @type {Record<string, TConfig>}
   */
  _registeredTypes = {};

  constructor() {
    super();

    this.init$ = {
      ...this.init$,
      iconName: 'default',
      'src-type': '',
    };
  }

  initTypes() {
    this.registerType({
      type: UploaderBlock.sourceTypes.LOCAL,
      activate: () => {
        this.api.openSystemDialog();
        return false;
      },
    });
    this.registerType({
      type: UploaderBlock.sourceTypes.URL,
      activity: ActivityBlock.activities.URL,
      textKey: 'from-url',
    });
    this.registerType({
      type: UploaderBlock.sourceTypes.CAMERA,
      activity: ActivityBlock.activities.CAMERA,
      activate: () => {
        const supportsCapture = 'capture' in document.createElement('input');
        if (supportsCapture) {
          this.api.openSystemDialog({ captureCamera: true });
        }
        return !supportsCapture;
      },
    });
    this.registerType({
      type: 'draw',
      activity: ActivityBlock.activities.DRAW,
      icon: 'edit-draw',
    });

    for (let externalSourceType of Object.values(UploaderBlock.extSrcList)) {
      this.registerType({
        type: externalSourceType,
        activity: ActivityBlock.activities.EXTERNAL,
        activityParams: {
          externalSourceType: externalSourceType,
        },
      });
    }
  }

  initCallback() {
    super.initCallback();
    this.initTypes();

    this.defineAccessor(
      'type',
      /** @param {string} val */
      (val) => {
        if (!val) {
          return;
        }
        this.applyType(val);
      },
    );
  }

  /** @param {TConfig} typeConfig */
  registerType(typeConfig) {
    this._registeredTypes[typeConfig.type] = typeConfig;
  }

  /** @param {string} type */
  getType(type) {
    return this._registeredTypes[type];
  }

  activate() {
    if (!this.type) {
      return;
    }
    const configType = this._registeredTypes[this.type];
    const { activity, activate, activityParams = {} } = configType;
    const showActivity = activate ? activate() : !!activity;
    showActivity &&
      this.set$({
        '*currentActivityParams': activityParams,
        '*currentActivity': activity,
      });
  }

  /** @param {string} type */
  applyType(type) {
    const configType = this._registeredTypes[type];
    if (!configType) {
      console.warn('Unsupported source type: ' + type);
      return;
    }
    const { textKey = type, icon = type } = configType;

    this.$['src-type'] = `${L10N_PREFIX}${textKey}`;
    this.$.iconName = icon;
    this.onclick = () => {
      this.activate();
    };
  }
}
SourceBtn.template = html`
  <button type="button">
    <uc-icon set="@name: iconName"></uc-icon>
    <div class="uc-txt" l10n="src-type"></div>
  </button>
`;
SourceBtn.bindAttributes({
  // @ts-expect-error symbiote types bug
  type: null,
});
