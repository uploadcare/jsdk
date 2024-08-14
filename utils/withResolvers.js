// @ts-check

/** @template T */
export function withResolvers() {
  let resolve;
  let reject;
  /** @type {Promise<T>} */
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return {
    resolve: /** @type {(value: T | PromiseLike<T>) => void} */ (/** @type {unknown} */ (resolve)),
    reject: /** @type {(value?: unknown) => void} */ (/** @type {unknown} */ (reject)),
    promise,
  };
}
