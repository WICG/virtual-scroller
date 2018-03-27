import {RepeatsAndScrolls} from '../../virtual-list.js';
import Layout from '../../layouts/layout-1d.js';
import {HtmlSpec} from '../../../streaming-spec/HtmlSpec.js';
import {iterateStream} from '../../../streaming-spec/iterateStream.js';

class HTMLSpecViewer extends RepeatsAndScrolls(HTMLElement) {

  constructor() {
    super();

    this.style.display = 'block';
    this.style.minHeight = '100000px';

    const htmlSpec = new HtmlSpec();
    htmlSpec.head.style.display = 'none';
    this.appendChild(htmlSpec.head);
    this._htmlSpec = htmlSpec;

    this.items = [];
    this.container = this;
    this.layout = new Layout({
      itemSize: {
        y: 10000,
      },
      _overhang: 800,
    });

    this.newChildFn = (item) => item;
    this.recycleChildFn = () => {};
  }

  _render() {
    super._render();
    if (this._stable && this._last >= this._items.length - 4) {
      this._addNextChunk();
    }
  }

  async _addNextChunk(chunk = 10) {
    if (this._adding) return;
    this._adding = true;
    let i = 0;
    const stream = this._htmlSpec.advance(this._items[this._items.length - 1]);
    for await (const el of iterateStream(stream)) {
      if (/^(style|link|script)$/.test(el.localName)) {
        this._htmlSpec.head.appendChild(el);
      } else {
        this.push(el);
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