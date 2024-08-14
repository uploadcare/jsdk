// @ts-check
import { html } from '../../symbiote.js';
import { Block } from '../../abstract/Block.js';

export class Icon extends Block {
  constructor() {
    super();

    this.init$ = {
      ...this.init$,
      name: '',
      href: '',
    };
  }

  initCallback() {
    super.initCallback();
    this.sub('name', (val) => {
      if (!val) {
        return;
      }
      let iconHref = `#uc-icon-${val}`;
      this.subConfigValue('iconHrefResolver', (iconHrefResolver) => {
        if (iconHrefResolver) {
          const customIconHref = iconHrefResolver(val);
          iconHref = customIconHref ?? iconHref;
        }
        this.$.href = iconHref;
      });
    });
  }
}

Icon.template = html`
  <svg ref="svg" xmlns="http://www.w3.org/2000/svg">
    <use set="@href: href;"></use>
  </svg>
`;

Icon.bindAttributes({
  name: 'name',
});
