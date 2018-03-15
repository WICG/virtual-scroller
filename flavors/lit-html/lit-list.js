import Layout from '../../layouts/layout-1d.js';
import {VirtualList} from '../../virtual-list.js';
import {LitMixin, repeat} from './lit-repeater.js';
import {directive} from '/node_modules/lit-html/lit-html.js';

const layout = new Layout({direction: 'vertical'});

export const LitList = LitMixin(VirtualList);

export const list = (config) => {
  // Recycle by default.
  if (config && !config.hasOwnProperty('recycle')) {
    config.recycle = true;
  }
  if (config && !config.hasOwnProperty('layout')) {
    config.layout = layout;
  }
  return repeat(config, LitList);
};
