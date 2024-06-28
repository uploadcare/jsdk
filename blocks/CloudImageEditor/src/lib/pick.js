/**
 * @param {{}} obj
 * @param {String[]} keys
 * @returns {{}}
 */
export function pick(obj, keys) {
  const result = {};
  for (const key of keys) {
    const value = obj[key];
    if (Object.hasOwn(obj, key) || value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}
