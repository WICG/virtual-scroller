import {HtmlSpec} from '../../node_modules/streaming-spec/HtmlSpec.js';
import {iterateStream} from '../../node_modules/streaming-spec/iterateStream.js';
import {VirtualScrollerElement} from '../../virtual-scroller-element.js';

class HTMLSpecViewer extends VirtualScrollerElement {
  connectedCallback() {
    super.connectedCallback();
    if (!this._htmlSpec) {
      const style = document.createElement('style');
      style.textContent = `
  :host {
    position: fixed;
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
      this.newChild = (idx) => this.items[idx];
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
    const stream = this._htmlSpec.advance(this.items[this.totalItems - 1]);
    for await (const el of iterateStream(stream)) {
      if (/^(style|link|script)$/.test(el.localName)) {
        this._htmlSpec.head.appendChild(el);
      } else {
        this.items.push(el);
        this.totalItems++;
        chunk--;
      }
      if (chunk === 0) {
        break;
      }
    }
    this._adding = false;
  }

  onRangechange(range) {
    if (range.last >= this.totalItems - 4) {
      this.addNextChunk();
    }
  }
}

customElements.define('html-spec-viewer', HTMLSpecViewer);