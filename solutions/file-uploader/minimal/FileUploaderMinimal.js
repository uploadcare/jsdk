import { html } from '@symbiotejs/symbiote';
import { ActivityBlock } from '../../../abstract/ActivityBlock.js';
import { SolutionBlock } from '../../../abstract/SolutionBlock.js';

export class FileUploaderMinimal extends SolutionBlock {
  static styleAttrs = [...super.styleAttrs, 'uc-file-uploader-minimal'];

  initCallback() {
    super.initCallback();

    /** @type {import('../../../abstract/UploaderBlock.js').UploaderBlock} */
    const uBlock = this.ref.uBlock;
    this.sub('*currentActivity', (val) => {
      if (!val) {
        this.$['*currentActivity'] = uBlock.initActivity || ActivityBlock.activities.START_FROM;
      }
    });

    this.sub('*uploadList', (list) => {
      if (list?.length > 0) {
        this.$['*currentActivity'] = ActivityBlock.activities.UPLOAD_LIST;
      } else {
        this.$['*currentActivity'] = uBlock.initActivity || ActivityBlock.activities.START_FROM;
      }
    });

    this.subConfigValue('sourceList', (sourceList) => {
      if (sourceList !== 'local') {
        this.cfg.sourceList = 'local';
      }
    });

    this.subConfigValue('confirmUpload', (confirmUpload) => {
      if (confirmUpload !== false) {
        this.cfg.confirmUpload = false;
      }
    });
  }
}

FileUploaderMinimal.template = html`
  <uc-start-from>
    <uc-drop-area tabindex="0" clickable l10n="choose-file"></uc-drop-area>
    <uc-copyright></uc-copyright>
  </uc-start-from>
  <uc-upload-list ref="uBlock"></uc-upload-list>
`;
