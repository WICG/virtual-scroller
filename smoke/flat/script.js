import {
  VirtualList
} from '../../virtual-list.js';

import Layout from '../../layouts/layout-1d.js';

const items = new Array(20).fill({
  name: 'item'
});
const container = document.getElementById('container');

const layout = new Layout({
  itemSize: {
    x: window.innerWidth,
    y: 50
  }
});
window.vlist = new VirtualList();
vlist._recycledChildren = [];
Object.assign(window.vlist, {
  id: 'vlist',
  items,
  container,
  layout,
  newChildFn: (item, idx) => {
    let section = vlist._recycledChildren.pop();
    if (!section) {
      section = document.createElement('section');
      section.innerHTML = `<div class="title"></div>`;
      section._title = section.querySelector('.title');
      // Update it immediately.
      vlist._updateChildFn(section, item, idx);
    }
    return section;
  },
  updateChildFn: (section, item, idx) => {
    section.id = `section_${idx}`;
    section._title.textContent = `${idx} - ${item.name}`;
  },
  recycleChildFn: (section, item, idx) => {
    vlist._recycledChildren.push(section);
  }
});

// document.body.style.minHeight = (innerHeight * 100) + 'px'

container.style.display = 'none';
setTimeout(() => {
  container.style.display = '';
  vlist.requestUpdateView();
}, 1000);

// setInterval(() => {
//   Array.from(container.children).forEach(section => {
//     section.appendChild(document.createElement('input'));
//   })
// }, 2000);

// setTimeout(() => {
//   vlist.splice(0, 0, {name: 'new'});
// }, 1000);