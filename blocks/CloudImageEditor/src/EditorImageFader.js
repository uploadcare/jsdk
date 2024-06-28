import { Block } from '../../../abstract/Block.js';
import { debounce } from '../../utils/debounce.js';
import { classNames } from './lib/classNames.js';
import { linspace } from './lib/linspace.js';
import { batchPreloadImages } from './lib/preloadImage.js';
import { COLOR_OPERATIONS_CONFIG } from './toolbar-constants.js';
import { viewerImageSrc } from './util.js';

/**
 * @param {Number[]} numbers
 * @returns {[Number, Number][]}
 */
function splitBySections(numbers) {
  return numbers.reduce((acc, point, idx) => {
    if (idx < numbers.length - 1) {
      acc.push([point, numbers[idx + 1]]);
      return acc;
    }
    return acc;
  }, []);
}

/**
 * @param {Number[]} keypoints
 * @param {Number} value
 * @param {Number} zero
 */
function calculateOpacities(keypoints, value, zero) {
  const section = splitBySections(keypoints).find(([left, right]) => left <= value && value <= right);
  return keypoints.map((point) => {
    const distance = Math.abs(section[0] - section[1]);
    const relation = Math.abs(value - section[0]) / distance;

    if (section[0] === point) {
      return value > zero ? 1 : 1 - relation;
    }
    if (section[1] === point) {
      return value >= zero ? relation : 1;
    }
    return 0;
  });
}

/**
 * @param {Number[]} keypoints
 * @param {Number} zero
 */
function calculateZIndices(keypoints, zero) {
  return keypoints.map((point, idx) => (point < zero ? keypoints.length - idx : idx));
}

/**
 * @param {String} operation
 * @param {Number} value
 * @returns {Number[]}
 */
function keypointsRange(operation, value) {
  const n = COLOR_OPERATIONS_CONFIG[operation].keypointsNumber;
  const { range, zero } = COLOR_OPERATIONS_CONFIG[operation];

  return [...new Set([...linspace(range[0], zero, n + 1), ...linspace(zero, range[1], n + 1), zero, value])].sort(
    (a, b) => a - b,
  );
}

/**
 * @typedef {Object} Keypoint
 * @property {String} src
 * @property {Number} opacity
 * @property {Number} zIndex
 * @property {HTMLImageElement} image
 * @property {Number} value
 */

export class EditorImageFader extends Block {
  constructor() {
    super();

    /**
     * @private
     * @type {Boolean}
     */
    this._isActive = false;

    /**
     * @private
     * @type {Boolean}
     */
    this._hidden = true;

    /** @private */
    this._addKeypointDebounced = debounce(this._addKeypoint.bind(this), 600);

    this.classList.add('inactive_to_cropper');
  }

  /**
   * @private
   * @param {String} src
   * @returns {() => void} Destructor
   */
  _handleImageLoading(src) {
    const operation = this._operation;

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

  /** @private */
  _flush() {
    window.cancelAnimationFrame(this._raf);
    this._raf = window.requestAnimationFrame(() => {
      for (const kp of this._keypoints) {
        const { image } = kp;
        if (image) {
          image.style.opacity = kp.opacity.toString();
          image.style.zIndex = kp.zIndex.toString();
        }
      }
    });
  }

  /**
   * @private
   * @param {Object} options
   * @param {String} [options.url]
   * @param {String} [options.filter]
   * @param {String} [options.operation]
   * @param {Number} [options.value]
   * @returns {String}
   */
  _imageSrc({ url = this._url, filter = this._filter, operation, value } = {}) {
    const transformations = { ...this._transformations };

    if (operation) {
      transformations[operation] = filter ? { name: filter, amount: value } : value;
    }

    // do not use getBoundingClientRect because scale transform affects it
    const width = this.offsetWidth;
    return this.proxyUrl(viewerImageSrc(url, width, transformations));
  }

  /**
   * @private
   * @param {String} operation
   * @param {Number} value
   * @returns {Keypoint}
   */
  _constructKeypoint(operation, value) {
    const src = this._imageSrc({ operation, value });
    return {
      src,
      image: null,
      opacity: 0,
      zIndex: 0,
      value,
    };
  }

  /**
   * Check if current operation and filter equals passed ones
   *
   * @private
   * @param {String} operation
   * @param {String} [filter]
   * @returns {Boolean}
   */
  _isSame(operation, filter) {
    return this._operation === operation && this._filter === filter;
  }

  /**
   * @private
   * @param {String} operation
   * @param {String | null} filter
   * @param {Number} value
   */
  _addKeypoint(operation, filter, value) {
    const shouldSkip = () =>
      !this._isSame(operation, filter) || this._value !== value || !!this._keypoints.find((kp) => kp.value === value);

    if (shouldSkip()) {
      return;
    }
    const keypoint = this._constructKeypoint(operation, value);
    const image = new Image();
    image.src = keypoint.src;
    const stop = this._handleImageLoading(keypoint.src);
    image.addEventListener('load', stop, { once: true });
    image.addEventListener('error', stop, { once: true });
    keypoint.image = image;
    image.classList.add('fader-image');

    image.addEventListener(
      'load',
      () => {
        if (shouldSkip()) {
          return;
        }
        const keypoints = this._keypoints;
        const idx = keypoints.findIndex((kp) => kp.value > value);
        const insertBeforeNode = idx < keypoints.length ? keypoints[idx].image : null;
        if (!this._container || (insertBeforeNode && !this._container.contains(insertBeforeNode))) {
          return;
        }
        keypoints.splice(idx, 0, keypoint);
        this._container.insertBefore(image, insertBeforeNode);
        this._update(operation, value);
      },
      { once: true },
    );

    image.addEventListener(
      'error',
      () => {
        this.$['*networkProblems'] = true;
      },
      { once: true },
    );
  }

  /** @param {String | Number} value */
  set(value) {
    const normalizedValue = typeof value === 'string' ? Number.parseInt(value, 10) : value;
    this._update(this._operation, normalizedValue);
    this._addKeypointDebounced(this._operation, this._filter, normalizedValue);
  }

  /**
   * @private
   * @param {String} operation
   * @param {Number} value
   */
  _update(operation, value) {
    this._operation = operation;
    this._value = value;

    const { zero } = COLOR_OPERATIONS_CONFIG[operation];

    const keypointValues = this._keypoints.map((kp) => kp.value);
    const opacities = calculateOpacities(keypointValues, value, zero);
    const zIndices = calculateZIndices(keypointValues, zero);

    for (const [idx, kp] of Object.entries(this._keypoints)) {
      kp.opacity = opacities[idx];
      kp.zIndex = zIndices[idx];
    }

    this._flush();
  }

  /** @private */
  _createPreviewImage() {
    const image = new Image();
    image.classList.add('fader-image', 'fader-image--preview');
    image.style.opacity = '0';
    return image;
  }

  /** @private */
  async _initNodes() {
    const fr = document.createDocumentFragment();
    this._previewImage = this._previewImage || this._createPreviewImage();
    !this.contains(this._previewImage) && fr.appendChild(this._previewImage);

    const container = document.createElement('div');
    fr.appendChild(container);

    const srcList = this._keypoints.map((kp) => kp.src);

    const { images, promise, cancel } = batchPreloadImages(srcList);
    for (const node of images) {
      const stop = this._handleImageLoading(node.src);
      node.addEventListener('load', stop);
      node.addEventListener('error', stop);
    }
    this._cancelLastImages = () => {
      cancel();
      this._cancelLastImages = undefined;
    };
    const operation = this._operation;
    const filter = this._filter;
    await promise;
    if (this._isActive && this._isSame(operation, filter)) {
      this._container?.remove();
      this._container = container;
      this._keypoints.forEach((kp, idx) => {
        const kpImage = images[idx];
        kpImage.classList.add('fader-image');
        kp.image = kpImage;
        this._container.appendChild(kpImage);
      });
      this.appendChild(fr);
      this._flush();
    }
  }

  /** @param {import('./types.js').Transformations} transformations */
  setTransformations(transformations) {
    this._transformations = transformations;
    if (this._previewImage) {
      const src = this._imageSrc();
      const stop = this._handleImageLoading(src);
      this._previewImage.src = src;
      this._previewImage.addEventListener('load', stop, { once: true });
      this._previewImage.addEventListener('error', stop, { once: true });
      this._previewImage.style.opacity = '1';

      this._previewImage.addEventListener(
        'error',
        () => {
          this.$['*networkProblems'] = true;
        },
        { once: true },
      );
    }
  }

  /**
   * @param {object} options
   * @param {String} options.url
   * @param {String} options.operation
   * @param {Number} options.value
   * @param {String} [options.filter]
   */
  preload({ url, filter, operation, value }) {
    this._cancelBatchPreload?.();

    const keypoints = keypointsRange(operation, value);
    const srcList = keypoints.map((kp) => this._imageSrc({ url, filter, operation, value: kp }));
    const { cancel } = batchPreloadImages(srcList);

    this._cancelBatchPreload = cancel;
  }

  /** @private */
  _setOriginalSrc(src) {
    const image = this._previewImage || this._createPreviewImage();
    !this.contains(image) && this.appendChild(image);
    this._previewImage = image;

    if (image.src === src) {
      image.style.opacity = '1';
      image.style.transform = 'scale(1)';
      this.className = classNames({
        active_from_viewer: this._fromViewer,
        active_from_cropper: !this._fromViewer,
        inactive_to_cropper: false,
      });
      return;
    }
    image.style.opacity = '0';
    const stop = this._handleImageLoading(src);
    image.addEventListener('error', stop, { once: true });
    image.src = src;
    image.addEventListener(
      'load',
      () => {
        stop();
        if (image) {
          image.style.opacity = '1';
          image.style.transform = 'scale(1)';
          this.className = classNames({
            active_from_viewer: this._fromViewer,
            active_from_cropper: !this._fromViewer,
            inactive_to_cropper: false,
          });
        }
      },
      { once: true },
    );
    image.addEventListener(
      'error',
      () => {
        this.$['*networkProblems'] = true;
      },
      { once: true },
    );
  }

  /**
   * @param {object} options
   * @param {String} options.url
   * @param {String} [options.operation]
   * @param {Number} [options.value]
   * @param {String} [options.filter]
   * @param {Boolean} [options.fromViewer]
   */
  activate({ url, operation, value, filter, fromViewer }) {
    this._isActive = true;
    this._hidden = false;
    this._url = url;
    this._operation = operation || 'initial';
    this._value = value;
    this._filter = filter;
    this._fromViewer = fromViewer;

    const isOriginal = typeof value !== 'number' && !filter;
    if (isOriginal) {
      const src = this._imageSrc({ operation, value });
      this._setOriginalSrc(src);
      this._container?.remove();
      return;
    }
    this._keypoints = keypointsRange(operation, value).map((keyValue) => this._constructKeypoint(operation, keyValue));

    this._update(operation, value);
    this._initNodes();
  }

  /** @param {{ hide?: Boolean }} options */
  deactivate({ hide = true } = {}) {
    this._isActive = false;

    this._cancelLastImages?.();
    this._cancelBatchPreload?.();

    if (hide && !this._hidden) {
      this._hidden = true;
      if (this._previewImage) {
        this._previewImage.style.transform = 'scale(1)';
      }
      this.className = classNames({
        active_from_viewer: false,
        active_from_cropper: false,
        inactive_to_cropper: true,
      });
      this.addEventListener(
        'transitionend',
        () => {
          this._container?.remove();
        },
        { once: true },
      );
    } else {
      this._container?.remove();
    }
  }
}
