# &lt;virtual-list&gt;

`<virtual-list>` maps a provided set of JavaScript objects onto DOM nodes, and renders only the DOM nodes that are currently visible, leaving the rest "virtualized".

This document is an early-stage explainer for `<virtual-list>` as a potential future web platform feature, as part of the [layered API](https://github.com/drufball/layered-apis) project. The repository also hosts a proof-of-concept implementation that is being co-evolved with the design.

The (tentative) API design choices made here, as well as the list's capabilities, take inspiration from the [infinite list study group](https://github.com/domenic/infinite-list-study-group) research.

## Example

```html
<script type="module"
        src="std:virtual-list|https://some.cdn.com/virtual-list.js">
</script>

<virtual-list></virtual-list>

<script type="module">
  const list = document.querySelector('virtual-list');

  // Setting this is required; without it the list does not function.
  list.newChild = (item, index) => {
    const child = document.createElement('section');
    child.textContent = index + ' - ' + item.name;
    return child;
  };

  // This will automatically cause a render of the visible children
  // (i.e., those that fit on the screen).
  list.items = new Array(200).fill({name: 'item'});
</script>
```

Checkout more examples in [demo/index.html](./demo/index.html) and [demo/examples.html](demo/examples.html).

## API

### `newChild` property

Type: `function(item: any, index: number) => Element`

Set this property to configure the virtual list with a factory that creates an element the first time a given item is ready to be displayed in the DOM.

This property is required. Without it set, nothing will render.

### `updateChild` property

Type: `function(child: Element, item: any, index: number)`

Set this property to configure the virtual list with a function that will update items' elements.

If set, this property is invoked in two scenarios:

* The user scrolls the list, changing which items' elements are visible. In this case, `updateChild` is called for all of the newly-visible elements.
* The developer sets the `items` property, changing the contents of an item whose element is visible.
* The developer calls `requestReset()`, which will call `updateChild` for all currently-visible elements. (See [below](#data-manipulation) for why this can be useful.)

### `recycleChild` property

Type: `function(child: Element, item: any, index: number)`

Set this property to replace the default behavior of removing an item's element from the DOM when it is no longer visible.

This is often used for node-recycling scenarios, as seen in [the example below](#dom-recycling).

_We are discussing the naming and API for this functionality in [#25](https://github.com/valdrinkoshi/virtual-list/issues/25)._

### `itemKey` property

Type: `function(item: any) => any`

Set this property to provide an identifier for a given item.

This is often used for more efficient re-ordering, as seen in [the example below](#efficient-re-ordering).

### `items` property

Type: `Array`

Set this property to control the items which are displayed in the list. (The items are mapped to elements via the `newChild` and `updateChild` properties.)

_Right now the getter for this property just returns back the set value. We are discussing how exactly that should work in [#29](https://github.com/valdrinkoshi/virtual-list/issues/29)._

### `layout` property

Type: `string`

One of:

* "vertical" (default)
* "horizontal"
* "vertical-grid"
* "horizontal-grid"

Can also be set as an attribute on the element, e.g. `<virtual-list layout="horizontal-grid"></virtual-list>`

### `requestReset()` method

This re-renders all of the currently-displayed items, updating them from their source data using `updateChild`.

This can be useful for if you mutate the `items` array, or elements in it, instead of setting the `items` property to a new value. Also see [the example below](#data-manipulation).

_We are discussing the naming of this API, as well as whether it should exist at all, in [#26](https://github.com/valdrinkoshi/virtual-list/issues/26). The aforementioned [#29](https://github.com/valdrinkoshi/virtual-list/issues/29) is also relevant._

### "`rangechange`" event

Bubbles: false / Cancelable: false / Composed: false

Fired when the list has finished rendering a new range of items, e.g. because the user scrolled. The event is an instance of `RangeChangeEvent`, which has the following properties:

- `first`: a number giving the index of the first item currently rendered.
- `last`: a number giving the index of the last item currently rendered.

Also see [the example below](#range-changes).

## More examples

### DOM recycling

You can recycle DOM by using the `recycleChild` function to collect DOM, and reuse it in `newChild`.

When doing this, be sure to perform DOM updates in `updateChild`, as recycled children will otherwise have the data from the previous `item`.

```js
const nodePool = [];

Object.assign(list, {
  newChild() {
    return nodePool.pop() || document.createElement('section');
  },
  updateChild(child, item, index) {
    child.textContent = index + ' - ' + item.name;
  },
  recycleChild(child) {
    nodePool.push(child);
  }
};
```

### Data manipulation

The `<virtual-list>` element will automatically rerender the displayed items when it receives a new `items` array. For example, to add a new item to the end, you could do:

```js
list.items = list.items.concat([{name: 'new item'}]);
```

If you want to keep the same `items` array instance, you can use `requestReset()` to notify the list about changes, and cause a rerender of currently-displayed items. If you do this, you'll also need to set `updateChild`, since the elements will already be created. For example:

```js
list.updateChild = (child, item, index) => {
  child.textContent = index + ' - ' + item.name;
};

list.items.push({name: 'new item'});
list.items[0].name = 'item 0 changed!';

list.requestReset();
```

In this case, `newChild` will be called for the newly-added item once it becomes visible, whereas `updateChild` will every item, including the ones that already had corresponding elements in the old items array.

### Efficient re-ordering

`<virtual-list>` keeps track of the generated DOM via an internal key/Element map to limit the number of created nodes. 

The default key is the array index, but can be customized through the `itemKey` property.

Imagine we have a list of 3 contacts:
```js
const myContacts = [{name: 'A'}, {name: 'B'}, {name: 'C'}];
virtualList.items = myContacts;
virtualList.newChild = () => document.createElement('div');
virtualList.updateChild = (div, contact) => div.textContent = contact.name;
```
This renders 3 contacts, and the `<virtual-list>` key/Element map is:
```
0: <div>A</div>
1: <div>B</div>
2: <div>C</div>
```
We want to move the first contact to the end:
```js
function moveFirstContactToEnd() {
  const contact = myContacts[0];
  myContacts.splice(0, 1); // remove it
  myContacts.push(contact); // add it to the end
  virtualList.requestReset(); // notify virtual-list
}
```
With the default `itemKey`, we would relayout and repaint all the contacts when invoking `moveFirstContactToEnd()`:
```
0: <div>B</div> (was <div>A</div>)
1: <div>C</div> (was <div>B</div>)
2: <div>A</div> (was <div>C</div>)
```
This is suboptimal, as we just needed to move the first DOM node to the end.

We can customize the key/Element mapping via `itemKey`:
```js
virtualList.itemKey = (contact) => contact.name;
```

This updates the `<virtual-list>` key/Element map to:
```
A: <div>A</div>
B: <div>B</div>
C: <div>C</div>
```
Now, invoking `moveFirstContactToEnd()` will only move the first contact DOM node to the end.

See [demo/sorting.html](demo/sorting.html) as an example implementation.

### Range changes

Listen for the "`rangechange`" event to get notified when the displayed items range changes.

```js
list.addEventListener('rangechange', (event) => {
  if (event.first === 0) {
    console.log('rendered first item.');
  }
  if (event.last === list.items.length - 1) {
    console.log('rendered last item.');
    // Perhaps you would want to load more data for display!
  }
});
```

### Scrolling

`<virtual-list>` needs to be sized in order to determine how many items should be rendered. Its default size is 300px × 150px, similar to [CSS inline replaced elements](https://www.w3.org/TR/CSS2/visudet.html#inline-replaced-width) like images and iframes.

Main document scrolling will be achievable through [`document.rootScroller`](https://github.com/bokand/root-scroller)
```html
<virtual-list style="height: 100vh"></virtual-list>
<script type="module">
  document.rootScroller = document.querySelector('virtual-list');
</script>
```

## Development

To work on the proof-of-concept implementation, ensure you have installed the npm dependencies and serve from the project root

```sh
$ npm install
$ python -m SimpleHTTPServer 8081
```

Then, navigate to the url: http://localhost:8081/demo/

For more documentation on the internal pieces that we use to implement our `<virtual-list>` prototype, see [DESIGN.md](./DESIGN.md).
