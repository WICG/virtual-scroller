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
  const myItems = new Array(200).fill('item');

  // Setting this is required; without it the list does not function.
  list.newChild = (index) => {
    const child = document.createElement('section');
    child.textContent = index + ' - ' + myItems[index];
    child.onclick = () => console.log(`clicked item #${index}`);
    return child;
  };

  // This will automatically cause a render of the visible children
  // (i.e., those that fit on the screen).
  list.totalItems = myItems.length;
</script>
```

Checkout more examples in [demo/index.html](./demo/index.html).

## API

### `newChild` property

Type: `function(itemIndex: number) => Element`

Set this property to configure the virtual list with a factory that creates an element the first time a given item at the specified index is ready to be displayed in the DOM.

This property is required. Without it set, nothing will render.

### `updateChild` property

Type: `function(child: Element, itemIndex: number)`

Set this property to configure the virtual list with a function that will update the element with data at a given index.

If set, this property is invoked in two scenarios:

* The user scrolls the list, changing which items' elements are visible. In this case, `updateChild` is called for all of the newly-visible elements.
* The developer changes the `totalItems` property.
* The developer calls `requestReset()`, which will call `updateChild` for all currently-visible elements. See [below](#data-manipulation-using-requestreset) for why this can be useful.

For more on the interplay between `newChild` and `updateChild`, and when each is appropriate, see [the example below](#using-newchild-and-updatechild)

### `recycleChild` property

Type: `function(child: Element, itemIndex: number)`

Set this property to replace the default behavior of removing an item's element from the DOM when it is no longer visible.

This is often used for node-recycling scenarios, as seen in [the example below](#dom-recycling-using-recyclechild).

_We are discussing the naming and API for this functionality in [#25](https://github.com/valdrinkoshi/virtual-list/issues/25)._

### `childKey` property

Type: `function(itemIndex: number) => any`

Set this property to provide a custom identifier for the element corresponding to a given data index.

This is often used for more efficient re-ordering, as seen in [the example below](#efficient-re-ordering-using-childkey).

### `totalItems` property

Type: `number`

Set this property to control how many items the list will display. The items are mapped to elements via the `newChild` property, so this controls the total number of times `newChild` could be called, as the user scrolls to reveal all the times.

Can also be set as an attribute (all lower-case) on the element, e.g. `<virtual-list totalitems="10"></virtual-list>`

### `layout` property

Type: `string`

One of:

* "vertical" (default)
* "horizontal"
* "vertical-grid"
* "horizontal-grid"

Can also be set as an attribute on the element, e.g. `<virtual-list layout="horizontal-grid"></virtual-list>`

### `requestReset()` method

This re-renders all of the currently-displayed elements, updating them from their source data using `updateChild`.

This can be useful when you mutate data without changing the `totalItems`. Also see [the example below](#data-manipulation-using-requestreset).

_We are discussing the naming of this API, as well as whether it should exist at all, in [#26](https://github.com/valdrinkoshi/virtual-list/issues/26). The aforementioned [#29](https://github.com/valdrinkoshi/virtual-list/issues/29) is also relevant._

### "`rangechange`" event

Bubbles: false / Cancelable: false / Composed: false

Fired when the list has finished rendering a new range of items, e.g. because the user scrolled. The event is an instance of `RangeChangeEvent`, which has the following properties:

- `first`: a number giving the index of the first item currently rendered.
- `last`: a number giving the index of the last item currently rendered.

Also see [the example below](#performing-actions-as-the-list-scrolls-using-the-rangechange-event).

## More examples

### Using `newChild` and `updateChild`

The rule of thumb for these two options is:

* You always have to set `newChild`. It is responsible for actually creating the DOM elements corresponding to each item.
* You should set `updateChild` if you ever plan on updating the items in the list.

Thus, for completely static lists, you only need to set `newChild`:

```js
let myItems = ['a', 'b', 'c', 'd'];

list.newChild = index => {
  const child = document.createElement('div');
  child.textContent = myItems[index];
  return child;
};

// Calls newChild four times (assuming the screen is big enough)
list.totalItems = myItems.length;
```

In this example, we are statically displaying a virtual list with four items, which we never plan to update. This can be useful for use cases where you would otherwise use static HTML, but want to get the performance benefits of virtualization. (Admittedly, we'd need more than four items to see that happen in reality.)

Note that even if we invoke `requestReset()`, nothing new would render in this case:

```js
// Does nothing
setTimeout(() => {
  myItems = ['A', 'B', 'C', 'D'];
  list.requestReset();
}, 100);
```

_Note: see [#15](https://github.com/valdrinkoshi/virtual-list/issues/51) for why we included a `setTimeout` here._

If you plan to update your items, you're likely better off using `newChild` to set up the "template" for each item, and using `updateChild` to fill in the data. Like so:

```js
list.newChild = () => {
  return document.createElement('div');
};

list.updateChild = (child, index) => {
  child.textContent = myItems[index];
};

let myItems = ['a', 'b', 'c', 'd'];
// Calls newChild + updateChild four times
list.totalItems = myItems.length;

// This now works: it calls updateChild four times
setTimeout(() => {
  myItems = ['A', 'B', 'C', 'D'];
  list.requestReset();
}, 100);
```

### DOM recycling using `recycleChild`

You can recycle DOM by using the `recycleChild` function to collect DOM, and reuse it in `newChild`.

When doing this, be sure to perform DOM updates in `updateChild`, as recycled children will otherwise have the data from the previous item.

```js
const myItems = ['a', 'b', 'c', 'd'];
const nodePool = [];

Object.assign(list, {
  newChild() {
    return nodePool.pop() || document.createElement('div');
  },
  updateChild(child, index) {
    child.textContent = myItems[index];
  },
  recycleChild(child) {
    nodePool.push(child);
  }
};
```

### Data manipulation using `requestReset()`

The `<virtual-list>` element will automatically rerender the displayed items when `items` changes. For example, to add a new item to the end, you could do:

```js
myItems.push('new item');
list.totalItems++;
```

If you want to keep the same number of items or change an item's properties, you can use `requestReset()` to notify the list about changes, and cause a rerender of currently-displayed items. If you do this, you'll also need to set `updateChild`, since the elements will already be created. For example:

```js
list.updateChild = (child, index) => {
  child.textContent = index + ' - ' + myItems[index];
};

myItems[0] = 'item 0 changed!';

list.requestReset();
```

In this case, `newChild` will be called for the newly-added item once it becomes visible, whereas `updateChild` will every item, including the ones that already had corresponding elements in the old items indexes.

### Efficient re-ordering using `childKey`

`<virtual-list>` keeps track of the generated DOM via an internal key/Element map to limit the number of created nodes.

The default key is the array index, but can be customized through the `childKey` property.

Imagine we have a list of 3 contacts:
```js
const myContacts = ['A', 'B', 'C'];
virtualList.totalItems = myContacts.length;
virtualList.newChild = () => document.createElement('div');
virtualList.updateChild = (div, index) => div.textContent = myContacts[index];
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
With the default `childKey`, we would relayout and repaint all the contacts when invoking `moveFirstContactToEnd()`:
```
0: <div>B</div> (was <div>A</div>)
1: <div>C</div> (was <div>B</div>)
2: <div>A</div> (was <div>C</div>)
```
This is suboptimal, as we just needed to move the first DOM node to the end.

We can customize the key/Element mapping via `childKey`:
```js
virtualList.childKey = (index) => myContacts[index];
```

This updates the `<virtual-list>` key/Element map to:
```
A: <div>A</div>
B: <div>B</div>
C: <div>C</div>
```
Now, invoking `moveFirstContactToEnd()` will only move the first contact DOM node to the end.

See [demo/sorting.html](demo/sorting.html) as an example implementation.

### Performing actions as the list scrolls using the "`rangechange`" event

Listen for the "`rangechange`" event to get notified when the displayed items range changes.

```js
list.addEventListener('rangechange', (event) => {
  if (event.first === 0) {
    console.log('rendered first item.');
  }
  if (event.last === list.totalItems - 1) {
    console.log('rendered last item.');
    // Perhaps you would want to load more data for display!
  }
});
```

### Scrolling

`<virtual-list>` needs to be sized in order to determine how many items should be rendered. Its default height is 150px, similar to [CSS inline replaced elements](https://www.w3.org/TR/CSS2/visudet.html#inline-replaced-height) like images and iframes.

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
