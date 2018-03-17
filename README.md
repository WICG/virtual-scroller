# Virtual list

Implementation of a Virtual list API, influenced by the research done by the [infinite list study group](https://github.com/domenic/infinite-list-study-group).

## Local Setup

Ensure you have installed the npm dependencies and serve from the project root
```sh
$ npm install
$ polymer serve --npm
```
Then, navigate to the url: http://localhost:8081/components/virtual-list/

## Concepts and Domain

An infinite list optimizes the rendering of DOM according to the visible area and available data.

Some implementations append DOM incrementally, others recycle the DOM.

### Repeats mixin - VirtualRepeater class

- Orchestrates DOM creation and layouting, ensures minimum number of nodes is created.
- Given an `items` array, it displays `num` elements starting from `first` index.
- Delegates DOM creation, update and recycling via `newChildFn, updateChildFn, recycleChildFn`.
- Delegates DOM layout via `_measureCallback`.


### RepeatsAndScrolls mixin - VirtualList class

- Extends `Repeats` mixin by updating the layout of container and items on scroll/resize.
- Delegates computation of range, container size, scroll position/size to a `Layout` instance.
- Handles the update of the range, container size, scroll position/size when notified by the `Layout` instance.
- Provides the `Layout` instance the layout information of the children via `_measureCallback`.

### Layout class

- Computes viewport, scroll size, average item size, first/last visible indexes.
- Supports 2 scroll directions: horizontal or vertical
- Notifies of size, position, range, scroll error changes to subscribers

## How to use

### VirtualList

```js 
import Layout from './layouts/layout-1d.js';
import {VirtualList} from './virtual-list.js';

(async () => {

  const layout = new Layout({direction: 'vertical'});
  const items = await fetch('./examples/contacts/contacts.json').then(response => response.json());
  const recycledChildren = [];
  
  const list = Object.assign(new VirtualList(), {
    items,
    layout,
    container: document.body,
    // Creates DOM that is about to be connected.
    newChildFn: (item, idx) => {
      return (recycledChildren.pop() || document.createElement('section'));
    },
    // Updates the DOM with data.
    updateChildFn: (child, item, idx) => {
      child.innerHTML = `<h3>${idx} - ${item.name}</h3><p>${item.mediumText}</p>`;
      // or update with lit-html, e.g.
      // render(html`<h3>${idx} - ${item.name}</h3><p>${item.mediumText}</p>`, child);
    },
    // Collects DOM that is offscreen instead of disconnecting & trashing it.
    recycleChildFn: (child, item, idx) => {
      recycledChildren.push(child);
    }
  });

})();

```

### `verticalList` directive (lit-html)

```js 
import {verticalList} from './flavors/lit-html/lit-list.js';
import {html, render} from '../../lit-html/lit-html.js';

(async () => {

  const items = await fetch('./examples/contacts/contacts.json').then(response => response.json());

  render(html`${verticalList(items, (item, idx) => 
      html`<section><h3>${idx} - ${item.name}</h3><p>${item.mediumText}</p></section>`)}`, document.body);

})();

```
