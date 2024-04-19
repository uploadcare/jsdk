export type UploadError = import('@uploadcare/upload-client').UploadError;
export type UploadcareFile = import('@uploadcare/upload-client').UploadcareFile;
export type NetworkError = import('@uploadcare/upload-client').NetworkError;
export type UploadcareGroup = import('@uploadcare/upload-client').UploadcareGroup;
export type Metadata = import('@uploadcare/upload-client').Metadata;
export type MetadataCallback = (fileEntry: OutputFileEntry) => Promise<Metadata> | Metadata;
export type ConfigType = {
  pubkey: string;
  multiple: boolean;
  multipleMin: number;
  multipleMax: number;
  confirmUpload: boolean;
  imgOnly: boolean;
  accept: string;
  externalSourcesPreferredTypes: string;
  store: boolean | 'auto';
  cameraMirror: boolean;
  cameraCapture: 'user' | 'environment' | '';
  sourceList: string;
  maxLocalFileSizeBytes: number;
  thumbSize: number;
  showEmptyList: boolean;
  useLocalImageEditor: boolean;
  useCloudImageEditor: boolean;
  cloudImageEditorTabs: string;
  removeCopyright: boolean;
  cropPreset: string;
  imageShrink: string;
  modalScrollLock: boolean;
  modalBackdropStrokes: boolean;
  sourceListWrap: boolean;
  remoteTabSessionKey: string;
  cdnCname: string;
  baseUrl: string;
  socialBaseUrl: string;
  secureSignature: string;
  secureExpire: string;
  secureDeliveryProxy: string;
  retryThrottledRequestMaxTimes: number;
  multipartMinFileSize: number;
  multipartChunkSize: number;
  maxConcurrentRequests: number;
  multipartMaxConcurrentRequests: number;
  multipartMaxAttempts: number;
  checkForUrlDuplicates: boolean;
  saveUrlForRecurrentUploads: boolean;
  groupOutput: boolean;
  userAgentIntegration: string;
  debug: boolean;
  metadata: Metadata | MetadataCallback | null;
  defaultValue: string[] | null;
};
export type ConfigComplexType = Pick<ConfigType, 'metadata' | 'defaultValue'>;
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

export type OutputFileErrorType =
  | 'NOT_AN_IMAGE'
  | 'FORBIDDEN_FILE_TYPE'
  | 'FILE_SIZE_EXCEEDED'
  | 'UPLOAD_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';
export type OutputCollectionErrorType = 'SOME_FILES_HAS_ERRORS' | 'TOO_MANY_FILES' | 'TOO_FEW_FILES';

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
};

export type OutputError<T extends OutputFileErrorType | OutputCollectionErrorType> =
  T extends keyof OutputErrorTypePayload
    ? {
        type: T;
        message: string;
      } & OutputErrorTypePayload[T]
    : never;

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

export {};
