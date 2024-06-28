// @ts-check
import { MIN_CROP_SIZE, THUMB_CORNER_SIZE, THUMB_OFFSET, THUMB_SIDE_SIZE } from './cropper-constants.js';

/**
 * @param {SVGElement} node
 * @param {{ [key: String]: String | Number }} attrs
 */
export function setSvgNodeAttrs(node, attrs) {
  for (const p in attrs) node.setAttributeNS(null, p, attrs[p].toString());
}

/**
 * @param {String} name
 * @param {{ [key: String]: String | Number }} attrs
 * @returns {SVGElement}
 */
export function createSvgNode(name, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  setSvgNodeAttrs(node, attrs);
  return node;
}

/**
 * @param {import('./types.js').Rectangle} rect
 * @param {import('./types.js').Direction} direction
 * @param {number} sizeMultiplier
 */
export function cornerPath(rect, direction, sizeMultiplier) {
  const { x, y, width, height } = rect;

  const wMul = direction.includes('w') ? 0 : 1;
  const hMul = direction.includes('n') ? 0 : 1;
  const xSide = [-1, 1][wMul];
  const ySide = [-1, 1][hMul];

  const p1 = [
    x + wMul * width + THUMB_OFFSET * xSide,
    y + hMul * height + THUMB_OFFSET * ySide - THUMB_CORNER_SIZE * sizeMultiplier * ySide,
  ];
  const p2 = [x + wMul * width + THUMB_OFFSET * xSide, y + hMul * height + THUMB_OFFSET * ySide];
  const p3 = [
    x + wMul * width - THUMB_CORNER_SIZE * sizeMultiplier * xSide + THUMB_OFFSET * xSide,
    y + hMul * height + THUMB_OFFSET * ySide,
  ];

  const path = `M ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} L ${p3[0]} ${p3[1]}`;
  const center = p2;

  return {
    d: path,
    center,
  };
}

/**
 * @param {import('./types.js').Rectangle} rect
 * @param {Extract<import('./types.js').Direction, 'n' | 's' | 'w' | 'e'>} direction
 * @param {number} sizeMultiplier
 */
export function sidePath(rect, direction, sizeMultiplier) {
  const { x, y, width, height } = rect;

  const wMul = ['n', 's'].includes(direction)
    ? 0.5
    : { w: 0, e: 1 }[/** @type {Extract<import('./types.js').Direction, 'w' | 'e'>} */ (direction)];
  const hMul = ['w', 'e'].includes(direction)
    ? 0.5
    : { n: 0, s: 1 }[/** @type {Extract<import('./types.js').Direction, 'n' | 's'>} */ (direction)];
  const xSide = [-1, 1][wMul];
  const ySide = [-1, 1][hMul];

  let p1;
  let p2;
  if (['n', 's'].includes(direction)) {
    p1 = [x + wMul * width - (THUMB_SIDE_SIZE * sizeMultiplier) / 2, y + hMul * height + THUMB_OFFSET * ySide];
    p2 = [x + wMul * width + (THUMB_SIDE_SIZE * sizeMultiplier) / 2, y + hMul * height + THUMB_OFFSET * ySide];
  } else {
    p1 = [x + wMul * width + THUMB_OFFSET * xSide, y + hMul * height - (THUMB_SIDE_SIZE * sizeMultiplier) / 2];
    p2 = [x + wMul * width + THUMB_OFFSET * xSide, y + hMul * height + (THUMB_SIDE_SIZE * sizeMultiplier) / 2];
  }
  const path = `M ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]}`;
  const center = [p2[0] - (p2[0] - p1[0]) / 2, p2[1] - (p2[1] - p1[1]) / 2];

  return { d: path, center };
}

/** @param {import('./types.js').Direction} direction */
export function thumbCursor(direction) {
  if (direction === '') {
    return 'move';
  }
  if (['e', 'w'].includes(direction)) {
    return 'ew-resize';
  }
  if (['n', 's'].includes(direction)) {
    return 'ns-resize';
  }
  if (['nw', 'se'].includes(direction)) {
    return 'nwse-resize';
  }
  return 'nesw-resize';
}

/**
 * @param {{
 *   rect: import('./types.js').Rectangle;
 *   delta: [Number, Number];
 *   imageBox: import('./types.js').Rectangle;
 * }} options
 */
export function moveRect({ rect, delta: [dx, dy], imageBox }) {
  return constraintRect(
    {
      ...rect,
      x: rect.x + dx,
      y: rect.y + dy,
    },
    imageBox,
  );
}

/**
 * @param {import('./types.js').Rectangle} rect1
 * @param {import('./types.js').Rectangle} rect2
 */
export function constraintRect(rect1, rect2) {
  let { x } = rect1;
  let { y } = rect1;
  if (rect1.x < rect2.x) {
    x = rect2.x;
  } else if (rect1.x + rect1.width > rect2.x + rect2.width) {
    x = rect2.x + rect2.width - rect1.width;
  }
  if (rect1.y < rect2.y) {
    y = rect2.y;
  } else if (rect1.y + rect1.height > rect2.y + rect2.height) {
    y = rect2.y + rect2.height - rect1.height;
  }

  return {
    ...rect1,
    x,
    y,
  };
}

/**
 * @param {{
 *   rect: import('./types.js').Rectangle;
 *   delta: [Number, Number];
 *   aspectRatio?: number;
 *   imageBox: import('./types.js').Rectangle;
 * }} options
 */
function resizeNorth({ rect, delta, aspectRatio, imageBox }) {
  const [, dy] = delta;
  let { y, width, height } = rect;

  y += dy;
  height -= dy;
  if (aspectRatio) {
    width = height * aspectRatio;
  }
  let x = rect.x + rect.width / 2 - width / 2;
  if (y <= imageBox.y) {
    y = imageBox.y;
    height = rect.y + rect.height - y;
    if (aspectRatio) {
      width = height * aspectRatio;
      x = rect.x + rect.width / 2 - width / 2;
    }
  }
  if (x <= imageBox.x) {
    x = imageBox.x;
    y = rect.y + rect.height - height;
  }
  if (x + width >= imageBox.x + imageBox.width) {
    x = Math.max(imageBox.x, imageBox.x + imageBox.width - width);
    width = imageBox.x + imageBox.width - x;
    if (aspectRatio) {
      height = width / aspectRatio;
    }
    y = rect.y + rect.height - height;
  }
  if (height < MIN_CROP_SIZE) {
    height = MIN_CROP_SIZE;
    if (aspectRatio) {
      width = height * aspectRatio;
      x = rect.x + rect.width / 2 - width / 2;
    }
    y = rect.y + rect.height - height;
  }
  if (width < MIN_CROP_SIZE) {
    width = MIN_CROP_SIZE;
    if (aspectRatio) {
      height = width / aspectRatio;
      x = rect.x + rect.width / 2 - width / 2;
    }
    y = rect.y + rect.height - height;
  }

  return { x, y, width, height };
}

/**
 * @param {{
 *   rect: import('./types.js').Rectangle;
 *   delta: [Number, Number];
 *   aspectRatio?: number;
 *   imageBox: import('./types.js').Rectangle;
 * }} options
 */
function resizeWest({ rect, delta, aspectRatio, imageBox }) {
  const [dx] = delta;
  let { x, width, height } = rect;

  x += dx;
  width -= dx;
  if (aspectRatio) {
    height = width / aspectRatio;
  }
  let y = rect.y + rect.height / 2 - height / 2;
  if (x <= imageBox.x) {
    x = imageBox.x;
    width = rect.x + rect.width - x;
    if (aspectRatio) {
      height = width / aspectRatio;
      y = rect.y + rect.height / 2 - height / 2;
    }
  }
  if (y <= imageBox.y) {
    y = imageBox.y;
    x = rect.x + rect.width - width;
  }
  if (y + height >= imageBox.y + imageBox.height) {
    y = Math.max(imageBox.y, imageBox.y + imageBox.height - height);
    height = imageBox.y + imageBox.height - y;
    if (aspectRatio) {
      width = height * aspectRatio;
    }
    x = rect.x + rect.width - width;
  }
  if (height < MIN_CROP_SIZE) {
    height = MIN_CROP_SIZE;
    if (aspectRatio) {
      width = height * aspectRatio;
    }
    y = rect.y + rect.height / 2 - height / 2;
    x = rect.x + rect.width - width;
  }
  if (width < MIN_CROP_SIZE) {
    width = MIN_CROP_SIZE;
    if (aspectRatio) {
      height = width / aspectRatio;
    }
    y = rect.y + rect.height / 2 - height / 2;
    x = rect.x + rect.width - width;
  }

  return { x, y, width, height };
}

/**
 * @param {{
 *   rect: import('./types.js').Rectangle;
 *   delta: [Number, Number];
 *   aspectRatio?: number;
 *   imageBox: import('./types.js').Rectangle;
 * }} options
 */
function resizeSouth({ rect, delta, aspectRatio, imageBox }) {
  const [, dy] = delta;
  let { y, width, height } = rect;

  height += dy;
  if (aspectRatio) {
    width = height * aspectRatio;
  }
  let x = rect.x + rect.width / 2 - width / 2;
  if (y + height >= imageBox.y + imageBox.height) {
    height = imageBox.y + imageBox.height - y;
    if (aspectRatio) {
      width = height * aspectRatio;
    }
    x = rect.x + rect.width / 2 - width / 2;
  }
  if (x <= imageBox.x) {
    x = imageBox.x;
    y = rect.y;
  }
  if (x + width >= imageBox.x + imageBox.width) {
    x = Math.max(imageBox.x, imageBox.x + imageBox.width - width);
    width = imageBox.x + imageBox.width - x;
    if (aspectRatio) {
      height = width / aspectRatio;
    }
    y = rect.y;
  }
  if (height < MIN_CROP_SIZE) {
    height = MIN_CROP_SIZE;
    if (aspectRatio) {
      width = height * aspectRatio;
    }
    x = rect.x + rect.width / 2 - width / 2;
  }
  if (width < MIN_CROP_SIZE) {
    width = MIN_CROP_SIZE;
    if (aspectRatio) {
      height = width / aspectRatio;
    }
    x = rect.x + rect.width / 2 - width / 2;
  }

  return { x, y, width, height };
}

/**
 * @param {{
 *   rect: import('./types.js').Rectangle;
 *   delta: [Number, Number];
 *   aspectRatio?: number;
 *   imageBox: import('./types.js').Rectangle;
 * }} options
 */
function resizeEast({ rect, delta, aspectRatio, imageBox }) {
  const [dx] = delta;
  let { x, width, height } = rect;

  width += dx;
  if (aspectRatio) {
    height = width / aspectRatio;
  }
  let y = rect.y + rect.height / 2 - height / 2;
  if (x + width >= imageBox.x + imageBox.width) {
    width = imageBox.x + imageBox.width - x;
    if (aspectRatio) {
      height = width / aspectRatio;
    }
    y = rect.y + rect.height / 2 - height / 2;
  }
  if (y <= imageBox.y) {
    y = imageBox.y;
    x = rect.x;
  }
  if (y + height >= imageBox.y + imageBox.height) {
    y = Math.max(imageBox.y, imageBox.y + imageBox.height - height);
    height = imageBox.y + imageBox.height - y;
    if (aspectRatio) {
      width = height * aspectRatio;
    }
    x = rect.x;
  }
  if (height < MIN_CROP_SIZE) {
    height = MIN_CROP_SIZE;
    if (aspectRatio) {
      width = height * aspectRatio;
    }
    y = rect.y + rect.height / 2 - height / 2;
  }
  if (width < MIN_CROP_SIZE) {
    width = MIN_CROP_SIZE;
    if (aspectRatio) {
      height = width / aspectRatio;
    }
    y = rect.y + rect.height / 2 - height / 2;
  }

  return { x, y, width, height };
}

/**
 * @param {{
 *   rect: import('./types.js').Rectangle;
 *   delta: [Number, Number];
 *   aspectRatio?: number;
 *   imageBox: import('./types.js').Rectangle;
 * }} options
 */
function resizeNorthWest({ rect, delta, aspectRatio, imageBox }) {
  let [dx, dy] = delta;
  let { x, y, width, height } = rect;

  if (x + dx < imageBox.x) {
    dx = imageBox.x - x;
  }
  if (y + dy < imageBox.y) {
    dy = imageBox.y - y;
  }
  x += dx;
  width -= dx;
  y += dy;
  height -= dy;
  if (aspectRatio && Math.abs(width / height) > aspectRatio) {
    dy = width / aspectRatio - height;
    height += dy;
    y -= dy;
    if (y <= imageBox.y) {
      height = height - (imageBox.y - y);
      width = height * aspectRatio;
      x = rect.x + rect.width - width;
      y = imageBox.y;
    }
  } else if (aspectRatio) {
    dx = height * aspectRatio - width;
    width = width + dx;
    x -= dx;
    if (x <= imageBox.x) {
      width = width - (imageBox.x - x);
      height = width / aspectRatio;
      x = imageBox.x;
      y = rect.y + rect.height - height;
    }
  }
  if (height < MIN_CROP_SIZE) {
    height = MIN_CROP_SIZE;
    if (aspectRatio) {
      width = height * aspectRatio;
    }
    x = rect.x + rect.width - width;
    y = rect.y + rect.height - height;
  }
  if (width < MIN_CROP_SIZE) {
    width = MIN_CROP_SIZE;
    if (aspectRatio) {
      height = width / aspectRatio;
    }
    x = rect.x + rect.width - width;
    y = rect.y + rect.height - height;
  }

  return { x, y, width, height };
}

/**
 * @param {{
 *   rect: import('./types.js').Rectangle;
 *   delta: [Number, Number];
 *   aspectRatio?: number;
 *   imageBox: import('./types.js').Rectangle;
 * }} options
 */
function resizeNorthEast({ rect, delta, aspectRatio, imageBox }) {
  let [dx, dy] = delta;
  let { x, y, width, height } = rect;

  if (x + width + dx > imageBox.x + imageBox.width) {
    dx = imageBox.x + imageBox.width - x - width;
  }
  if (y + dy < imageBox.y) {
    dy = imageBox.y - y;
  }
  width += dx;
  y += dy;
  height -= dy;
  if (aspectRatio && Math.abs(width / height) > aspectRatio) {
    dy = width / aspectRatio - height;
    height += dy;
    y -= dy;
    if (y <= imageBox.y) {
      height = height - (imageBox.y - y);
      width = height * aspectRatio;
      x = rect.x;
      y = imageBox.y;
    }
  } else if (aspectRatio) {
    dx = height * aspectRatio - width;
    width += dx;
    if (x + width >= imageBox.x + imageBox.width) {
      width = imageBox.x + imageBox.width - x;
      height = width / aspectRatio;
      x = imageBox.x + imageBox.width - width;
      y = rect.y + rect.height - height;
    }
  }
  if (height < MIN_CROP_SIZE) {
    height = MIN_CROP_SIZE;
    if (aspectRatio) {
      width = height * aspectRatio;
    }
    y = rect.y + rect.height - height;
  }
  if (width < MIN_CROP_SIZE) {
    width = MIN_CROP_SIZE;
    if (aspectRatio) {
      height = width / aspectRatio;
    }
    y = rect.y + rect.height - height;
  }

  return { x, y, width, height };
}

/**
 * @param {{
 *   rect: import('./types.js').Rectangle;
 *   delta: [Number, Number];
 *   aspectRatio?: number;
 *   imageBox: import('./types.js').Rectangle;
 * }} options
 */
function resizeSouthWest({ rect, delta, aspectRatio, imageBox }) {
  let [dx, dy] = delta;
  let { x, y, width, height } = rect;

  if (x + dx < imageBox.x) {
    dx = imageBox.x - x;
  }
  if (y + height + dy > imageBox.y + imageBox.height) {
    dy = imageBox.y + imageBox.height - y - height;
  }
  x += dx;
  width -= dx;
  height += dy;
  if (aspectRatio && Math.abs(width / height) > aspectRatio) {
    dy = width / aspectRatio - height;
    height += dy;
    if (y + height >= imageBox.y + imageBox.height) {
      height = imageBox.y + imageBox.height - y;
      width = height * aspectRatio;
      x = rect.x + rect.width - width;
      y = imageBox.y + imageBox.height - height;
    }
  } else if (aspectRatio) {
    dx = height * aspectRatio - width;
    width += dx;
    x -= dx;
    if (x <= imageBox.x) {
      width = width - (imageBox.x - x);
      height = width / aspectRatio;
      x = imageBox.x;
      y = rect.y;
    }
  }
  if (height < MIN_CROP_SIZE) {
    height = MIN_CROP_SIZE;
    if (aspectRatio) {
      width = height * aspectRatio;
    }
    x = rect.x + rect.width - width;
  }
  if (width < MIN_CROP_SIZE) {
    width = MIN_CROP_SIZE;
    if (aspectRatio) {
      height = width / aspectRatio;
    }
    x = rect.x + rect.width - width;
  }

  return { x, y, width, height };
}

/**
 * @param {{
 *   rect: import('./types.js').Rectangle;
 *   delta: [Number, Number];
 *   aspectRatio?: number;
 *   imageBox: import('./types.js').Rectangle;
 * }} options
 */
function resizeSouthEast({ rect, delta, aspectRatio, imageBox }) {
  let [dx, dy] = delta;
  let { x, y, width, height } = rect;

  if (x + width + dx > imageBox.x + imageBox.width) {
    dx = imageBox.x + imageBox.width - x - width;
  }
  if (y + height + dy > imageBox.y + imageBox.height) {
    dy = imageBox.y + imageBox.height - y - height;
  }
  width += dx;
  height += dy;
  if (aspectRatio && Math.abs(width / height) > aspectRatio) {
    dy = width / aspectRatio - height;
    height += dy;
    if (y + height >= imageBox.y + imageBox.height) {
      height = imageBox.y + imageBox.height - y;
      width = height * aspectRatio;
      x = rect.x;
      y = imageBox.y + imageBox.height - height;
    }
  } else if (aspectRatio) {
    dx = height * aspectRatio - width;
    width += dx;
    if (x + width >= imageBox.x + imageBox.width) {
      width = imageBox.x + imageBox.width - x;
      height = width / aspectRatio;
      x = imageBox.x + imageBox.width - width;
      y = rect.y;
    }
  }
  if (height < MIN_CROP_SIZE) {
    height = MIN_CROP_SIZE;
    if (aspectRatio) {
      width = height * aspectRatio;
    }
  }
  if (width < MIN_CROP_SIZE) {
    width = MIN_CROP_SIZE;
    if (aspectRatio) {
      height = width / aspectRatio;
    }
  }

  return { x, y, width, height };
}

/**
 * @param {{
 *   rect: import('./types.js').Rectangle;
 *   delta: [Number, Number];
 *   direction: import('./types.js').Direction;
 *   aspectRatio?: number;
 *   imageBox: import('./types.js').Rectangle;
 * }} options
 */
export function resizeRect({ direction, ...rest }) {
  switch (direction) {
    case 'n':
      return resizeNorth(rest);
    case 'w':
      return resizeWest(rest);
    case 's':
      return resizeSouth(rest);
    case 'e':
      return resizeEast(rest);
    case 'nw':
      return resizeNorthWest(rest);
    case 'ne':
      return resizeNorthEast(rest);
    case 'sw':
      return resizeSouthWest(rest);
    case 'se':
      return resizeSouthEast(rest);
    default:
      return rest.rect;
  }
}

/**
 * @param {import('./types.js').Rectangle} rect
 * @param {[Number, Number]} point
 */
export function rectContainsPoint(rect, [x, y]) {
  return rect.x <= x && x <= rect.x + rect.width && rect.y <= y && y <= rect.y + rect.height;
}

/**
 * @param {import('./types.js').Rectangle} rect1
 * @param {import('./types.js').Rectangle} rect2
 */
export function isRectInsideRect(rect1, rect2) {
  return (
    rect1.x >= rect2.x &&
    rect1.y >= rect2.y &&
    rect1.x + rect1.width <= rect2.x + rect2.width &&
    rect1.y + rect1.height <= rect2.y + rect2.height
  );
}

/**
 * @param {import('./types.js').Rectangle} rect
 * @param {number} aspectRatio
 */
export function isRectMatchesAspectRatio(rect, aspectRatio) {
  const THRESHOLD = 0.1;
  return Math.abs(rect.width / rect.height - aspectRatio) < THRESHOLD;
}

/**
 * @param {import('./types.js').ImageSize} imageSize
 * @param {Number} angle
 * @returns {import('./types.js').ImageSize}
 */
export function rotateSize({ width, height }, angle) {
  const swap = (angle / 90) % 2 !== 0;
  return { width: swap ? height : width, height: swap ? width : height };
}

/**
 * @param {number} width
 * @param {number} height
 * @param {number} aspectRatio
 */
export function calculateMaxCenteredCropFrame(width, height, aspectRatio) {
  const imageAspectRatio = width / height;
  let cropWidth;
  let cropHeight;

  if (imageAspectRatio > aspectRatio) {
    cropWidth = Math.round(height * aspectRatio);
    cropHeight = height;
  } else {
    cropWidth = width;
    cropHeight = Math.round(width / aspectRatio);
  }

  const cropX = Math.round((width - cropWidth) / 2);
  const cropY = Math.round((height - cropHeight) / 2);

  if (cropX + cropWidth > width) {
    cropWidth = width - cropX;
  }
  if (cropY + cropHeight > height) {
    cropHeight = height - cropY;
  }

  return { x: cropX, y: cropY, width: cropWidth, height: cropHeight };
}

/**
 * @param {import('./types.js').Rectangle} rect
 * @returns {import('./types.js').Rectangle}
 */
export function roundRect(rect) {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

/**
 * @param {Number} value
 * @param {Number} min
 * @param {Number} max
 * @returns {Number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
