/**
 * @param {String} svg
 * @returns {String}
 */
function createSvgBlobUrl(svg) {
  const blob = new Blob([svg], {
    type: 'image/svg+xml',
  });
  return URL.createObjectURL(blob);
}

/**
 * @param {String} [color1]
 * @param {String} [color2]
 * @returns {String}
 */
export function checkerboardCssBg(color1 = '#fff', color2 = 'rgba(0, 0, 0, .1)') {
  return createSvgBlobUrl(/*svg*/ `<svg height="20" width="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="20" height="20" fill="${color1}" />
    <rect x="0" y="0" width="10" height="10" fill="${color2}" />
    <rect x="10" y="10" width="10" height="10" fill="${color2}" />
  </svg>`);
}

/**
 * @param {String} [color]
 * @returns {String}
 */
export function strokesCssBg(color = 'rgba(0, 0, 0, .1)') {
  return createSvgBlobUrl(/*svg*/ `<svg height="10" width="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
    <line x1="0" y1="10" x2="10" y2="0" stroke="${color}" />
  </svg>`);
}

/**
 * @param {String} [color]
 * @returns {String}
 */
export function fileCssBg(color = 'hsl(209, 21%, 65%)', width = 32, height = 32) {
  return createSvgBlobUrl(/*svg*/ `
  <svg width="${width}" height="${height}" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" fill="${color}" d="M9.68848 8.70068C9.68848 8.42454 9.91233 8.20068 10.1885 8.20068H15.0885C15.2211 8.20068 15.3483 8.25336 15.442 8.34713L20.342 13.2471C20.4358 13.3409 20.4885 13.4681 20.4885 13.6007V21.3007C20.4885 21.5768 20.2646 21.8007 19.9885 21.8007H10.1885C9.91233 21.8007 9.68848 21.5768 9.68848 21.3007V8.70068ZM10.6885 9.20068V20.8007H19.4885V14.1007L15.0885 14.1007C14.8123 14.1007 14.5885 13.8768 14.5885 13.6007L14.5885 9.20068H10.6885ZM15.5885 9.90779L18.7814 13.1007L15.5885 13.1007L15.5885 9.90779Z"/>
  </svg>
  `);
}
