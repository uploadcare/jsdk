// @ts-check
import { joinCdnOperations } from '../../../../utils/cdn-utils.js';
import { stringToArray } from '../../../../utils/stringToArray.js';

/** @type {Record<keyof import('../types').Transformations, unknown>} */
export const OPERATIONS_DEFAULTS = Object.freeze({
  brightness: 0,
  exposure: 0,
  gamma: 100,
  contrast: 0,
  saturation: 0,
  vibrance: 0,
  warmth: 0,
  enhance: 0,
  filter: 0,
  rotate: 0,
  mirror: false,
  flip: false,
  crop: undefined,
});

/** @type {readonly (keyof import('../types').Transformations)[]} */
const SUPPORTED_OPERATIONS_ORDERED = /** @type {const} */ ([
  'enhance',
  'brightness',
  'exposure',
  'gamma',
  'contrast',
  'saturation',
  'vibrance',
  'warmth',
  'filter',
  'mirror',
  'flip',
  'rotate',
  'crop',
]);

/**
 * @template {keyof import('../types').Transformations} T
 * @param {T} operation
 * @param {import('../types').Transformations[T]} options
 */
function transformationToStr(operation, options) {
  if (typeof options === 'number') {
    const value = options;
    return OPERATIONS_DEFAULTS[operation] !== value ? `${operation}/${value}` : '';
  }

  if (typeof options === 'boolean') {
    const value = options;
    return OPERATIONS_DEFAULTS[operation] !== value ? `${operation}` : '';
  }

  if (operation === 'filter' && options) {
    const { name, amount } = /** @type {NonNullable<import('../types').Transformations['filter']>} */ (options);
    if (OPERATIONS_DEFAULTS.filter === amount) {
      return '';
    }
    return `${operation}/${name}/${amount}`;
  }

  if (operation === 'crop' && options) {
    const { dimensions, coords } = /** @type {NonNullable<import('../types').Transformations['crop']>} */ (options);
    return `${operation}/${dimensions.join('x')}/${coords.join(',')}`;
  }

  return '';
}

/**
 * @param {import('../types').Transformations} transformations
 * @returns {string}
 */
export function transformationsToOperations(transformations) {
  return joinCdnOperations(
    ...SUPPORTED_OPERATIONS_ORDERED.filter(
      (operation) => typeof transformations[operation] !== 'undefined' && transformations[operation] !== null,
    )
      .map((operation) => {
        const options = transformations[operation];
        return transformationToStr(operation, options);
      })
      .filter((str) => !!str),
  );
}

export const COMMON_OPERATIONS = joinCdnOperations('format/auto', 'progressive/yes');

/** @param {[unknown]} arg */
const asNumber = ([value]) => (typeof value !== 'undefined' ? Number(value) : undefined);
const asBoolean = () => true;
/** @param {[string, unknown]} arg */
const asFilter = ([name, amount]) => ({
  name,
  amount: typeof amount !== 'undefined' ? Number(amount) : 100,
});

/**
 * Docs: https://uploadcare.com/docs/transformations/image/resize-crop/#operation-crop We don't support percentages and
 * alignment presets, Because it's unclear how to handle them in the Editor UI TODO: add support for percentages and
 * alignment presets
 *
 * @param {[string, string]} arg
 */
const asCrop = ([dimensions, alignment]) => {
  if (!/\d+x\d+/.test(dimensions) || !/\d+,\d+/.test(alignment)) {
    throw new Error('Crop by aspect ratio, percentage or alignment shortcuts is not supported.');
  }

  return /** @type {{ dimensions: [number, number]; coords: [number, number] }} */ ({
    dimensions: stringToArray(dimensions, 'x').map(Number),
    coords: stringToArray(alignment).map(Number),
  });
};

/**
 * @type {{
 *   [K in keyof Required<import('../types').Transformations>]: (args: any) => import('../types').Transformations[K];
 * }}
 */
const OPERATION_PROCESSORS = Object.freeze({
  enhance: asNumber,
  brightness: asNumber,
  exposure: asNumber,
  gamma: asNumber,
  contrast: asNumber,
  saturation: asNumber,
  vibrance: asNumber,
  warmth: asNumber,
  filter: asFilter,
  mirror: asBoolean,
  flip: asBoolean,
  rotate: asNumber,
  crop: asCrop,
});

/**
 * @param {string[]} operations
 * @returns {import('../types.js').Transformations}
 */
export function operationsToTransformations(operations) {
  /** @type {Record<string, unknown>} */
  const transformations = {};
  for (const operation of operations) {
    const [name, ...args] = operation.split('/');
    if (!SUPPORTED_OPERATIONS_ORDERED.includes(name)) {
      continue;
    }
    const operationName = /** @type {(typeof SUPPORTED_OPERATIONS_ORDERED)[number]} */ (name);
    const processor = OPERATION_PROCESSORS[operationName];
    try {
      const value = processor(args);
      transformations[operationName] = value;
    } catch (err) {
      console.warn(
        [
          `Failed to parse URL operation "${operation}". It will be ignored.`,
          err instanceof Error ? `Error message: "${err.message}"` : err,
          'If you need this functionality, please feel free to open an issue at https://github.com/uploadcare/blocks/issues/new',
        ].join('\n'),
      );
    }
  }

  return /** @type {import('../types.js').Transformations} */ (transformations);
}
