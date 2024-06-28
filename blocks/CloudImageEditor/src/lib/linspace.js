/**
 * @param {Number} a Start of sample (int)
 * @param {Number} b End of sample (int)
 * @param {Number} n Number of elements (int)
 * @returns {Number[]}
 */
export function linspace(a, b, n) {
  const ret = Array(n);
  const startN = n - 1;
  for (let i = startN; i >= 0; i--) {
    ret[i] = Math.ceil((i * b + (startN - i) * a) / startN);
  }
  return ret;
}
