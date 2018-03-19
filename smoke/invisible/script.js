import {
  VirtualVerticalList
} from '../../virtual-list.js';

const items = new Array(40).fill({
  name: 'item'
});
const container = document.getElementById('container');


window.vlist = new VirtualVerticalList();
vlist._recycledChildren = [];
vlist.layout._itemSize.y = 250;
Object.assign(window.vlist, {
  id: 'vlist',
  items,
  container,
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


container.style.display = 'none';
setTimeout(() => {
  container.style.display = '';
  vlist.requestUpdateView();
}, 1000);