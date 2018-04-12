import {HtmlSpec} from '../../../streaming-spec/HtmlSpec.js';
import {iterateStream} from '../../../streaming-spec/iterateStream.js';
import Layout from '../../layouts/layout-1d.js';
import {VirtualList} from '../../virtual-list.js';

class HTMLSpecViewer extends HTMLElement {
  connectedCallback() {
    if (this._htmlSpec) {
      return;
    }
    this.style.display = 'block';
    this.style.minHeight = '100000px';

    this._htmlSpec = new HtmlSpec();
    this._htmlSpec.head.style.display = 'none';
    this.appendChild(this._htmlSpec.head);

    const winHeight = innerHeight;
    this._list = new VirtualList({
      container: this,
      layout: new Layout({itemSize: {height: winHeight}, _overhang: winHeight}),
      newChild: (item) => item
    });
    this.items = this._list.items = [];
    this.addEventListener('stable', this._onStable.bind(this));
  }

  _onStable() {
    if (this._list.first + this._list.num >= this.items.length - 4) {
      this._addNextChunk();
    }
  }

  async _addNextChunk(chunk = 10) {
    if (this._adding) {
      return;
    }
    this._adding = true;
    let i = 0;
    const stream = this._htmlSpec.advance(this.items[this.items.length - 1]);
    for await (const el of iterateStream(stream)) {
      if (/^(style|link|script)$/.test(el.localName)) {
        this._htmlSpec.head.appendChild(el);
      } else {
        this._list.push(el);
        i++;
      }
      if (i === chunk) {
        this._adding = false;
        break;
      }
    }
  }
}

customElements.define('html-spec-viewer', HTMLSpecViewer);