// @ts-check
import { Block } from '../../../abstract/Block.js';
import {
  clamp,
  constraintRect,
  cornerPath,
  createSvgNode,
  moveRect,
  rectContainsPoint,
  resizeRect,
  roundRect,
  setSvgNodeAttrs,
  sidePath,
  thumbCursor,
} from './crop-utils.js';
import {
  GUIDE_STROKE_WIDTH,
  GUIDE_THIRD,
  MAX_INTERACTION_SIZE,
  MIN_CROP_SIZE,
  MIN_INTERACTION_SIZE,
  THUMB_CORNER_SIZE,
  THUMB_SIDE_SIZE,
  THUMB_STROKE_WIDTH,
} from './cropper-constants.js';
import { classNames } from './lib/classNames.js';

export class CropFrame extends Block {
  constructor() {
    super();

    this.init$ = {
      ...this.init$,
      dragging: false,
    };

    /** @private */
    this._handlePointerUp = this._handlePointerUp_.bind(this);

    /** @private */
    this._handlePointerMove = this._handlePointerMove_.bind(this);

    /** @private */
    this._handleSvgPointerMove = this._handleSvgPointerMove_.bind(this);
  }

  /**
   * @private
   * @param {import('./types.js').Direction} direction
   */
  _shouldThumbBeDisabled(direction) {
    let imageBox = this.$['*imageBox'];
    if (!imageBox) {
      return;
    }

    if (direction === '' && imageBox.height <= MIN_CROP_SIZE && imageBox.width <= MIN_CROP_SIZE) {
      return true;
    }

    let tooHigh = imageBox.height <= MIN_CROP_SIZE && (direction.includes('n') || direction.includes('s'));
    let tooWide = imageBox.width <= MIN_CROP_SIZE && (direction.includes('e') || direction.includes('w'));
    return tooHigh || tooWide;
  }

  /** @private */
  _createBackdrop() {
    /** @type {import('./types.js').Rectangle} */
    let cropBox = this.$['*cropBox'];
    if (!cropBox) {
      return;
    }
    let { x, y, width, height } = cropBox;
    let svg = this.ref['svg-el'];

    let mask = createSvgNode('mask', { id: 'backdrop-mask' });
    let maskRectOuter = createSvgNode('rect', {
      x: 0,
      y: 0,
      width: '100%',
      height: '100%',
      fill: 'white',
    });
    let maskRectInner = createSvgNode('rect', {
      x,
      y,
      width,
      height,
      fill: 'black',
    });
    mask.appendChild(maskRectOuter);
    mask.appendChild(maskRectInner);

    let backdropRect = createSvgNode('rect', {
      x: 0,
      y: 0,
      width: '100%',
      height: '100%',
      fill: 'var(--color-image-background)',
      'fill-opacity': 0.85,
      mask: 'url(#backdrop-mask)',
    });
    svg.appendChild(backdropRect);
    svg.appendChild(mask);

    this._backdropMask = mask;
    this._backdropMaskInner = maskRectInner;
  }

  /**
   * @private Super Tricky workaround for the chromium bug See
   *   https://bugs.chromium.org/p/chromium/issues/detail?id=330815
   */
  _resizeBackdrop() {
    if (!this._backdropMask) {
      return;
    }
    this._backdropMask.style.display = 'none';
    window.requestAnimationFrame(() => {
      if (this._backdropMask) {
        this._backdropMask.style.display = 'block';
      }
    });
  }

  /** @private */
  _updateBackdrop() {
    /** @type {import('./types.js').Rectangle} */
    let cropBox = this.$['*cropBox'];
    if (!cropBox) {
      return;
    }
    let { x, y, width, height } = cropBox;

    this._backdropMaskInner && setSvgNodeAttrs(this._backdropMaskInner, { x, y, width, height });
  }

  /** @private */
  _updateFrame() {
    /** @type {import('./types.js').Rectangle} */
    let cropBox = this.$['*cropBox'];

    if (!cropBox || !this._frameGuides || !this._frameThumbs) {
      return;
    }
    for (let thumb of Object.values(this._frameThumbs)) {
      let { direction, pathNode, interactionNode, groupNode } = thumb;
      let isCenter = direction === '';
      let isCorner = direction.length === 2;
      let { x, y, width, height } = cropBox;

      if (isCenter) {
        const moveThumbRect = {
          x,
          y,
          width,
          height,
        };
        setSvgNodeAttrs(interactionNode, moveThumbRect);
      } else {
        const thumbSizeMultiplier = clamp(
          Math.min(width, height) / (THUMB_CORNER_SIZE * 2 + THUMB_SIDE_SIZE) / 2,
          0,
          1,
        );

        let { d, center } = isCorner
          ? cornerPath(cropBox, direction, thumbSizeMultiplier)
          : sidePath(
              cropBox,
              /** @type {Extract<import('./types.js').Direction, 'n' | 's' | 'w' | 'e'>} */ (direction),
              thumbSizeMultiplier,
            );
        const size = Math.max(
          MAX_INTERACTION_SIZE * clamp(Math.min(width, height) / MAX_INTERACTION_SIZE / 3, 0, 1),
          MIN_INTERACTION_SIZE,
        );
        setSvgNodeAttrs(interactionNode, {
          x: center[0] - size,
          y: center[1] - size,
          width: size * 2,
          height: size * 2,
        });
        setSvgNodeAttrs(pathNode, { d });
      }

      let disableThumb = this._shouldThumbBeDisabled(direction);
      groupNode.setAttribute(
        'class',
        classNames('uc-thumb', {
          'uc-thumb--hidden': disableThumb,
          'uc-thumb--visible': !disableThumb,
        }),
      );
    }

    setSvgNodeAttrs(this._frameGuides, {
      x: cropBox.x - GUIDE_STROKE_WIDTH * 0.5,
      y: cropBox.y - GUIDE_STROKE_WIDTH * 0.5,
      width: cropBox.width + GUIDE_STROKE_WIDTH,
      height: cropBox.height + GUIDE_STROKE_WIDTH,
    });
  }

  /**
   * @param {import('./types.js').FrameThumbs} frameThumbs
   * @param {import('./types.js').Direction} direction
   */
  _createThumb(frameThumbs, direction) {
    let groupNode = createSvgNode('g');
    groupNode.classList.add('uc-thumb');
    groupNode.setAttribute('with-effects', '');
    let interactionNode = createSvgNode('rect', {
      fill: 'transparent',
    });
    let pathNode = createSvgNode('path', {
      stroke: 'currentColor',
      fill: 'none',
      'stroke-width': THUMB_STROKE_WIDTH,
    });
    groupNode.appendChild(pathNode);
    groupNode.appendChild(interactionNode);
    frameThumbs[direction] = {
      direction,
      pathNode,
      interactionNode,
      groupNode,
    };

    if (direction === '') {
      groupNode.style.cursor = 'move';
    }

    interactionNode.addEventListener('pointerdown', this._handlePointerDown.bind(this, direction));
  }

  /** @private */
  _createThumbs() {
    /** @type {import('./types.js').FrameThumbs} */
    const frameThumbs = {};

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let direction = /** @type {import('./types.js').Direction} */ (`${['n', '', 's'][i]}${['w', '', 'e'][j]}`);
        if (direction === '') {
          continue;
        }

        this._createThumb(frameThumbs, direction);
      }
    }

    this._createThumb(frameThumbs, '');
    return frameThumbs;
  }

  /** @private */
  _createGuides() {
    let svg = createSvgNode('svg');

    let rect = createSvgNode('rect', {
      x: 0,
      y: 0,
      width: '100%',
      height: '100%',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': GUIDE_STROKE_WIDTH,
      'stroke-opacity': 0.5,
    });
    svg.appendChild(rect);

    for (let i = 1; i <= 2; i++) {
      let line = createSvgNode('line', {
        x1: `${GUIDE_THIRD * i}%`,
        y1: `0%`,
        x2: `${GUIDE_THIRD * i}%`,
        y2: `100%`,
        stroke: 'currentColor',
        'stroke-width': GUIDE_STROKE_WIDTH,
        'stroke-opacity': 0.3,
      });
      svg.appendChild(line);
    }

    for (let i = 1; i <= 2; i++) {
      let line = createSvgNode('line', {
        x1: `0%`,
        y1: `${GUIDE_THIRD * i}%`,
        x2: `100%`,
        y2: `${GUIDE_THIRD * i}%`,
        stroke: 'currentColor',
        'stroke-width': GUIDE_STROKE_WIDTH,
        'stroke-opacity': 0.3,
      });
      svg.appendChild(line);
    }

    svg.classList.add('uc-guides', 'uc-guides--semi-hidden');

    return svg;
  }

  /** @private */
  _createFrame() {
    let svg = this.ref['svg-el'];
    let fr = document.createDocumentFragment();

    let frameGuides = this._createGuides();
    fr.appendChild(frameGuides);

    let frameThumbs = this._createThumbs();
    for (let { groupNode } of Object.values(frameThumbs)) {
      fr.appendChild(groupNode);
    }

    svg.appendChild(fr);
    this._frameThumbs = frameThumbs;
    this._frameGuides = frameGuides;
  }

  /**
   * @private
   * @param {import('./types.js').Direction} direction
   * @param {PointerEvent} e
   */
  _handlePointerDown(direction, e) {
    if (!this._frameThumbs) return;
    let thumb = this._frameThumbs[direction];
    if (this._shouldThumbBeDisabled(direction)) {
      return;
    }

    let cropBox = this.$['*cropBox'];
    let { x: svgX, y: svgY } = this.ref['svg-el'].getBoundingClientRect();
    let x = e.x - svgX;
    let y = e.y - svgY;

    this.$.dragging = true;
    this._draggingThumb = thumb;
    this._dragStartPoint = [x, y];
    /** @type {import('./types.js').Rectangle} */
    this._dragStartCrop = { ...cropBox };
  }

  /**
   * @private
   * @param {PointerEvent} e
   */
  _handlePointerUp_(e) {
    this._updateCursor();

    if (!this.$.dragging) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();

    this.$.dragging = false;
  }

  /**
   * @private
   * @param {PointerEvent} e
   */
  _handlePointerMove_(e) {
    if (!this.$.dragging || !this._dragStartPoint || !this._draggingThumb) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();

    let svg = this.ref['svg-el'];
    let { x: svgX, y: svgY } = svg.getBoundingClientRect();
    let x = e.x - svgX;
    let y = e.y - svgY;
    let dx = x - this._dragStartPoint[0];
    let dy = y - this._dragStartPoint[1];
    let { direction } = this._draggingThumb;

    const movedCropBox = this._calcCropBox(direction, [dx, dy]);
    if (movedCropBox) {
      this.$['*cropBox'] = movedCropBox;
    }
  }

  /**
   * @private
   * @param {import('./types.js').Direction} direction
   * @param {[Number, Number]} delta
   */
  _calcCropBox(direction, delta) {
    const [dx, dy] = delta;
    /** @type {import('./types.js').Rectangle} */
    let imageBox = this.$['*imageBox'];
    let rect = /** @type {import('./types.js').Rectangle} */ (this._dragStartCrop) ?? this.$['*cropBox'];
    /** @type {import('./types.js').CropPresetList[0]} */
    const cropPreset = this.$['*cropPresetList']?.[0];
    const aspectRatio = cropPreset ? cropPreset.width / cropPreset.height : undefined;

    if (direction === '') {
      rect = moveRect({ rect, delta: [dx, dy], imageBox });
    } else {
      rect = resizeRect({ rect, delta: [dx, dy], direction, aspectRatio, imageBox });
    }

    if (!Object.values(rect).every((number) => Number.isFinite(number) && number >= 0)) {
      console.error('CropFrame is trying to create invalid rectangle', {
        payload: rect,
      });
      return;
    }
    return constraintRect(roundRect(rect), this.$['*imageBox']);
  }

  /**
   * @private
   * @param {PointerEvent} e
   */
  _handleSvgPointerMove_(e) {
    if (!this._frameThumbs) return;

    let hoverThumb = Object.values(this._frameThumbs).find((thumb) => {
      if (this._shouldThumbBeDisabled(thumb.direction)) {
        return false;
      }
      let node = thumb.interactionNode;
      let bounds = node.getBoundingClientRect();
      let rect = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      };
      let hover = rectContainsPoint(rect, [e.x, e.y]);
      return hover;
    });

    this._hoverThumb = hoverThumb;
    this._updateCursor();
  }

  /** @private */
  _updateCursor() {
    let hoverThumb = this._hoverThumb;
    this.ref['svg-el'].style.cursor = hoverThumb ? thumbCursor(hoverThumb.direction) : 'initial';
  }

  /**
   * @private
   * @param {String} href
   */
  _createMask(href) {
    if (this._frameImage) {
      this._frameImage.setAttribute('href', href);
      return;
    }

    let svg = this.ref['svg-el'];
    let fr = document.createDocumentFragment();

    let imageNode = createSvgNode('image', {
      href,
    });

    imageNode.setAttribute('class', 'uc-cloud-mask');

    fr.appendChild(imageNode);

    svg.appendChild(fr);

    this._frameImage = imageNode;
  }

  _updateMask() {
    let cropBox = this.$['*cropBox'];

    if (!cropBox || !this._frameImage) {
      return;
    }

    let { x, y, width, height } = cropBox;

    setSvgNodeAttrs(this._frameImage, {
      x,
      y,
      height,
      width,
    });
  }

  /** @private */
  _render() {
    this._updateBackdrop();
    this._updateFrame();
    this._updateMask();
  }

  /** @param {boolean} visible */
  toggleThumbs(visible) {
    if (!this._frameThumbs) return;
    Object.values(this._frameThumbs)
      .map(({ groupNode }) => groupNode)
      .forEach((groupNode) => {
        groupNode.setAttribute(
          'class',
          classNames('uc-thumb', {
            'uc-thumb--hidden': !visible,
            'uc-thumb--visible': visible,
          }),
        );
      });
  }

  initCallback() {
    super.initCallback();

    this._createBackdrop();
    this._createFrame();

    this.sub('*imageBox', () => {
      this._resizeBackdrop();
      window.requestAnimationFrame(() => {
        this._render();
      });
    });

    this.sub('*cropBox', (cropBox) => {
      if (!cropBox) {
        return;
      }
      this._guidesHidden = cropBox.height <= MIN_CROP_SIZE || cropBox.width <= MIN_CROP_SIZE;
      window.requestAnimationFrame(() => {
        this._render();
      });
    });

    this.subConfigValue('cloudImageEditorMaskHref', (maskHref) => {
      if (maskHref) {
        this._createMask(maskHref);
      }
    });

    this.sub('dragging', (dragging) => {
      if (!this._frameGuides) return;
      this._frameGuides.setAttribute(
        'class',
        classNames({
          'uc-guides--hidden': this._guidesHidden,
          'uc-guides--visible': !this._guidesHidden && dragging,
          'uc-guides--semi-hidden': !this._guidesHidden && !dragging,
        }),
      );
    });

    this.ref['svg-el'].addEventListener('pointermove', this._handleSvgPointerMove, true);
    document.addEventListener('pointermove', this._handlePointerMove, true);
    document.addEventListener('pointerup', this._handlePointerUp, true);
  }

  destroyCallback() {
    super.destroyCallback();

    document.removeEventListener('pointermove', this._handlePointerMove);
    document.removeEventListener('pointerup', this._handlePointerUp);
  }
}

CropFrame.template = /* HTML */ ` <svg class="uc-svg" ref="svg-el" xmlns="http://www.w3.org/2000/svg"></svg> `;
