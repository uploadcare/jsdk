import { html } from '../../symbiote.js';
import { Block } from '../../abstract/Block.js';

export class Copyright extends Block {
  initCallback() {
    super.initCallback();

    this.subConfigValue(
      'removeCopyright',
      /** @param {number} value */
      (value) => {
        this.toggleAttribute('hidden', !!value);
      },
    );
  }

  static template = html`
    <a
      href="https://uploadcare.com/?utm_source=copyright&utm_medium=referral&utm_campaign=v4"
      target="_blank noopener"
      class="uc-credits"
      >Powered by Uploadcare</a
    >
  `;
}
