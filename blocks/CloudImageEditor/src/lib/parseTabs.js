// @ts-check

import { deserializeCsv } from '../../../utils/comma-separated.js';
import { ALL_TABS } from '../toolbar-constants.js';

/** @param {string} tabs */
export const parseTabs = (tabs) => {
  if (!tabs) return ALL_TABS;
  const tabList = deserializeCsv(tabs).filter((tab) => ALL_TABS.includes(tab));
  if (tabList.length === 0) {
    return ALL_TABS;
  }
  return tabList;
};
