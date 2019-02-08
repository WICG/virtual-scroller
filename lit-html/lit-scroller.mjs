import {Layout1d} from '../src/layouts/Layout1d.mjs';
import {directive} from '../node_modules/lit-html/lit-html.js';
import {VirtualScroller} from '../src/VirtualScroller.mjs';

import {LitMixin} from './lit-repeater.mjs';

export const LitScroller = LitMixin(VirtualScroller);

const partToScroller = new WeakMap();
export const scroller = directive((config = {}) => async part => {
  let scroller = partToScroller.get(part);
  if (!scroller) {
    if (!part.startNode.isConnected) {
      await Promise.resolve();
    }
    if (!config.layout && config.direction) {
      config.layout = new Layout1d({direction: config.direction});
    }
    const {template, layout} = config;
    scroller = new LitScroller({part, template, layout});
    partToScroller.set(part, scroller);
  }
  scroller.totalItems = config.totalItems;
});

export const virtualScroller = (totalItems, template, direction = 'vertical') =>
    scroller({totalItems, template, direction});
