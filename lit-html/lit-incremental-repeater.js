import {directive} from '../../lit-html/lit-html.js';
import {IncrementalRepeater} from '../incremental-repeater.js';

import {LitMixin} from './lit-repeater.js';

export const LitIncrementalRepeater = LitMixin(IncrementalRepeater);

const partToRepeater = new WeakMap();
export const repeat = (config = {}) => directive(async part => {
  let repeater = partToRepeater.get(part);
  if (!repeater) {
    if (!part.startNode.isConnected) {
      await Promise.resolve();
    }
    repeater = new LitIncrementalRepeater({part, template: config.template});
    partToRepeater.set(part, repeater);
  }
  const {first, chunk, items} = config;
  Object.assign(repeater, {first, chunk, items});
});