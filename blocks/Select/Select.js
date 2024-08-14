import { html } from '../../symbiote.js';
import { Block } from '../../abstract/Block.js';

export class Select extends Block {
  init$ = {
    ...this.init$,
    currentText: '',
    options: [],
    selectHtml: '',
    onSelect: (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.value = this.ref.select.value;
      this.$.currentText =
        this.$.options.find((opt) => {
          return opt.value == this.value;
        })?.text || '';
      this.dispatchEvent(new Event('change'));
    },
  };

  initCallback() {
    super.initCallback();

    this.defineAccessor(
      'options',
      /** @param {{ text: String; value: String }[]} options */
      (options) => {
        this.$.currentText = options?.[0]?.text || '';
        let htmlCode = '';
        options?.forEach((opt) => {
          htmlCode += html`<option value="${opt.value}">${opt.text}</option>`;
        });
        this.$.selectHtml = htmlCode;
      },
    );
  }
}

Select.template = html` <select ref="select" set="innerHTML: selectHtml; onchange: onSelect"></select> `;
