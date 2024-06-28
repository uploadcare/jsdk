import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import SVGSpriter from 'svg-sprite';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const DATA = [
  {
    input: path.resolve(__dirname, './blocks/CloudImageEditor/src/icons/'),
    output: path.resolve(__dirname, './blocks/CloudImageEditor/src/svg-sprite.js'),
  },
  {
    input: path.resolve(__dirname, './blocks/themes/lr-basic/icons/'),
    output: path.resolve(__dirname, './blocks/themes/lr-basic/svg-sprite.js'),
  },
];

const config = {
  mode: {
    symbol: {
      inline: true,
    },
  },
  shape: {
    id: {
      generator: (name) => `uc-icon-${name.replace(/\.svg$/, '')}`,
    },
    transform: [
      {
        svgo: {
          plugins: [
            {
              name: 'preset-default',
            },
            {
              name: 'prefixIds',
              params: {
                prefix: 'uc-icon-id',
              },
            },
          ],
        },
      },
    ],
  },
};

const spriter = new SVGSpriter(config);

console.log('Generating SVG sprite...');

for (const item of DATA) {
  fs.readdir(item.input, (err, files) => {
    if (err) {
      throw err;
    }

    console.log(`Processing ${item.input}...`);

    for (const file of files) {
      const filePath = path.resolve(item.input, file);
      console.log(`Icon processed: ${filePath}`);
      spriter.add(filePath, null, fs.readFileSync(filePath, { encoding: 'utf-8' }));
    }

    spriter.compile((error, result) => {
      if (error) {
        throw error;
      }

      const jsTemplate = `export default "${result.symbol.sprite.contents.toString().replace(/\"/g, "'")}";`;

      fs.writeFileSync(item.output, jsTemplate);
    });
  });
}
