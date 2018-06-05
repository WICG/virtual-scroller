# &lt;virtual-scroller&gt;

`<virtual-scroller>` maps a provided set of JavaScript objects onto DOM nodes, and renders only the DOM nodes that are currently visible, leaving the rest "virtualized".

This document is an early-stage explainer for `<virtual-scroller>` as a potential future web platform feature, as part of the [layered API](https://github.com/drufball/layered-apis) project. The repository also hosts a proof-of-concept implementation that is being co-evolved with the design.

The (tentative) API design choices made here, as well as the element's capabilities, take inspiration from the [infinite list study group](https://github.com/domenic/infinite-list-study-group) research.

## Example

```html
<script type="module"
        src="std:virtual-scroller|https://some.cdn.com/virtual-scroller.js">
</script>

<virtual-scroller></virtual-scroller>

<script type="module">
  const scroller = document.querySelector('virtual-scroller');
  const myItems = new Array(200).fill('item');

  // Setting this is required; without it the scroller does not function.
  scroller.createElement = (index) => {
    const child = document.createElement('section');
    child.textContent = index + ' - ' + myItems[index];
    child.onclick = () => console.log(`clicked item #${index}`);
    return child;
  };

  // This will automatically cause a render of the visible children
  // (i.e., those that fit on the screen).
  scroller.totalItems = myItems.length;
</script>
```

### Leverage default recycling

By default `virtual-scroller` creates and recycles `<div>` children, and renders the data index.
This snippet creates a list of divs displaying indexes from 0 to 99:
```html
<virtual-scroller totalitems="100"></virtual-scroller>
```

You can customize the rendering through `updateElement` property:
```js
virtualScroller.updateElement = (divElem, index) => {
  divElem.textContent = index + ' - ' + myItems[index];
};
```

You can customize the child type while still leveraging the recycling by distributing a `<template>` with the custom element into `virtual-scroller`:
```html
<virtual-scroller totalitems="100">
  <template>
    <contact-element sortable></contact-element>
  </template>
</virtual-scroller>

<script type="module">
  virtualScroller.updateElement = (contactElem, index) => {
    contactElem.contact = getContactForIndex(index);
  };
</script>
```

Checkout more examples in [demo/index.html](./demo/index.html).

## API

### `createElement` property

Type: `function(itemIndex: number) => Element`

Set this property to configure the virtual scroller with a factory that creates an element the first time a given item at the specified index is ready to be displayed in the DOM.

The default `createElement` searches for a `<template>` child, and if none, it creates a generic `<div>`. It reuses recycled DOM nodes collected by the default `recycleElement`. 

Changing this property will automatically set the default `recycleElement` to null.

### `updateElement` property

Type: `function(child: Element, itemIndex: number)`

Set this property to configure the virtual scroller with a function that will update the element with data at a given index.

This property is invoked in these scenarios:

* The user scrolls the scroller, changing which items' elements are visible. In this case, `updateElement` is called for all of the newly-visible elements.
* The developer changes the `totalItems` property.
* The developer calls `requestReset()`, which will call `updateElement` for all currently-visible elements. See [below](#data-manipulation-using-requestreset) for why this can be useful.

The default `updateElement` sets the textContent of the child to be the data index.

For more on the interplay between `createElement` and `updateElement`, and when each is appropriate, see [the example below](#using-createelement-and-updateelement)

### `recycleElement` property

Type: `function(child: Element, itemIndex: number)`

The default `recycleElement` collects the item's element no longer visible and keeps it on the DOM in order to be reused by the default `createElement`. 

Set this property to null to discart and remove the item's element from the DOM when no longer visible.

Changing this property will automatically set the default `createElement` to null.

This is often used for node-recycling scenarios, as seen in [the example below](#dom-recycling-using-recycleElement).

### `elementKey` property

Type: `function(itemIndex: number) => any`

Set this property to provide a custom identifier for the element corresponding to a given data index.

This is often used for more efficient re-ordering, as seen in [the example below](#efficient-re-ordering-using-elementKey).

### `totalItems` property

Type: `number`

Set this property to control how many items the scroller will display. The items are mapped to elements via the `createElement` property, so this controls the total number of times `createElement` could be called, as the user scrolls to reveal all the times.

Can also be set as an attribute (all lower-case) on the element, e.g. `<virtual-scroller totalitems="10"></virtual-scroller>`

### `layout` property

Type: `string`

One of:

* "vertical" (default)
* "horizontal"
* "vertical-grid"
* "horizontal-grid"

Can also be set as an attribute on the element, e.g. `<virtual-scroller layout="horizontal-grid"></virtual-scroller>`

### `requestReset()` method

This re-renders all of the currently-displayed elements, updating them from their source data using `updateElement`.

This can be useful when you mutate data without changing the `totalItems`. Also see [the example below](#data-manipulation-using-requestreset).

_We are discussing the naming of this API, as well as whether it should exist at all, in [#26](https://github.com/valdrinkoshi/virtual-scroller/issues/26). The aforementioned [#29](https://github.com/valdrinkoshi/virtual-scroller/issues/29) is also relevant._

### "`rangechange`" event

Bubbles: false / Cancelable: false / Composed: false

Fired when the scroller has finished rendering a new range of items, e.g. because the user scrolled. The event is an instance of `RangeChangeEvent`, which has the following properties:

- `first`: a number giving the index of the first item currently rendered.
- `last`: a number giving the index of the last item currently rendered.

Also see [the example below](#performing-actions-as-the-scroller-scrolls-using-the-rangechange-event).

## More examples

### Using `createElement` and `updateElement`

The rule of thumb for these two options is:

* You always have to set `createElement`. It is responsible for actually creating the DOM elements corresponding to each item.
* You should set `updateElement` if you ever plan on updating the data items.

Thus, for completely static lists, you only need to set `createElement`:

```js
let myItems = ['a', 'b', 'c', 'd'];

scroller.createElement = index => {
  const child = document.createElement('div');
  child.textContent = myItems[index];
  return child;
};

// Calls createElement four times (assuming the screen is big enough)
scroller.totalItems = myItems.length;
```

In this example, we are statically displaying a virtual scroller with four items, which we never plan to update. This can be useful for use cases where you would otherwise use static HTML, but want to get the performance benefits of virtualization. (Admittedly, we'd need more than four items to see that happen in reality.)

Note that even if we invoke `requestReset()`, nothing new would render in this case:

```js
// Does nothing
requestAnimationFrame(() => {
  myItems = ['A', 'B', 'C', 'D'];
  scroller.requestReset();
});
```

_Note: we include `requestAnimationFrame` here to wait for `<virtual-scroller>` rendering._

If you plan to update your items, you're likely better off using `createElement` to set up the "template" for each item, and using `updateElement` to fill in the data. Like so:

```js
// Leverage the default `createElement` which creates a generic `<div>`.

scroller.updateElement = (child, index) => {
  child.textContent = myItems[index];
};

let myItems = ['a', 'b', 'c', 'd'];
// Calls createElement + updateElement four times
scroller.totalItems = myItems.length;

// This now works: it calls updateElement four times
requestAnimationFrame(() => {
  myItems = ['A', 'B', 'C', 'D'];
  scroller.requestReset();
});
```

### DOM recycling using `recycleElement`

You can recycle DOM by using the `recycleElement` function to collect DOM, and reuse it in `createElement`.

When doing this, be sure to perform DOM updates in `updateElement`, as recycled children will otherwise have the data from the previous item.

```js
const myItems = ['a', 'b', 'c', 'd'];

// By default virtual-scroller creates and recycles `<div>` children, 
// but we want to generate `<section>` children and control the recycling.
const nodePool = [];
scroller.createElement = (index) => {
  return nodePool.pop() || document.createElement('section');
};
scroller.recycleElement = (child) => {
  nodePool.push(child);
};

scroller.updateElement = (child, index) => {
  child.textContent = myItems[index];
};

scroller.totalItems = myItems.length;
```

### Data manipulation using `requestReset()`

The `<virtual-scroller>` element will automatically rerender the displayed items when `totalItems` changes. For example, to add a new item to the end, you could do:

```js
myItems.push('new item');
scroller.totalItems++;
```

If you want to keep the same number of items or change an item's properties, you can use `requestReset()` to notify the scroller about changes, and cause a rerender of currently-displayed items. If you do this, you'll also need to set `updateElement`, since the elements will already be created. For example:

```js
scroller.updateElement = (child, index) => {
  child.textContent = index + ' - ' + myItems[index];
};

myItems[0] = 'item 0 changed!';

scroller.requestReset();
```

In this case, `createElement` will be called for the newly-added item once it becomes visible, whereas `updateElement` will every item, including the ones that already had corresponding elements in the old items indexes.

### Efficient re-ordering using `elementKey`

`<virtual-scroller>` keeps track of the generated DOM via an internal key/Element map to limit the number of created nodes.

The default key is the array index, but can be customized through the `elementKey` property.

Imagine we have a list of 3 contacts:
```js
const myContacts = ['A', 'B', 'C'];
virtualScroller.totalItems = myContacts.length;
virtualScroller.updateElement = (div, index) => div.textContent = myContacts[index];
```
This renders 3 contacts, and the `<virtual-scroller>` key/Element map is:
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
  virtualScroller.requestReset(); // notify virtual-scroller
}
```
With the default `elementKey`, we would relayout and repaint all the contacts when invoking `moveFirstContactToEnd()`:
```
0: <div>B</div> (was <div>A</div>)
1: <div>C</div> (was <div>B</div>)
2: <div>A</div> (was <div>C</div>)
```
This is suboptimal, as we just needed to move the first DOM node to the end.

We can customize the key/Element mapping via `elementKey`:
```js
virtualScroller.elementKey = (index) => myContacts[index];
```

This updates the `<virtual-scroller>` key/Element map to:
```
A: <div>A</div>
B: <div>B</div>
C: <div>C</div>
```
Now, invoking `moveFirstContactToEnd()` will only move the first contact DOM node to the end.

See [demo/sorting.html](demo/sorting.html) as an example implementation.

### Performing actions as the scroller scrolls using the "`rangechange`" event

Listen for the "`rangechange`" event to get notified when the displayed items range changes.

```js
scroller.addEventListener('rangechange', (event) => {
  if (event.first === 0) {
    console.log('rendered first item.');
  }
  if (event.last === scroller.totalItems - 1) {
    console.log('rendered last item.');
    // Perhaps you would want to load more data for display!
  }
});
```

### Scrolling

`<virtual-scroller>` needs to be sized in order to determine how many items should be rendered. Its default height is 150px, similar to [CSS inline replaced elements](https://www.w3.org/TR/CSS2/visudet.html#inline-replaced-height) like images and iframes.

Main document scrolling will be achievable through [`document.rootScroller`](https://github.com/bokand/root-scroller)
```html
<virtual-scroller style="height: 100vh"></virtual-scroller>
<script type="module">
  document.rootScroller = document.querySelector('virtual-scroller');
</script>
```

## Development

To work on the proof-of-concept implementation, ensure you have installed the npm dependencies and serve from the project root

```sh
$ npm install
$ python -m SimpleHTTPServer 8081
```

Then, navigate to the url: http://localhost:8081/demo/

For more documentation on the internal pieces that we use to implement our `<virtual-scroller>` prototype, see [DESIGN.md](./DESIGN.md).
