import { warnOnce } from '../../utils/warnOnce.js';
import { debounce } from '../utils/debounce.js';

const ASSERTIONS = [
  {
    test: (cfg) => cfg.accept && !!cfg.imgOnly,
    message:
      'There could be a mistake.\n' +
      'Both `accept` and `imgOnly` parameters are set.\n' +
      'The value of `accept` will be concatenated with the internal image mime types list.',
  },
  {
    test: (cfg) => cfg.enableVideoRecording !== null,
    message:
      'The `enableVideoRecording` parameter is deprecated and will be removed in the next major release.\n' +
      'Please use the `cameraModes` parameter instead.',
  },
  {
    test: (cfg) => cfg.defaultCameraMode !== null,
    message:
      'The `defaultCameraMode` parameter is deprecated and will be removed in the next major release.\n' +
      'Please use the `cameraModes` parameter instead.',
  },
];

/** Runs on every config change and warns about potential issues. */
export const runAssertions = debounce(
  /** @param {import('../../types').ConfigType} cfg */
  (cfg) => {
    for (const { test, message } of ASSERTIONS) {
      if (test(cfg)) {
        warnOnce(message);
      }
    }
  },
  0,
);
