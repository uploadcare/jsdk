// @ts-check
import { html } from '../../../symbiote.js';
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
  let shouldMatch = [
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
    let transformations = this.$['*editorTransformations'];
    let pickedTransformations = pick(transformations, Object.keys(this.$['*operations']));
    let operations = { ...this.$['*operations'], ...pickedTransformations };
    this.$['*operations'] = operations;
  }

  /** @private */
  _initCanvas() {
    /** @type {HTMLCanvasElement} */
    let canvas = this.ref['canvas-el'];
    let ctx = canvas.getContext('2d');

    let width = this.offsetWidth;
    let height = this.offsetHeight;
    let dpr = window.devicePixelRatio;
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

    let image = this.$.image;
    let padding = this.$['*padding'];
    let operations = this.$['*operations'];
    let { rotate } = operations;

    let bounds = { width: this.offsetWidth, height: this.offsetHeight };
    let naturalSize = rotateSize({ width: image.naturalWidth, height: image.naturalHeight }, rotate);
    let imageBox;

    if (naturalSize.width > bounds.width - padding * 2 || naturalSize.height > bounds.height - padding * 2) {
      let imageAspectRatio = naturalSize.width / naturalSize.height;
      let viewportAspectRatio = bounds.width / bounds.height;

      if (imageAspectRatio > viewportAspectRatio) {
        let width = bounds.width - padding * 2;
        let height = width / imageAspectRatio;
        let x = 0 + padding;
        let y = padding + (bounds.height - padding * 2) / 2 - height / 2;
        imageBox = { x, y, width, height };
      } else {
        let height = bounds.height - padding * 2;
        let width = height * imageAspectRatio;
        let x = padding + (bounds.width - padding * 2) / 2 - width / 2;
        let y = 0 + padding;
        imageBox = { x, y, width, height };
      }
    } else {
      let { width, height } = naturalSize;
      let x = padding + (bounds.width - padding * 2) / 2 - width / 2;
      let y = padding + (bounds.height - padding * 2) / 2 - height / 2;
      imageBox = { x, y, width, height };
    }

    this.$['*imageBox'] = roundRect(imageBox);
  }

  /** @private */
  _alignCrop() {
    let cropBox = this.$['*cropBox'];
    let imageBox = this.$['*imageBox'];
    let operations = this.$['*operations'];
    let { rotate } = operations;
    let cropTransformation = this.$['*editorTransformations']['crop'];
    let { width: previewWidth, x: previewX, y: previewY } = this.$['*imageBox'];

    if (cropTransformation) {
      let {
        dimensions: [width, height],
        coords: [x, y],
      } = cropTransformation;
      let { width: sourceWidth } = rotateSize(this._imageSize, rotate);
      let ratio = previewWidth / sourceWidth;
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
    let ctx = this._ctx;
    if (!ctx) return;
    let image = this.$.image;
    let imageBox = this.$['*imageBox'];
    let operations = this.$['*operations'];
    let { mirror, flip, rotate } = operations;
    let rotated = rotateSize({ width: imageBox.width, height: imageBox.height }, rotate);
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
    let canvas = this._canvas;
    let ctx = this._ctx;

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
          'uc-active_from_viewer': fromViewer,
          'uc-active_from_editor': !fromViewer,
          'uc-inactive_to_editor': false,
        });
      });
    }
  }

  /**
   * @private
   * @returns {NonNullable<import('./types.js').Transformations['crop']>['dimensions']}
   */
  _getCropDimensions() {
    let cropBox = this.$['*cropBox'];
    let imageBox = this.$['*imageBox'];
    let operations = this.$['*operations'];
    let { rotate } = operations;
    let { width: previewWidth, height: previewHeight } = imageBox;
    let { width: sourceWidth, height: sourceHeight } = rotateSize(this._imageSize, rotate);
    let { width: cropWidth, height: cropHeight } = cropBox;
    let ratioW = previewWidth / sourceWidth;
    let ratioH = previewHeight / sourceHeight;

    /** @type {[Number, Number]} */
    let dimensions = [
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
    let cropBox = this.$['*cropBox'];
    let imageBox = this.$['*imageBox'];
    let operations = this.$['*operations'];
    let { rotate } = operations;
    let { width: previewWidth, height: previewHeight, x: previewX, y: previewY } = imageBox;
    let { width: sourceWidth, height: sourceHeight } = rotateSize(this._imageSize, rotate);
    let { x: cropX, y: cropY } = cropBox;
    let ratioW = previewWidth / sourceWidth;
    let ratioH = previewHeight / sourceHeight;

    let dimensions = this._getCropDimensions();
    let crop = {
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
    let operations = this.$['*operations'];
    let { rotate, mirror, flip } = operations;
    let crop = this._getCropTransformation();
    /** @type {import('./types.js').Transformations} */
    let editorTransformations = this.$['*editorTransformations'];
    let transformations = {
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
      'uc-active_from_viewer': false,
      'uc-active_from_editor': false,
      'uc-inactive_to_editor': true,
    });

    this.ref['frame-el'].toggleThumbs(false);
    this.addEventListener('transitionend', this._reset, { once: true });
    this._observer?.disconnect();
  }

  /** @private */
  _transitionToCrop() {
    let dimensions = this._getCropDimensions();
    let scaleX = Math.min(this.offsetWidth, dimensions[0]) / this.$['*cropBox'].width;
    let scaleY = Math.min(this.offsetHeight, dimensions[1]) / this.$['*cropBox'].height;
    let scale = Math.min(scaleX, scaleY);
    let cropCenterX = this.$['*cropBox'].x + this.$['*cropBox'].width / 2;
    let cropCenterY = this.$['*cropBox'].y + this.$['*cropBox'].height / 2;

    this.style.transform = `scale(${scale}) translate(${(this.offsetWidth / 2 - cropCenterX) / scale}px, ${
      (this.offsetHeight / 2 - cropCenterY) / scale
    }px)`;
    this.style.transformOrigin = `${cropCenterX}px ${cropCenterY}px`;
  }

  /** @private */
  _transitionToImage() {
    let cropCenterX = this.$['*cropBox'].x + this.$['*cropBox'].width / 2;
    let cropCenterY = this.$['*cropBox'].y + this.$['*cropBox'].height / 2;

    this.style.transform = `scale(1)`;
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
  async _waitForImage(originalUrl, transformations) {
    let width = this.offsetWidth;
    transformations = {
      ...transformations,
      crop: undefined,
      rotate: undefined,
      flip: undefined,
      mirror: undefined,
    };
    let src = await this.proxyUrl(viewerImageSrc(originalUrl, width, transformations));
    let { promise, cancel, image } = preloadImage(src);

    let stop = this._handleImageLoading(src);
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
    let operation = 'crop';
    let loadingOperations = this.$['*loadingOperations'];
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

EditorImageCropper.template = html`
  <canvas class="uc-canvas" ref="canvas-el"></canvas>
  <uc-crop-frame ref="frame-el"></uc-crop-frame>
`;
