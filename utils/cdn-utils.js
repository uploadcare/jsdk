import { PACKAGE_NAME, PACKAGE_VERSION } from '../env.js';

/**
 * Trim leading `-/`, `/` and trailing `/` from CDN operation
 *
 * @param {String | unknown} [operation]
 * @returns {String}
 */
export const normalizeCdnOperation = (operation) => {
  if (typeof operation !== 'string' || !operation) {
    return '';
  }
  let str = operation.trim();
  if (str.startsWith('-/')) {
    str = str.slice(2);
  } else if (str.startsWith('/')) {
    str = str.slice(1);
  }

  if (str.endsWith('/')) {
    str = str.slice(0, str.length - 1);
  }
  return str;
};

/**
 * Join multiple CDN operations into one string without trailing or leading delimeters
 *
 * @param {...(String | unknown)} [operations]
 * @returns {String}
 */
export const joinCdnOperations = (...operations) => {
  return operations
    .filter((op) => typeof op === 'string' && op)
    .map((op) => normalizeCdnOperation(/** @type {String} */ (op)))
    .join('/-/');
};

/**
 * Create string with leading `-/` from passed CDN operations. Do the same as `joinCdnOperations` but adds leading `-/`
 * and trailing `/`
 *
 * @param {...(String | unknown)} [cdnOperations] -
 * @returns {String}
 */
export const createCdnUrlModifiers = (...cdnOperations) => {
  let joined = joinCdnOperations(...cdnOperations);
  return joined ? `-/${joined}/` : '';
};

/**
 * Extract filename or file URL
 *
 * @param {String} cdnUrl
 * @returns {String}
 */
export function extractFilename(cdnUrl) {
  let url = new URL(cdnUrl);
  let noOrigin = url.pathname + url.search + url.hash;
  let urlFilenameIdx = noOrigin.lastIndexOf('http');
  let plainFilenameIdx = noOrigin.lastIndexOf('/');
  let filename = '';

  if (urlFilenameIdx >= 0) {
    filename = noOrigin.slice(urlFilenameIdx);
  } else if (plainFilenameIdx >= 0) {
    filename = noOrigin.slice(plainFilenameIdx + 1);
  }

  return filename;
}

/**
 * Extract UUID from CDN URL
 *
 * @param {string} cdnUrl
 * @returns {string}
 */
export function extractUuid(cdnUrl) {
  let url = new URL(cdnUrl);
  let { pathname } = url;
  const slashIndex = pathname.indexOf('/');
  const secondSlashIndex = pathname.indexOf('/', slashIndex + 1);
  return pathname.substring(slashIndex + 1, secondSlashIndex);
}

/**
 * Extract UUID from CDN URL
 *
 * @param {string} cdnUrl
 * @returns {string[]}
 */
export function extractOperations(cdnUrl) {
  let withoutFilename = trimFilename(cdnUrl);
  let url = new URL(withoutFilename);
  let operationsMarker = url.pathname.indexOf('/-/');
  if (operationsMarker === -1) {
    return [];
  }
  let operationsStr = url.pathname.substring(operationsMarker);

  return operationsStr
    .split('/-/')
    .filter(Boolean)
    .map((operation) => normalizeCdnOperation(operation));
}

/**
 * Trim filename or file URL
 *
 * @param {String} cdnUrl
 * @returns {String}
 */
export function trimFilename(cdnUrl) {
  let url = new URL(cdnUrl);
  let filename = extractFilename(cdnUrl);
  let filenamePathPart = isFileUrl(filename) ? splitFileUrl(filename).pathname : filename;

  url.pathname = url.pathname.replace(filenamePathPart, '');
  url.search = '';
  url.hash = '';
  return url.toString();
}

/**
 * Detect if filename is actually file URL
 *
 * @param {String} filename
 * @returns {Boolean}
 */
export function isFileUrl(filename) {
  return filename.startsWith('http');
}

/**
 * Split file URL into the path and search parts
 *
 * @param {String} fileUrl
 * @returns {{ pathname: String; search: String; hash: String }}
 */
export function splitFileUrl(fileUrl) {
  let url = new URL(fileUrl);
  return {
    pathname: url.origin + url.pathname || '',
    search: url.search || '',
    hash: url.hash || '',
  };
}

/**
 * Create a final CDN URL with CDN modifiers and filename
 *
 * @param {String} baseCdnUrl - Base URL to CDN or Proxy, CDN modifiers and filename accepted
 * @param {String} [cdnModifiers] - CDN modifiers to apply, will be appended to `baseCdnUrl` ones
 * @param {String} [filename] - Filename for CDN or file URL for Proxy, will override one from `baseCdnUrl`
 * @returns {String}
 */

// TODO eadidenko replace arg to pass the object parameter
export const createCdnUrl = (baseCdnUrl, cdnModifiers, filename) => {
  let url = new URL(trimFilename(baseCdnUrl));
  filename = filename || extractFilename(baseCdnUrl);
  // TODO: fix double slash pathname bug (--cfg-cdn-cname: 'https://ucarecdn.com/' - trailing slash case)
  if (url.pathname.startsWith('//')) {
    url.pathname = url.pathname.replace('//', '/');
  }
  if (isFileUrl(filename)) {
    let splitted = splitFileUrl(filename);
    url.pathname = url.pathname + (cdnModifiers || '') + (splitted.pathname || '');
    url.search = splitted.search;
    url.hash = splitted.hash;
  } else {
    url.pathname = url.pathname + (cdnModifiers || '') + (filename || '');
  }
  return url.toString();
};

/**
 * Create URL for an original file on CDN
 *
 * @param {String} cdnUrl - URL to get base domain from, any pathname will be stripped
 * @param {String} uuid
 * @returns {String}
 */
export const createOriginalUrl = (cdnUrl, uuid) => {
  let url = new URL(cdnUrl);
  url.pathname = uuid + '/';
  return url.toString();
};

export const isValidURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};
