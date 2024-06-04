// @ts-check
import { EventType } from '../blocks/UploadCtxProvider/EventEmitter.js';
import {
  validateIsImage,
  validateFileType,
  validateMaxSizeLimit,
  validateUploadError,
} from '../utils/validators/file/index.js';
import { validateMultiple, validateCollectionUploadError } from '../utils/validators/collection/index.js';

/** @typedef {import('../types').OutputError<import('../types').OutputFileErrorType>} OutputFileErrorType */

/** @typedef {import('../types').OutputError<import('../types').OutputCollectionErrorType>} OutputCollectionErrorType */

/**
 * @typedef {(
 *   outputEntry: import('../types').OutputFileEntry,
 *   ctx: import('./UploaderBlock.js').UploaderBlock,
 * ) => undefined | OutputFileErrorType} FuncFileValidator
 */

/**
 * @typedef {(
 *   collection: import('./TypedCollection.js').TypedCollection,
 *   ctx: import('./UploaderBlock.js').UploaderBlock,
 * ) => undefined | OutputCollectionErrorType | OutputCollectionErrorType[]} FuncCollectionValidator
 */

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
    const collection = this._uploadCollection;
    const errors = [];

    for (const validator of [...this._collectionValidators, ...(this._blockInstance.cfg.collectionValidators ?? [])]) {
      const errorOrErrors = validator(collection, this._blockInstance);
      if (!errorOrErrors) {
        continue;
      }
      if (Array.isArray(errorOrErrors)) {
        errors.push(...errorOrErrors);
      } else {
        errors.push(errorOrErrors);
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

    for (const validator of [...this._fileValidators, ...(this._blockInstance.cfg.fileValidators ?? [])]) {
      try {
        const error = validator(outputEntry, this._blockInstance);
        if (error) {
          errors.push(error);
        }
      } catch (error) {
        console.log(`You're validator is failed ${error}`);
      }
    }
    entry.setValue('errors', errors);
  }
}
