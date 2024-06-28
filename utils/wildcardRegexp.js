/**
 * @param {string} str
 * @returns {string}
 */
const escapeRegExp = (str) => str.replace(/[\\-\\[]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');

/**
 * @param {string} str
 * @param {string} flags
 * @returns {RegExp}
 */
export const wildcardRegexp = (str, flags = 'i') => {
  const parts = str.split('*').map(escapeRegExp);
  return new RegExp(`^${parts.join('.+')}$`, flags);
};
