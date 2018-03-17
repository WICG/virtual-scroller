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
container._recycledChildren = [];

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

window.vlist = new VirtualVerticalList();
Object.assign(window.vlist, {
  id: 'vlist',
  items,
  container,
  newChildFn: (item, idx) => {
    let section = container._recycledChildren.pop();
    if (!section) {
      section = document.createElement('section');
      section.innerHTML = `<div class="title"></div><div class="innerContainer"></div>`;
      section.$ = {
        title: section.querySelector('.title'),
        container: section.querySelector('.innerContainer')
      };
      section.id = `section_${idx}`;
      section.$.container.id = `innerContainer_${idx}`;
      section._recycledChildren = [];
      section._list = new VirtualVerticalList();
      Object.assign(section._list, {
        id: `nestedList_${idx}`,
        container: section.$.container,
        newChildFn: (innerItem, innerIdx) => {
          return (section._recycledChildren.pop() || document.createElement('div'));
        },
        updateChildFn: (child, innerItem, innerIdx) => {
          child.id = `innerContent_${idx}.${innerIdx}`;
          child.innerHTML = `${idx}.${innerIdx} - ${innerItem.name}`;
        },
        recycleChildFn: (child, innerItem, innerIdx) => {
          section._recycledChildren.push(child);
        }
      });
      // section._list._layout._itemSize.y = 1000000;
    }
    return section;
  },
  updateChildFn: (section, item, idx) => {
    section.id = `section_${idx}`;
    section.$.container.id = `innerContainer_${idx}`;
    section.$.title.textContent = `${idx} - ${item.name}`;
    section._list.id = `nestedList_${idx}`;
    section._list.items = item.items;
  },
  recycleChildFn: (section, item, idx) => {
    container._recycledChildren.push(section);
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