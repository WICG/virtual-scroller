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

## Design

See [DESIGN.md](./DESIGN.md) for more details.

## &lt;virtual-list&gt;

`<virtual-list>` can be configured through 3 properties:
- `items (Array)`, the data model.
- `template (Function|Object)`, generates the DOM for each data item. Can be set only once.
- `direction (string)` (optional), layout direction, can be set via attribute or property to "vertical" (default) or "horizontal".

Minimal setup:
```html
<virtual-list></virtual-list>

<script type="module">
  import './virtual-list-element.js';

  const list = document.querySelector('virtual-list');

  list.items = new Array(20).fill({name: 'item'});

  list.template = (item, index) => {
    const child = document.createElement('section');
    child.textContent = index + ' - ' + item.name;
    return child;
  };
  
</script>
```

`template` can be also set as an `{newChild: Function, updateChild: Function, recycleChild: Function}` object.

You can recycle DOM by using the `recycleChild` function to collect DOM, and reuse it in `newChild`.

If you decide to keep the recycled DOM attached in the main document, perform DOM updates in `updateChild`.

```js
const recycled = [];

list.template = {
  newChild: (item, index) => {
    return recycled.pop() || document.createElement('section');
  },
  updateChild: (child, item, index) => {
    child.textContent = index + ' - ' + item.name;
  },
  recycleChild: (child, item, index) => {
    recycled.push(child);
  }
};
```

Updates to the `items` array instance will not be captured by `<virtual-list>`. Set a new array to trigger the update.
```js
list.items = list.items.concat([{name: 'new item'}]);
```

### `virtualList(items, template, direction)` directive (lit-html)

`virtualList` directive can be configured with 3 properties:
- `items (Array)`, the data model.
- `template (Function)`, generates the DOM for each data item.
- `direction (string)` (optional), layout direction, can be set to "vertical" (default) or "horizontal".

```js
const render = () => html`
  <ul>
    ${virtualList(items, (i, index) => html`
      <li>${index}: ${i.name}</li>`)}
  </ul>
`;
```
