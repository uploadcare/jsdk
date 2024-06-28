// @ts-check
import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { buildItems } from './build-items.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRootPath = __dirname;

function jsBanner() {
  const license = fs.readFileSync(path.join(packageRootPath, './LICENSE')).toString();
  return `/**\n * @license\n${license
    .split('\n')
    .map((line) => ` * ${line}`)
    .join('\n')}\n */`;
}

/** @param {import('./build-items.js').BuildItem} buildItem */
function build(buildItem) {
  esbuild
    .build({
      entryPoints: [buildItem.in],
      format: buildItem.iife ? 'iife' : 'esm',
      globalName: buildItem.iife ? 'LR' : undefined,
      keepNames: buildItem.iife ? true : undefined,
      bundle: true,
      minify: buildItem.minify,
      sourcemap: false,
      outfile: buildItem.out,
      target: 'es2019',
      banner: {
        js: jsBanner(),
      },
    })
    .then(async () => {
      if (!buildItem.minifyHtml) {
        return;
      }
      const js = fs.readFileSync(buildItem.out).toString();
      /** @param {string} str */
      const checkIfHtml = (str) => {
        return str.includes('<') && (str.includes('</') || str.includes('/>'));
      };
      /** @param {string} ch */
      const processChunk = (ch) => {
        if (checkIfHtml(ch)) {
          let htmlMin = ch.split('\n').join(' ');
          while (htmlMin.includes('  ')) {
            htmlMin = htmlMin.split('  ').join(' ');
          }
          htmlMin = htmlMin.split('> <').join('><');
          return htmlMin.trim();
        }
        return ch;
      };
      const result = js
        .split('`')
        .map((chunk) => processChunk(chunk))
        .join('`')
        .split(`'`)
        .map((chunk) => processChunk(chunk))
        .join(`'`);
      fs.writeFileSync(buildItem.out, result);
    });
}

for (const buildItem of buildItems) {
  build(buildItem);
}
