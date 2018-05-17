import {HtmlSpec} from '../../node_modules/streaming-spec/HtmlSpec.js';
import {iterateStream} from '../../node_modules/streaming-spec/iterateStream.js';
import {VirtualScrollerElement} from '../../virtual-scroller-element.js';

class HTMLSpecViewer extends VirtualScrollerElement {
  constructor() {
    super();
    this.onRangechange = this.onRangechange.bind(this);
  }
  connectedCallback() {
    super.connectedCallback();
    if (!this.htmlSpec) {
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

      this.htmlSpec = new HtmlSpec();
      this.htmlSpec.head.style.display = 'none';
      this.appendChild(this.htmlSpec.head);

      // The number of nodes that we'll load dynamically
      // as the user scrolls.
      this.totalItems = 9312;
      this.items = [];
      this.placeholders = [];
      for (let i = 0; i < 2; i++) {
        const el = document.createElement('div');
        el.style.lineHeight = '100vh';
        this.placeholders.push(el);
      }
      this.newChild = (idx) => {
        return idx >= this.items.length ?
            this.placeholders[idx % this.placeholders.length] :
            this.items[idx];
      };
      this.updateChild = (child, idx) => {
        if (idx >= this.items.length) {
          child.textContent = `Loading (index ${idx}, loaded ${
              this.items.length} / ${this.totalItems})`;
        }
      };
      this.childKey = (idx) => {
        return idx >= this.items.length ?
            `placeholder-${idx % this.placeholders.length}` :
            idx;
      };
      this.addEventListener('rangechange', this.onRangechange);
    }
  }

  async addNextChunk(chunk = 10) {
    if (this._adding) {
      return;
    }
    this._adding = true;

    await new Promise(resolve => requestIdleCallback(resolve));

    const stream = this.htmlSpec.advance(this.items[this.items.length - 1]);
    for await (const el of iterateStream(stream)) {
      if (/^(style|link|script)$/.test(el.localName)) {
        this.htmlSpec.head.appendChild(el);
      } else {
        this.items.push(el);
        chunk--;
      }
      if (chunk === 0) {
        break;
      }
    }
    this._adding = false;
    if (chunk > 0) {
      // YOU REACHED THE END OF THE SPEC \o/
      this.totalItems = this.items.length;
      this.newChild = (idx) => this.items[idx];
      this.updateChild = this.recycleChild = this.childKey = null;
      this.placeholders = null;
      this.removeEventListener('rangechange', this.onRangechange);
    } else {
      this.requestReset();
    }
  }

  onRangechange(range) {
    if (range.last >= this.items.length) {
      this.addNextChunk();
    }
  }
}

customElements.define('html-spec-viewer', HTMLSpecViewer);