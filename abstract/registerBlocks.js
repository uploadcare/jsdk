/** @param {Object<string, any>} blockExports */
export function registerBlocks(blockExports) {
  for (const blockName in blockExports) {
    let tagName = [...blockName].reduce((name, char) => {
      if (char.toUpperCase() === char) {
        return `${name}-${char.toLowerCase()}`;
      }
      return `${name}${char}`;
    }, '');
    if (tagName.startsWith('-')) {
      tagName = tagName.replace('-', '');
    }
    if (!tagName.startsWith('lr-')) {
      tagName = `lr-${tagName}`;
    }
    if (blockExports[blockName].reg) {
      blockExports[blockName].reg(tagName);
    }
  }
}
