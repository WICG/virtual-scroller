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

  scroller.updateElement = (child, index) => {
    child.textContent = index + ' - ' + myItems[index];
    child.onclick = () => console.log(`clicked item #${index}`);
  };

  // This will automatically cause a render of the visible children
  // (i.e., those that fit on the screen).
  scroller.totalItems = myItems.length;
</script>
```

By default, the elements inside the virtual scroller created in this example will be `<div>`s, and will be recycled. See below for more on customizing this behavior through the `createElement` and `recycleElement` APIs.

Checkout more examples in [demo/index.html](./demo/index.html).

## API

### `createElement` property

Type: `function(itemIndex: number) => Element`

Set this property to configure the virtual scroller with a factory that creates an element the first time a given item at the specified index is ready to be displayed in the DOM.

The default `createElement` will, upon first being invoked, search for the first `<template>` element child that itself has at least one child element in its template contents. If one exists, it will create new elements by cloning that child. Otherwise, it will create `<div>` elements. In either case, it will reuse recycled DOM nodes if `recycleElement` is left as its default value.

Changing this property from its default will automatically reset `recycleElement` to null, if `recycleElement` has been left as its default.

### `updateElement` property

Type: `function(child: Element, itemIndex: number)`

Set this property to configure the virtual scroller with a function that will update the element with data at a given index.

This property is invoked in these scenarios:

* The user scrolls the scroller, changing which items' elements are visible. In this case, `updateElement` is called for all of the newly-visible elements.
* The developer changes the `totalItems` property.
* The developer calls `requestReset()`, which will call `updateElement` for all currently-visible elements. See [below](#data-manipulation-using-requestreset) for why this can be useful.

The default `updateElement` sets the textContent of the child to be the data index. Almost all uses of `<virtual-scroller>` will want to change this behavior.

### `recycleElement` property

Type: `function(child: Element, itemIndex: number)`

The default `recycleElement` collects the item's element if it is no longer visible, and leaves it connected to the DOM in order to be reused by the default `createElement`.

Set this property to null to remove the item's element from the DOM when it is no longer visible, and to prevent recycling by the default `createElement`.

Usually this property will be customized to introduce custom node recycling logic, as seen in [the example below](#custom-dom-recycling-using-recycleelement).

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

### Customizing element creation and updating with `<template>`

If the user does nothing special, the default `createElement` callback will create and reuse `<div>` elements. There are several ways of getting more control over this process.

First, you can use a `<template>` child element to declaratively set up your new element. This snippet creates a scrolling view onto `<section>` elements, which (per the default `updateElement` behavior) display indices from 0 to 99:

```html
<virtual-scroller totalitems="100">
  <template>
    <section></section>
  </template>
</virtual-scroller>
```

By setting a custom `updateElement` behavior, you can leverage more interesting templates, for example:

```html
<virtual-scroller id="scroller">
  <template>
    <section>
      <h1></h1>
      <img></img>
      <p></p>
    </section>
  </template>
</virtual-scroller>

<script type="module">
  scroller.updateElement = (child, index) => {
    child.querySelector("h1") = contacts[index].name;
    child.querySelector("img").src = contacts[index].avatarURL;
    child.querySelector("p").textContent = contacts[index].bio;
  };

  scroller.totalItems = contacts.length;
</script>
```

A useful pattern here is to encapsulate the details of updating your elements inside a custom element, for example:

```html
<virtual-scroller>
  <template>
    <contact-element sortable></contact-element>
  </template>
</virtual-scroller>

<script type="module">
  scroller.updateElement = (child, index) => {
    child.contact = contacts[index];
  };

  scroller.totalItems = contacts.length;
</script>
```

Note that in all these examples, the elements are recycled.

### Customizing element creation and updating: using `createElement`

If you want complete control over element creation, you can set a custom `createElement`. This could be useful if, for example, you have a completely static list, which you want to fill out ahead of time and never update again:

```js
let myItems = ['a', 'b', 'c', 'd'];

scroller.createElement = index => {
  const child = document.createElement('div');
  child.textContent = myItems[index];
  return child;
};

scroller.updateElement = null;

// Calls createElement four times (assuming the screen is big enough)
scroller.totalItems = myItems.length;
```

Note that even if we invoke `requestReset()`, nothing new would render in this case, because we have no `updateElement` behavior:

```js
// Does nothing
requestAnimationFrame(() => {
  myItems = ['A', 'B', 'C', 'D'];
  scroller.requestReset();
});
```

_Note: we include `requestAnimationFrame` here to wait for `<virtual-scroller>` rendering._

### Custom DOM recycling using `recycleElement`

The default `createElement` and `recycleElement` functions will recycle the created DOM elements. You can also control this process on your own by setting a custom `recycleElement`:

```js
const myItems = ['a', 'b', 'c', 'd'];

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

This example's only customization over the default is using `<section>` instead of `<div>`. So, it is equivalent to only setting `updateElement` and then using

```html
<virtual-scroller>
  <template><section></section></template>
</virtual-scroller>
```

But at least it illustrates the idea, and gives you a starting point for more advanced customizations.

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
