import {VirtualListElement} from 'std:virtual-list';

import {HtmlSpec} from '../../node_modules/streaming-spec/HtmlSpec.js';
import {iterateStream} from '../../node_modules/streaming-spec/iterateStream.js';

class HTMLSpecViewer extends VirtualListElement {
  connectedCallback() {
    super.connectedCallback();
    if (!this._htmlSpec) {
      const style = document.createElement('style');
      style.textContent = `
  :host {
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

      this.items = [];
      this.newChild = (item) => item;
      this.addNextChunk();
      this.addEventListener(
          'rangechange', (event) => this.onRangechange(event));
    }
  }

  async addNextChunk(chunk = 10) {
    if (this._adding) {
      return;
    }
    this._adding = true;
    const stream = this._htmlSpec.advance(this.items[this.items.length - 1]);
    for await (const el of iterateStream(stream)) {
      if (/^(style|link|script)$/.test(el.localName)) {
        this._htmlSpec.head.appendChild(el);
      } else {
        this.items.push(el);
        chunk--;
      }
      if (chunk === 0) {
        this.requestReset();
        break;
      }
    }
    this._adding = false;
  }

  onRangechange(range) {
    if (range.last >= this.items.length - 4) {
      this.addNextChunk();
    }
  }
}

customElements.define('html-spec-viewer', HTMLSpecViewer);