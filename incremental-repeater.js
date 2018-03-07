import {Repeats} from './virtual-repeater.js';

export const IncrementalRepeats = Superclass => class extends Repeats(Superclass) {

    constructor() {
        super();
        // Default.
        this._chunk = 1;
    }

    set items(items) {
        if (items !== this._items) {
            super.items = items;
            this.num = this._chunk;
        }
    }

    set chunk(chunk) {
        this._chunk = Math.max(chunk, 1);
    }

    _render() {
        super._render();
        if (!this._asyncRenderChunkId) {
            // TODO: what's the best timing?
            this._asyncRenderChunkId = requestIdleCallback(() => {
                this._asyncRenderChunkId = null;
                // TODO: adaptive chunk like in dom-repeat?
                const num = this._num + this._chunk;
                if (this._items && num <= this._items.length) {
                    this.num = num;
                }
            });
        }
    }
};