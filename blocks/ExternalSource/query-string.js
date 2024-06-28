/**
 * @param {{ [key: string]: string | number | boolean | null | undefined }} params
 * @returns {string}
 */
export function queryString(params) {
  const list = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || (typeof value === 'string' && value.length === 0)) {
      continue;
    }
    list.push(`${key}=${encodeURIComponent(value)}`);
  }
  return list.join('&');
}
