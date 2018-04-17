# &lt;virtual-list&gt;

`<virtual-list>` renders only the visible portion of a list and optimizes the amount of DOM operations and reflows.

## Properties

- _newChild_
  - type: `function(item: any, index: number) => Element`
  - returns an `Element` for the given item and index.
- _updateChild_
  - type: `function(child: Element, item: any, index: number)`
  - invoked after the `child` is appended to the DOM and requires to be updated with data.
- _recycleChild_
  - type: `function(child: Element, item: any, index: number)`
  - invoked before the `child` is removed from the DOM. Set to control DOM removal/recycling behavior.
- _items_
  - type: `Array`
  - the data model.
- _layout_ 
  - type: `string`
  - layout type, can be set via attribute or property to "vertical" (default) or "horizontal".


## Methods

- _requestReset()_
  - Schedules a rerendering of the displayed items.

## Events

- _rangechange_
  - `bubbles: false, cancelable: false, composed: false`
  - Fired when the list has scrolled to a new range of items.
  - _event.detail.first_
    - type: `number`
    - the index of the first item currently rendered.
  - _event.detail.num_
    - type: `number`
    - the number of items currently rendered.


## Minimal setup
 
```html
<virtual-list></virtual-list>

<script type="module">
  import './virtual-list-element.js';

  const list = document.querySelector('virtual-list');

  list.items = new Array(20).fill({name: 'item'});

  list.newChild = (item, index) => {
    const child = document.createElement('section');
    child.textContent = index + ' - ' + item.name;
    return child;
  };
</script>
```

## DOM recycling

You can recycle DOM by using the `recycleChild` function to collect DOM, and reuse it in `newChild`.

If you decide to keep the recycled DOM attached in the main document, perform DOM updates in `updateChild`.

```js
const recycled = [];

Object.assign(list, {
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

## Data manipulation

Updates to the `items` array instance will not be captured by `<virtual-list>`.

Either set a new array to trigger the update, or use `requestReset()` to notify of changes if you want to keep the same array instance.
```js
/* Set a new array instance to trigger rerendering. */
list.items = list.items.concat([{name: 'new item'}]);

/* 
  If you want to keep the same array instance, remember to 
  invoke `requestReset()` to notify of the changes.
 */
list.items.push({name: 'new item'});
list.requestReset();
```

## Range changes

Listen for `rangechange` event to get notified of changes of `first, num`.
```js
list.addEventListener('rangechange', (event) => {
  const range = event.detail;
  if (range.first + range.num === list.items.length) {
    console.log('scrolled to the bottom of the list!');
  }
});
```

# Development

Implementation of a Virtual list API, influenced by the research done by the [infinite list study group](https://github.com/domenic/infinite-list-study-group).

Ensure you have installed the npm dependencies and serve from the project root
```sh
$ npm install
$ polymer serve --npm
```
Then, navigate to the url: http://localhost:8081/components/virtual-list/

### Design

See [DESIGN.md](./DESIGN.md) for more details.