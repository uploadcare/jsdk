import { deserializeCsv, serializeCsv } from '../utils/comma-separated.js';

/**
 * @template {keyof import('../../types').ConfigType} T
 * @param {{
 *   key: T;
 *   value: import('../../types').ConfigType[T];
 *   setValue: (key: T, value: import('../../types').ConfigType[T]) => void;
 *   getValue: (key: T) => import('../../types').ConfigType[T];
 * }} options
 */
export const runSideEffects = ({ key, value, setValue, getValue }) => {
  if (key === 'enableVideoRecording' && value !== null) {
    let cameraModes = deserializeCsv(getValue('cameraModes'));
    if (value && !cameraModes.includes('video')) {
      cameraModes = cameraModes.concat('video');
    } else if (!value) {
      cameraModes = cameraModes.filter((mode) => mode !== 'video');
    }
    setValue('cameraModes', serializeCsv(cameraModes));
  }

  if (key === 'defaultCameraMode' && value !== null) {
    let cameraModes = deserializeCsv(getValue('cameraModes'));
    cameraModes = cameraModes.sort((a, b) => {
      if (a === value) return -1;
      if (b === value) return 1;
      return 0;
    });
    setValue('cameraModes', serializeCsv(cameraModes));
  }
};
