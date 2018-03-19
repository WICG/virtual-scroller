import {
  VirtualVerticalList
} from '../../virtual-list.js';
import {
  list
} from '../../lit-html/lit-list.js';
import {
  html,
  render
} from '../../../lit-html/lit-html.js';

const items = new Array(40).fill({
  name: 'item',
  items: new Array(1).fill({
    name: 'inner item',
  })
});
const container = document.getElementById('container');

// const ro = new ResizeObserver(entries => {
//   for (let entry of entries) {
//     const cr = entry.contentRect;
//     console.log('Element:', entry.target);
//     console.log(`Element size: ${cr.width}px x ${cr.height}px`);
//     console.log(`Element padding: ${cr.top}px ; ${cr.left}px`);
//   }
// });
// ro.observe(container);

/* ------------- raw js ------------- */

let listsCount = 0;
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
      section.innerHTML = `<div class="title"></div><div class="innerContainer"></div>`;
      section.$ = {
        title: section.querySelector('.title'),
        container: section.querySelector('.innerContainer')
      };
      section.id = `section_${idx}`;
      section.$.container.id = `innerContainer_${idx}`;
      section._list = new VirtualVerticalList();
      section._list._recycledChildren = [];
      section._list.layout._itemSize.y = 200;
      Object.assign(section._list, {
        id: 'nested_' + listsCount++,
        container: section.$.container,
        newChildFn: (innerItem, innerIdx) => {
          let child = section._list._recycledChildren.pop();
          if (!child) {
            child = document.createElement('div');
          } else {
            console.debug(section._list.id + ' used recycled #' + child.id);
          }
          return child;
        },
        updateChildFn: (child, innerItem, innerIdx) => {
          child.id = `innerContent_${idx}.${innerIdx}`;
          child.innerHTML = `${idx}.${innerIdx} - ${innerItem.name}`;
        },
        recycleChildFn: (child, innerItem, innerIdx) => {
          section._list._recycledChildren.push(child);
          console.debug(section._list.id + ' recycled #' + child.id);
        }
      });
    } else {
      console.debug(vlist.id + ' used recycled #' + section.id);
    }
    return section;
  },
  updateChildFn: (section, item, idx) => {
    section.id = `section_${idx}`;
    section.$.container.id = `innerContainer_${idx}`;
    section.$.title.textContent = `${idx} - ${item.name}`;
    section._list.items = item.items;
  },
  recycleChildFn: (section, item, idx) => {
    vlist._recycledChildren.push(section);
    console.debug(vlist.id + ' recycled #' + section.id);
  }
});


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