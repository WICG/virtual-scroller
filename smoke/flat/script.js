import Layout from '../../layouts/layout-1d.js';
import {scroller} from '../../lit-html/lit-scroller.js';
import {html, render} from '../../node_modules/lit-html/lib/lit-extended.js';
import {VirtualScroller} from '../../virtual-scroller.js';

const items = new Array(200).fill({name: 'item'});
const container = document.getElementById('container');

const layout = new Layout({itemSize: {height: 50}});
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
