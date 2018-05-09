import Layout from '../../layouts/layout-1d.js';
import {list} from '../../lit-html/lit-list.js';
import {html, render} from '../../node_modules/lit-html/lib/lit-extended.js';
import {VirtualList} from '../../virtual-list.js';

const items = new Array(200).fill({name: 'item'});
const container = document.getElementById('container');

const layout = new Layout({itemSize: {height: 50}});
// render(
//     html`${list({
//       items,
//       template: (item, idx) => html`
//         <section><div class="title">${idx} - ${item.name}</div></section>
//       `,
//       layout,
//     })}`,
//     container);
const pool = [];
const config = {
  items: items.length,
  container,
  layout,
  newChild: (idx) => {
    let section = pool.pop();
    if (!section) {
      section = document.createElement('section');
      section.innerHTML = `<div class="title"></div>`;
      section._title = section.querySelector('.title');
      // Update it immediately.
      config.updateChild(section, idx);
    }
    return section;
  },
  updateChild: (section, idx) => {
    const item = items[idx];
    section.id = `section_${idx}`;
    section._title.textContent = `${idx} - ${item.name}`;
  },
  recycleChild: (section) => {
    pool.push(section);
  }
};
window.vlist = new VirtualList(config);

// document.body.style.minHeight = (innerHeight * 100) + 'px'

// container.style.display = 'none';
// setTimeout(() => {
//   container.style.display = '';
//   vlist.requestReset();
// }, 1000);

// setInterval(() => {
//   Array.from(container.children).forEach(section => {
//     section.appendChild(document.createElement('input'));
//   })
// }, 2000);

// setTimeout(() => {
//   vlist.splice(0, 0, {name: 'new'});
// }, 1000);