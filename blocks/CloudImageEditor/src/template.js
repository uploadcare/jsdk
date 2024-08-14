import { html } from '../../../symbiote.js';
import { TRANSPARENT_PIXEL_SRC } from '../../../utils/transparentPixelSrc.js';
import svgIconsSprite from './svg-sprite.js';

export const TEMPLATE = html`
  ${svgIconsSprite}
  <div class="uc-wrapper uc-wrapper_desktop">
    <uc-presence-toggle class="uc-network_problems_splash" set="visible: presence.networkProblems;">
      <div class="uc-network_problems_content">
        <div class="uc-network_problems_icon">
          <uc-icon name="sad"></uc-icon>
        </div>
        <div class="uc-network_problems_text">Network error</div>
      </div>
      <div class="uc-network_problems_footer">
        <uc-btn-ui theme="primary" text="Retry" set="onclick: *on.retryNetwork"></uc-btn-ui>
      </div>
    </uc-presence-toggle>
    <div class="uc-viewport">
      <div class="uc-file_type_outer">
        <div class="uc-file_type">{{fileType}}</div>
      </div>
      <div class="uc-image_container" ref="img-container-el">
        <img src="${TRANSPARENT_PIXEL_SRC}" class="uc-image uc-image_visible_from_editor" ref="img-el" />
        <uc-editor-image-cropper ref="cropper-el"></uc-editor-image-cropper>
        <uc-editor-image-fader ref="fader-el"></uc-editor-image-fader>
      </div>
      <div class="uc-info_pan">{{msg}}</div>
    </div>
    <div class="uc-toolbar">
      <uc-line-loader-ui set="active: showLoader"></uc-line-loader-ui>
      <div class="uc-toolbar_content uc-toolbar_content__editor">
        <uc-editor-toolbar></uc-editor-toolbar>
      </div>
    </div>
  </div>
`;
