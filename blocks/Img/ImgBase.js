import { applyTemplateData } from '../../utils/template-utils.js';
import { createCdnUrl, createCdnUrlModifiers, createOriginalUrl } from '../../utils/cdn-utils.js';
import { stringToArray } from '../../utils/stringToArray.js';
import { uniqueArray } from '../../utils/uniqueArray.js';
import { parseObjectToString } from './utils/parseObjectToString.js';
import { ImgConfig } from './ImgConfig.js';
import {
  DEV_MODE,
  HI_RES_K,
  ULTRA_RES_K,
  UNRESOLVED_ATTR,
  MAX_WIDTH,
  MAX_WIDTH_JPG,
  ImgTypeEnum,
} from './configurations.js';

export class ImgBase extends ImgConfig {
  _img = new Image();
  _imgPreview = new Image();

  /**
   * @private
   * @param {String} src
   */
  _fmtAbs(src) {
    let isRel = !src.includes('//');
    if (isRel && !DEV_MODE) {
      src = new URL(src, document.baseURI).href;
    }
    return src;
  }

  /**
   * Validate size
   *
   * @param {String} [size]
   * @returns {String | Number}
   */
  _validateSize(size) {
    if (size?.trim() !== '') {
      // Extract numeric part
      let numericPart = size.match(/\d+/)[0];

      // Extract alphabetic part
      let alphabeticPart = size.match(/[a-zA-Z]+/)[0];

      const bp = parseInt(numericPart, 10);

      if (Number(bp) > MAX_WIDTH_JPG && this.hasFormatJPG) {
        return MAX_WIDTH_JPG + alphabeticPart;
      } else if (Number(bp) > MAX_WIDTH && !this.hasFormatJPG) {
        return MAX_WIDTH + alphabeticPart;
      }
    }

    return size;
  }

  /**
   * Image operations
   *
   * @param {String} [size]
   * @param {String} [blur]
   */
  _getCdnModifiers(size, blur) {
    const params = {
      format: this.$$('format'),
      quality: this.$$('quality'),
      resize: this._validateSize(size),
      blur,
      'cdn-operations': this.$$('cdn-operations'),
      analytics: this.analyticsParams(),
    };

    return createCdnUrlModifiers(...parseObjectToString(params));
  }

  /**
   * @private
   * @param {String} [size]
   * @param {String} [blur]
   * @returns {any}
   */
  _getUrlBase(size = '', blur = '') {
    if (this.$$('src').startsWith('data:') || this.$$('src').startsWith('blob:')) {
      return this.$$('src');
    }

    // Localhost + relative image path (DO NOTHING):
    if (DEV_MODE && this.$$('src') && !this.$$('src').includes('//')) {
      return this._proxyUrl(this.$$('src'));
    }

    let cdnModifiers = this._getCdnModifiers(size, blur);

    if (this.$$('src').startsWith(this.$$('cdn-cname'))) {
      return createCdnUrl(this.$$('src'), cdnModifiers);
    }

    // Alternative CDN name:
    if (this.$$('cdn-cname') && this.$$('uuid')) {
      return this._proxyUrl(
        createCdnUrl(
          //
          createOriginalUrl(this.$$('cdn-cname'), this.$$('uuid')),
          cdnModifiers,
        ),
      );
    }

    // UUID only:
    if (this.$$('uuid')) {
      return this._proxyUrl(
        createCdnUrl(
          //
          createOriginalUrl(this.$$('cdn-cname'), this.$$('uuid')),
          cdnModifiers,
        ),
      );
    }

    // Alternative proxy name:
    if (this.$$('proxy-cname')) {
      return this._proxyUrl(
        createCdnUrl(
          //
          this.$$('proxy-cname'),
          cdnModifiers,
          this._fmtAbs(this.$$('src')),
        ),
      );
    }

    // Project pubkey only:
    if (this.$$('pubkey')) {
      return this._proxyUrl(
        createCdnUrl(
          //
          `https://${this.$$('pubkey')}.ucr.io/`,
          cdnModifiers,
          this._fmtAbs(this.$$('src')),
        ),
      );
    }
  }

  /**
   * @private
   * @param {String} url
   * @returns {String}
   */
  _proxyUrl(url) {
    let previewProxy = this.$$('secure-delivery-proxy');
    if (!previewProxy) {
      return url;
    }
    return applyTemplateData(
      this.$$('secure-delivery-proxy'),
      { previewUrl: url },
      { transform: (value) => window.encodeURIComponent(value) },
    );
  }

  /**
   * @param {HTMLElement} el
   * @param {Number} [k]
   * @param {Boolean} [wOnly]
   */
  _getElSize(el, k = 1, wOnly = true) {
    let rect = el.getBoundingClientRect();
    let w = k * Math.round(rect.width);
    let h = wOnly ? '' : k * Math.round(rect.height);

    if (w || h) {
      return `${w ? w : ''}x${h ? h : ''}`;
    } else {
      return null;
    }
  }

  /** @param {HTMLImageElement} img */
  _setupEventProxy(img) {
    /** @param {Event} e */
    let proxifyEvent = (e) => {
      e.stopPropagation();
      let event = new Event(e.type, e);
      this.dispatchEvent(event);
    };
    let EVENTS = ['load', 'error'];
    for (let event of EVENTS) {
      img.addEventListener(event, proxifyEvent);
    }
  }

  /** @type {HTMLImageElement} */
  get img() {
    if (!this.hasPreviewImage) {
      this._setupConfigForImage({ elNode: this._img });
      this.appendChild(this._img);
    }
    return this._img;
  }

  get currentImg() {
    return this.hasPreviewImage
      ? {
          type: ImgTypeEnum.PREVIEW,
          img: this._imgPreview,
        }
      : {
          type: ImgTypeEnum.MAIN,
          img: this.img,
        };
  }

  get hasPreviewImage() {
    return this.$$('is-preview-blur');
  }

  get bgSelector() {
    return this.$$('is-background-for');
  }

  get breakpoints() {
    if (this.$$('breakpoints')) {
      const list = stringToArray(this.$$('breakpoints'));
      return uniqueArray(list.map((bp) => parseInt(bp, 10)));
    } else {
      return null;
    }
  }

  get hasFormatJPG() {
    return this.$$('format').toLowerCase() === 'jpeg';
  }

  /** @param {HTMLElement} el */
  renderBg(el) {
    let imgSet = new Set();

    imgSet.add(`url("${this._getUrlBase(this._getElSize(el))}") 1x`);
    if (this.$$('hi-res-support')) {
      imgSet.add(`url("${this._getUrlBase(this._getElSize(el, HI_RES_K))}") ${HI_RES_K}x`);
    }

    if (this.$$('ultra-res-support')) {
      imgSet.add(`url("${this._getUrlBase(this._getElSize(el, ULTRA_RES_K))}") ${ULTRA_RES_K}x`);
    }

    let iSet = `image-set(${[...imgSet].join(', ')})`;
    el.style.setProperty('background-image', iSet);
    el.style.setProperty('background-image', '-webkit-' + iSet);
  }

  getSrcset() {
    let srcset = new Set();
    if (this.breakpoints) {
      this.breakpoints.forEach((bp) => {
        srcset.add(this._getUrlBase(bp + 'x') + ` ${this._validateSize(bp + 'w')}`);
        if (this.$$('hi-res-support')) {
          srcset.add(this._getUrlBase(bp * HI_RES_K + 'x') + ` ${this._validateSize(bp * HI_RES_K + 'w')}`);
        }
        if (this.$$('ultra-res-support')) {
          srcset.add(this._getUrlBase(bp * ULTRA_RES_K + 'x') + ` ${this._validateSize(bp * ULTRA_RES_K + 'w')}`);
        }
      });
    } else {
      srcset.add(this._getUrlBase(this._getElSize(this.currentImg.img)) + ' 1x');
      if (this.$$('hi-res-support')) {
        srcset.add(this._getUrlBase(this._getElSize(this.currentImg.img, 2)) + ' 2x');
      }
      if (this.$$('ultra-res-support')) {
        srcset.add(this._getUrlBase(this._getElSize(this.currentImg.img, 3)) + ' 3x');
      }
    }
    return [...srcset].join();
  }

  getSrc() {
    return this._getUrlBase();
  }

  get srcUrlPreview() {
    return this._getUrlBase('100x', '100');
  }

  renderBackground() {
    [...document.querySelectorAll(this.bgSelector)].forEach((el) => {
      if (this.$$('intersection')) {
        this.initIntersection(el, () => {
          this.renderBg(el);
        });
      } else {
        this.renderBg(el);
      }
    });
  }

  _appendURL({ elNode, src, srcset }) {
    if (src) {
      elNode.src = src;
    }

    if (srcset) {
      elNode.srcset = srcset;
    }
  }

  _setupConfigForImage({ elNode }) {
    this._setupEventProxy(elNode);
    this.initAttributes(elNode);
  }

  loaderImage({ src, srcset, elNode }) {
    return new Promise((resolve, reject) => {
      this._setupConfigForImage({ elNode });

      elNode.setAttribute(UNRESOLVED_ATTR, '');

      elNode.addEventListener('load', () => {
        elNode.removeAttribute(UNRESOLVED_ATTR);
        resolve(elNode);
      });

      elNode.addEventListener('error', () => {
        reject(false);
      });

      this._appendURL({
        elNode,
        src,
        srcset,
      });
    });
  }

  async renderImage() {
    if (this.$$('intersection')) {
      if (this.hasPreviewImage) {
        this._setupConfigForImage({ elNode: this._imgPreview });
        this.appendChild(this._imgPreview);
      }

      this.initIntersection(this.currentImg.img, async () => {
        if (this.hasPreviewImage) {
          this._imgPreview.src = this.srcUrlPreview;
        }

        try {
          await this.loaderImage({
            src: this.getSrc(),
            srcset: this.getSrcset(),
            elNode: this._img,
          });

          if (this.hasPreviewImage) {
            await this._imgPreview.remove();
          }

          this.appendChild(this._img);
        } catch (e) {
          if (this.hasPreviewImage) {
            await this._imgPreview?.remove();
          }
          this.appendChild(this._img);
        }
      });

      return;
    }

    try {
      if (this.hasPreviewImage) {
        await this.loaderImage({
          src: this.srcUrlPreview,
          elNode: this._imgPreview,
        });

        this.appendChild(this._imgPreview);
      }

      await this.loaderImage({
        src: this.getSrc(),
        srcset: this.getSrcset(),
        elNode: this._img,
      });

      if (this.hasPreviewImage) {
        await this._imgPreview?.remove();
      }

      this.appendChild(this._img);
    } catch (e) {
      if (this.hasPreviewImage) {
        await this._imgPreview?.remove();
      }
      this.appendChild(this._img);
    }
  }

  init() {
    if (this.bgSelector) {
      this.renderBackground();
    } else {
      this.renderImage();
    }
  }
}
