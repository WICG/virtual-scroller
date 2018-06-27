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

  scroller.updateElement = (child, item, index) => {
    child.textContent = index + ' - ' + item;
    child.onclick = () => console.log(`clicked item #${index}`);
  };

  // This will automatically cause a render of the visible children
  // (i.e., those that fit on the screen).
  scroller.itemSource = myItems;
</script>
```

By default, the elements inside the virtual scroller created in this example will be `<div>`s, and will be recycled. See below for more on customizing this behavior through the `createElement` and `recycleElement` APIs.

Checkout more examples in [demo/index.html](./demo/index.html).

## API

### `createElement` property

Type: `function(item: any, itemIndex: number) => Element`

Set this property to configure the virtual scroller with a factory that creates an element the first time a given item at the specified index is ready to be displayed in the DOM.

The default `createElement` will, upon first being invoked, search for the first `<template>` element child that itself has at least one child element in its template contents. If one exists, it will create new elements by cloning that child. Otherwise, it will create `<div>` elements. In either case, it will reuse recycled DOM nodes if `recycleElement` is left as its default value.

Changing this property from its default will automatically reset `recycleElement` to null, if `recycleElement` has been left as its default.

### `updateElement` property

Type: `function(child: Element, item: any, itemIndex: number)`

Set this property to configure the virtual scroller with a function that will update the element with data from a given item at the specified index.

This property is invoked in these scenarios:

* The user scrolls the scroller, changing which items' elements are visible. In this case, `updateElement` is called for all of the newly-visible elements.
* The developer changes the `itemSource` property.
* The developer calls `itemsChanged()`, which will call `updateElement` for all currently-visible elements. See [below](#data-manipulation-using-itemschanged) for more on this.

The default `updateElement` sets the `textContent` of the child to be the given item, stringified. Almost all uses of `<virtual-scroller>` will want to change this behavior.

### `recycleElement` property

Type: `function(child: Element, item: any, itemIndex: number)`

The default `recycleElement` collects the item's element if it is no longer visible, and leaves it connected to the DOM in order to be reused by the default `createElement`.

Set this property to null to remove the item's element from the DOM when it is no longer visible, and to prevent recycling by the default `createElement`.

Usually this property will be customized to introduce custom node recycling logic, as seen in [the example below](#custom-dom-recycling-using-recycleelement).

### `itemSource` property

Type: `Array` or [`ItemSource`](#the-itemsource-class)

Set this property to control how the scroller will map the visible indices into their corresponding items. The items are then provided to the various rendering customization functions: `createElement`, `updateElement`, `recycleElement`.

If an array is provided, it will be converted to an `ItemSource` instance that returns the elements from the array, as if by using `ItemSource.fromArray(array)` (with no `key` argument).

### `layout` property

Type: `string`

One of:

* "vertical" (default)
* "horizontal"
* "vertical-grid"
* "horizontal-grid"

Can also be set as an attribute on the element, e.g. `<virtual-scroller layout="horizontal-grid"></virtual-scroller>`

### `itemsChanged()` method

This re-renders all of the currently-displayed elements, updating them from their source items using `updateElement` (which in turn consults the `itemSource`).

This generally needs to be called any time the data to be displayed changes. This includes additions, removals, and modifications to the data. See our [examples below](#data-manipulation-using-itemschanged) for more information.

### `scrollToIndex(index: number, { position: string = "start" } = {})` method

Scrolls to a specified index, optionally with a position, one of:

* `"start"`: aligns the start of the item with the start of the visible portion of the scroller
* `"center"`: aligns the center of the item with the center of the visible portion of the scroller
* `"end"`: aligns the end of the item with the end of the visible portion of the scroller
* `"nearest"`: if the item is before the center of the visible portion of the scroller, behaves like `"start"`; if it is after the center of the visible portion of the scroller, behaves like `"end"`

Note that what is considered the "start" and "end" of the scroller is dependent on the layout; for vertical layouts, start/end means top/bottom, while for horizontal layouts, they mean left/right.

See [demo/scrolling.html](demo/scrolling.html) to see these behaviors in action.

_Note: the options object design is inspired by [the options for `element.scrollIntoView()`](https://drafts.csswg.org/cssom-view/#dictdef-scrollintoviewoptions). We may in the future add a `behavior` option for smooth scrolling; see [#99](https://github.com/valdrinkoshi/virtual-scroller/issues/99)._

### "`rangechange`" event

Bubbles: false / Cancelable: false / Composed: false

Fired when the scroller has finished rendering a new range of items, e.g. because the user scrolled. The event is an instance of `RangeChangeEvent`, which has the following properties:

- `first`: a number giving the index of the first item currently rendered.
- `last`: a number giving the index of the last item currently rendered.

Also see [the example below](#performing-actions-as-the-scroller-scrolls-using-the-rangechange-event).

### The `ItemSource` class

The `ItemSource` class represents a way of translating indices into JavaScript values. You can create them like so:

```js
const source = new ItemSource({
  item(index) { ... },
  getLength() { ... },
  key(index) { ... }
});
```

For example, to create an `ItemSource` that gets its items from a `contacts` array, and uses `contact.id` as the key, you could do

```js
const contactsSource = new ItemSource({
  item(index) { return contacts[index]; },
  getLength() { return contacts.length; },
  key(index) { return contacts[index].id; }
});
```

There is also a factory method, `ItemSource.fromArray(array[, key])`, that makes this easier:

```js
const contactsSource = ItemSource.fromArray(contacts, c => c.id);
```

The `key` argument to `fromArray()` is called with an item, and should return a unique key for the object. If no `key` argument is given, then the item index is used as the key.

The main use of the `ItemSource` class is to be assigned to the `itemSource` property of a `<virtual-scroller>` element; as such, for now its only public API is a `length` property.

## More examples

### Customizing element creation and updating with `<template>`

If the user does nothing special, the default `createElement` callback will create and reuse `<div>` elements. There are several ways of getting more control over this process.

First, you can use a `<template>` child element to declaratively set up your new element. This snippet creates a scrolling view onto `<section>` elements, which (per the default `updateElement` behavior) displays any items given to it, stringified:

```html
<virtual-scroller>
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
      <img>
      <p></p>
    </section>
  </template>
</virtual-scroller>

<script type="module">
  scroller.updateElement = (child, contact) => {
    child.querySelector("h1").textContent = contact.name;
    child.querySelector("img").src = contact.avatarURL;
    child.querySelector("p").textContent = contact.bio;
  };

  scroller.itemSource = contacts;
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
  scroller.updateElement = (child, contact) => {
    child.contact = contact;
  };

  scroller.itemSource = contacts;
</script>
```

_We could add a feature to make this even simpler, for custom-element cases like this. See [#101](https://github.com/valdrinkoshi/virtual-scroller/issues/101)._

Note that in all these examples, the elements are recycled.

#### Relation to template instantiation proposal

The [template instantiation](https://github.com/w3c/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md) proposal is a still-evolving idea for how to provide native updating of `<template>` elements to the web platform. This seems like exactly the kind of thing we'd want to use with `<virtual-scroller>`, once it becomes ready. For example, one could replace the above example with

```html
<virtual-scroller id="scroller">
  <template>
    <section>
      <h1>{{name}}</h1>
      <img src="{{avatarURL}}">
      <p>{{bio}}</p>
    </section>
  </template>
</virtual-scroller>

<script type="module">
  scroller.itemSource = contacts;
</script>
```

Since the template instantiation proposal is still in flux, and in particular the idea of a default processor which interprets `{{double-curly}}` syntax is controversial, we don't have any immediate plans for integrating the two proposals. But, we think it's important to preserve forward-compatibility, so if this capability eventually manifests in the web platform, the virtual-scroller spec can be upgraded to use it.

We see no serious obstacles to such a future upgrade. The only potential forward-compatibility issue to worry about is web pages that use `<template>`-based item creation, use the above double-curly syntax, and do not set a custom `updateElement`. Such pages would be changed from having their child element's `textContent` set into having the template stamped.

Such cases _should_ be exceedingly rare; since any text is overwritten by the default `updateElement`, writing double-curly text inside the `<template>` is rather nonsensical. If we're still concerned when that future day comes, we could require some explicit opt-in to the template-stamping, such as `<virtual-scroller autotemplate>` or similar.

### Customizing element creation and updating: using `createElement`

If you want complete control over element creation, you can set a custom `createElement`. This could be useful if, for example, you have a completely static list, which you want to fill out ahead of time and never update again:

```js
let myItems = ['a', 'b', 'c', 'd'];

scroller.createElement = item => {
  const child = document.createElement('div');
  child.textContent = item;
  return child;
};

scroller.updateElement = null;

// Calls createElement four times (assuming the screen is big enough)
scroller.itemSource = myItems;
```

Note that even if we invoke `itemsChanged()`, or change `itemSource`, nothing new would render in this case, because we have no `updateElement` behavior:

```js
// Does nothing
requestAnimationFrame(() => {
  myItems.length = 0;
  myItems.push('A', 'B', 'C', 'D');
  scroller.itemsChanged();
});

// Does nothing
requestAnimationFrame(() => {
  scroller.itemSource = ['X', 'Y', 'Z', 'W'];
});
```

_Note: we include `requestAnimationFrame` here to wait for `<virtual-scroller>` rendering._

### Custom DOM recycling using `recycleElement`

The default `createElement` and `recycleElement` functions will recycle the created DOM elements. You can also control this process on your own by setting a custom `recycleElement`:

```js
const nodePool = [];
scroller.createElement = () => {
  return nodePool.pop() || document.createElement('section');
};
scroller.recycleElement = (child) => {
  nodePool.push(child);
};
```

This example's only customization over the default is using `<section>` instead of `<div>`. So, it is equivalent to using

```html
<virtual-scroller>
  <template><section></section></template>
</virtual-scroller>
```

But at least it illustrates the idea, and gives you a starting point for more advanced customizations.

### Data manipulation using `itemsChanged()`

The `<virtual-scroller>` element will automatically rerender the displayed items when `itemSource` changes. For example, to switch to a completely new set of items, you could do:

```js
scroller.itemSource = newArray;
```

If you want to continue using the same items and item source, but have updated any of them, you need to use `itemsChanged()` to notify the scroller about changes, and cause a rerender of currently-displayed items. For example:

```js
const myItems = ['a', 'b', 'c'];
scroller.itemSource = myItems;

myItems[0] = 'item 0 changed!';
scroller.itemsChanged();

myItems.push('d');
scroller.itemsChanged();
```

### Efficient re-ordering using a custom item key

`<virtual-scroller>` keeps track of the generated DOM via an internal key/element map to limit the number of created nodes.

Most of our examples so far have directly assigned an array to the `itemSource` property. For these cases, the default key is the item index. But you can set a custom key either by using the second argument to `fromArray`:

```js
scroller.itemSource = ItemSource.fromArray(items, item => ...);
```

or by creating a custom `ItemSource` and providing the `key` method:

```js
scroller.itemSource = new ItemSource({
  key(index) { ... },
  ...
});
```

To see how this helps, consider the following example. Imagine we have a list of 3 contacts:

```js
const myContacts = [{name: 'A'}, {name: 'B'}, {name:'C'}];
scroller.updateElement = (child, item) => child.textContent = item.name;
scroller.itemSource = myContacts;
```

This renders 3 contacts, and the `<virtual-scroller>` key/element map is:

```
0 → <div>A</div>
1 → <div>B</div>
2 → <div>C</div>
```

Let's say we receive new data from the server, which has rearranged the contacts in a different order:

```js
// Pretend this came from the server:
const newContacts = [{name: 'B'}, {name:'C'}, {name: 'A'}];
scroller.itemSource = newContacts;
```

With the default key function, we would re-update, relayout, and repaint all the contacts. Since none of the new contact objects are in the key/element map, we would need to call `createElement` again, once for each new contact.

This is suboptimal, as we just needed to move the first DOM node to the end.

If instead we set the key computation appropriately when first setting `myContacts`, e.g. by doing

```js
scroller.itemSource = ItemSource.fromArray(myContacts, c => c.name);
```

then the key/element map would be

```
A → <div>A</div>
B → <div>B</div>
C → <div>C</div>
```

Now if we update the `itemSource`, with

```js
scroller.itemSource = ItemSource.fromArray(newContacts, c => c.name);
```

the `<virtual-scroller>` will notice that none of its keys changed, and so it can just reuse the same elements from the key/element map, while rearranging them appropriately. Thus we have avoided the expense of creating new ones.

See [demo/sorting.html](demo/sorting.html) as an example implementation.

### Performing actions as the scroller scrolls using the "`rangechange`" event

Listen for the "`rangechange`" event to get notified when the displayed items range changes.

```js
scroller.addEventListener('rangechange', (event) => {
  if (event.first === 0) {
    console.log('rendered first item.');
  }
  if (event.last === scroller.itemSource.length - 1) {
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
