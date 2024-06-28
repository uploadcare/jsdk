import { createCdnUrl, createCdnUrlModifiers } from '../../../utils/cdn-utils.js';
import { COMMON_OPERATIONS, transformationsToOperations } from './lib/transformationUtils.js';

export function viewerImageSrc(originalUrl, width, transformations) {
  const MAX_CDN_DIMENSION = 3000;
  const dpr = window.devicePixelRatio;
  const size = Math.min(Math.ceil(width * dpr), MAX_CDN_DIMENSION);
  const quality = dpr >= 2 ? 'lightest' : 'normal';

  return createCdnUrl(
    originalUrl,
    createCdnUrlModifiers(
      COMMON_OPERATIONS,
      transformationsToOperations(transformations),
      `quality/${quality}`,
      `stretch/off/-/resize/${size}x`,
    ),
  );
}
