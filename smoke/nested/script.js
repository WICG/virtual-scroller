import {html, render} from '../../../lit-html/lit-html.js';
import Layout from '../../layouts/layout-1d.js';
import {list} from '../../lit-html/lit-list.js';
import {VirtualList} from '../../virtual-list.js';

const items = new Array(40).fill({
  name: 'item',
  items: new Array(2).fill({
    name: 'inner item',
    // items: new Array(4).fill({
    //   name: 'inner inner item',
    // })
  })
});
const container = document.getElementById('root');
listForContainer(container, items);


function listForContainer(container, items) {
  container.classList.add('list');

  const recycledChildren = [];
  const list = Object.assign(new VirtualList(), {
    items,
    recycledChildren: [],
    layout: new Layout({itemSize: {x: innerWidth, y: innerHeight}}),
    container,
    newChildFn: (item, idx) => {
      let child = recycledChildren.pop();
      if (!child) {
        child = document.createElement('div');
        child.classList.add('row');
        child.innerHTML =
            `<div class="title"></div><div class="innerContainer"></div>`;
        child._title = child.querySelector('.title');
        child._container = child.querySelector('.innerContainer');

        // child.id = `section_${idx}`;
        // child._container.id = `innerContainer_${idx}`;

        if (item.items) {
          child._container.classList.remove('innerContainer');
          listForContainer(child._container, item.items);
        }
      }
      return child;
    },
    updateChildFn: (child, item, idx) => {
      // child.id = `section_${idx}`;
      // child._container.id = `innerContainer_${idx}`;

      child._title.textContent = `${idx} - ${item.name}`;
      if (child._container._list) {
        child._container._list.items = item.items;
      }
    },
    recycleChildFn: (child, item, idx) => {
      recycledChildren.push(child);
    }
  });
  container._list = list;
}


/* ------------- lit-html ------------- */

// const template = (item, idx) => html`
//   <section>
//     <h3 class="title">${idx} - ${item.name}</h3>
//     <div class="innerContainer">
//       ${list(item.items, (innerItem, innerIdx) => html`
//         <div>${idx}.${innerIdx} - ${innerItem.name}</div>
//       `)}
//     </div>
//   </section>`;
// render(html`${list(items, template)}`, container);
// setTimeout(() => render(html `${list(items, template)}`, container), 1000);