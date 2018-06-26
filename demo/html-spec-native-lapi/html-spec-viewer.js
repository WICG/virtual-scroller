import {ItemSource, VirtualScrollerElement} from 'std:virtual-scroller';

import {HtmlSpec} from '../../node_modules/streaming-spec/HtmlSpec.js';
import {iterateStream} from '../../node_modules/streaming-spec/iterateStream.js';

class HTMLSpecSource extends ItemSource {
  static fromArray(items) {
    const placeholders = [];
    for (let i = 0; i < 4; i++) {
      const el = document.createElement('div');
      el.style.lineHeight = '100vh';
      placeholders.push(el);
    }
    const indexToElement = (idx) => idx >= items.length ?
        placeholders[idx % placeholders.length] :
        items[idx];

    return new this({
      // The number of nodes that we'll load dynamically
      // as the user scrolls.
      getLength: () => Math.max(items.length, 9312),
      item: indexToElement,
      key: indexToElement,
    });
  }
}

class HTMLSpecViewer extends VirtualScrollerElement {
  constructor() {
    super();
    this.onRangechange = this.onRangechange.bind(this);
  }
  connectedCallback() {
    super.connectedCallback();
    if (!this._htmlSpec) {
      const style = document.createElement('style');
      style.textContent = `
  :host {
    /* Bug with position: fixed https://crbug.com/846322 */
    position: absolute;
    top: 0px;
    left: 0px;
    right: 0px;
    bottom: 0px;
    padding: 8px;
    height: auto;
  }`;
      this.shadowRoot.appendChild(style);
      if ('rootScroller' in document) {
        document.rootScroller = this;
      }

      this._htmlSpec = new HtmlSpec();
      this._htmlSpec.head.style.display = 'none';
      this.appendChild(this._htmlSpec.head);

      this._stream = this._htmlSpec.advance();
      this.items = [];
      this.itemSource = HTMLSpecSource.fromArray(this.items);
      this.createElement = (item) => item;
      this.updateElement = (item, _, idx) => {
        if (idx >= this.items.length) {
          item.textContent = `Loading (index ${idx}, loaded ${
              this.items.length} / ${this.itemSource.length})`;
        }
      };
      this.addNextChunk();
      this.addEventListener('rangechange', this.onRangechange);
    }
  }

  async addNextChunk(chunk = 10) {
    if (this._adding) {
      return;
    }
    this._adding = true;

    await new Promise(resolve => requestIdleCallback(resolve));

    for await (const el of iterateStream(this._stream)) {
      if (/^(style|link|script)$/.test(el.localName)) {
        this._htmlSpec.head.appendChild(el);
      } else {
        this.items.push(el);
        this.itemsChanged();
        chunk--;
      }
      if (chunk === 0) {
        break;
      }
    }
    this._adding = false;
    if (chunk > 0) {
      // YOU REACHED THE END OF THE SPEC \o/
      this.itemSource = this.items;
      this.updateElement = null;
      this._stream = null;
      this.removeEventListener('rangechange', this.onRangechange);
    }
  }

  onRangechange(range) {
    if (range.last >= this.items.length) {
      this.addNextChunk();
    }
  }
}

customElements.define('html-spec-viewer', HTMLSpecViewer);