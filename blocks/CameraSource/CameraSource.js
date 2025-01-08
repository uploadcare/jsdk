//@ts-nocheck
import { ActivityBlock } from '../../abstract/ActivityBlock.js';
import { UploaderBlock } from '../../abstract/UploaderBlock.js';
import { canUsePermissionsApi } from '../utils/abilities.js';
import { debounce } from '../utils/debounce.js';
import { UploadSource } from '../utils/UploadSource.js';

const DEFAULT_VIDEO_CONFIG = {
  width: {
    ideal: 1920,
  },
  height: {
    ideal: 1080,
  },
  frameRate: {
    ideal: 30,
  },
};

const DEFAULT_PERMISSIONS = ['camera', 'microphone'];

/**
 * @param {Number} time
 * @returns
 */
function formatTime(time) {
  const minutes = Math.floor(time / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(time % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

const DEFAULT_PICTURE_FORMAT = 'image/jpeg';
const DEFAULT_VIDEO_FORMAT = 'video/webm';

/** @typedef {'photo' | 'video'} CameraTabId */

/** @typedef {'shot' | 'retake' | 'accept' | 'play' | 'stop' | 'pause' | 'resume'} CameraStatus */

export class CameraSource extends UploaderBlock {
  couldBeCtxOwner = true;
  activityType = ActivityBlock.activities.CAMERA;

  /** @private */
  _unsubPermissions = null;

  /** @type {BlobPart[]} */
  _chunks = [];

  /** @type {MediaRecorder | null} */
  _mediaRecorder = null;

  /** @type {MediaStream | null} */
  _stream = null;

  /** @type {string | null} */
  _selectedAudioId = null;

  /** @type {string | null} */
  _selectedCameraId = null;

  constructor() {
    super();

    this.init$ = {
      ...this.init$,
      video: null,
      videoTransformCss: null,

      videoHidden: true,
      messageHidden: true,
      requestBtnHidden: canUsePermissionsApi(),
      cameraSelectOptions: null,
      cameraSelectHidden: true,
      l10nMessage: '',

      // This is refs
      switcher: null,
      panels: null,
      timer: null,

      timerHidden: true,
      cameraHidden: true,
      cameraActionsHidden: true,

      audioSelectOptions: null,
      audioSelectHidden: true,
      audioSelectDisabled: true,
      audioToggleMicorphoneHidden: true,

      tabCameraHidden: true,
      tabVideoHidden: true,

      currentIcon: 'camera-full',
      currentTimelineIcon: 'play',
      toggleMicorphoneIcon: 'microphone',

      /** @type {Number} */
      _startTime: 0,
      /** @type {Number} */
      _elapsedTime: 0,
      _animationFrameId: null,

      mutableClassButton: 'uc-shot-btn uc-camera-action',

      /** @param {Event} e */
      onCameraSelectChange: (e) => {
        this._selectedCameraId = e.target.value;
        this._capture();
      },

      /** @param {Event} e */
      onAudioSelectChange: (e) => {
        this._selectedAudioId = e.target.value;
        this._capture();
      },

      onCancel: () => {
        this.historyBack();
      },

      onShot: () => this._shot(),

      onRequestPermissions: () => this._capture(),

      /** General method for photo and video capture */
      onStartCamera: () => this._chooseActionWithCamera(),

      onStartRecording: () => this._startRecording(),

      onStopRecording: () => this._stopRecording(),

      onToggleRecording: () => this._toggleRecording(),

      onToggleAudio: () => this._toggleEnableAudio(),

      onRetake: () => this._retake(),

      onAccept: () => this._accept(),

      /** @param {MouseEvent} e */
      onClickTab: (e) => {
        const id = /** @type {HTMLElement} */ (e.currentTarget).getAttribute('data-id');
        if (id) this._handleActiveTab(/** @type {CameraTabId} */ (id));
      },
    };
  }

  _chooseActionWithCamera = () => {
    if (this._activeTab === CameraSource.types.PHOTO) {
      this._shot();
    }

    if (this._activeTab === CameraSource.types.VIDEO) {
      if (this._mediaRecorder?.state === 'recording') {
        this._stopRecording();
        return;
      }

      this._startRecording();
    }
  };

  _updateTimer = () => {
    const currentTime = Math.floor((performance.now() - this.$._startTime + this.$._elapsedTime) / 1000);

    if (typeof this.cfg.maxVideoRecordingDuration === 'number' && this.cfg.maxVideoRecordingDuration > 0) {
      const remainingTime = this.cfg.maxVideoRecordingDuration - currentTime;

      if (remainingTime <= 0) {
        this.ref.timer.textContent = formatTime(remainingTime);
        this._stopRecording();
        return;
      }

      this.ref.timer.textContent = formatTime(remainingTime);
    } else {
      this.ref.timer.textContent = formatTime(currentTime);
    }

    this._animationFrameId = requestAnimationFrame(this._updateTimer);
  };

  _startTimer = () => {
    this.$._startTime = performance.now();
    this.$._elapsedTime = 0;

    this._updateTimer();
  };

  _stopTimer = () => {
    if (this._animationFrameId) cancelAnimationFrame(this._animationFrameId);
  };

  _startTimeline = () => {
    const currentTime = this.ref.video.currentTime;
    const duration = this.ref.video.duration;

    this.ref.line.style.transform = `scaleX(${currentTime / duration})`;
    this.ref.timer.textContent = formatTime(currentTime);
    this._animationFrameId = requestAnimationFrame(this._startTimeline);
  };

  _stopTimeline = () => {
    if (this._animationFrameId) cancelAnimationFrame(this._animationFrameId);
  };

  _startRecording = () => {
    try {
      this._chunks = [];
      this._options = {
        ...this.cfg.mediaRecorerOptions,
      };

      const { mimeType } = this.cfg.mediaRecorerOptions || {};

      if (mimeType && MediaRecorder.isTypeSupported(mimeType)) {
        this._options.mimeType = mimeType;
      } else if (MediaRecorder.isTypeSupported(DEFAULT_VIDEO_FORMAT)) {
        this._options.mimeType = DEFAULT_VIDEO_FORMAT;
      } else {
        this._options.mimeType = 'video/mp4';
      }

      if (this._stream) {
        this._mediaRecorder = new MediaRecorder(this._stream, this._options);
        this._mediaRecorder.start();

        this._mediaRecorder.addEventListener('dataavailable', (e) => {
          this._chunks.push(e.data);
        });

        this._startTimer();

        this.classList.add('uc-recording');
        this._setCameraState(CameraSource.events.PLAY);
      }
    } catch (error) {
      console.error('Failed to start recording', error);
    }
  };

  /** @private */
  _stopRecording = () => {
    this._mediaRecorder?.addEventListener('stop', () => {
      this._previewVideo();

      this._stopTimer();

      this._setCameraState(CameraSource.events.STOP);
    });

    this._mediaRecorder?.stop();
    this.classList.remove('uc-recording');
  };

  /** This method is used to toggle recording pause/resume */
  _toggleRecording = () => {
    if (this._mediaRecorder?.state === 'recording') return;

    if (!this.ref.video.paused && !this.ref.video.ended && this.ref.video.readyState > 2) {
      this.ref.video.pause();
    } else if (this.ref.video.paused) {
      this.ref.video.play();
    }
  };

  _toggleEnableAudio = () => {
    this._stream?.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;

      this.$.toggleMicorphoneIcon = !track.enabled ? 'microphone-mute' : 'microphone';
      this.$.audioSelectDisabled = !track.enabled;
    });
  };

  /**
   * Previewing the video that was recorded on the camera
   *
   * @private
   */
  _previewVideo = () => {
    try {
      const blob = new Blob(this._chunks, {
        type: this._mediaRecorder?.mimeType,
      });

      const videoURL = URL.createObjectURL(blob);

      this.ref.video.muted = false;
      this.ref.video.volume = 1;
      this.$.video = null;
      this.ref.video.src = videoURL;

      this.ref.video.addEventListener('play', () => {
        this._startTimeline();
        this.set$({
          currentTimelineIcon: 'pause',
        });
      });

      this.ref.video.addEventListener('pause', () => {
        this.set$({
          currentTimelineIcon: 'play',
        });
        this._stopTimeline();
      });
    } catch (error) {
      console.error('Failed to preview video', error);
    }
  };

  _retake = () => {
    this._setCameraState(CameraSource.events.RETAKE);

    /** Reset video */
    if (this._activeTab === CameraSource.types.VIDEO) {
      this.$.video = this._stream;
      this.ref.video.muted = true;
    }

    this.ref.video.play();
  };

  _accept = () => {
    this._setCameraState(CameraSource.events.ACCEPT);

    if (this._activeTab === CameraSource.types.PHOTO) {
      this._canvas?.toBlob((blob) => {
        const file = this._createFile('camera', 'jpeg', DEFAULT_PICTURE_FORMAT, blob);
        this._toSend(file);
      }, DEFAULT_PICTURE_FORMAT);
      return;
    }

    const blob = new Blob(this._chunks, {
      type: this._mediaRecorder?.mimeType,
    });

    const ext = this._guessExtensionByMime(this._mediaRecorder?.mimeType);
    const file = this._createFile('video', ext, `video/${ext}`, blob);

    this._toSend(file);
    this._chunks = [];
  };

  /** @param {CameraStatus} status */
  _handlePhoto = (status) => {
    if (status === CameraSource.events.SHOT) {
      this.set$({
        tabVideoHidden: true,
        cameraHidden: true,
        tabCameraHidden: true,
        cameraActionsHidden: false,
        cameraSelectHidden: true,
      });
    }

    if (status === CameraSource.events.RETAKE || status === CameraSource.events.ACCEPT) {
      this.set$({
        tabVideoHidden: !this.cfg.enableVideoRecording,
        cameraHidden: false,
        tabCameraHidden: false,
        cameraActionsHidden: true,
        cameraSelectHidden: this.cameraDevices.length <= 1,
      });
    }
  };

  /** @param {CameraStatus} status */
  _handleVideo = (status) => {
    if (status === CameraSource.events.PLAY) {
      this.set$({
        timerHidden: false,
        tabCameraHidden: true,

        cameraSelectHidden: true,
        audioSelectHidden: true,

        currentTimelineIcon: 'pause',
        currentIcon: 'square',
        mutableClassButton: 'uc-shot-btn uc-camera-action uc-stop-record',
      });
    }

    if (status === CameraSource.events.STOP) {
      this.set$({
        timerHidden: false,
        cameraHidden: true,
        audioToggleMicorphoneHidden: true,
        cameraActionsHidden: false,
      });
    }

    if (status === CameraSource.events.RETAKE || status === CameraSource.events.ACCEPT) {
      this.set$({
        timerHidden: true,
        tabCameraHidden: false,
        cameraHidden: false,
        cameraActionsHidden: true,
        audioToggleMicorphoneHidden: !this.cfg.enableAudioRecording,
        currentIcon: 'video-camera-full',
        mutableClassButton: 'uc-shot-btn uc-camera-action',

        audioSelectHidden: !this.cfg.enableAudioRecording || this.audioDevices.length <= 1,
        cameraSelectHidden: this.cameraDevices.length <= 1,
      });
    }
  };

  /**
   * @private
   * @param {CameraStatus} status
   */
  _setCameraState = (status) => {
    if (
      this._activeTab === CameraSource.types.PHOTO &&
      (status === 'shot' || status === 'retake' || status === 'accept')
    ) {
      this._handlePhoto(status);
    }

    if (
      this._activeTab === CameraSource.types.VIDEO &&
      (status === 'play' ||
        status === 'stop' ||
        status === 'retake' ||
        status === 'accept' ||
        status === 'pause' ||
        status === 'resume')
    ) {
      this._handleVideo(status);
    }
  };

  /** @private */
  _shot() {
    this._setCameraState('shot');

    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');

    if (!this._ctx) {
      throw new Error('Failed to get canvas context');
    }

    this._canvas.height = this.ref.video['videoHeight'];
    this._canvas.width = this.ref.video['videoWidth'];

    if (this.cfg.cameraMirror) {
      this._ctx.translate(this._canvas.width, 0);
      this._ctx.scale(-1, 1);
    }

    this._ctx.drawImage(this.ref.video, 0, 0);
    this.ref.video.pause();
  }

  /**
   * @private
   * @param {CameraTabId} tabId
   */
  _handleActiveTab = (tabId) => {
    this.ref.switcher.querySelectorAll('button').forEach((/** @type {HTMLElement} */ btn) => {
      btn.classList.toggle('uc-active', btn.getAttribute('data-id') === tabId);
    });

    if (tabId === CameraSource.types.PHOTO) {
      this.set$({
        currentIcon: 'camera-full',
        audioSelectHidden: true,
        audioToggleMicorphoneHidden: true,
      });
    }

    if (tabId === CameraSource.types.VIDEO) {
      this.set$({
        currentTimelineIcon: 'play',
        currentIcon: 'video-camera-full',

        audioSelectHidden: !this.cfg.enableAudioRecording || this.audioDevices.length <= 1,
        audioToggleMicorphoneHidden: !this.cfg.enableAudioRecording,
      });
    }

    this._activeTab = tabId;
  };

  /**
   * @param {'camera' | 'video'} type
   * @param {'jpeg' | 'webm'} ext
   * @param {String} format
   * @param {Blob} blob
   */
  _createFile = (type, ext, format, blob) => {
    const date = Date.now();
    const name = `${type}-${date}.${ext}`;

    const file = new File([blob], name, {
      lastModified: date,
      type: format,
    });

    return file;
  };

  /** @param {String | undefined} mime */
  _guessExtensionByMime(mime) {
    const knownContainers = {
      mp4: 'mp4',
      ogg: 'ogg',
      webm: 'webm',
      quicktime: 'mov',
      'x-matroska': 'mkv',
    };

    // MediaRecorder.mimeType returns empty string in Firefox.
    // Firefox record video as WebM now by default.
    // @link https://bugzilla.mozilla.org/show_bug.cgi?id=1512175
    if (mime === '') {
      return 'webm';
    }

    // e.g. "video/x-matroska;codecs=avc1,opus"
    if (mime) {
      // e.g. ["video", "x-matroska;codecs=avc1,opus"]
      /** @type {string | string[]} */ (mime) = mime.split('/');
      if (mime?.[0] === 'video') {
        // e.g. "x-matroska;codecs=avc1,opus"
        mime = mime.slice(1).join('/');
        // e.g. "x-matroska"
        const container = mime?.split(';')[0];
        // e.g. "mkv"
        if (knownContainers[container]) {
          return knownContainers[container];
        }
      }
    }

    // In all other cases just return the base extension for all times
    return 'avi';
  }

  /**
   * The send file to the server
   *
   * @param {File} file
   */
  _toSend = (file) => {
    this.api.addFileFromObject(file, { source: UploadSource.CAMERA });
    this.set$({
      '*currentActivity': ActivityBlock.activities.UPLOAD_LIST,
    });
  };

  /**
   * @private
   * @param {'granted' | 'denied' | 'prompt'} state
   */
  _setPermissionsState = debounce((state) => {
    this.classList.toggle('uc-initialized', state === 'granted');

    const visibleAudio = this._activeTab === CameraSource.types.VIDEO && this.cfg.enableAudioRecording;
    const currentIcon = this._activeTab === CameraSource.types.PHOTO ? 'camera-full' : 'video-camera-full';

    if (state === 'granted') {
      this.set$({
        videoHidden: false,
        cameraHidden: false,
        tabCameraHidden: false,
        messageHidden: true,
        timerHidden: true,

        currentIcon,
        audioToggleMicorphoneHidden: !visibleAudio,
        audioSelectHidden: !visibleAudio,
      });
    } else if (state === 'prompt') {
      this.$.l10nMessage = 'camera-permissions-prompt';

      this.set$({
        videoHidden: true,
        cameraHidden: true,
        tabCameraHidden: true,
        messageHidden: false,
      });

      this._stopCapture();
    } else {
      this.$.l10nMessage = 'camera-permissions-denied';

      this.set$({
        videoHidden: true,
        messageHidden: false,

        tabCameraHidden: false,
        tabVideoHidden: !this.cfg.enableVideoRecording,

        cameraActionsHidden: true,

        mutableClassButton: 'uc-shot-btn uc-camera-action',
      });

      this._stopCapture();
    }
  }, 300);

  _makeStreamInactive = () => {
    if (!this._stream) return false;

    const audioTracks = this._stream?.getAudioTracks();
    const videoTracks = this._stream?.getVideoTracks();

    /** @type {MediaStreamTrack[]} */ (audioTracks).forEach((track) => track.stop());
    /** @type {MediaStreamTrack[]} */ (videoTracks).forEach((track) => track.stop());
  };

  _stopCapture = () => {
    if (this._capturing) {
      this.ref.video.volume = 0;
      this.$.video?.getTracks()[0].stop();
      this.$.video = null;

      this._makeStreamInactive();
      this._stopTimer();

      this._capturing = false;
    }
  };

  _capture = async () => {
    const constraints = {
      video: {
        aspectRatio: this.cfg.aspectRatio,
      },
      audio: this.cfg.enableAudioRecording ? {} : false,
    };

    if (this._selectedCameraId) {
      constraints.video.deviceId = {
        exact: this._selectedCameraId,
      };
    }

    if (this._selectedAudioId && this.cfg.enableAudioRecording) {
      constraints.audio = {
        deviceId: {
          exact: this._selectedAudioId,
        },
      };
    }

    // Mute the video to prevent feedback for Firefox
    this.ref.video.volume = 0;

    try {
      this._setPermissionsState('prompt');
      this._stream = await navigator.mediaDevices.getUserMedia(constraints);

      this._stream.addEventListener('inactive', () => {
        this._setPermissionsState('denied');
      });

      this.$.video = this._stream;
      /** @private */
      this._capturing = true;
      this._setPermissionsState('granted');
    } catch (error) {
      this._setPermissionsState('denied');
      console.log('Failed to capture camera', error);
    }
  };

  _handlePermissionsChange = () => {
    this._capture();
  };

  _permissionAccess = async () => {
    try {
      for (const permission of DEFAULT_PERMISSIONS) {
        // @ts-ignore  https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API
        this[`${permission}Response`] = await navigator.permissions.query({ name: permission });

        this[`${permission}Response`].addEventListener('change', this._handlePermissionsChange);
      }
    } catch (error) {
      console.log('Failed to use permissions API. Fallback to manual request mode.', error);
      this._capture();
    }
  };

  _getPermission = () => {};

  _requestDeviceAccess = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: this.cfg.enableAudioRecording });
      await this._getDevices();

      navigator.mediaDevices.addEventListener('devicechange', this._getDevices);
    } catch (error) {
      console.log('Failed to get user media', error);
    }
  };

  _getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      this.cameraDevices = devices
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({
          text: device.label.trim() || `${this.l10n('caption-camera')} ${index + 1}`,
          value: device.deviceId,
        }));

      this.audioDevices =
        this.cfg.enableAudioRecording &&
        devices
          .filter((device) => device.kind === 'audioinput')
          .map((device) => ({
            text: device.label.trim(),
            value: device.deviceId,
          }));

      if (this.cameraDevices.length > 1) {
        this.set$({
          cameraSelectOptions: this.cameraDevices,
          cameraSelectHidden: false,
        });
      }
      this._selectedCameraId = this.cameraDevices[0]?.value;

      if (this.audioDevices.length > 1) {
        this.set$({
          audioSelectOptions: this.audioDevices,
          audioSelectHidden: false,
        });
      }
      this._selectedAudioId = this.audioDevices[0]?.value;
    } catch (error) {
      console.log('Failed to get devices', error);
    }
  };

  _onActivate = async () => {
    await this._permissionAccess();
    await this._requestDeviceAccess();
    await this._capture();
  };

  _onDeactivate = async () => {
    if (this._unsubPermissions) {
      this._unsubPermissions();
    }

    /** Calling this method here because safari and firefox don't support the inactive event yet */
    const isChromium = !!window.chrome;
    if (!isChromium) {
      this._setPermissionsState('denied');
    }

    this._stopCapture();
  };

  initCallback() {
    super.initCallback();
    this.registerActivity(this.activityType, {
      onActivate: this._onActivate,
      onDeactivate: this._onDeactivate,
    });

    this.subConfigValue('cameraMirror', (val) => {
      this.$.videoTransformCss = val ? 'scaleX(-1)' : null;
    });

    this.subConfigValue('enableAudioRecording', (val) => {
      this.$.audioToggleMicorphoneHidden = !val;
      this.$.audioSelectDisabled = !val;
    });

    this.subConfigValue('enableVideoRecording', (val) => {
      this.$.tabVideoHidden = !val;
    });

    this.subConfigValue('defaultCameraMode', (val) => {
      if (this.cfg.enableVideoRecording) {
        this._handleActiveTab(val);
        return;
      }

      this._handleActiveTab('photo');
    });
  }

  _destroy() {
    for (const permission of DEFAULT_PERMISSIONS) {
      this[`${permission}Response`]?.removeEventListener('change', this._handlePermissionsChange);
    }

    navigator.mediaDevices?.removeEventListener('devicechange', this._getDevices);
  }

  async destroyCallback() {
    super.destroyCallback();

    this._destroy();
  }
}

CameraSource.types = Object.freeze({
  PHOTO: 'photo',
  VIDEO: 'video',
});

CameraSource.events = Object.freeze({
  IDLE: 'idle',
  SHOT: 'shot',

  PLAY: 'play',
  PAUSE: 'pause',
  RESUME: 'resume',
  STOP: 'stop',

  RETAKE: 'retake',
  ACCEPT: 'accept',
});

CameraSource.template = /* HTML */ `
  <uc-activity-header>
    <button type="button" class="uc-mini-btn" set="onclick: *historyBack" l10n="@title:back">
      <uc-icon name="back"></uc-icon>
    </button>
    <div set="@hidden: !cameraSelectHidden">
      <uc-icon name="camera"></uc-icon>
      <span l10n="caption-camera"></span>
    </div>
    <uc-select
      class="uc-camera-select"
      set="$.options: cameraSelectOptions; @hidden: cameraSelectHidden; onchange: onCameraSelectChange"
    >
    </uc-select>
    <button
      type="button"
      class="uc-mini-btn uc-close-btn"
      set="onclick: *closeModal"
      l10n="@title:a11y-activity-header-button-close"
    >
      <uc-icon name="close"></uc-icon>
    </button>
  </uc-activity-header>
  <div class="uc-content">
    <video
      muted
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
  </div>

  <div class="uc-controls">
    <div ref="switcher" class="uc-switcher" set="@hidden:!timerHidden">
      <button
        data-id="photo"
        type="button"
        class="uc-switch uc-mini-btn"
        set="onclick: onClickTab;  @hidden: tabCameraHidden"
      >
        <uc-icon name="camera"></uc-icon>
      </button>
      <button
        data-id="video"
        type="button"
        class="uc-switch  uc-mini-btn"
        set="onclick: onClickTab; @hidden: tabVideoHidden"
      >
        <uc-icon name="video-camera"></uc-icon>
      </button>
    </div>

    <button class="uc-secondary-btn uc-recording-timer" set="@hidden:timerHidden; onclick: onToggleRecording">
      <uc-icon set="@name: currentTimelineIcon"></uc-icon>
      <span ref="timer"> 00:00 </span>
      <span ref="line" class="uc-line"></span>
    </button>

    <div class="uc-camera-actions uc-camera-action" set="@hidden: cameraActionsHidden">
      <button type="button" class="uc-secondary-btn" set="onclick: onRetake">Retake</button>
      <button type="button" class="uc-primary-btn" set="onclick: onAccept">Accept</button>
    </div>

    <button
      type="button"
      class="uc-shot-btn uc-camera-action"
      set="onclick: onStartCamera; @class: mutableClassButton; @hidden: cameraHidden;"
    >
      <uc-icon set="@name: currentIcon"></uc-icon>
    </button>

    <div class="uc-select">
      <button class="uc-mini-btn uc-btn-microphone" set="onclick: onToggleAudio; @hidden: audioToggleMicorphoneHidden;">
        <uc-icon set="@name:toggleMicorphoneIcon"></uc-icon>
      </button>

      <uc-select
        class="uc-audio-select"
        set="$.options: audioSelectOptions; onchange: onAudioSelectChange; @hidden: audioSelectHidden; @disabled: audioSelectDisabled"
      >
      </uc-select>
    </div>
  </div>
`;
