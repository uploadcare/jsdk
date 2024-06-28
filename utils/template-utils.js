/** @typedef {{ [key: String]: String | Number | Boolean | InputData }} InputData */

const DEFAULT_TRANSFORMER = (value) => value;
const OPEN_TOKEN = '{{';
const CLOSE_TOKEN = '}}';
const PLURAL_PREFIX = 'plural:';

/**
 * @typedef {Object} Options
 * @property {String} [openToken='{{'] Default is `'{{'`
 * @property {String} [closeToken='}}'] Default is `'}}'`
 * @property {(value: String) => String} [transform=DEFAULT_TRANSFORMER] Default is `DEFAULT_TRANSFORMER`
 */

/**
 * @param {String} template
 * @param {InputData} [data={}] Default is `{}`
 * @param {Options} [options={}] Default is `{}`
 * @returns {String}
 */
export function applyTemplateData(template, data, options = {}) {
  const { openToken = OPEN_TOKEN, closeToken = CLOSE_TOKEN, transform = DEFAULT_TRANSFORMER } = options;

  for (const key in data) {
    const value = data[key]?.toString();
    return template.replaceAll(openToken + key + closeToken, typeof value === 'string' ? transform(value) : value);
  }
  return template;
}

/**
 * @param {String} template
 * @returns {{ variable: string; pluralKey: string; countVariable: string }[]}
 */
export function getPluralObjects(template) {
  const pluralObjects = [];
  let open = template.indexOf(OPEN_TOKEN);
  while (open !== -1) {
    const close = template.indexOf(CLOSE_TOKEN, open);
    const variable = template.substring(open + 2, close);
    if (variable.startsWith(PLURAL_PREFIX)) {
      const keyValue = template.substring(open + 2, close).replace(PLURAL_PREFIX, '');
      const key = keyValue.substring(0, keyValue.indexOf('('));
      const count = keyValue.substring(keyValue.indexOf('(') + 1, keyValue.indexOf(')'));
      pluralObjects.push({ variable, pluralKey: key, countVariable: count });
    }
    open = template.indexOf(OPEN_TOKEN, close);
  }
  return pluralObjects;
}
