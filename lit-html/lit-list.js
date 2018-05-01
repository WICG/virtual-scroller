import Layout from '../layouts/layout-1d.js';
import {directive} from '../node_modules/lit-html/lit-html.js';
import {VirtualList} from '../virtual-list.js';

import {LitMixin} from './lit-repeater.js';

export const LitList = LitMixin(VirtualList);

const partToList = new WeakMap();
export const list = (config = {}) => directive(async part => {
  let list = partToList.get(part);
  if (!list) {
    if (!part.startNode.isConnected) {
      await Promise.resolve();
    }
    if (!config.layout && config.direction) {
      config.layout = new Layout({direction: config.direction});
    }
    const {template, layout} = config;
    list = new LitList({part, template, layout});
    partToList.set(part, list);
  }
  list.items = config.items;
});

export const virtualList = (items, template, direction = 'vertical') =>
    list({items, template, direction});