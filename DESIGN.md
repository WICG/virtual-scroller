# Virtual Scroller pieces

This document gives an overview of various pieces we use to build up the `<virtual-scroller>` element. For now we are considering these implementation details. A future proposal may expose these building blocks more directly, but only after significant refinement.

## VirtualRepeater (Repeats mixin)

- Orchestrates DOM creation and layouting, ensures minimum number of nodes is created.
- Given a `totalItems` amount, it displays `num` elements starting from `first` index.
- Delegates DOM creation, update and recycling via `createElement, updateElement, recycleElement`.
- Delegates DOM layout via `_measureCallback`.

### Basic setup

```js
const repeater = new VirtualRepeater({
  /**
   * Total number of items.
   */
  totalItems: myItems.length,
  /**
   * From which index to start.
   */
  first: 0,
  /**
   * How many items to render.
   */
  num: 5,
  /**
   * Where to render the items.
   */
  container: document.body,
  /**
   * The DOM representing data.
   */
  createElement: (index) => {
    const child = document.createElement('section');
    child.textContent = index + ' - ' + myItems[index];
    return child;
  }
});
```

### Recycling

You can recycle DOM through the `recycleElement`, and use the recycled DOM
in `createElement`.

If you decide to keep the recycled DOM attached in the main document, perform
DOM updates in `updateElement`.

```js
/**
 * Used to collect and recycle DOM.
 */
const pool = [];
const repeater = new VirtualRepeater({
  container: document.body,
  /**
   * The DOM representing data.
   */
  createElement: (index) => {
    return pool.pop() || document.createElement('section');
  },
  /**
   * Updates the DOM with data.
   */
  updateElement: (child, index) => {
    child.textContent = index + ' - ' + myItems[index];
  },
  /**
   * Invoked when the DOM is about to be removed.
   * Here we keep the child in the main document.
   */
  recycleElement: (child, index) => {
    pool.push(child);
  }
});

/**
 * Now, when we manipulate `totalItems, first, num` properties,
 * the DOM will be recycled.
 */
repeater.totalItems--;
repeater.num = 5;
setTimeout(() => {
  repeater.num = 2;
}, 1000);

```

### Data manipulation

VirtualRepeater will update the DOM when `totalItems` changes. For cases where data changes while keeping the same `totalItems`, or a specific item changes, you can use `requestReset()` to notify of the changes, or force `totalItems` change.

```js
/**
 * Forces change.
 */
repeater.totalItems--;
repeater.totalItems++;
/**
 * You can also use `requestReset()` to notify of changes.
 */
myItems[0] = 'item 0 changed!';
repeater.requestReset();
```

### Protected methods/properties

#### _incremental

Set to true to disable DOM additions/removals done by VirtualRepeater.

#### _measureCallback()

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

## Layout

Given a viewport size and total items count, it computes children position, container size, range of visible items, and scroll error.

```js
const layout = new Layout({
  viewportSize: {height: 1000},
  totalItems: 20,
  /**
   * Layout direction, vertical (default) or horizontal.
   */
  direction: 'vertical',
  /**
   * Average item size (default).
   */
  itemSize: {height: 100},
});
```

Apply changes by invoking `layout.reflowIfNeeded()`.

It notifies subscribers about changes on range (e.g. `first, num`), item position, scroll size, scroll error. It's up to the listeners to take action on these.

```js
layout.addEventListener('rangechange', (event) => {
  const range = event.detail;
  console.log(`update first to ${range.first}`);
  console.log(`update num to ${range.num}`);
});

layout.addEventListener('itempositionchange', (event) => {
  const positionInfo = event.detail;
  for (const itemIndex in positionInfo) {
    const itemPosition = positionInfo[itemIndex];
    console.log(`item at index ${itemIndex}`);
    console.log(`update position to ${itemPosition.top}`);
  }
});

layout.addEventListener('scrollsizechange', (event) => {
  const size = event.detail;
  console.log(`update container size to ${size.height}`);
});

layout.addEventListener('scrollerrorchange', (event) => {
  const error = event.detail;
  console.log(`account for scroll error of ${error.top}`);
});

layout.reflowIfNeeded();
```

Use `layout.updateItemSizes()` to give layout more information regarding item sizes.
```js
// Pass an object with key = item index, value = bounds.
layout.updateItemSizes({
  0: {height: 300},
  4: {height: 100},
});
```

### Move range

Use `viewportScroll (type: {top: number, left: number})` to move the range to a specific point.
```js
const el = document.scrollingElement;
el.addEventListener('scroll', () => {
  layout.viewportScroll = {top: el.scrollTop};
  layout.reflowIfNeeded();
});
```

Use `scrollToIndex(index: number, position: string)` to move the range to a specific index.
```js
// Scroll to the 3rd item, position it at the start of the viewport.
layout.scrollToIndex(2);

// Scroll to the 10th item, position it at the center of the viewport.
layout.scrollToIndex(9, 'center');

// Scroll to the 20th item, position it at the end of the viewport.
layout.scrollToIndex(19, 'end');

// Scroll to the 100th item, position it at the end of the viewport 
// if we are scrolled above it already, otherwise position it to the start.
layout.scrollToIndex(99, 'nearest');

```

## VirtualScroller (RepeatsAndScrolls mixin)

- Extends `VirtualRepeater`, delegates the updates of `first, num` to a `Layout` instance
- Exposes a `layout` property, updates the `layout.totalItems`, `layout.viewportSize`, and `layout.viewportScroll`.
- Subscribes to `layout` updates on range (`first, num`), children position, scrolling position and scrolling size
- Updates the container size (`min-width/height`) and children positions (`position: absolute`)

```js
const scroller = new VirtualScroller({
  /**
   * The layout in charge of computing `first, num`,
   * children position, scrolling position and scrolling size.
   */
  layout: new Layout(),
  /**
   * Where to render the items.
   */
  container: document.body,
  /**
   * The total number of items.
   */
  totalItems: myItems.length,
  /**
   * The DOM representing data.
   */
  createElement: (index) => {
    const child = document.createElement('section');
    child.textContent = index + ' - ' + myItems[index];
    return child;
  }
});
```
