import {Layout1d} from '../../src/layouts/Layout1d.js';
import {scroller} from '../../lit-html/lit-scroller.js';
import {html, render} from '../../node_modules/lit-html/lit-html.js';
import {VirtualScroller} from '../../src/virtual-scroller.js';

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
scrollerForContainer(container, items);


function scrollerForContainer(container, items) {
  container.classList.add('scroller');

  const pool = [];
  const scroller = new VirtualScroller({
    totalItems: items.length,
    layout: new Layout1d({itemSize: {width: innerWidth, height: innerHeight}}),
    container,
    createElement: (idx) => {
      let child = pool.pop();
      if (!child) {
        child = document.createElement('div');
        child.classList.add('row');
        child.innerHTML =
            `<div class="title"></div><div class="innerContainer"></div>`;
        child._title = child.querySelector('.title');
        child._container = child.querySelector('.innerContainer');

        // child.id = `section_${idx}`;
        // child._container.id = `innerContainer_${idx}`;

        if (items[idx].items) {
          child._container.classList.remove('innerContainer');
          scrollerForContainer(child._container, item.items);
        }
      }
      return child;
    },
    updateElement: (child, idx) => {
      // child.id = `section_${idx}`;
      // child._container.id = `innerContainer_${idx}`;

      child._title.textContent = `${idx} - ${items[idx].name}`;
      if (child._container._scroller) {
        child._container._scroller.totalItems = item.items.length;
      }
    },
    recycleElement: (child) => {
      pool.push(child);
    }
  });
  container._scroller = scroller;
}


/* ------------- lit-html ------------- */

// const template = (item, idx) => html`
//   <section>
//     <h3 class="title">${idx} - ${item.name}</h3>
//     <div class="innerContainer">
//       ${scroller(item.items, (innerItem, innerIdx) => html`
//         <div>${idx}.${innerIdx} - ${innerItem.name}</div>
//       `)}
//     </div>
//   </section>`;
// render(html`${scroller(items, template)}`, container);
// setTimeout(() => render(html `${scroller(items, template)}`, container),
// 1000);
