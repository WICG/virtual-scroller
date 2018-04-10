import {directive} from '../../lit-html/lit-html.js';
import {IncrementalRepeats} from '../incremental-repeater.js';

import {LitMixin} from './lit-repeater.js';

export const LitIncrementalRepeater = LitMixin(IncrementalRepeats(class {}));

const partToRepeater = new WeakMap();
export const repeat = (config = {}) => directive(part => {
  let repeater = partToRepeater.get(part);
  if (!repeater) {
    repeater = new LitIncrementalRepeater({part, template: config.template});
    partToRepeater.set(part, repeater);
  }
  const {first, num, chunk, items} = config;
  Object.assign(repeater, {first, num, chunk, items});
});