import { TRANSPARENT_PIXEL_SRC } from '../../../../utils/transparentPixelSrc.js';

export function preloadImage(src) {
  const image = new Image();

  const promise = new Promise((resolve, reject) => {
    image.src = src;
    image.onload = resolve;
    image.onerror = reject;
  });

  const cancel = () => {
    if (image.naturalWidth === 0) {
      image.src = TRANSPARENT_PIXEL_SRC;
    }
  };

  return { promise, image, cancel };
}

export function batchPreloadImages(list) {
  const preloaders = [];

  for (const src of list) {
    const preload = preloadImage(src);
    preloaders.push(preload);
  }

  const images = preloaders.map((preload) => preload.image);
  const promise = Promise.allSettled(preloaders.map((preload) => preload.promise));
  const cancel = () => {
    for (const preload of preloaders) {
      preload.cancel();
    }
  };

  return { promise, images, cancel };
}
