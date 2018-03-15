import {IncrementalRepeats} from '../incremental-repeater.js';
import {LitMixin, repeat as baseRepeat} from './lit-repeater.js';

export const LitIncrementalRepeater = LitMixin(IncrementalRepeats(class{}));

export const repeat = (config) => baseRepeat(config, LitIncrementalRepeater);