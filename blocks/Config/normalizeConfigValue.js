// @ts-check

import { initialConfig } from './initialConfig.js';

/** @param {unknown} value */
const asString = (value) => String(value);
/** @param {unknown} value */
const asNumber = (value) => {
  const number = Number(value);
  if (Number.isNaN(number)) {
    throw new Error(`Invalid number: "${value}"`);
  }
  return number;
};
/** @param {unknown} value */
export const asBoolean = (value) => {
  if (typeof value === 'undefined' || value === null) return false;
  if (typeof value === 'boolean') return value;
  // for attr like multiple="true" (react will pass it as string)
  if (value === 'true') return true;
  // for attr flags like multiple="" (some other libs will pass it as empty string)
  if (value === '') return true;
  // for attr like multiple="false" (react will pass it as string)
  if (value === 'false') return false;
  throw new Error(`Invalid boolean: "${value}"`);
};
/** @param {unknown} value */
const asStore = (value) => (value === 'auto' ? value : asBoolean(value));

/** @param {unknown} value */
const asCameraCapture = (value) => {
  const strValue = asString(value);
  if (strValue !== 'user' && strValue !== 'environment' && strValue !== '') {
    throw new Error(`Invalid "cameraCapture" value: "${strValue}"`);
  }
  return strValue;
};

/** @param {unknown} value */
const asCameraTab = (value) => {
  const strValue = asString(value);
  if (strValue !== 'photo' && strValue !== 'video') {
    throw new Error(`Invalid "CameraTab" value: "${strValue}"`);
  }
  return strValue;
};

/** @param {unknown} value */
const asMetadata = (value) => {
  if (typeof value === 'object' && !Array.isArray(value)) {
    return /** @type {import('../../types').Metadata} */ (value);
  }
  if (typeof value === 'function') {
    return /** @type {import('../../types').MetadataCallback} */ (value);
  }

  throw new Error('Invalid metadata value. Must be an object or function.');
};

/**
 * @template {{}} T
 * @param {unknown} value
 * @returns {T}
 */
const asObject = (value) => {
  if (typeof value === 'object') {
    return /** @type {T} */ (value);
  }

  throw new Error('Invalid value. Must be an object.');
};

/**
 * @template {Function} T
 * @param {unknown} value
 * @returns {T}
 */
const asFunction = (value) => {
  if (typeof value === 'function') {
    return /** @type {T} */ (value);
  }

  throw new Error('Invalid value. Must be a function.');
};

/**
 * @template {Function[] | string | {}} T
 * @param {unknown} value
 * @returns {T}
 */
const asArray = (value) => {
  if (Array.isArray(value)) {
    return /** @type {T} */ (value);
  }

  throw new Error('Must be an array.');
};

/**
 * @type {{
 *   [Key in keyof import('../../types').ConfigType]: (
 *     value: unknown,
 *   ) => import('../../types').ConfigType[Key] | undefined;
 * }}
 */
const mapping = {
  pubkey: asString,
  multiple: asBoolean,
  multipleMin: asNumber,
  multipleMax: asNumber,

  confirmUpload: asBoolean,
  imgOnly: asBoolean,
  accept: asString,
  externalSourcesPreferredTypes: asString,
  store: asStore,
  cameraMirror: asBoolean,
  cameraCapture: asCameraCapture,
  sourceList: asString,
  maxLocalFileSizeBytes: asNumber,
  thumbSize: asNumber,
  showEmptyList: asBoolean,
  useLocalImageEditor: asBoolean,
  useCloudImageEditor: asBoolean,
  cloudImageEditorTabs: asString,
  removeCopyright: asBoolean,
  cropPreset: asString,
  imageShrink: asString,

  modalScrollLock: asBoolean,
  modalBackdropStrokes: asBoolean,

  sourceListWrap: asBoolean,

  remoteTabSessionKey: asString,
  cdnCname: asString,
  baseUrl: asString,
  socialBaseUrl: asString,
  secureSignature: asString,
  secureExpire: asString,
  secureDeliveryProxy: asString,
  retryThrottledRequestMaxTimes: asNumber,
  multipartMinFileSize: asNumber,
  multipartChunkSize: asNumber,
  maxConcurrentRequests: asNumber,
  multipartMaxConcurrentRequests: asNumber,
  multipartMaxAttempts: asNumber,
  checkForUrlDuplicates: asBoolean,
  saveUrlForRecurrentUploads: asBoolean,

  groupOutput: asBoolean,
  userAgentIntegration: asString,
  debug: asBoolean,

  localeName: asString,

  metadata: asMetadata,
  secureUploadsExpireThreshold: asNumber,
  localeDefinitionOverride: /** @type {typeof asObject<import('../../types').LocaleDefinitionOverride>} */ (asObject),
  secureUploadsSignatureResolver:
    /** @type {typeof asFunction<import('../../types').SecureUploadsSignatureResolver>} */ (asFunction),
  secureDeliveryProxyUrlResolver:
    /** @type {typeof asFunction<import('../../types').SecureDeliveryProxyUrlResolver>} */ (asFunction),
  iconHrefResolver: /** @type {typeof asFunction<import('../../types').IconHrefResolver>} */ (asFunction),
  fileValidators: /** @type {typeof asArray<import('../../types').FileValidators>} */ (asArray),
  collectionValidators: /** @type {typeof asArray<import('../../types').CollectionValidators>} */ (asArray),

  defaultCameraMode: asCameraTab,
  enableAudioRecording: asBoolean,
  enableVideoRecording: asBoolean,
  mediaRecorerOptions: asObject,

  maxVideoRecordingDuration: asNumber,
  aspectRatio: asObject,
};

/**
 * @template {keyof import('../../types').ConfigType} T
 * @param {T} key
 * @param {unknown} value
 * @returns {import('../../types').ConfigType[T] | undefined}
 */
export const normalizeConfigValue = (key, value) => {
  if (typeof value === 'undefined' || value === null) {
    return undefined;
  }

  try {
    return mapping[key](value);
  } catch (reason) {
    console.error(`Invalid value for config key "${key}".`, reason);
    return initialConfig[key];
  }
};
