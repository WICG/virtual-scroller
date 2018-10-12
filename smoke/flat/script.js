import {Layout1d} from '../../src/layouts/Layout1d.js';
import {scroller} from '../../lit-html/lit-scroller.js';
import {html, render} from '../../node_modules/lit-html/lib/lit-extended.js';
import {VirtualScroller} from '../../src/virtual-scroller.js';

const items = new Array(200).fill({name: 'item'});
const container = document.getElementById('container');

const layout = new Layout1d({itemSize: {height: 50}});
// render(
//     html`${scroller({
//       items,
//       template: (item, idx) => html`
//         <section><div class="title">${idx} - ${item.name}</div></section>
//       `,
//       layout,
//     })}`,
//     container);
const pool = [];
const config = {
  totalItems: items.length,
  container,
  layout,
  createElement: (idx) => {
    let section = pool.pop();
    if (!section) {
      section = document.createElement('section');
      section.innerHTML = `<div class="title"></div>`;
      section._title = section.querySelector('.title');
      // Update it immediately.
      config.updateElement(section, idx);
    }
    return section;
  },
  updateElement: (section, idx) => {
    const item = items[idx];
    section.id = `section_${idx}`;
    section._title.textContent = `${idx} - ${item.name}`;
  },
  recycleElement: (section) => {
    pool.push(section);
  }
};
window.scroller = new VirtualScroller(config);

// document.body.style.minHeight = (innerHeight * 100) + 'px'

// container.style.display = 'none';
// setTimeout(() => {
//   container.style.display = '';
//   scroller.requestReset();
// }, 1000);

// setInterval(() => {
//   Array.from(container.children).forEach(section => {
//     section.appendChild(document.createElement('input'));
//   })
// }, 2000);

// setTimeout(() => {
//   scroller.splice(0, 0, {name: 'new'});
// }, 1000);
