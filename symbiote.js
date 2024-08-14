import { DICT } from '@symbiotejs/symbiote';
export {
  Symbiote,
  Symbiote as BaseComponent,
  PubSub,
  PubSub as Data,
  UID,
  html,
  create,
  applyStyles,
} from '@symbiotejs/symbiote';
export { slotProcessor } from '@symbiotejs/symbiote/core/slotProcessor.js';

Object.assign(DICT, {
  CTX_NAME_ATTR: 'ctx-name',
  BIND_ATTR: 'set',
});

export { DICT };
