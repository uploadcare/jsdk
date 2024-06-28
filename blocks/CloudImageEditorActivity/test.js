import * as blocks from '../../index.js';
import { ifRef } from '../../utils/ifRef.js';

ifRef(() => {
  blocks.registerBlocks(blocks);
  document.querySelector(blocks.CloudImageEditorBlock.is)?.addEventListener('apply', (e) => {
    console.log(e);
  });
});
