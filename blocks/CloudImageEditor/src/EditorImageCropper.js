// @ts-check

import { Block } from '../../../abstract/Block.js';
import { debounce } from '../../utils/debounce.js';
import { throttle } from '../../utils/throttle.js';
import {
  clamp,
  constraintRect,
  isRectInsideRect,
  isRectMatchesAspectRatio,
  rotateSize,
  roundRect,
} from './crop-utils.js';
import { CROP_PADDING } from './cropper-constants.js';
import { classNames } from './lib/classNames.js';
import { pick } from './lib/pick.js';
import { preloadImage } from './lib/preloadImage.js';
import { viewerImageSrc } from './util.js';

/**
 * @typedef {Object} Operations
 * @property {boolean} flip
 * @property {boolean} mirror
 * @property {Number} rotate
 */

/**
 * @param {import('./types.js').Transformations['crop']} crop
 * @returns {boolean}
 */
function validateCrop(crop) {
  if (!crop) {
    return true;
  }
  /** @type {((arg: NonNullable<typeof crop>) => boolean)[]} */
  const shouldMatch = [
    ({ dimensions, coords }) =>
      [...dimensions, ...coords].every((number) => Number.isInteger(number) && Number.isFinite(number)),
    ({ dimensions, coords }) => dimensions.every((d) => d > 0) && coords.every((c) => c >= 0),
  ];
  return shouldMatch.every((matcher) => matcher(crop));
}

export class EditorImageCropper extends Block {
  ctxOwner = true;
  constructor() {
    super();

    this.init$ = {
      ...this.init$,
      image: null,
      '*padding': CROP_PADDING,
      /** @type {Operations} */
      '*operations': {
        rotate: 0,
        mirror: false,
        flip: false,
      },
      /** @type {import('./types.js').Rectangle} */
      '*imageBox': {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
      /** @type {import('./types.js').Rectangle} */
      '*cropBox': {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
    };

    /** @private */
    this._commitDebounced = debounce(this._commit.bind(this), 300);

    /** @private */
    this._handleResizeThrottled = throttle(this._handleResize.bind(this), 100);

    this._imageSize = { width: 0, height: 0 };
  }

  /** @private */
  _handleResize() {
    if (!this.isConnected || !this._isActive) {
      return;
    }
    this._initCanvas();
    this._syncTransformations();
    this._alignImage();
    this._alignCrop();
    this._draw();
  }

  /** @private */
  _syncTransformations() {
    const transformations = this.$['*editorTransformations'];
    const pickedTransformations = pick(transformations, Object.keys(this.$['*operations']));
    const operations = { ...this.$['*operations'], ...pickedTransformations };
    this.$['*operations'] = operations;
  }

  /** @private */
  _initCanvas() {
    /** @type {HTMLCanvasElement} */
    const canvas = this.ref['canvas-el'];
    const ctx = canvas.getContext('2d');

    const width = this.offsetWidth;
    const height = this.offsetHeight;
    const dpr = window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx?.scale(dpr, dpr);

    this._canvas = canvas;
    this._ctx = ctx;
  }

  /** @private */
  _alignImage() {
    if (!this._isActive || !this.$.image) {
      return;
    }

    const image = this.$.image;
    const padding = this.$['*padding'];
    const operations = this.$['*operations'];
    const { rotate } = operations;

    const bounds = { width: this.offsetWidth, height: this.offsetHeight };
    const naturalSize = rotateSize({ width: image.naturalWidth, height: image.naturalHeight }, rotate);
    let imageBox;

    if (naturalSize.width > bounds.width - padding * 2 || naturalSize.height > bounds.height - padding * 2) {
      const imageAspectRatio = naturalSize.width / naturalSize.height;
      const viewportAspectRatio = bounds.width / bounds.height;

      if (imageAspectRatio > viewportAspectRatio) {
        const width = bounds.width - padding * 2;
        const height = width / imageAspectRatio;
        const x = 0 + padding;
        const y = padding + (bounds.height - padding * 2) / 2 - height / 2;
        imageBox = { x, y, width, height };
      } else {
        const height = bounds.height - padding * 2;
        const width = height * imageAspectRatio;
        const x = padding + (bounds.width - padding * 2) / 2 - width / 2;
        const y = 0 + padding;
        imageBox = { x, y, width, height };
      }
    } else {
      const { width, height } = naturalSize;
      const x = padding + (bounds.width - padding * 2) / 2 - width / 2;
      const y = padding + (bounds.height - padding * 2) / 2 - height / 2;
      imageBox = { x, y, width, height };
    }

    this.$['*imageBox'] = roundRect(imageBox);
  }

  /** @private */
  _alignCrop() {
    let cropBox = this.$['*cropBox'];
    const imageBox = this.$['*imageBox'];
    const operations = this.$['*operations'];
    const { rotate } = operations;
    const cropTransformation = this.$['*editorTransformations'].crop;
    const { width: previewWidth, x: previewX, y: previewY } = this.$['*imageBox'];

    if (cropTransformation) {
      const {
        dimensions: [width, height],
        coords: [x, y],
      } = cropTransformation;
      const { width: sourceWidth } = rotateSize(this._imageSize, rotate);
      const ratio = previewWidth / sourceWidth;
      cropBox = constraintRect(
        roundRect({
          x: previewX + x * ratio,
          y: previewY + y * ratio,
          width: width * ratio,
          height: height * ratio,
        }),
        this.$['*imageBox'],
      );
    }

    /** @type {import('./types.js').CropPresetList[0] | undefined} */
    const cropPreset = this.$['*cropPresetList']?.[0];
    const cropAspectRatio = cropPreset ? cropPreset.width / cropPreset.height : undefined;

    if (
      !isRectInsideRect(cropBox, imageBox) ||
      (cropAspectRatio && !isRectMatchesAspectRatio(cropBox, cropAspectRatio))
    ) {
      const imageAspectRatio = imageBox.width / imageBox.height;
      let width = imageBox.width;
      let height = imageBox.height;
      if (cropAspectRatio) {
        if (imageAspectRatio > cropAspectRatio) {
          width = Math.min(imageBox.height * cropAspectRatio, imageBox.width);
        } else {
          height = Math.min(imageBox.width / cropAspectRatio, imageBox.height);
        }
      }
      cropBox = {
        x: imageBox.x + imageBox.width / 2 - width / 2,
        y: imageBox.y + imageBox.height / 2 - height / 2,
        width,
        height,
      };
    }

    this.$['*cropBox'] = constraintRect(roundRect(cropBox), this.$['*imageBox']);
  }

  /** @private */
  _drawImage() {
    const ctx = this._ctx;
    if (!ctx) return;
    const image = this.$.image;
    const imageBox = this.$['*imageBox'];
    const operations = this.$['*operations'];
    const { mirror, flip, rotate } = operations;
    const rotated = rotateSize({ width: imageBox.width, height: imageBox.height }, rotate);
    ctx.save();
    ctx.translate(imageBox.x + imageBox.width / 2, imageBox.y + imageBox.height / 2);
    ctx.rotate((rotate * Math.PI * -1) / 180);
    ctx.scale(mirror ? -1 : 1, flip ? -1 : 1);
    ctx.drawImage(image, -rotated.width / 2, -rotated.height / 2, rotated.width, rotated.height);
    ctx.restore();
  }

  /** @private */
  _draw() {
    if (!this._isActive || !this.$.image || !this._canvas || !this._ctx) {
      return;
    }
    const canvas = this._canvas;
    const ctx = this._ctx;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this._drawImage();
  }

  /**
   * @private
   * @param {{ fromViewer?: boolean }} options
   */
  _animateIn({ fromViewer }) {
    if (this.$.image) {
      this.ref['frame-el'].toggleThumbs(true);
      this._transitionToImage();
      setTimeout(() => {
        this.className = classNames({
          active_from_viewer: fromViewer,
          active_from_editor: !fromViewer,
          inactive_to_editor: false,
        });
      });
    }
  }

  /**
   * @private
   * @returns {NonNullable<import('./types.js').Transformations['crop']>['dimensions']}
   */
  _getCropDimensions() {
    const cropBox = this.$['*cropBox'];
    const imageBox = this.$['*imageBox'];
    const operations = this.$['*operations'];
    const { rotate } = operations;
    const { width: previewWidth, height: previewHeight } = imageBox;
    const { width: sourceWidth, height: sourceHeight } = rotateSize(this._imageSize, rotate);
    const { width: cropWidth, height: cropHeight } = cropBox;
    const ratioW = previewWidth / sourceWidth;
    const ratioH = previewHeight / sourceHeight;

    /** @type {[Number, Number]} */
    const dimensions = [
      clamp(Math.round(cropWidth / ratioW), 1, sourceWidth),
      clamp(Math.round(cropHeight / ratioH), 1, sourceHeight),
    ];

    return dimensions;
  }

  /**
   * @private
   * @returns {import('./types.js').Transformations['crop']}
   */
  _getCropTransformation() {
    const cropBox = this.$['*cropBox'];
    const imageBox = this.$['*imageBox'];
    const operations = this.$['*operations'];
    const { rotate } = operations;
    const { width: previewWidth, height: previewHeight, x: previewX, y: previewY } = imageBox;
    const { width: sourceWidth, height: sourceHeight } = rotateSize(this._imageSize, rotate);
    const { x: cropX, y: cropY } = cropBox;
    const ratioW = previewWidth / sourceWidth;
    const ratioH = previewHeight / sourceHeight;

    const dimensions = this._getCropDimensions();
    const crop = {
      dimensions,
      coords: /** @type {[Number, Number]} */ ([
        clamp(Math.round((cropX - previewX) / ratioW), 0, sourceWidth - dimensions[0]),
        clamp(Math.round((cropY - previewY) / ratioH), 0, sourceHeight - dimensions[1]),
      ]),
    };
    if (!validateCrop(crop)) {
      console.error('Cropper is trying to create invalid crop object', {
        payload: crop,
      });
      return undefined;
    }
    if (dimensions[0] === sourceWidth && dimensions[1] === sourceHeight) {
      return undefined;
    }

    return crop;
  }

  /** @private */
  _commit() {
    if (!this.isConnected || !this._imageSize) {
      return;
    }
    const operations = this.$['*operations'];
    const { rotate, mirror, flip } = operations;
    const crop = this._getCropTransformation();
    /** @type {import('./types.js').Transformations} */
    const editorTransformations = this.$['*editorTransformations'];
    const transformations = {
      ...editorTransformations,
      crop,
      rotate,
      mirror,
      flip,
    };

    this.$['*editorTransformations'] = transformations;
  }

  /**
   * @param {String} operation
   * @param {Number} value
   * @returns {void}
   */
  setValue(operation, value) {
    this.$['*operations'] = {
      ...this.$['*operations'],
      [operation]: value,
    };

    if (!this._isActive) {
      return;
    }

    this._alignImage();
    this._alignCrop();
    this._draw();
  }

  /**
   * @param {keyof Operations} operation
   * @returns {Number | boolean}
   */
  getValue(operation) {
    return this.$['*operations'][operation];
  }

  /**
   * @param {import('./types.js').ImageSize} imageSize
   * @param {{ fromViewer?: boolean }} options
   */
  async activate(imageSize, { fromViewer } = {}) {
    if (this._isActive) {
      return;
    }
    this._isActive = true;
    this._imageSize = imageSize;
    this.removeEventListener('transitionend', this._reset);

    try {
      this.$.image = await this._waitForImage(this.$['*originalUrl'], this.$['*editorTransformations']);
      this._syncTransformations();
      this._animateIn({ fromViewer });
    } catch (err) {
      console.error('Failed to activate cropper', { error: err });
    }

    this._observer = new ResizeObserver(([entry]) => {
      const nonZeroSize = entry.contentRect.width > 0 && entry.contentRect.height > 0;
      if (nonZeroSize && this._isActive && this.$.image) {
        this._handleResizeThrottled();
      }
    });
    this._observer.observe(this);
  }
  deactivate({ reset = false } = {}) {
    if (!this._isActive) {
      return;
    }
    !reset && this._commit();
    this._isActive = false;

    this._transitionToCrop();

    this.className = classNames({
      active_from_viewer: false,
      active_from_editor: false,
      inactive_to_editor: true,
    });

    this.ref['frame-el'].toggleThumbs(false);
    this.addEventListener('transitionend', this._reset, { once: true });
    this._observer?.disconnect();
  }

  /** @private */
  _transitionToCrop() {
    const dimensions = this._getCropDimensions();
    const scaleX = Math.min(this.offsetWidth, dimensions[0]) / this.$['*cropBox'].width;
    const scaleY = Math.min(this.offsetHeight, dimensions[1]) / this.$['*cropBox'].height;
    const scale = Math.min(scaleX, scaleY);
    const cropCenterX = this.$['*cropBox'].x + this.$['*cropBox'].width / 2;
    const cropCenterY = this.$['*cropBox'].y + this.$['*cropBox'].height / 2;

    this.style.transform = `scale(${scale}) translate(${(this.offsetWidth / 2 - cropCenterX) / scale}px, ${
      (this.offsetHeight / 2 - cropCenterY) / scale
    }px)`;
    this.style.transformOrigin = `${cropCenterX}px ${cropCenterY}px`;
  }

  /** @private */
  _transitionToImage() {
    const cropCenterX = this.$['*cropBox'].x + this.$['*cropBox'].width / 2;
    const cropCenterY = this.$['*cropBox'].y + this.$['*cropBox'].height / 2;

    this.style.transform = 'scale(1)';
    this.style.transformOrigin = `${cropCenterX}px ${cropCenterY}px`;
  }

  /** @private */
  _reset() {
    if (this._isActive) {
      return;
    }
    this.$.image = null;
  }

  /**
   * @private
   * @param {String} originalUrl
   * @param {import('./types.js').Transformations} transformations
   * @returns {Promise<HTMLImageElement>}
   */
  _waitForImage(originalUrl, transformations) {
    const width = this.offsetWidth;
    const appendedTransformations = {
      ...transformations,
      crop: undefined,
      rotate: undefined,
      flip: undefined,
      mirror: undefined,
    };
    const src = this.proxyUrl(viewerImageSrc(originalUrl, width, appendedTransformations));
    const { promise, cancel, image } = preloadImage(src);

    const stop = this._handleImageLoading(src);
    image.addEventListener('load', stop, { once: true });
    image.addEventListener('error', stop, { once: true });
    this._cancelPreload?.();
    this._cancelPreload = cancel;

    return promise
      .then(() => image)
      .catch((err) => {
        console.error('Failed to load image', { error: err });
        this.$['*networkProblems'] = true;
        return Promise.resolve(image);
      });
  }

  /**
   * @private
   * @param {String} src
   * @returns {() => void} Destructor
   */
  _handleImageLoading(src) {
    const operation = 'crop';
    const loadingOperations = this.$['*loadingOperations'];
    if (!loadingOperations.get(operation)) {
      loadingOperations.set(operation, new Map());
    }

    if (!loadingOperations.get(operation).get(src)) {
      loadingOperations.set(operation, loadingOperations.get(operation).set(src, true));
      this.$['*loadingOperations'] = loadingOperations;
    }

    return () => {
      if (loadingOperations?.get(operation)?.has(src)) {
        loadingOperations.get(operation).delete(src);
        this.$['*loadingOperations'] = loadingOperations;
      }
    };
  }

  initCallback() {
    super.initCallback();

    this.sub('*imageBox', () => {
      this._draw();
    });

    this.sub('*cropBox', () => {
      if (this.$.image) {
        this._commitDebounced();
      }
    });

    this.sub('*cropPresetList', () => {
      this._alignCrop();
    });

    setTimeout(() => {
      this.sub('*networkProblems', (networkProblems) => {
        if (!networkProblems) {
          this._isActive && this.activate(this._imageSize, { fromViewer: false });
        }
      });
    }, 0);
  }

  destroyCallback() {
    super.destroyCallback();
    this._observer?.disconnect();
  }
}

EditorImageCropper.template = /* HTML */ `
  <canvas class="canvas" ref="canvas-el"></canvas>
  <lr-crop-frame ref="frame-el"></lr-crop-frame>
`;
