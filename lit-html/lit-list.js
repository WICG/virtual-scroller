import {directive} from '../../lit-html/lit-html.js';
import Layout from '../layouts/layout-1d.js';
import {VirtualList} from '../virtual-list.js';

import {containerFromPart, LitMixin} from './lit-repeater.js';

export const LitList = LitMixin(VirtualList);

const partToList = new WeakMap();
export const list = (config = {}) => directive(async part => {
  let list = partToList.get(part);
  if (!list) {
    const container = await containerFromPart(part);
    list = new LitList({
      part,
      container,
      template: config.template,
      layout: config.layout,
      // Recycle by default.
      recycle: Boolean(!config.hasOwnProperty('recycle') || config.recycle),
    });
    partToList.set(part, list);
  }
  list.items = config.items;
});

export const verticalList = (items, template, layout = new Layout()) =>
    list({items, template, layout});