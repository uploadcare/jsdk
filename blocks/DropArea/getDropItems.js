// @ts-check

/**
 * @typedef {{
 *       type: 'file';
 *       file: File;
 *       fullPath?: string;
 *     }
 *   | {
 *       type: 'url';
 *       url: string;
 *     }} DropItem
 */

/**
 * @param {File} file
 * @returns {Promise<boolean>}
 */
function checkIsDirectory(file) {
  return new Promise((resolve) => {
    if (typeof window.FileReader !== 'function') {
      resolve(false);
    }

    try {
      const reader = new FileReader();
      reader.onerror = () => {
        resolve(true);
      };
      /** @param {Event} e */
      const onLoad = (e) => {
        if (e.type !== 'loadend') {
          reader.abort();
        }
        resolve(false);
      };
      reader.onloadend = onLoad;
      reader.onprogress = onLoad;

      reader.readAsDataURL(file);
    } catch (err) {
      resolve(false);
    }
  });
}

/**
 * @param {FileSystemEntry} webkitEntry
 * @param {string} dataTransferItemType
 * @returns {Promise<DropItem[] | null>}
 */
function readEntryContentAsync(webkitEntry, dataTransferItemType) {
  return new Promise((resolve) => {
    let reading = 0;
    /** @type {DropItem[]} */
    const dropItems = [];

    /** @param {FileSystemEntry} entry */
    const readEntry = (entry) => {
      if (!entry) {
        console.warn('Unexpectedly received empty content entry', { scope: 'drag-and-drop' });
        resolve(null);
      }
      if (entry.isFile) {
        reading++;
        /** @type {FileSystemFileEntry} */ (entry).file((file) => {
          reading--;
          // webkitGetAsEntry don't provide type for HEIC images at least, so we use type value from dataTransferItem
          const clonedFile = new File([file], file.name, { type: file.type || dataTransferItemType });
          dropItems.push({
            type: 'file',
            file: clonedFile,
            fullPath: entry.fullPath,
          });

          if (reading === 0) {
            resolve(dropItems);
          }
        });
      } else if (entry.isDirectory) {
        readReaderContent(/** @type {FileSystemDirectoryEntry} */ (entry).createReader());
      }
    };

    /** @param {FileSystemDirectoryReader} reader */
    const readReaderContent = (reader) => {
      reading++;

      reader.readEntries((entries) => {
        reading--;
        for (const entry of entries) {
          readEntry(entry);
        }

        if (reading === 0) {
          resolve(dropItems);
        }
      });
    };

    readEntry(webkitEntry);
  });
}

/**
 * Note: dataTransfer will be destroyed outside of the call stack. So, do not try to process it asynchronous.
 *
 * @param {DataTransfer} dataTransfer
 * @returns {Promise<DropItem[]>}
 */
export function getDropItems(dataTransfer) {
  /** @type {DropItem[]} */
  const dropItems = [];
  const promises = [];
  for (let i = 0; i < dataTransfer.items.length; i++) {
    const item = dataTransfer.items[i];
    if (!item) {
      continue;
    }
    if (item.kind === 'file') {
      const itemType = item.type;
      if (typeof item.webkitGetAsEntry === 'function' || typeof (/** @type {any} */ (item).getAsEntry) === 'function') {
        const entry =
          typeof item.webkitGetAsEntry === 'function'
            ? item.webkitGetAsEntry()
            : /** @type {any} */ (item).getAsEntry();
        promises.push(
          readEntryContentAsync(entry, itemType).then((items) => {
            if (items) {
              dropItems.push(...items);
            }
          }),
        );
        continue;
      }

      const file = item.getAsFile();
      file &&
        promises.push(
          checkIsDirectory(file).then((isDirectory) => {
            if (isDirectory) {
              // we can't get directory files, so we'll skip it
            } else {
              dropItems.push({
                type: 'file',
                file,
              });
            }
          }),
        );
    } else if (item.kind === 'string' && item.type.match('^text/uri-list')) {
      promises.push(
        new Promise((resolve) => {
          item.getAsString((value) => {
            dropItems.push({
              type: 'url',
              url: value,
            });
            resolve(undefined);
          });
        }),
      );
    }
  }

  return Promise.all(promises).then(() => dropItems);
}
