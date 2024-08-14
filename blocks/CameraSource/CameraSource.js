import { html } from '../../symbiote.js';
import { ActivityBlock } from '../../abstract/ActivityBlock.js';
import { UploaderBlock } from '../../abstract/UploaderBlock.js';
import { UploadSource } from '../utils/UploadSource.js';
import { canUsePermissionsApi } from '../utils/abilities.js';
import { debounce } from '../utils/debounce.js';

export class CameraSource extends UploaderBlock {
  couldBeCtxOwner = true;
  activityType = ActivityBlock.activities.CAMERA;

  /** @private */
  _unsubPermissions = null;

  init$ = {
    ...this.init$,
    video: null,
    videoTransformCss: null,
    shotBtnDisabled: true,
    videoHidden: true,
    messageHidden: true,
    requestBtnHidden: canUsePermissionsApi(),
    cameraSelectOptions: null,
    cameraSelectHidden: true,
    l10nMessage: '',

    onCameraSelectChange: (e) => {
      /** @type {String} */
      this._selectedCameraId = e.target.value;
      this._capture();
    },
    onCancel: () => {
      this.historyBack();
    },
    onShot: () => {
      this._shot();
    },
    onRequestPermissions: () => {
      this._capture();
    },
  };

  /** @private */
  _onActivate = () => {
    if (canUsePermissionsApi()) {
      this._subscribePermissions();
    }
    this._capture();
  };

  /** @private */
  _onDeactivate = () => {
    if (this._unsubPermissions) {
      this._unsubPermissions();
    }

    this._stopCapture();
  };

  /** @private */
  _handlePermissionsChange = () => {
    this._capture();
  };

  /**
   * @private
   * @param {'granted' | 'denied' | 'prompt'} state
   */
  _setPermissionsState = debounce((state) => {
    this.classList.toggle('uc-initialized', state === 'granted');

    if (state === 'granted') {
      this.set$({
        videoHidden: false,
        shotBtnDisabled: false,
        messageHidden: true,
      });
    } else if (state === 'prompt') {
      this.$.l10nMessage = 'camera-permissions-prompt';
      this.set$({
        videoHidden: true,
        shotBtnDisabled: true,
        messageHidden: false,
      });
      this._stopCapture();
    } else {
      this.$.l10nMessage = 'camera-permissions-denied';

      this.set$({
        videoHidden: true,
        shotBtnDisabled: true,
        messageHidden: false,
      });
      this._stopCapture();
    }
  }, 300);

  /** @private */
  async _subscribePermissions() {
    try {
      // @ts-ignore
      let permissionsResponse = await navigator.permissions.query({ name: 'camera' });
      permissionsResponse.addEventListener('change', this._handlePermissionsChange);
    } catch (err) {
      console.log('Failed to use permissions API. Fallback to manual request mode.', err);
      this._capture();
    }
  }

  /** @private */
  async _capture() {
    let constr = {
      video: {
        width: {
          ideal: 1920,
        },
        height: {
          ideal: 1080,
        },
        frameRate: {
          ideal: 30,
        },
      },
      audio: false,
    };
    if (this._selectedCameraId) {
      constr.video.deviceId = {
        exact: this._selectedCameraId,
      };
    }
    /** @private */
    this._canvas = document.createElement('canvas');
    /** @private */
    this._ctx = this._canvas.getContext('2d');

    try {
      this._setPermissionsState('prompt');
      let stream = await navigator.mediaDevices.getUserMedia(constr);
      stream.addEventListener('inactive', () => {
        this._setPermissionsState('denied');
      });
      this.$.video = stream;
      /** @private */
      this._capturing = true;
      this._setPermissionsState('granted');
    } catch (err) {
      this._setPermissionsState('denied');
      console.error('Failed to capture camera', err);
    }
  }

  /** @private */
  _stopCapture() {
    if (this._capturing) {
      this.$.video?.getTracks()[0].stop();
      this.$.video = null;
      this._capturing = false;
    }
  }

  /** @private */
  _shot() {
    this._canvas.height = this.ref.video['videoHeight'];
    this._canvas.width = this.ref.video['videoWidth'];
    // @ts-ignore
    this._ctx.drawImage(this.ref.video, 0, 0);
    const date = Date.now();
    const name = `camera-${date}.jpeg`;
    const format = 'image/jpeg';
    this._canvas.toBlob((blob) => {
      let file = new File([blob], name, {
        lastModified: date,
        type: format,
      });
      this.api.addFileFromObject(file, { source: UploadSource.CAMERA });
      this.set$({
        '*currentActivity': ActivityBlock.activities.UPLOAD_LIST,
      });
    }, format);
  }

  async initCallback() {
    super.initCallback();
    this.registerActivity(this.activityType, {
      onActivate: this._onActivate,
      onDeactivate: this._onDeactivate,
    });

    this.subConfigValue('cameraMirror', (val) => {
      this.$.videoTransformCss = val ? 'scaleX(-1)' : null;
    });

    try {
      let deviceList = await navigator.mediaDevices.enumerateDevices();
      let cameraSelectOptions = deviceList
        .filter((info) => {
          return info.kind === 'videoinput';
        })
        .map((info, idx) => {
          return {
            text: info.label.trim() || `${this.l10n('caption-camera')} ${idx + 1}`,
            value: info.deviceId,
          };
        });
      if (cameraSelectOptions.length > 1) {
        this.$.cameraSelectOptions = cameraSelectOptions;
        this.$.cameraSelectHidden = false;
      }
      this._selectedCameraId = cameraSelectOptions[0]?.value;
    } catch (err) {
      // mediaDevices isn't available for HTTP
      // TODO: handle this case
    }
  }
}

CameraSource.template = html`
  <uc-activity-header>
    <button type="button" class="uc-mini-btn" set="onclick: *historyBack">
      <uc-icon name="back"></uc-icon>
    </button>
    <div set="@hidden: !cameraSelectHidden">
      <uc-icon name="camera"></uc-icon>
      <span l10n="caption-camera"></span>
    </div>
    <uc-select
      class="uc-camera-select"
      set="options: cameraSelectOptions; @hidden: cameraSelectHidden; onchange: onCameraSelectChange"
    >
    </uc-select>
    <button type="button" class="uc-mini-btn uc-close-btn" set="onclick: *closeModal">
      <uc-icon name="close"></uc-icon>
    </button>
  </uc-activity-header>
  <div class="uc-content">
    <video
      autoplay
      playsinline
      set="srcObject: video; style.transform: videoTransformCss; @hidden: videoHidden"
      ref="video"
    ></video>
    <div class="uc-message-box" set="@hidden: messageHidden">
      <span l10n="l10nMessage"></span>
      <button
        type="button"
        set="onclick: onRequestPermissions; @hidden: requestBtnHidden"
        l10n="camera-permissions-request"
      ></button>
    </div>
    <button type="button" class="uc-shot-btn" set="onclick: onShot; @disabled: shotBtnDisabled">
      <uc-icon name="camera"></uc-icon>
    </button>
  </div>
`;
