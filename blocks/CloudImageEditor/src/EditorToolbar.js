// @ts-check
import { Block } from '../../../abstract/Block.js';
import { debounce } from '../../utils/debounce.js';
import { EditorCropButtonControl } from './EditorCropButtonControl.js';
import { EditorFilterControl } from './EditorFilterControl.js';
import { EditorOperationControl } from './EditorOperationControl.js';
import { FAKE_ORIGINAL_FILTER } from './EditorSlider.js';
import { batchPreloadImages } from './lib/preloadImage.js';
import {
  ALL_COLOR_OPERATIONS,
  ALL_CROP_OPERATIONS,
  ALL_FILTERS,
  ALL_TABS,
  COLOR_OPERATIONS_CONFIG,
  TabId,
} from './toolbar-constants.js';
import { viewerImageSrc } from './util.js';

/** @param {String} id */
function renderTabToggle(id) {
  return /* HTML */ `
    <lr-presence-toggle class="tab-toggle" set="visible: presence.tabToggle.${id}; styles: presence.tabToggleStyles;">
      <lr-btn-ui
        theme="tab"
        ref="tab-toggle-${id}"
        data-id="${id}"
        icon="${id}"
        set="onclick: on.clickTab; aria-role:tab_role; aria-controls:tab_${id}"
      >
      </lr-btn-ui>
    </lr-presence-toggle>
  `;
}

/** @param {String} id */
function renderTabContent(id) {
  return /* HTML */ `
    <lr-presence-toggle
      id="tab_${id}"
      class="tab-content"
      set="visible: presence.tabContent.${id}; styles: presence.tabContentStyles"
    >
      <lr-editor-scroller hidden-scrollbar>
        <div class="controls-list_align">
          <div role="listbox" aria-orientation="horizontal" class="controls-list_inner" ref="controls-list-${id}"></div>
        </div>
      </lr-editor-scroller>
    </lr-presence-toggle>
  `;
}

export class EditorToolbar extends Block {
  constructor() {
    super();

    this.init$ = {
      ...this.init$,
      '*sliderEl': null,
      /** @type {import('./types.js').LoadingOperations} */
      '*loadingOperations': new Map(),
      '*showSlider': false,
      '*currentFilter': FAKE_ORIGINAL_FILTER,
      '*currentOperation': null,
      showLoader: false,
      filters: ALL_FILTERS,
      colorOperations: ALL_COLOR_OPERATIONS,
      cropOperations: ALL_CROP_OPERATIONS,
      '*operationTooltip': null,

      'presence.mainToolbar': true,
      'presence.subToolbar': false,
      'presence.tabToggles': true,
      'presence.tabContent.crop': false,
      'presence.tabContent.tuning': false,
      'presence.tabContent.filters': false,
      'presence.tabToggle.crop': true,
      'presence.tabToggle.tuning': true,
      'presence.tabToggle.filters': true,
      'presence.subTopToolbarStyles': {
        hidden: 'sub-toolbar--top-hidden',
        visible: 'sub-toolbar--visible',
      },
      'presence.subBottomToolbarStyles': {
        hidden: 'sub-toolbar--bottom-hidden',
        visible: 'sub-toolbar--visible',
      },
      'presence.tabContentStyles': {
        hidden: 'tab-content--hidden',
        visible: 'tab-content--visible',
      },
      'presence.tabToggleStyles': {
        hidden: 'tab-toggle--hidden',
        visible: 'tab-toggle--visible',
      },
      'presence.tabTogglesStyles': {
        hidden: 'tab-toggles--hidden',
        visible: 'tab-toggles--visible',
      },
      'on.cancel': () => {
        this._cancelPreload?.();
        this.$['*on.cancel']();
      },
      'on.apply': () => {
        this.$['*on.apply'](this.$['*editorTransformations']);
      },
      'on.applySlider': () => {
        this.ref['slider-el'].apply();
        this._onSliderClose();
      },
      'on.cancelSlider': () => {
        this.ref['slider-el'].cancel();
        this._onSliderClose();
      },
      /** @param {MouseEvent} e */
      'on.clickTab': (e) => {
        const id = /** @type {HTMLElement} */ (e.currentTarget).getAttribute('data-id');
        if (id) {
          this._activateTab(id, { fromViewer: false });
        }
      },
      tab_role: 'tab',
      [`tab_${TabId.TUNING}`]: `tab_${TabId.TUNING}`,
      [`tab_${TabId.CROP}`]: `tab_${TabId.CROP}`,
      [`tab_${TabId.FILTERS}`]: `tab_${TabId.FILTERS}`,
    };

    /** @private */

    this._debouncedShowLoader = debounce(this._showLoader.bind(this), 500);
  }

  /** @private */
  _onSliderClose() {
    this.$['*showSlider'] = false;
    if (this.$['*tabId'] === TabId.TUNING) {
      this.ref['tooltip-el'].classList.toggle('info-tooltip_visible', false);
    }
  }

  /**
   * @private
   * @param {String} operation
   */
  _createOperationControl(operation) {
    const el = new EditorOperationControl();
    // @ts-expect-error TODO: fix
    el.operation = operation;
    return el;
  }

  /**
   * @private
   * @param {String} filter
   */
  _createFilterControl(filter) {
    const el = new EditorFilterControl();
    // @ts-expect-error TODO: fix
    el.filter = filter;
    return el;
  }

  /**
   * @private
   * @param {String} operation
   */
  _createToggleControl(operation) {
    const el = new EditorCropButtonControl();
    // @ts-expect-error TODO: fix
    el.operation = operation;
    return el;
  }

  /**
   * @private
   * @param {String} tabId
   */
  _renderControlsList(tabId) {
    const listEl = this.ref[`controls-list-${tabId}`];
    const fr = document.createDocumentFragment();

    if (tabId === TabId.CROP) {
      this.$.cropOperations.forEach();
      for (const operation of /** @type {string[]} */ (this.$.cropOperations)) {
        const el = this._createToggleControl(operation);
        fr.appendChild(el);
      }
    } else if (tabId === TabId.FILTERS) {
      for (const filterId of [FAKE_ORIGINAL_FILTER, ...this.$.filters]) {
        const el = this._createFilterControl(filterId);
        fr.appendChild(el);
      }
    } else if (tabId === TabId.TUNING) {
      for (const operation of /** @type {string[]} */ (this.$.colorOperations)) {
        const el = this._createOperationControl(operation);
        // @ts-ignore
        fr.appendChild(el);
      }
    }

    [...fr.children].forEach((el, idx) => {
      if (idx === fr.childNodes.length - 1) {
        el.classList.add('controls-list_last-item');
      }
    });

    listEl.innerHTML = '';
    listEl.appendChild(fr);
  }

  /**
   * @private
   * @param {String} id
   * @param {{ fromViewer?: Boolean }} options
   */
  _activateTab(id, { fromViewer }) {
    this.$['*tabId'] = id;

    if (id === TabId.CROP) {
      this.$['*faderEl'].deactivate();
      this.$['*cropperEl'].activate(this.$['*imageSize'], { fromViewer });
    } else {
      this.$['*faderEl'].activate({ url: this.$['*originalUrl'], fromViewer });
      this.$['*cropperEl'].deactivate();
    }

    for (const tabId of ALL_TABS) {
      const isCurrentTab = tabId === id;

      const tabToggleEl = this.ref[`tab-toggle-${tabId}`];
      tabToggleEl.active = isCurrentTab;

      if (isCurrentTab) {
        this._renderControlsList(id);
        this._syncTabIndicator();
      } else {
        this._unmountTabControls(tabId);
      }
      this.$[`presence.tabContent.${tabId}`] = isCurrentTab;
    }
  }

  /**
   * @private
   * @param {String} tabId
   */
  _unmountTabControls(tabId) {
    const listEl = this.ref[`controls-list-${tabId}`];
    if (listEl) {
      listEl.innerHTML = '';
    }
  }

  /** @private */
  _syncTabIndicator() {
    const tabToggleEl = this.ref[`tab-toggle-${this.$['*tabId']}`];
    const indicatorEl = this.ref['tabs-indicator'];
    indicatorEl.style.transform = `translateX(${tabToggleEl.offsetLeft}px)`;
  }

  /** @private */
  _preloadEditedImage() {
    if (this.$['*imgContainerEl'] && this.$['*originalUrl']) {
      const width = this.$['*imgContainerEl'].offsetWidth;
      const src = this.proxyUrl(viewerImageSrc(this.$['*originalUrl'], width, this.$['*editorTransformations']));
      this._cancelPreload?.();
      const { cancel } = batchPreloadImages([src]);
      this._cancelPreload = () => {
        cancel();
        this._cancelPreload = undefined;
      };
    }
  }

  /**
   * @private
   * @param {boolean} show
   */
  _showLoader(show) {
    this.$.showLoader = show;
  }

  _updateInfoTooltip = debounce(() => {
    const transformations = this.$['*editorTransformations'];
    /** @type {keyof COLOR_OPERATIONS_CONFIG} */
    const currentOperation = this.$['*currentOperation'];
    let text = '';
    let visible = false;

    if (this.$['*tabId'] === TabId.FILTERS) {
      visible = true;
      if (this.$['*currentFilter'] && transformations?.filter?.name === this.$['*currentFilter']) {
        const value = transformations?.filter?.amount || 100;
        text = `${this.$['*currentFilter']} ${value}`;
      } else {
        text = this.l10n(FAKE_ORIGINAL_FILTER);
      }
    } else if (this.$['*tabId'] === TabId.TUNING && currentOperation) {
      visible = true;
      const value = transformations?.[currentOperation] || COLOR_OPERATIONS_CONFIG[currentOperation].zero;
      text = `${this.l10n(currentOperation)} ${value}`;
    }
    if (visible) {
      this.$['*operationTooltip'] = text;
    }
    this.ref['tooltip-el'].classList.toggle('info-tooltip_visible', visible);
  }, 0);

  initCallback() {
    super.initCallback();

    this.$['*sliderEl'] = this.ref['slider-el'];

    this.sub('*imageSize', (imageSize) => {
      if (imageSize) {
        setTimeout(() => {
          this._activateTab(this.$['*tabId'], { fromViewer: true });
        }, 0);
      }
    });

    this.sub('*editorTransformations', (editorTransformations) => {
      const appliedFilter = editorTransformations?.filter?.name;
      if (this.$['*currentFilter'] !== appliedFilter) {
        this.$['*currentFilter'] = appliedFilter;
      }
    });

    this.sub('*currentFilter', () => {
      this._updateInfoTooltip();
    });

    this.sub('*currentOperation', () => {
      this._updateInfoTooltip();
    });

    this.sub('*tabId', () => {
      this._updateInfoTooltip();
    });

    this.sub('*originalUrl', () => {
      this.$['*faderEl']?.deactivate();
    });

    this.sub('*editorTransformations', (transformations) => {
      this._preloadEditedImage();
      if (this.$['*faderEl']) {
        this.$['*faderEl'].setTransformations(transformations);
      }
    });

    this.sub('*loadingOperations', (/** @type {import('./types.js').LoadingOperations} */ loadingOperations) => {
      let anyLoading = false;
      for (const [, mapping] of loadingOperations.entries()) {
        if (anyLoading) {
          break;
        }
        for (const [, loading] of mapping.entries()) {
          if (loading) {
            anyLoading = true;
            break;
          }
        }
      }
      this._debouncedShowLoader(anyLoading);
    });

    this.sub('*showSlider', (showSlider) => {
      this.$['presence.subToolbar'] = showSlider;
      this.$['presence.mainToolbar'] = !showSlider;
    });

    this.sub('*tabList', (tabList) => {
      this.$['presence.tabToggles'] = tabList.length > 1;
      for (const tabId of ALL_TABS) {
        this.$[`presence.tabToggle.${tabId}`] = tabList.includes(tabId);
        const toggleEl = this.ref[`tab-toggle-${tabId}`];
        toggleEl.style.gridColumn = tabList.indexOf(tabId) + 1;
      }

      if (!tabList.includes(this.$['*tabId'])) {
        this._activateTab(tabList[0], { fromViewer: false });
      }
    });

    this._updateInfoTooltip();
  }
}

EditorToolbar.template = /* HTML */ `
  <lr-line-loader-ui set="active: showLoader"></lr-line-loader-ui>
  <div class="info-tooltip_container">
    <div class="info-tooltip_wrapper">
      <div ref="tooltip-el" class="info-tooltip info-tooltip_hidden">{{*operationTooltip}}</div>
    </div>
  </div>
  <div class="toolbar-container">
    <lr-presence-toggle
      role="tablist"
      class="sub-toolbar"
      set="visible: presence.mainToolbar; styles: presence.subTopToolbarStyles"
    >
      <div class="tab-content-row">${ALL_TABS.map(renderTabContent).join('')}</div>
      <div class="controls-row">
        <lr-presence-toggle class="tab-toggles" set="visible: presence.tabToggles; styles: presence.tabTogglesStyles">
          <div ref="tabs-indicator" class="tab-toggles_indicator"></div>
          ${ALL_TABS.map(renderTabToggle).join('')}
        </lr-presence-toggle>
        <lr-btn-ui style="order: -1" theme="secondary-icon" icon="closeMax" set="onclick: on.cancel"> </lr-btn-ui>
        <lr-btn-ui theme="primary-icon" icon="done" set="onclick: on.apply"> </lr-btn-ui>
      </div>
    </lr-presence-toggle>
    <lr-presence-toggle class="sub-toolbar" set="visible: presence.subToolbar; styles: presence.subBottomToolbarStyles">
      <div class="slider">
        <lr-editor-slider ref="slider-el"></lr-editor-slider>
      </div>
      <div class="controls-row">
        <lr-btn-ui theme="secondary" set="onclick: on.cancelSlider;" l10n="@text:cancel"> </lr-btn-ui>
        <lr-btn-ui theme="primary" set="onclick: on.applySlider;" l10n="@text:apply"> </lr-btn-ui>
      </div>
    </lr-presence-toggle>
  </div>
`;
