import {RepeatsAndScrolls} from '../../virtual-list.js';
import Layout from '../../layouts/layout-1d.js';
import {HtmlSpec} from '../../../streaming-spec/HtmlSpec.js';
import {iterateStream} from '../../../streaming-spec/iterateStream.js';

class HTMLSpecViewer extends RepeatsAndScrolls(HTMLElement) {

  connectedCallback() {
    if (this._firstConnected) return;
    this._firstConnected = true;
    this._setup();
  }

  async _setup() {
    this.style.display = 'block';
    this.style.minHeight = '100000px';

    this.layout = new Layout();
    this.container = this;
    this.newChildFn = item => item;
    this.updateChildFn = this.recycleChildFn = () => {};

    const htmlSpec = new HtmlSpec();
    this.parentElement.append(htmlSpec.head);

    // A stream of elements that yields as soon as the
    // element is created. As in, content may yet be appended
    // due to parsing.
    const stream = htmlSpec.advance();
    this.items = [];
    for await (const el of iterateStream(stream)) {
      this.push(el);
    }
  }
}

customElements.define('html-spec-viewer', HTMLSpecViewer);