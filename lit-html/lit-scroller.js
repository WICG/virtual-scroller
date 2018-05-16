import Layout from '../layouts/layout-1d.js';
import {directive} from '../node_modules/lit-html/lit-html.js';
import {VirtualScroller} from '../virtual-scroller.js';

import {LitMixin} from './lit-repeater.js';

export const LitScroller = LitMixin(VirtualScroller);

const partToScroller = new WeakMap();
export const scroller = (config = {}) => directive(async part => {
  let scroller = partToScroller.get(part);
  if (!scroller) {
    if (!part.startNode.isConnected) {
      await Promise.resolve();
    }
    if (!config.layout && config.direction) {
      config.layout = new Layout({direction: config.direction});
    }
    const {template, layout} = config;
    scroller = new LitScroller({part, template, layout});
    partToScroller.set(part, scroller);
  }
  scroller.totalItems = config.totalItems;
});

export const virtualScroller = (totalItems, template, direction = 'vertical') =>
    scroller({totalItems, template, direction});