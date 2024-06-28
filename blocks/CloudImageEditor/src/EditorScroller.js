import { Block } from '../../../abstract/Block.js';

const X_THRESHOLD = 1;

export class EditorScroller extends Block {
  initCallback() {
    super.initCallback();

    this.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();

        const { deltaY, deltaX } = e;
        if (Math.abs(deltaX) > X_THRESHOLD) {
          this.scrollLeft += deltaX;
        } else {
          this.scrollLeft += deltaY;
        }
      },
      {
        passive: false,
      },
    );

    // This fixes some strange bug on MacOS - wheel event doesn't fire for physical mouse wheel if no scroll event attached also
    this.addEventListener('scroll', () => {}, {
      passive: true,
    });
  }
}

// biome-ignore lint/style/noUnusedTemplateLiteral: This is HTML template
EditorScroller.template = /* HTML */ `<slot></slot>`;
