import type { EventPayload } from '../blocks/UploadCtxProvider/EventEmitter';

export type EventMap = {
  [T in keyof EventPayload]: CustomEvent<EventPayload[T]>;
};
