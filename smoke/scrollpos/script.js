import Layout from '../../layouts/layout-1d.js';
import {VirtualScroller} from '../../virtual-scroller.js';

const anchor = document.getElementById('anchor');

const container = document.body;
const layout = new Layout();
const scroller = new VirtualScroller({
  container,
  layout,
  createElement: (index) => {
    const element = document.createElement('div');
    element.className = 'item';
    element.innerHTML = `${index}) ${
        myContacts[index].longText}<div class='anchor' index="${index}"></div>`;
    return element;
  }
});

let myContacts = null;
fetch('../../demo/contacts/contacts.json')
    .then((resp) => resp.json())
    .then((contacts) => {
      myContacts = contacts;
      scroller.totalItems = myContacts.length;
    });

window.updateItemAnchor = function updateItemAnchor(a) {
  if (Number.isFinite(a)) {
    layout.itemAnchor = a;
    layout.reflowIfNeeded();
    container.style.setProperty('--item-anchor', (100 * a) + '%');
  }
};

window.updateViewportAnchor = function updateViewportAnchor(a) {
  if (Number.isFinite(a)) {
    layout.viewportAnchor = a;
    layout.reflowIfNeeded();
    container.style.setProperty('--viewport-anchor', (100 * a) + '%');
  }
};

window.scrollToIndex = function scrollToIndex(index, offset) {
  index = Math.min(myContacts.length - 1, Math.max(0, index));
  offset = Number.isFinite(offset) ? offset : 0;
  document.getElementById('index').value = index;
  document.getElementById('offset').value = offset;
  layout.scrollAnchor = {index, offset};
  layout.reflowIfNeeded();
};

window.runTest = async function runTest() {
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const step = 50, max = container.offsetWidth, min = 100;
  for (let i = max - step; i >= min; i -= step) {
    await raf();
    container.style.width = `${i}px`;
  }
  for (let i = min + step; i < max; i += step) {
    await raf();
    container.style.width = `${i}px`;
  }
  await raf();
  container.style.width = null;
};