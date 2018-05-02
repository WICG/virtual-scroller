import Layout from '../../layouts/layout-1d.js';
import {HtmlSpec} from '../../node_modules/streaming-spec/HtmlSpec.js';
import {iterateStream} from '../../node_modules/streaming-spec/iterateStream.js';
import {VirtualList} from '../../virtual-list.js';

const htmlSpec = new HtmlSpec();
htmlSpec.head.style.display = 'none';
document.body.appendChild(htmlSpec.head);

const items = [];

const list = new VirtualList({
  items,
  container: document.body,
  layout: new Layout({itemSize: {height: 1000}}),
  newChild(item) {
    return item;
  },
  recycleChild() {
    // Keep nodes in the dom.
  },
});
document.body.addEventListener('rangechange', onRangechange);

let isAddingChunks = false;
addNextChunk();

async function addNextChunk(chunk = 10) {
  if (isAddingChunks) {
    return;
  }
  isAddingChunks = true;
  const last = items[items.length - 1];
  const stream = htmlSpec.advance(last);
  for await (const el of iterateStream(stream)) {
    if (/^(style|link|script)$/.test(el.localName)) {
      htmlSpec.head.appendChild(el);
    } else {
      items.push(el);
      chunk--;
    }
    if (chunk === 0) {
      list.requestReset();
      break;
    }
  }
  isAddingChunks = false;
}

function onRangechange(range) {
  if (range.last >= items.length - 4) {
    addNextChunk();
  }
}