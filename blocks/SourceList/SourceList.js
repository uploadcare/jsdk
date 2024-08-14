import { Block } from '../../abstract/Block.js';
import { stringToArray } from '../../utils/stringToArray.js';
import { html } from '../../symbiote.js';

export class SourceList extends Block {
  initCallback() {
    super.initCallback();
    this.subConfigValue('sourceList', (/** @type {String} */ val) => {
      let list = stringToArray(val);
      let htmlContent = '';
      list.forEach((srcName) => {
        htmlContent += html`<uc-source-btn type="${srcName}"></uc-source-btn>`;
      });
      if (this.cfg.sourceListWrap) {
        this.innerHTML = htmlContent;
      } else {
        this.outerHTML = htmlContent;
      }
    });
  }
}
