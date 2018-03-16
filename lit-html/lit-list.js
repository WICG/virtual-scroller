import Layout from '../layouts/layout-1d.js';
import {VirtualList} from '../virtual-list.js';
import {LitMixin, repeat} from './lit-repeater.js';
import {directive} from '../../lit-html/lit-html.js';

const layout = new Layout({direction: 'vertical'});

export const LitList = LitMixin(VirtualList);

export const list = (items, template, config = {}) => {
  // Recycle by default.
  if (!config.hasOwnProperty('recycle')) {
    config.recycle = true;
  }
  if (!config.hasOwnProperty('layout')) {
    config.layout = layout;
  }
  return repeat(items, template, config, LitList);
};
