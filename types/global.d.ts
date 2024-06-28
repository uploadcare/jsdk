import { LR_WINDOW_KEY } from '../abstract/connectBlocksFrom.js';
import type * as blocks from '../index.js';

declare global {
  interface Window {
    [LR_WINDOW_KEY]?: typeof blocks;
  }
}
