import {directive} from '../../lit-html/lit-html.js';
import {IncrementalRepeats} from '../incremental-repeater.js';

import {LitMixin} from './lit-repeater.js';

export const LitIncrementalRepeater = LitMixin(IncrementalRepeats(class {}));

const partToRepeater = new WeakMap();
export const repeat = (config = {}) => directive(part => {
  let repeater = partToRepeater.get(part);
  if (!repeater) {
    repeater = new LitIncrementalRepeater();
    partToRepeater.set(part, repeater);
  }
  Object.assign(config, {
    part,
    // Assign template only once.
    template: repeater.template || config.template,
  });
  Object.assign(repeater, config);
});