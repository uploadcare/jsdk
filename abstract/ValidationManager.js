// @ts-check
import { EventType } from '../blocks/UploadCtxProvider/EventEmitter.js';
import { validateCollectionUploadError, validateMultiple } from '../utils/validators/collection/index.js';
import {
  validateFileType,
  validateIsImage,
  validateMaxSizeLimit,
  validateUploadError,
} from '../utils/validators/file/index.js';

/**
 * @typedef {(
 *   outputEntry: import('../types').OutputFileEntry,
 *   ctx: import('./UploaderBlock.js').UploaderBlock,
 * ) => undefined | import('../types').OutputErrorFile} FuncFileValidator
 */

/**
 * @typedef {(
 *   collection: ReturnType<
 *     typeof import('./buildOutputCollectionState.js').buildOutputCollectionState<
 *       import('../types').OutputCollectionStatus
 *     >
 *   >,
 *   ctx: import('./UploaderBlock.js').UploaderBlock,
 * ) => undefined | import('../types').OutputErrorCollection} FuncCollectionValidator
 */

const LOGGER = {
  file: 'File validator execution has failed',
  collection: 'Collection validator execution has failed',
  message: 'Missing message. We recommend adding message: value.',
};

export class ValidationManager {
  /**
   * @private
   * @type {import('./UploaderBlock.js').UploaderBlock}
   */
  _blockInstance;

  /** @type {FuncFileValidator[]} */
  _fileValidators = [validateIsImage, validateFileType, validateMaxSizeLimit, validateUploadError];

  /** @type {FuncCollectionValidator[]} */
  _collectionValidators = [validateMultiple, validateCollectionUploadError];

  /** @param {import('./UploaderBlock.js').UploaderBlock} blockInstance */
  constructor(blockInstance) {
    this._blockInstance = blockInstance;

    this._uploadCollection = this._blockInstance.uploadCollection;

    const runAllValidators = () => {
      this.runFileValidators();
      this.runCollectionValidators();
    };

    this._blockInstance.subConfigValue('maxLocalFileSizeBytes', runAllValidators);
    this._blockInstance.subConfigValue('multipleMin', runAllValidators);
    this._blockInstance.subConfigValue('multipleMax', runAllValidators);
    this._blockInstance.subConfigValue('multiple', runAllValidators);
    this._blockInstance.subConfigValue('imgOnly', runAllValidators);
    this._blockInstance.subConfigValue('accept', runAllValidators);
  }

  /** @param {string[]} [entryIds] */
  runFileValidators(entryIds) {
    const ids = entryIds ?? this._uploadCollection.items();
    for (const id of ids) {
      const entry = this._uploadCollection.read(id);
      if (entry) {
        this._runFileValidatorsForEntry(entry);
      }
    }
  }

  runCollectionValidators() {
    const collection = this._blockInstance.getOutputCollectionState();
    const errors = [];

    for (const validator of [
      ...this._collectionValidators,
      ...this._addCustomTypeToValidators(this._blockInstance.cfg.collectionValidators),
    ]) {
      try {
        const errorOrErrors = validator(collection, this._blockInstance);
        if (!errorOrErrors) {
          continue;
        }
        if (errorOrErrors) {
          errors.push(errorOrErrors);

          if (!errorOrErrors.message) {
            console.warn(LOGGER.message);
          }
        }
      } catch (error) {
        console.warn(LOGGER.collection, error);
      }
    }

    this._blockInstance.$['*collectionErrors'] = errors;

    if (errors.length > 0) {
      this._blockInstance.emit(
        EventType.COMMON_UPLOAD_FAILED,
        () =>
          /** @type {import('../types').OutputCollectionState<'failed'>} */ (
            this._blockInstance.getOutputCollectionState()
          ),
        { debounce: true },
      );
    }
  }

  /**
   * @private
   * @param {import('./TypedData.js').TypedData} entry
   */
  _runFileValidatorsForEntry(entry) {
    const outputEntry = this._blockInstance.getOutputItem(entry.uid);
    const errors = [];

    for (const validator of [
      ...this._fileValidators,
      ...this._addCustomTypeToValidators(this._blockInstance.cfg.fileValidators),
    ]) {
      try {
        const error = validator(outputEntry, this._blockInstance);
        if (!error) {
          continue;
        }
        if (error) {
          errors.push(error);

          if (!error.message) {
            console.warn(LOGGER.message);
          }
        }
      } catch (error) {
        console.warn(LOGGER.file, error);
      }
    }
    entry.setValue('errors', errors);
  }

  /**
   * @template T
   * @param {T[]} validators
   * @returns {T[]}
   */
  _addCustomTypeToValidators(validators) {
    // @ts-ignore
    return validators.map((fn) => (...args) => {
      // @ts-ignore
      const result = fn(...args);

      return result ? { ...result, ...{ type: 'CUSTOM_ERROR' } } : undefined;
    });
  }
}
