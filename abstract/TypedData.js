import { PubSub, UID } from '../symbiote.js';

const MSG_NAME = '[Typed State] Wrong property name: ';
const MSG_TYPE = '[Typed State] Wrong property type: ';

export class TypedData {
  /**
   * @param {Object<string, { type: any; value: any; nullable?: Boolean }>} typedSchema
   * @param {String} [ctxName]
   */
  constructor(typedSchema, ctxName) {
    /** @private */
    this.__typedSchema = typedSchema;
    /** @private */
    this.__ctxId = ctxName || UID.generate();
    /** @private */
    this.__schema = Object.keys(typedSchema).reduce((acc, key) => {
      acc[key] = typedSchema[key].value;
      return acc;
    }, {});
    /**
     * @private
     * @type {PubSub}
     */
    this.__data = PubSub.registerCtx(this.__schema, this.__ctxId);
  }

  /** @returns {String} */
  get uid() {
    return this.__ctxId;
  }

  /**
   * @param {String} prop
   * @param {any} value
   */
  setValue(prop, value) {
    if (!this.__typedSchema.hasOwnProperty(prop)) {
      console.warn(MSG_NAME + prop);
      return;
    }
    let pDesc = this.__typedSchema[prop];
    if (value?.constructor === pDesc.type || value instanceof pDesc.type || (pDesc.nullable && value === null)) {
      this.__data.pub(prop, value);
      return;
    }
    console.warn(MSG_TYPE + prop);
  }

  /** @param {Object<string, any>} updObj */
  setMultipleValues(updObj) {
    for (let prop in updObj) {
      this.setValue(prop, updObj[prop]);
    }
  }

  /** @param {String} prop */
  getValue(prop) {
    if (!this.__typedSchema.hasOwnProperty(prop)) {
      console.warn(MSG_NAME + prop);
      return undefined;
    }
    return this.__data.read(prop);
  }

  /**
   * @param {String} prop
   * @param {(newVal: any) => void} handler
   */
  subscribe(prop, handler) {
    return this.__data.sub(prop, handler);
  }

  remove() {
    PubSub.deleteCtx(this.__ctxId);
  }
}
