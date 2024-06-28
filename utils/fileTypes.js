// @ts-check
import { stringToArray } from './stringToArray.js';

export const IMAGE_ACCEPT_LIST = [
  'image/*',
  'image/heif',
  'image/heif-sequence',
  'image/heic',
  'image/heic-sequence',
  'image/avif',
  'image/avif-sequence',
  '.heif',
  '.heifs',
  '.heic',
  '.heics',
  '.avif',
  '.avifs',
];

/**
 * @param {string[]} [fileTypes]
 * @returns {string[]}
 */
export const mergeFileTypes = (fileTypes) => {
  if (!fileTypes) {
    return [];
  }
  return fileTypes.filter((item) => typeof item === 'string').flatMap((str) => stringToArray(str));
};

/**
 * @param {String} mimeType
 * @param {String[]} allowedFileTypes
 * @returns {Boolean}
 */
export const matchMimeType = (mimeType, allowedFileTypes) => {
  return allowedFileTypes.some((type) => {
    if (type.endsWith('*')) {
      const noWildcardType = type.replace('*', '');
      return mimeType.startsWith(noWildcardType);
    }

    return mimeType === type;
  });
};

/**
 * @param {String} fileName
 * @param {String[]} allowedFileTypes
 * @returns {Boolean}
 */
export const matchExtension = (fileName, allowedFileTypes) => {
  return allowedFileTypes.some((type) => {
    if (!type.startsWith('.')) {
      return false;
    }

    return fileName.toLowerCase().endsWith(type.toLowerCase());
  });
};

/**
 * @param {File | Blob} file
 * @returns {Boolean}
 */
export const fileIsImage = (file) => {
  const type = file?.type;
  if (!type) {
    return false;
  }
  return matchMimeType(type, IMAGE_ACCEPT_LIST);
};

/**
 * Checks if the given data is a Blob.
 *
 * @param {unknown} data - The data to check.
 * @returns {boolean} - True if the data is a Blob, false otherwise.
 */
export const isBlob = (data) => {
  return typeof Blob !== 'undefined' && data instanceof Blob;
};

/**
 * Checks if the given data is a File.
 *
 * @param {unknown} data - The data to check.
 * @returns {boolean} - True if the data is a File, false otherwise.
 */
export const isFile = (data) => {
  return typeof File !== 'undefined' && data instanceof File;
};
