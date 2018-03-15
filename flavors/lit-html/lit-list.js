import {VirtualList} from '../../virtual-list.js';
import {LitMixin, repeat} from './lit-repeater.js';
import {directive} from '/node_modules/lit-html/lit-html.js';

const partToList = new WeakMap();

export const LitList = LitMixin(VirtualList);

export const list = (config) => {
  // Recycle by default.
  if (config && !config.hasOwnProperty('recycle')) {
    config.recycle = true;
  }
  return repeat(config, LitList);
};
