// @ts-check
import { html } from '../../../symbiote.js';
import { debounce } from '../../utils/debounce.js';
import { Block } from '../../../abstract/Block.js';
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
    <uc-presence-toggle
      class="uc-tab-toggle"
      set="visible: presence.tabToggle.${id}; styles: presence.tabToggleStyles;"
    >
      <uc-btn-ui
        theme="tab"
        ref="tab-toggle-${id}"
        data-id="${id}"
        icon="${id}"
        set="onclick: on.clickTab; aria-role:tab_role; aria-controls:tab_${id}"
      >
      </uc-btn-ui>
    </uc-presence-toggle>
  `;
}

/** @param {String} id */
function renderTabContent(id) {
  return html`
    <uc-presence-toggle
      id="tab_${id}"
      class="uc-tab-content"
      set="visible: presence.tabContent.${id}; styles: presence.tabContentStyles"
    >
      <uc-editor-scroller hidden-scrollbar>
        <div class="uc-controls-list_align">
          <div
            role="listbox"
            aria-orientation="horizontal"
            class="uc-controls-list_inner"
            ref="controls-list-${id}"
          ></div>
        </div>
      </uc-editor-scroller>
    </uc-presence-toggle>
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
        hidden: 'uc-sub-toolbar--top-hidden',
        visible: 'uc-sub-toolbar--visible',
      },
      'presence.subBottomToolbarStyles': {
        hidden: 'uc-sub-toolbar--bottom-hidden',
        visible: 'uc-sub-toolbar--visible',
      },
      'presence.tabContentStyles': {
        hidden: 'uc-tab-content--hidden',
        visible: 'uc-tab-content--visible',
      },
      'presence.tabToggleStyles': {
        hidden: 'uc-tab-toggle--hidden',
        visible: 'uc-tab-toggle--visible',
      },
      'presence.tabTogglesStyles': {
        hidden: 'uc-tab-toggles--hidden',
        visible: 'uc-tab-toggles--visible',
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
      this.ref['tooltip-el'].classList.toggle('uc-info-tooltip_visible', false);
    }
  }

  /**
   * @private
   * @param {String} operation
   */
  _createOperationControl(operation) {
    let el = new EditorOperationControl();
    // @ts-expect-error TODO: fix
    el.operation = operation;
    return el;
  }

  /**
   * @private
   * @param {String} filter
   */
  _createFilterControl(filter) {
    let el = new EditorFilterControl();
    // @ts-expect-error TODO: fix
    el.filter = filter;
    return el;
  }

  /**
   * @private
   * @param {String} operation
   */
  _createToggleControl(operation) {
    let el = new EditorCropButtonControl();
    // @ts-expect-error TODO: fix
    el.operation = operation;
    return el;
  }

  /**
   * @private
   * @param {String} tabId
   */
  _renderControlsList(tabId) {
    let listEl = this.ref[`controls-list-${tabId}`];
    let fr = document.createDocumentFragment();

    if (tabId === TabId.CROP) {
      this.$.cropOperations.forEach(
        /** @param {string} operation */ (operation) => {
          let el = this._createToggleControl(operation);
          // @ts-ignore
          fr.appendChild(el);
        },
      );
    } else if (tabId === TabId.FILTERS) {
      [FAKE_ORIGINAL_FILTER, ...this.$.filters].forEach((filterId) => {
        let el = this._createFilterControl(filterId);
        // @ts-ignore
        fr.appendChild(el);
      });
    } else if (tabId === TabId.TUNING) {
      this.$.colorOperations.forEach(
        /** @param {string} operation */ (operation) => {
          let el = this._createOperationControl(operation);
          // @ts-ignore
          fr.appendChild(el);
        },
      );
    }

    [...fr.children].forEach((el, idx) => {
      if (idx === fr.childNodes.length - 1) {
        el.classList.add('uc-controls-list_last-item');
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

    for (let tabId of ALL_TABS) {
      let isCurrentTab = tabId === id;

      let tabToggleEl = this.ref[`tab-toggle-${tabId}`];
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
    let listEl = this.ref[`controls-list-${tabId}`];
    if (listEl) {
      listEl.innerHTML = '';
    }
  }

  /** @private */
  _syncTabIndicator() {
    let tabToggleEl = this.ref[`tab-toggle-${this.$['*tabId']}`];
    let indicatorEl = this.ref['tabs-indicator'];
    indicatorEl.style.transform = `translateX(${tabToggleEl.offsetLeft}px)`;
  }

  /** @private */
  async _preloadEditedImage() {
    if (this.$['*imgContainerEl'] && this.$['*originalUrl']) {
      let width = this.$['*imgContainerEl'].offsetWidth;
      let src = await this.proxyUrl(viewerImageSrc(this.$['*originalUrl'], width, this.$['*editorTransformations']));
      this._cancelPreload?.();
      let { cancel } = batchPreloadImages([src]);
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
        let value = transformations?.filter?.amount || 100;
        text = this.$['*currentFilter'] + ' ' + value;
      } else {
        text = this.l10n(FAKE_ORIGINAL_FILTER);
      }
    } else if (this.$['*tabId'] === TabId.TUNING && currentOperation) {
      visible = true;
      let value = transformations?.[currentOperation] || COLOR_OPERATIONS_CONFIG[currentOperation].zero;
      text = this.l10n(currentOperation) + ' ' + value;
    }
    if (visible) {
      this.$['*operationTooltip'] = text;
    }
    this.ref['tooltip-el'].classList.toggle('uc-info-tooltip_visible', visible);
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
      let appliedFilter = editorTransformations?.filter?.name;
      if (this.$['*currentFilter'] !== appliedFilter) {
        this.$['*currentFilter'] = appliedFilter ?? null;
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
      this.$['*faderEl'] && this.$['*faderEl'].deactivate();
    });

    this.sub('*editorTransformations', (transformations) => {
      this._preloadEditedImage();
      if (this.$['*faderEl']) {
        this.$['*faderEl'].setTransformations(transformations);
      }
    });

    this.sub('*loadingOperations', (/** @type {import('./types.js').LoadingOperations} */ loadingOperations) => {
      let anyLoading = false;
      for (let [, mapping] of loadingOperations.entries()) {
        if (anyLoading) {
          break;
        }
        for (let [, loading] of mapping.entries()) {
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

EditorToolbar.template = html`
  <uc-line-loader-ui set="active: showLoader"></uc-line-loader-ui>
  <div class="uc-info-tooltip_container">
    <div class="uc-info-tooltip_wrapper">
      <div ref="tooltip-el" class="uc-info-tooltip uc-info-tooltip_hidden">{{*operationTooltip}}</div>
    </div>
  </div>
  <div class="uc-toolbar-container">
    <uc-presence-toggle
      role="tablist"
      class="uc-sub-toolbar"
      set="visible: presence.mainToolbar; styles: presence.subTopToolbarStyles"
    >
      <div class="uc-tab-content-row">${ALL_TABS.map(renderTabContent).join('')}</div>
      <div class="uc-controls-row">
        <uc-presence-toggle
          class="uc-tab-toggles"
          set="visible: presence.tabToggles; styles: presence.tabTogglesStyles"
        >
          <div ref="tabs-indicator" class="uc-tab-toggles_indicator"></div>
          ${ALL_TABS.map(renderTabToggle).join('')}
        </uc-presence-toggle>
        <uc-btn-ui style="order: -1" theme="secondary-icon" icon="closeMax" set="onclick: on.cancel"> </uc-btn-ui>
        <uc-btn-ui theme="primary-icon" icon="done" set="onclick: on.apply"> </uc-btn-ui>
      </div>
    </uc-presence-toggle>
    <uc-presence-toggle
      class="uc-sub-toolbar"
      set="visible: presence.subToolbar; styles: presence.subBottomToolbarStyles"
    >
      <div class="uc-slider">
        <uc-editor-slider ref="slider-el"></uc-editor-slider>
      </div>
      <div class="uc-controls-row">
        <uc-btn-ui theme="secondary" set="onclick: on.cancelSlider;" l10n="@text:cancel"> </uc-btn-ui>
        <uc-btn-ui theme="primary" set="onclick: on.applySlider;" l10n="@text:apply"> </uc-btn-ui>
      </div>
    </uc-presence-toggle>
  </div>
`;
