// @ts-check

/** @param {string} value */
export const deserializeCsv = (value) => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

/** @param {unknown[]} value */
export const serializeCsv = (value) => {
  if (!value) {
    return '';
  }

  return value.join(',');
};
