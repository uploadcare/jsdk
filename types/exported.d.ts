import type { LocaleDefinition } from '../abstract/localeRegistry';
import type { complexConfigKeys } from '../blocks/Config/Config';
import type { FuncFileValidator, FuncCollectionValidator } from '../abstract/ValidationManager';
import type { CameraMode } from '../blocks/CameraSource/CameraSource';

export type { FuncFileValidator, FuncCollectionValidator } from '../abstract/ValidationManager';
export type { UploaderPublicApi } from '../abstract/UploaderPublicApi';

export type UploadError = import('@uploadcare/upload-client').UploadError;
export type UploadcareFile = import('@uploadcare/upload-client').UploadcareFile;
export type NetworkError = import('@uploadcare/upload-client').NetworkError;
export type UploadcareGroup = import('@uploadcare/upload-client').UploadcareGroup;
export type Metadata = import('@uploadcare/upload-client').Metadata;
export type MetadataCallback = (fileEntry: OutputFileEntry) => Promise<Metadata> | Metadata;
export type LocaleDefinitionOverride = Record<string, LocaleDefinition>;
export type SecureDeliveryProxyUrlResolver = (
  previewUrl: string,
  urlParts: { uuid: string; cdnUrlModifiers: string; fileName: string },
) => Promise<string> | string;
export type SecureUploadsSignatureAndExpire = { secureSignature: string; secureExpire: string };
export type SecureUploadsSignatureResolver = () => Promise<SecureUploadsSignatureAndExpire | null>;
export type IconHrefResolver = (iconName: string) => string;
export type FileValidators = FuncFileValidator[];
export type CollectionValidators = FuncCollectionValidator[];
export type SourceTypes = import('../blocks/utils/UploadSource').SourceTypes;

export type ConfigType = {
  /**
   * Your project’s Public Key.
   */
  pubkey: string;
  /**
   * Allow multiple file uploads.
   */
  multiple: boolean;
  /**
   * Minimum number of files to upload.
   */
  multipleMin: number;
  /**
   * Maximum number of files to upload.
   */
  multipleMax: number;
  /**
   * Require user confirmation before uploading.
   */
  confirmUpload: boolean;
  /**
   * Allow only image files.
   */
  imgOnly: boolean;
  /**
   * Native file input accept attribute value. Also affects client validation settings.
   */
  accept: string;
  /**
   * Preferred types for external sources.
   * See [here](https://uploadcare.com/docs/file-uploader/options/#external-sources-preferred-types)
   */
  externalSourcesPreferredTypes: string;
  /**
   * Provide custom CSS to the social sources iframe
   */
  externalSourcesEmbedCss: string;
  /**
   * Store uploaded files.
   */
  store: boolean | 'auto';
  /**
   * Mirror the camera view.
   */
  cameraMirror: boolean;
  /**
   * Default camera capture mode.
   */
  cameraCapture: 'user' | 'environment' | '';
  /**
   * List of sources for file uploads.
   */
  sourceList: string;
  /**
   * Maximum size of local files in bytes.
   */
  maxLocalFileSizeBytes: number;
  /**
   * Thumbnail size.
   */
  thumbSize: number;
  /**
   * Show the upload list even if it is empty.
   */
  showEmptyList: boolean;
  /**
   * Use local image editor.
   */
  useLocalImageEditor: boolean;
  /**
   * Enable cloud image editing.
   */
  useCloudImageEditor: boolean;
  /**
   * Tabs to show in the cloud image editor.
   *
   *  @default 'crop, tuning, filters'
   */
  cloudImageEditorTabs: string;
  /**
   * Remove copyright information.
   */
  removeCopyright: boolean;
  /**
   * Defines the crop behavior. When uploading images, your users can select a crop area with a defined aspect ratio.
   */
  cropPreset: string;
  /**
   * Image shrink options.
   */
  imageShrink: string;
  /**
   * Lock scroll when modal is open.
   */
  modalScrollLock: boolean;
  /**
   * Show strokes on modal backdrop.
   */
  modalBackdropStrokes: boolean;
  /**
   * Wrap the source list.
   */
  sourceListWrap: boolean;
  /**
   * Key to revoke Custom OAuth access. See [OAuth docs](https://uploadcare.com/docs/upload-sources/#oauth) for details.
   */
  remoteTabSessionKey: string;
  /**
   * Set custom CNAME.
   */
  cdnCname: string;
  /**
   * Set a custom upload URL.
   */
  baseUrl: string;
  /**
   * Set a custom social sources URL.
   */
  socialBaseUrl: string;
  /**
   * Secure signature for uploads.
   */
  secureSignature: string;
  /**
   * Expiry time for secure uploads.
   */
  secureExpire: string;
  /**
   * Proxy URL for secure delivery.
   */
  secureDeliveryProxy: string;
  /**
   * Maximum number of retry attempts for throttled requests.
   */
  retryThrottledRequestMaxTimes: number;
  /**
   * Minimum file size for multipart uploads.
   */
  multipartMinFileSize: number;
  /**
   * Chunk size for multipart uploads.
   */
  multipartChunkSize: number;
  /**
   * Maximum number of concurrent requests.
   */
  maxConcurrentRequests: number;
  /**
   * Maximum number of concurrent multipart requests.
   */
  multipartMaxConcurrentRequests: number;
  /**
   * Maximum number of attempts for multipart uploads.
   */
  multipartMaxAttempts: number;
  /**
   * Check for URL duplicates.
   */
  checkForUrlDuplicates: boolean;
  /**
   * Save URL for recurrent uploads.
   */
  saveUrlForRecurrentUploads: boolean;
  /**
   * Group output files.
   */
  groupOutput: boolean;
  /**
   * User agent integration string.
   */
  userAgentIntegration: string;
  /**
   * Enable debug mode.
   */
  debug: boolean;
  /**
   * Locale name for the uploader.
   */
  localeName: string;
  /**
   * Expiry threshold for secure uploads.
   */
  secureUploadsExpireThreshold: number;

  // Complex types
  /**
   * Metadata for the file.
   */
  metadata: Metadata | MetadataCallback | null;
  /**
   * Override locale definitions.
   */
  localeDefinitionOverride: LocaleDefinitionOverride | null;
  /**
   * Resolver for secure uploads signature.
   */
  secureUploadsSignatureResolver: SecureUploadsSignatureResolver | null;
  /**
   * Resolver for secure delivery proxy URL.
   */
  secureDeliveryProxyUrlResolver: SecureDeliveryProxyUrlResolver | null;
  /**
   * Resolver for icon href.
   */
  iconHrefResolver: IconHrefResolver | null;

  /**
   * Validators for individual files.
   */
  fileValidators: FileValidators;
  /**
   * Validators for file collections.
   */
  collectionValidators: CollectionValidators;

  /**
   * The camera modes to enable in the camera modal,
   * it is possible to select photo or video capture.
   * The first mode is the default mode.
   * @default 'photo,video'
   */
  cameraModes: string;

  /**
   * The default tab to open in the camera modal,
   * it is possible to select video or photo capture
   * @default 'null'
   * @deprecated - use `cameraModes` instead
   */
  defaultCameraMode: CameraMode | null;
  /**
   * Enable audio recording.
   * @default true
   */
  enableAudioRecording: boolean;
  /**
   * Enable video recording.
   * @deprecated - use `cameraModes` instead
   * @default null
   */
  enableVideoRecording: boolean | null;

  /**
   * The maximum duration of the video recording in seconds
   * @default null
   */
  maxVideoRecordingDuration: number | null;

  /**
   * A dictionary object that can contain
   * the following properties from MediaRecorderOptions
   */
  mediaRecorderOptions: MediaRecorderOptions | null;

  cloudImageEditorMaskHref: string | null;
};
export type ConfigComplexType = Pick<ConfigType, (typeof complexConfigKeys)[number]>;
export type ConfigPlainType = Omit<ConfigType, keyof ConfigComplexType>;
export type ConfigAttributesType = KebabCaseKeys<ConfigPlainType> & LowerCaseKeys<ConfigPlainType>;

export type KebabCase<S extends string> = S extends `${infer C}${infer T}`
  ? T extends Uncapitalize<T>
  ? `${Uncapitalize<C>}${KebabCase<T>}`
  : `${Uncapitalize<C>}-${KebabCase<T>}`
  : S;
export type KebabCaseKeys<T extends Record<string, unknown>> = { [Key in keyof T as KebabCase<Key & string>]: T[Key] };
export type LowerCase<S extends string> = Lowercase<S>;
export type LowerCaseKeys<T extends Record<string, unknown>> = { [Key in keyof T as Lowercase<Key & string>]: T[Key] };

export type OutputFileStatus = 'idle' | 'uploading' | 'success' | 'failed' | 'removed';

export type OutputCustomErrorType = 'CUSTOM_ERROR';

export type OutputFileErrorType =
  | OutputCustomErrorType
  | 'NOT_AN_IMAGE'
  | 'FORBIDDEN_FILE_TYPE'
  | 'FILE_SIZE_EXCEEDED'
  | 'UPLOAD_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export type OutputCollectionErrorType =
  | OutputCustomErrorType
  | 'SOME_FILES_HAS_ERRORS'
  | 'TOO_MANY_FILES'
  | 'TOO_FEW_FILES';

export type OutputFileErrorPayload = {
  entry: OutputFileEntry;
};

export type OutputErrorTypePayload = {
  NOT_AN_IMAGE: OutputFileErrorPayload;
  FORBIDDEN_FILE_TYPE: OutputFileErrorPayload;
  FILE_SIZE_EXCEEDED: OutputFileErrorPayload;

  SOME_FILES_HAS_ERRORS: {};
  TOO_MANY_FILES: {
    min: number;
    max: number;
    total: number;
  };
  TOO_FEW_FILES: {
    min: number;
    max: number;
    total: number;
  };
  UPLOAD_ERROR: OutputFileErrorPayload & {
    error: UploadError;
  };
  NETWORK_ERROR: OutputFileErrorPayload & {
    error: NetworkError;
  };
  UNKNOWN_ERROR: OutputFileErrorPayload & {
    error?: Error;
  };
  CUSTOM_ERROR: Record<string, unknown>;
};

export type OutputError<T extends OutputFileErrorType | OutputCollectionErrorType> = T extends OutputCustomErrorType
  ? {
    type?: T;
    message: string;
    payload?: OutputErrorTypePayload[T];
  }
  : T extends keyof OutputErrorTypePayload
  ? {
    type: T;
    message: string;
    payload?: OutputErrorTypePayload[T];
  }
  : never;

export type OutputErrorFile = OutputError<OutputFileErrorType>;

export type OutputErrorCollection = OutputError<OutputCollectionErrorType>;

export type OutputFileEntry<TStatus extends OutputFileStatus = OutputFileStatus> = {
  status: TStatus;
  internalId: string;

  name: string;
  size: number;
  isImage: boolean;
  mimeType: string;
  metadata: Metadata | null;

  file: File | Blob | null;
  externalUrl: string | null;
  uploadProgress: number;
  fullPath: string | null;
  source: SourceTypes | null;
} & (
    | {
      status: 'success';
      fileInfo: UploadcareFile;
      uuid: string;
      cdnUrl: string;
      cdnUrlModifiers: string;
      isUploading: false;
      isSuccess: true;
      isFailed: false;
      isRemoved: false;
      errors: [];
    }
    | {
      status: 'failed';
      fileInfo: UploadcareFile | null;
      uuid: string | null;
      cdnUrl: string | null;
      cdnUrlModifiers: string | null;
      isUploading: false;
      isSuccess: false;
      isFailed: true;
      isRemoved: false;
      errors: OutputError<OutputFileErrorType>[];
    }
    | {
      status: 'uploading';
      fileInfo: null;
      uuid: null;
      cdnUrl: null;
      cdnUrlModifiers: null;
      isUploading: true;
      isSuccess: false;
      isFailed: false;
      isRemoved: false;
      errors: [];
    }
    | {
      status: 'removed';
      fileInfo: UploadcareFile | null;
      uuid: string | null;
      cdnUrl: string | null;
      cdnUrlModifiers: string | null;
      isUploading: false;
      isSuccess: false;
      isFailed: false;
      isRemoved: true;
      errors: OutputError<OutputFileErrorType>[];
    }
    | {
      status: 'idle';
      fileInfo: null;
      uuid: null;
      cdnUrl: null;
      cdnUrlModifiers: null;
      isUploading: false;
      isSuccess: false;
      isFailed: false;
      isRemoved: false;
      errors: [];
    }
  );

export type OutputCollectionStatus = 'idle' | 'uploading' | 'success' | 'failed';

export type GroupFlag = 'has-group' | 'maybe-has-group';

export type OutputCollectionState<
  TStatus extends OutputCollectionStatus = OutputCollectionStatus,
  TGroupFlag extends GroupFlag = 'maybe-has-group',
> = {
  status: TStatus;
  totalCount: number;
  successCount: number;
  failedCount: number;
  uploadingCount: number;
  progress: number;

  successEntries: OutputFileEntry<'success'>[];
  failedEntries: OutputFileEntry<'failed'>[];
  uploadingEntries: OutputFileEntry<'uploading'>[];
  idleEntries: OutputFileEntry<'idle'>[];
} & (TGroupFlag extends 'has-group'
  ? { group: UploadcareGroup }
  : TGroupFlag extends 'maybe-has-group'
  ? { group: UploadcareGroup | null }
  : never) &
  (
    | {
      status: 'idle';
      isFailed: false;
      isUploading: false;
      isSuccess: false;
      errors: [];
      allEntries: OutputFileEntry<'idle' | 'success'>[];
    }
    | {
      status: 'uploading';
      isFailed: false;
      isUploading: true;
      isSuccess: false;
      errors: [];
      allEntries: OutputFileEntry[];
    }
    | {
      status: 'success';
      isFailed: false;
      isUploading: false;
      isSuccess: true;
      errors: [];
      allEntries: OutputFileEntry<'success'>[];
    }
    | {
      status: 'failed';
      isFailed: true;
      isUploading: false;
      isSuccess: false;
      errors: OutputError<OutputCollectionErrorType>[];
      allEntries: OutputFileEntry[];
    }
  );

export { EventType, EventPayload } from '../blocks/UploadCtxProvider/EventEmitter';

export { };
