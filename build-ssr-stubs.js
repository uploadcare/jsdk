import { writeFileSync } from 'node:fs';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import prettier from 'prettier';

GlobalRegistrator.register();

/**
 * @param {unknown} value
 * @returns {value is Function}
 */
const isClass = (value) => {
  return value.toString().startsWith('class');
};

/** @param {Function} klass */
const getClassStaticProperties = (klass) => {
  /** @type {Record<string, unknown>} */
  const extractedProperties = {};
  /** @param {unknown} proto */
  const extract = (proto) => {
    if (proto === null) return;
    if (proto === HTMLElement || proto === HTMLElement.prototype) {
      return;
    }

    for (const name of Object.getOwnPropertyNames(proto)) {
      const isPublic = !name.startsWith('_');
      const isOwn = !['arguments', 'prototype', 'caller', 'constructor', 'name', 'length'].includes(name);
      const isDefined = isOwn && !!proto[name];

      if (isPublic && isOwn && isDefined) {
        extractedProperties[name] = proto[name];
      }
    }

    extract(Object.getPrototypeOf(proto));
  };
  extract(klass);
  return extractedProperties;
};

/** @param {function} klass */
const stubClass = (klass) => {
  const properties = getClassStaticProperties(klass);
  return `class {
    ${Object.entries(properties)
      .map(([key, value]) => {
        let valueString;
        if (typeof value === 'function') {
          valueString = '() => {}';
        } else if (typeof value === 'string') {
          valueString = `\`${value}\``;
        } else if (Array.isArray(value)) {
          valueString = JSON.stringify(value);
        } else if (typeof value === 'object') {
          valueString = JSON.stringify(value);
        } else {
          throw new Error(`Unexpected property type: ${typeof value}`);
        }
        return `static ${key} = ${valueString}`;
      })
      .join('\n')}
  }`;
};

const realExports = await import('./index.js');
const stubbedExports = Object.fromEntries(
  Object.entries(realExports).map(([key, value]) => {
    let newValue;
    if (isClass(value)) {
      newValue = stubClass(value);
    } else if (typeof value === 'function') {
      newValue = '() => {}';
    } else if (typeof value === 'string') {
      newValue = `\`${value}\``;
    } else {
      throw new Error(`Unexpected export type: ${typeof value}`);
    }
    return [key, newValue];
  }),
);

const content = Object.entries(stubbedExports)
  .map(([key, value]) => {
    return `export const ${key} = ${value};`;
  })
  .join('\n');

const formatted = await prettier.resolveConfig('./').then(
  /** @param {Record<string, unknown>} options */
  (options) => {
    return prettier.format(content, { ...options, parser: 'babel' });
  },
);

writeFileSync('./index.ssr.js', formatted);
