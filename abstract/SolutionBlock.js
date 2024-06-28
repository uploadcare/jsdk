import svgIconsSprite from '../blocks/themes/lr-basic/svg-sprite.js';
import { Block } from './Block.js';
import { uploaderBlockCtx } from './CTX.js';

export class SolutionBlock extends Block {
  static styleAttrs = ['lr-wgt-common'];
  requireCtxName = true;
  init$ = uploaderBlockCtx(this);
  _template = null;

  initCallback() {
    super.initCallback();
    this.a11y?.registerBlock(this);
  }

  static set template(value) {
    SolutionBlock._template = /* HTML */ `${svgIconsSprite + value}<slot></slot>`;
  }

  static get template() {
    return SolutionBlock._template;
  }
}
