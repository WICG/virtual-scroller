import {directive} from '../../lit-html/lit-html.js';
import Layout from '../layouts/layout-1d.js';
import {VirtualList} from '../virtual-list.js';

import {LitMixin} from './lit-repeater.js';

export const LitList = LitMixin(VirtualList);

const partToList = new WeakMap();
export const list = (config = {}) => directive(async part => {
  let list = partToList.get(part);
  if (!list) {
    while (!part.startNode.isConnected) {
      await Promise.resolve();
    }
    const {template, layout} = config;
    list = new LitList({part, template, layout});
    partToList.set(part, list);
  }
  list.items = config.items;
});

export const verticalList = (items, template, layout = new Layout()) =>
    list({items, template, layout});