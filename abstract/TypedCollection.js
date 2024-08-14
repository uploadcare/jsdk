import { PubSub, UID } from '../symbiote.js';
import { TypedData } from './TypedData.js';

export class TypedCollection {
  /**
   * @param {Object} options
   * @param {Object<string, { type: any; value: any }>} options.typedSchema
   * @param {String[]} [options.watchList]
   * @param {(list: string[], added: Set<any>, removed: Set<any>) => void} [options.handler]
   * @param {String} [options.ctxName]
   */
  constructor(options) {
    /**
     * @private
     * @type {Object<string, { type: any; value: any }>}
     */
    this.__typedSchema = options.typedSchema;
    /**
     * @private
     * @type {String}
     */
    this.__ctxId = options.ctxName || UID.generate();
    /**
     * @private
     * @type {PubSub}
     */
    this.__data = PubSub.registerCtx({}, this.__ctxId);
    /**
     * @private
     * @type {string[]}
     */
    this.__watchList = options.watchList || [];
    /**
     * @private
     * @type {Object<string, any>}
     */
    this.__subsMap = Object.create(null);
    /**
     * @private
     * @type {Set<Function>}
     */
    this.__propertyObservers = new Set();
    /**
     * @private
     * @type {Set<(list: string[], added: Set<any>, removed: Set<any>) => void>}
     */
    this.__collectionObservers = new Set();
    /**
     * @private
     * @type {Set<string>}
     */
    this.__items = new Set();
    /**
     * @private
     * @type {Set<any>}
     */
    this.__removed = new Set();
    /**
     * @private
     * @type {Set<any>}
     */
    this.__added = new Set();

    let changeMap = Object.create(null);

    /**
     * @private
     * @param {String} propName
     * @param {String} ctxId
     */
    this.__notifyObservers = (propName, ctxId) => {
      if (this.__observeTimeout) {
        window.clearTimeout(this.__observeTimeout);
      }
      if (!changeMap[propName]) {
        changeMap[propName] = new Set();
      }
      changeMap[propName].add(ctxId);
      /** @private */
      this.__observeTimeout = window.setTimeout(() => {
        if (Object.keys(changeMap).length === 0) {
          return;
        }
        this.__propertyObservers.forEach((handler) => {
          handler({ ...changeMap });
        });
        changeMap = Object.create(null);
      });
    };
  }

  notify() {
    if (this.__notifyTimeout) {
      window.clearTimeout(this.__notifyTimeout);
    }
    /** @private */
    this.__notifyTimeout = window.setTimeout(() => {
      let added = new Set(this.__added);
      let removed = new Set(this.__removed);
      this.__added.clear();
      this.__removed.clear();
      for (const handler of this.__collectionObservers) {
        handler?.([...this.__items], added, removed);
      }
    });
  }

  /** @param {(list: string[], added: Set<any>, removed: Set<any>) => void} handler */
  observeCollection(handler) {
    this.__collectionObservers.add(handler);

    if (this.__items.size > 0) {
      this.notify();
    }

    return () => {
      this.unobserveCollection(handler);
    };
  }

  /** @param {Function} handler */
  unobserveCollection(handler) {
    this.__collectionObservers?.delete(handler);
  }

  /**
   * @param {Object<string, any>} init
   * @returns {string}
   */
  add(init) {
    let item = new TypedData(this.__typedSchema);
    for (let prop in init) {
      item.setValue(prop, init[prop]);
    }
    this.__items.add(item.uid);
    this.notify();

    this.__data.add(item.uid, item);
    this.__added.add(item);
    this.__watchList.forEach((propName) => {
      if (!this.__subsMap[item.uid]) {
        this.__subsMap[item.uid] = [];
      }
      this.__subsMap[item.uid].push(
        item.subscribe(propName, () => {
          this.__notifyObservers(propName, item.uid);
        }),
      );
    });
    return item.uid;
  }

  /**
   * @param {String} id
   * @returns {TypedData}
   */
  read(id) {
    return this.__data.read(id);
  }

  /**
   * @param {String} id
   * @param {String} propName
   * @returns {any}
   */
  readProp(id, propName) {
    let item = this.read(id);
    return item.getValue(propName);
  }

  /**
   * @template T
   * @param {String} id
   * @param {String} propName
   * @param {T} value
   */
  publishProp(id, propName, value) {
    let item = this.read(id);
    item.setValue(propName, value);
  }

  /** @param {String} id */
  remove(id) {
    this.__removed.add(this.__data.read(id));
    this.__items.delete(id);
    this.notify();
    this.__data.pub(id, null);
    delete this.__subsMap[id];
  }

  clearAll() {
    this.__items.forEach((id) => {
      this.remove(id);
    });
  }

  /** @param {Function} handler */
  observeProperties(handler) {
    this.__propertyObservers.add(handler);

    return () => {
      this.unobserveProperties(handler);
    };
  }

  /** @param {Function} handler */
  unobserveProperties(handler) {
    this.__propertyObservers?.delete(handler);
  }

  /**
   * @param {(item: TypedData) => Boolean} checkFn
   * @returns {String[]}
   */
  findItems(checkFn) {
    let result = [];
    this.__items.forEach((id) => {
      let item = this.read(id);
      if (checkFn(item)) {
        result.push(id);
      }
    });
    return result;
  }

  items() {
    return [...this.__items];
  }

  get size() {
    return this.__items.size;
  }

  destroy() {
    PubSub.deleteCtx(this.__ctxId);
    this.__propertyObservers = null;
    this.__collectionObservers = null;
    for (let id in this.__subsMap) {
      this.__subsMap[id].forEach((sub) => {
        sub.remove();
      });
      delete this.__subsMap[id];
    }
  }
}
