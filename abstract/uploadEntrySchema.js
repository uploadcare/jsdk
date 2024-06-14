// @ts-check
import { UploadcareFile } from '@uploadcare/upload-client';

/**
 * @typedef {Object} UploadEntry
 * @property {File} file
 * @property {String} externalUrl
 * @property {String} fileName
 * @property {number} fileSize
 * @property {number} lastModified
 * @property {number} uploadProgress
 * @property {String} uuid
 * @property {Boolean} isImage
 * @property {String} mimeType
 * @property {String} ctxName
 * @property {String} cdnUrl
 * @property {String} cdnUrlModifiers
 * @property {UploadcareFile} fileInfo
 * @property {Boolean} isUploading
 * @property {String} thumbUrl
 * @property {Boolean} silent
 * @property {({
 *   type: import('..').OutputFileErrorType | import('..').OutputCollectionErrorType;
 *   message: string;
 * } & Record<string, unknown>)[]} errors
 * @property {Error | null} uploadError
 * @property {string | null} fullPath
 * @property {import('@uploadcare/upload-client').Metadata | null} metadata
 * @property {boolean} isRemoved
 */

/**
 * @template {keyof UploadEntry} K
 * @type {Record<K, { type: Function; value: any; nullable?: Boolean }>}
 */
export const uploadEntrySchema = Object.freeze({
  file: {
    type: File,
    value: null,
  },
  externalUrl: {
    type: String,
    value: null,
  },
  fileName: {
    type: String,
    value: null,
    nullable: true,
  },
  fileSize: {
    type: Number,
    value: null,
    nullable: true,
  },
  lastModified: {
    type: Number,
    value: Date.now(),
  },
  uploadProgress: {
    type: Number,
    value: 0,
  },
  uuid: {
    type: String,
    value: null,
  },
  isImage: {
    type: Boolean,
    value: false,
  },
  mimeType: {
    type: String,
    value: null,
    nullable: true,
  },
  ctxName: {
    type: String,
    value: null,
  },
  cdnUrl: {
    type: String,
    value: null,
  },
  cdnUrlModifiers: {
    type: String,
    value: null,
  },
  fileInfo: {
    type: UploadcareFile,
    value: null,
  },
  isUploading: {
    type: Boolean,
    value: false,
  },
  abortController: {
    type: AbortController,
    value: null,
    nullable: true,
  },
  thumbUrl: {
    type: String,
    value: null,
    nullable: true,
  },
  isFailedToGenerateThumb: {
    type: Boolean,
    value: false,
  },
  silent: {
    type: Boolean,
    value: false,
  },
  source: {
    type: String,
    value: false,
    nullable: true,
  },
  fullPath: {
    type: String,
    value: null,
    nullable: true,
  },
  metadata: {
    type: Object,
    value: null,
    nullable: true,
  },
  errors: {
    type: Array,
    value: [],
  },
  uploadError: {
    type: Error,
    value: null,
    nullable: true,
  },
  isRemoved: {
    type: Boolean,
    value: false,
  },
});
