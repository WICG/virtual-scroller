import {directive} from '../../lit-html/lit-html.js';
import Layout from '../layouts/layout-1d.js';
import {VirtualList} from '../virtual-list.js';

import {LitMixin} from './lit-repeater.js';

export const LitList = LitMixin(VirtualList);

const partToList = new WeakMap();
export const list = (config = {}) => directive(part => {
  let list = partToList.get(part);
  if (!list) {
    list = new LitList();
    partToList.set(part, list);
  }
  Object.assign(config, {
    part,
    // Assign template only once.
    template: list.template || config.template,
    // Assign layout only once.
    layout: list.layout || config.layout,
    // Recycle by default.
    recycle:
        Boolean(config.hasOwnProperty('recycle') === false || config.recycle),
  });
  Object.assign(list, config);
});

export const verticalList = (items, template, layout = new Layout()) =>
    list({items, template, layout});