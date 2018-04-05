# VirtualRepeater (Repeats mixin)

- Orchestrates DOM creation and layouting, ensures minimum number of nodes is created.
- Given an `items` array, it displays `num` elements starting from `first` index.
- Delegates DOM creation, update and recycling via `newChildFn, updateChildFn, recycleChildFn`.
- Delegates DOM layout via `_measureCallback`.

## Basic setup

```js
const repeater = Object.assign(new VirtualRepeater(), {
  /**
   * Where to render the list items.
   */
  container: document.body,
  /**
   * The data model.
   */
  items: new Array(20).fill({name: 'item'}),
  /**
   * From which index to start.
   */
  first: 0,
  /**
   * How many items to render.
   */
  num: 5,
  /**
   * The DOM representing data.
   */
  newChildFn: (item, index) => {
    const child = document.createElement('section');
    child.textContent = index + ' - ' + item.name;
    return child;
  }
});
```

## Recycling

You can recycle DOM through the `recycleChildFn`, and use the recycled DOM
in `newChildFn`.

If you decide to keep the recycled DOM attached in the main document, perform
DOM updates in `updateChildFn`.

```js
Object.assign(repeater, {
  /**
   * Used to collect and recycle DOM.
   */
  _recycledChildren: [],
  /**
   * The DOM representing data.
   */
  newChildFn: (item, index) => {
    let child = repeater._recycledChildren.pop();
    if (!child) {
      child = document.createElement('section');
    }
    return child;
  },
  /**
   * Updates the DOM with data.
   */
  updateChildFn: (child, item, index) => {
    child.textContent = index + ' - ' + item.name;
  },
  /**
   * Invoked when the DOM is about to be removed.
   * Here we keep the child in the main document.
   */
  recycleChildFn: (child, item, index) => {
    repeater._recycledChildren.push(child);
  }
});

/**
 * Now, when we manipulate `items, first, num` properties,
 * the DOM will be recycled.
 */
repeater.num = 2;
setTimeout(() => {
  repeater.num = 10;
}, 1000);

```

## Data manipulation

VirtualRepeater doesn't have a getter for `items`, but allows manipulation 
via `push` or `splice`.

```js
/**
 * You can set a new `items` array.
 */
repeater.items = new Array(10).fill({name: 'new array item'});
/**
 * You can also use `push` and `splice` methods.
 */
repeater.push({name: 'inserted with push'});
repeater.splice(0, 2);
repeater.splice(1, 0, {name: 'inserted with splice'});
```

## Protected methods/properties

### _incremental

Set to true to keep the current dom.

### _measureCallback

You can receive child layout information through `_measureCallback`,
which will get invoked after each rendering.
```js
repeater._measureCallback = (measuresInfo) => {
  for (const itemIndex in measuresInfo) {
    const itemSize = measuresInfo[itemIndex];
    console.log(`item at index ${itemIndex}`);
    console.log(`width: ${itemSize.width}, height: ${itemSize.height}`);
  }
};
```

# Layout

- Computes scroll size, average item size, first/last visible indexes.
- Supports 2 scroll directions: horizontal or vertical
- Notifies of size, position, range, scroll error changes to subscribers


# VirtualList (RepeatsAndScrolls mixin)

- Extends `VirtualRepeater` by updating `first, num` on window resize and document scroll.
- Provides to the `Layout` instance updates on the viewport size and children size.
- Delegates to a `Layout` instance the computation of `first, num`, children position, scrolling position and scrolling size.

```js
const list = Object.assign(new VirtualList(), {
  /**
   * The layout in charge of computing `first, num`,
   * children position, scrolling position and scrolling size.
   */
  layout: new Layout(),
  /**
   * Where to render the list items.
   */
  container: document.body,
  /**
   * The data model.
   */
  items: new Array(20).fill({name: 'item'}),
  /**
   * The DOM representing data.
   */
  newChildFn: (item, index) => {
    const child = document.createElement('section');
    child.textContent = index + ' - ' + item.name;
    return child;
  }
});
```
