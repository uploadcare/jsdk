import { getDropItems } from './getDropItems.js';

/** @enum {Number} */
export const DropzoneState = {
  ACTIVE: 0,
  INACTIVE: 1,
  NEAR: 2,
  OVER: 3,
};

const RESET_EVENTS = ['focus'];
const NEAR_OFFSET = 100;
const nearnessRegistry = new Map();

/**
 * @param {[x: number, y: number]} p
 * @param {{ x: number; y: number; width: number; height: number }} r
 * @returns {number}
 */
function distance(p, r) {
  const cx = Math.max(Math.min(p[0], r.x + r.width), r.x);
  const cy = Math.max(Math.min(p[1], r.y + r.height), r.y);

  return Math.sqrt((p[0] - cx) * (p[0] - cx) + (p[1] - cy) * (p[1] - cy));
}

/**
 * @param {Object} desc
 * @param {HTMLElement} desc.element
 * @param {Function} desc.onChange
 * @param {Function} desc.onItems
 * @param {() => Boolean} desc.shouldIgnore
 */
export function addDropzone(desc) {
  let eventCounter = 0;

  const body = document.body;
  const switchHandlers = new Set();
  const handleSwitch = (fn) => switchHandlers.add(fn);
  let state = DropzoneState.INACTIVE;

  const setState = (newState) => {
    if (desc.shouldIgnore() && newState !== DropzoneState.INACTIVE) {
      return;
    }
    if (state !== newState) {
      for (const fn of switchHandlers) {
        fn(newState);
      }
    }
    state = newState;
  };

  const isDragging = () => eventCounter > 0;

  handleSwitch((newState) => desc.onChange(newState));

  const onResetEvent = () => {
    eventCounter = 0;
    setState(DropzoneState.INACTIVE);
  };
  const onDragEnter = () => {
    eventCounter += 1;
    if (state === DropzoneState.INACTIVE) {
      setState(DropzoneState.ACTIVE);
    }
  };
  const onDragLeave = () => {
    eventCounter -= 1;
    if (!isDragging()) {
      setState(DropzoneState.INACTIVE);
    }
  };
  const onDrop = (e) => {
    e.preventDefault();
    eventCounter = 0;
    setState(DropzoneState.INACTIVE);
  };

  const onDragOver = (e) => {
    if (desc.shouldIgnore()) {
      return;
    }

    if (!isDragging()) {
      eventCounter += 1;
    }

    /** @type {[Number, Number]} */
    const dragPoint = [e.x, e.y];
    const targetRect = desc.element.getBoundingClientRect();
    const nearness = Math.floor(distance(dragPoint, targetRect));
    const isNear = nearness < NEAR_OFFSET;
    const isOver = e.composedPath().includes(desc.element);

    nearnessRegistry.set(desc.element, nearness);
    const isNearest = Math.min(...nearnessRegistry.values()) === nearness;

    if (isOver && isNearest) {
      e.preventDefault();
      setState(DropzoneState.OVER);
    } else if (isNear && isNearest) {
      setState(DropzoneState.NEAR);
    } else {
      setState(DropzoneState.ACTIVE);
    }
  };

  const onElementDrop = async (e) => {
    if (desc.shouldIgnore()) {
      return;
    }
    e.preventDefault();
    const items = await getDropItems(e.dataTransfer);
    desc.onItems(items);
    setState(DropzoneState.INACTIVE);
  };

  body.addEventListener('drop', onDrop);
  body.addEventListener('dragleave', onDragLeave);
  body.addEventListener('dragenter', onDragEnter);
  body.addEventListener('dragover', onDragOver);
  desc.element.addEventListener('drop', onElementDrop);
  for (const eventName of RESET_EVENTS) {
    window.addEventListener(eventName, onResetEvent);
  }

  return () => {
    nearnessRegistry.delete(desc.element);
    body.removeEventListener('drop', onDrop);
    body.removeEventListener('dragleave', onDragLeave);
    body.removeEventListener('dragenter', onDragEnter);
    body.removeEventListener('dragover', onDragOver);
    desc.element.removeEventListener('drop', onElementDrop);
    for (const eventName of RESET_EVENTS) {
      window.removeEventListener(eventName, onResetEvent);
    }
  };
}
