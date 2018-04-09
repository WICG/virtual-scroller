import {html, render} from '../../../lit-html/lib/lit-extended.js';
import Layout from '../../layouts/layout-1d.js';
import {list} from '../../lit-html/lit-list.js';
import {VirtualList} from '../../virtual-list.js';

const items = new Array(2).fill({name: 'item'});
const container = document.getElementById('container');

const layout = new Layout({itemSize: {x: window.innerWidth, y: 50}});
render(
    html`${list({
      template: (item, idx) => html`
        <section><div class="title">${idx} - ${item.name}</div></section>
      `,
      container,
      layout,
      items
    })}`,
    container);
// window.vlist = new VirtualList({
//   id: 'vlist',
//   items,
//   container,
//   layout,
//   newChild: (item, idx) => {
//     let section = vlist._recycledChildren.pop();
//     if (!section) {
//       section = document.createElement('section');
//       section.innerHTML = `<div class="title"></div>`;
//       section._title = section.querySelector('.title');
//       // Update it immediately.
//       vlist._updateChildFn(section, item, idx);
//     }
//     return section;
//   },
//   updateChild: (section, item, idx) => {
//     section.id = `section_${idx}`;
//     section._title.textContent = `${idx} - ${item.name}`;
//   },
//   recycleChild: (section, item, idx) => {
//     vlist._recycledChildren.push(section);
//   }
// });
// vlist._recycledChildren = [];

// document.body.style.minHeight = (innerHeight * 100) + 'px'

// container.style.display = 'none';
// setTimeout(() => {
//   container.style.display = '';
//   vlist.requestUpdateView();
// }, 1000);

// setInterval(() => {
//   Array.from(container.children).forEach(section => {
//     section.appendChild(document.createElement('input'));
//   })
// }, 2000);

// setTimeout(() => {
//   vlist.splice(0, 0, {name: 'new'});
// }, 1000);