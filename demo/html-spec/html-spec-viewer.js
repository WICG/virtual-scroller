import {HtmlSpec} from '../../../streaming-spec/HtmlSpec.js';
import {iterateStream} from '../../../streaming-spec/iterateStream.js';
import {VirtualListElement} from '../../virtual-list-element.js';

class HTMLSpecViewer extends VirtualListElement {
  connectedCallback() {
    super.connectedCallback();
    if (!this._htmlSpec) {
      this._htmlSpec = new HtmlSpec();
      this._htmlSpec.head.style.display = 'none';
      this.appendChild(this._htmlSpec.head);

      this.items = [];
      this.addNextChunk();
      this.addEventListener(
          'rangechange', (event) => this.onRangechange(event));
    }
  }

  newChild(item) {
    return item;
  }

  recycleChild() {
    // keep children in DOM.
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