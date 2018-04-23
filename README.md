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
  - type: `RangeChangeEvent, bubbles: false, cancelable: false, composed: false`
  - Fired when the list has rendered to a new range of items.
  - _event.first_
    - type: `number`
    - the index of the first item currently rendered.
  - _event.last_
    - type: `number`
    - the index of the last item currently rendered.

# Example

```html
<virtual-list></virtual-list>

<script type="module">
  import './virtual-list-element.js';

  const list = document.querySelector('virtual-list');

  list.newChild = (item, index) => {
    const child = document.createElement('section');
    child.textContent = index + ' - ' + item.name;
    return child;
  };

  list.items = new Array(20).fill({name: 'item'});
</script>
```

## DOM recycling

You can recycle DOM by using the `recycleChild` function to collect DOM, and reuse it in `newChild`.

Ensure to perform DOM updates in `updateChild`, as recycled children will still be configured with the old `item`.

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

`<virtual-list>` will rerender the displayed items when it receives a new `items` array.
```js
list.items = list.items.concat([{name: 'new item'}]);
```

If you want to keep the same `items` array instance, ensure to update the DOM via `updateChild` and to use `requestReset()` to rerender the displayed items.

```js
list.updateChild = (child, item, index) => {
  child.textContent = index + ' - ' + item.name;
};

list.items.push({name: 'new item'});
list.items[0].name = 'item 0 changed!';

list.requestReset();
```

## Range changes

Listen for `rangechange` event to get notified when the displayed items range changes.
```js
list.addEventListener('rangechange', (event) => {
  if (event.first === 0) {
    console.log('rendered first item.');
  }
  if (event.last === list.items.length - 1) {
    console.log('rendered last item.');
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