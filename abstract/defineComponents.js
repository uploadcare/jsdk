const EXCLUDE_COMPONENTS = ['Symbiote', 'BaseComponent', 'UploaderBlock', 'ActivityBlock', 'Block', 'SolutionBlock'];

/** @param {Object<string, any>} blockExports */
export function defineComponents(blockExports) {
  for (let blockName in blockExports) {
    if (EXCLUDE_COMPONENTS.includes(blockName)) {
      continue;
    }
    let tagName = [...blockName].reduce((name, char) => {
      if (char.toUpperCase() === char) {
        char = '-' + char.toLowerCase();
      }
      return (name += char);
    }, '');
    if (tagName.startsWith('-')) {
      tagName = tagName.replace('-', '');
    }

    if (!tagName.startsWith('uc-')) {
      tagName = 'uc-' + tagName;
    }
    if (blockExports[blockName].reg) {
      blockExports[blockName].reg(tagName);
    }
  }
}
