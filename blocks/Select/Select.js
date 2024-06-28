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
          return opt.value === this.value;
        })?.text || '';
      this.dispatchEvent(new Event('change'));
    },
  };

  initCallback() {
    super.initCallback();

    this.sub('options', (/** @type {{ text: String; value: String }[]} */ options) => {
      this.$.currentText = options?.[0]?.text || '';
      let html = '';
      if (options) {
        for (const opt of options) {
          html += /* HTML */ `<option value="${opt.value}">${opt.text}</option>`;
        }
      }
      this.$.selectHtml = html;
    });
  }
}

Select.template = /* HTML */ ` <select ref="select" set="innerHTML: selectHtml; onchange: onSelect"></select> `;
