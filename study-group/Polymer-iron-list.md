# Polymer's `<iron-list>`

- Study Author: [@kschaaf](https://github.com/kschaaf)
- Platform: web

## Background on Polymer & Web Components

[Polymer](http://www.polymer-project.org/) is a Google project focused on developer experience for creating, vending, and building applications using [Web Components](https://www.webcomponents.org/introduction).

Web Components is an ubmrella term referring to a series of new browser API's that allow defining custom HTML elements whose internal details and rendering are encapsulated. Taken together, the Web Components specs form a built-in, browser-native UI component model.  Once a custom element definition is imported, users may create and interact with custom elements using the same browser API's and idioms as any other built-in HTML element.

The Polymer team ships a library of the same name (effectively, a custom element base class) that layers a number of features onto the built-in Web Components primitives, such as property change observation, template-based declarative data-binding, and declarative event handlers.


## Overview

`<iron-list>` is a Web Component built using the Polymer library that implements a virtualized, "infinite-scrolling" list.  As its primary inputs it accepts an array of list data (via property) and a template (via light dom) containing the prototypical dom for each list item, including Polymer-specific data-bindings that determine how to propagate array item data to each template instance.  It then stamps enough template instances to fill the viewport, plus a sufficient "runway" of off-screen items to maintain the illusion of continuous items during scrolling.  At each scroll event, it uses a boundary-based heuristic to determine when to rotate off-screen items from one edge of the list to the other, repositions one or more template instances via css transform, and updates the data-bindings in the template instance with a new item from the array.

The design is optimized for the following assumptions/biases:
* Bounding the total number of DOM nodes ever made by the list is important to avoid memory pressure
* The cost of showing new items during scroll (via any strategy) directly affects the risk of checkerboarding
* Updating existing DOM with new data (recycling) is cheaper than making new DOM and then updating it with data
* Support for variable height items is important to solve a number of use cases in the most flexible way (grouping, heterogenus content, etc.)

## Essential sample code

```html
<iron-list id="list">
  <template>
    <div class="item">[[index]] - [[item.name]]</div>
  </template>
</iron-list>

<script>
  list.items = [{name: 'Domenic'}, {name: 'Ojan'}, ...];
</script>
```

## Resulting DOM structure

```html
<iron-list id="list" style="overflow-y: auto;">
  #shadow-root
    <style>/*...*/</style>
    <array-selector id="selector"></array-selector>
    <div id="items" style="height: 9000px;">
      <slot>
        <!-- projected list items stamped into light dom, shown here for understandability -->
        <div class="item" style="transform: translate3d(0px, 0px, 0px);">0 - Domenic</div>      
        <div class="item" style="transform: translate3d(0px, 18px, 0px);">1 - Ojan</div>
        <div class="item" style="transform: translate3d(0px, 36px, 0px);">2 - Drew</div>
        <div class="item" style="transform: translate3d(0px, 54px, 0px);">3 - Kevin</div>
        <div class="item" style="transform: translate3d(0px, 72px, 0px);">4 - Gray</div> 
        ...
      </slot>
    </div>
  (end #shadow-root)
  <!-- the physical list items above are actually appended here -->
</iron-list>
```

## Live examples:
* [minimal usage example](http://jsbin.com/qoletob/edit?html,output)
* [x-ray example](http://jsbin.com/yesezed/edit?html,output)
* [x-ray variable height](http://jsbin.com/tukulub/edit?html,output)
* [all element demos](https://raw-dot-custom-elements.appspot.com/PolymerElements/iron-list/v2.0.12/iron-list/demo/index.html)

## Customization options

* `grid` (true/false) - toggles row vs. grid mode
* `selectionEnabled` (true/false) - toggles selection on/off. When selected (via tap), items get `selected` class applied which can be styled, and places the item in a `selected` array
* `multiSelection` (true/false) - toggles multiple selection on/off
* `scrollTarget` (element reference, id ref, or `'document'`) - by default the `<iron-list>` will be the scroll target, and must be sized; alternatively `<iron-list>` can be placed inside another scrolling region, in which case it is not the scroller and the `scrollTarget` must then specify the scroller element (to determine sizing, listen for `scroll` event, etc.)
* `scrollOffset` (integer, pixels) -  offset from the scrolling element to the top of iron-list element

## Imperative API

* scroll to item/index
  * `scrollToIndex(idx)`
  * `scrollToItem(item)`
* update size
  * `updateSizeForIndex(index)`
  * `updateSizeForItem(item)`
  * `updateViewportBoundaries()`
* update data (standard Polymer structured data API)
  * `set(path, value)`
  * `push(array, value)`
  * `splice(array, value)`
  * ...
* selection
  * `clearSelection()`
  * `selectIndex(index)`
  * `selectItem(item)`
  * `deselectIndex(index)`
  * `deselectItem(item)`
  * `toggleSelectionForIndex(index)`
  * `toggleSelectionForItem(item)`
* accessibility
  * `focusItem(idx)`

## Read-only properties (outputs)

* `firstVisibleIndex`
* `lastVisibleIndex`
* `selectedItem`
* `selectedItems`

## Events

Any events passed to declarative event handlers in item templates are decorated with information to associate them to the user data associated with the item receiving the event:

* `event.model.index` - index in user array
* `event.model.item` - item from user array

## Noteworthy features & implementation details

### Item recycling, sizing, and positioning

`iron-list` creates a pool of template instances that are repositioned via css transform and re-bound to array items during scrolling.  An algorithm described below is used to ensure the pool of items is roughly 2x the size of the visible viewport, to help prevent checkerboarding when scrolling if the time to recycle items from e.g. top to bottom exceeds a scroll frame.  Composited scrolling will keep the list scrolling at 60fps, but if a scroll event blows its budget, the extra items in the pool can cover the lower framerate (for some amount of scroll length, leading to a better UX especially on mobile).  The amount of runway is not technically configurable (it was in previous iterations), but could be.

`iron-list` does not require fixed-size items, for maximum flexibility; it measures the natural size of newly created items after binding data into them, and then translates items in the viewort adjacent to the previous item's position. This design ensures that until the item is recycled, there is zero paint/layout cost to this item during scrolling or recycling of other items (would not be the case if any sort of static/flow/flex layout were used to position the pool of adjacent items).  This does mean, however, that if the item changes after the initial rendering, the list must be notified via e.g. `updateSizeForIndex` to ensure positioning is correct, which is a performance/ergonomics tradeoff.

Supporting variable, naturally sized items poses a question about how many items to create for the pool that will be recycled: creating too many unnecessarily delays initial painting of any list items; creating too few means needing to do multiple rounds of create+layout+measure, which is also inefficient.  As such, `iron-list` uses an incremental "increase pool if needed" algorightm as follows: it initially creates 3 items (a fixed constant), and if the items do not yet fill the viewport, it increases the pool size by 50%, and tries again. This continues synchronously (blocking paint) until the viewport is (just) filled.  After this, it yields to paint the initial items, and then switches to use `requestIdleCallback` to render the remaining items in the pool to reach 2x of the viewport height, in chunks of `n` items per `rIC`, where `n` is calculated emperically as the number of template instances that can be stamped in 50ms (to maintain responsiveness while completing initial render).  It is a bit fancy, but was refined during development of `chrome://history` and `chrome://downloads` to meet the performance sensitivity of initial rendering for those applications.

### Configurable scroll target

`iron-list` can either _be_ the scroller (useful when e.g. multiple lists are needed on the same page), or delegate to a scrollable parent (particularly useful for document scrolling to ensure users get the native "URL bar scrolls away" behavior of modern mobile browsers).

The `scrollTarget` property supports string-based "idref" to select a scrollable parent (useful for fully declarative usage in HTML, but the id-referenced element must be in the same in the same shadow root scope).  Alternatively users can assign an element reference imperatively.

Annoyingly, the semantics of document-based scrolling requires special case logic: unlike overflow scrolling where `scrollTop` and `scroll` events come from the same element, with document based scrolling the `scroll` event fires on `document.documentElement` (`<html>`), but the effective `scrollTop` must be read from `window.pageYOffset`.  Similarly with setting the scroll position (assigning `scrollTop` vs. calling `window.scrollTo()`)  Hence a magic `'document'` value which can be used to toggle these semantics.

### Virtual list sizing

Since `iron-list` supports variable height, to maintain (the illusion of) correct scrollbar sizing and positioning, the container inside the list that holds the positioned items is sized to the estimated full length of the list.

A continuously updating average height of items rendered is maintained and used to size the remaining unknown length of the list. As the user scrolls closer to the bottom, the amount of error trends towards zero, and reaches zero once the last set of items have been assigned to rows in the physical pool.  This can cause small jumps in the scroll thumb positioning, but it is usually imperceptable, especially for large lists.

The average is also used when scrolling to an arbitrary point in the list.  When scrolling to an arbitrary `scrollTop`, it is used to guess what array item would be at that spot. Likewise, when scrolling to an arbitrary array index, it is used to guess what the `scrollTop` should be set at.  The same process of updating the height of the container is used to trim the error back out of the list as the user approaches either end of the list (although since items are translated from the top, trimming error from the top of the list also requires updating the `scrollTop` and positioning of items).

### Resize handling

There are a couple of considerations that `iron-list` implements regarding resizing the list:

First, when the list is resized, it attempts to maintain the same content visible on screen by adjusting the scroll position to keep the top-most visible item on the screen.  This may be questionable, but we felt it provided a much better UX than what normally happens when a traditional page full of content is resized (content either wraps more or less, causing the content in the visible viewport to change, which is a hair-pulling experience when e.g. rotating midway down a page on a phone).

Second, to implement the above, but also to simply ensure that the physical items are actually positioned correctly in the viewport, the list needs to know when its size has changed.  It listens to `resize` on `window`, but this is not sufficient to handle all cases where the list is resized (e.g. lists sized based on draggable pane splitters, for instance).  In the future, `ResizeObserver` should solve this problem, but in the meantime and for cross-platform support, `iron-list` uses the [`iron-resizable-behavior`](https://www.webcomponents.org/element/PolymerElements/iron-resizable-behavior/behaviors/Polymer.IronResizableBehavior) mixin, which is an approach for having resizable parents notify children (such as `iron-list`) when their size has changed via a cooperative event-based API.

### Accessibility

`iron-list` has some built-in handling for keyboard navigation of the list, such that only one item in the list is ever tab-focusable, and focus for items _within the list_ can then be navigated via arrow keys.  This list-managed focus handling can be opted into by binding `[[tabIndex]]` to the `tabindex` attribute of a list item.  Via this data-binding, the list ensures only one item is ever focusable (all others get `tabindex="-1"`), and moves the focus and sets `tabindex="0"` for the next/previous item via arrow keys.

There is also some careful handling to avoid the currently focused item from being recycled, to both prevent the focus from looping while scrolling, and to prevent unnaturally thrashing `focus`/`blur` events on the focused item if it is scrolled in/out of the viewport.  Essentially, as long as an item becomes focused, it is never recycled; at the point where it would have been recycled it is positioned off screen (and another item is stamped to fill its place in the pool).  The list also ensures that e.g. pressing an arrow key once the focused item has been scrolled off screen causes the list to scroll back to the focused item (and then moves focus to the adjacent peer appropriately).

### Template-based data-binding

The declarative template-based data-binding approach central to `iron-list`'s update process when recycling is probably the most non-portable, Polymer-specific aspect of `iron-list`.  Since the template and the data-binding annotations form the complete mapping of data to dom, no user code is needed to either generate the list item instances (the template is stamped) nor update items with new data (new item data from the `items` array is simply fed into the template instance via the data binging system).  This gives good ergonomics in that the list can be constructed in a fully declarative manner, but is also constrained by the limits of the Polymer data binding system.

The binding scope for each template instance is an object with the following structure:

```js
{
  index: 0,        // index in the item array
  selected: false, // true if the current item is selected
  tabIndex: -1,    // a dynamically generated tabIndex for focus management
  item: {}         // user data corresponding to items[index]
}
```

It's important to note that `iron-list` does rely on Polymer 1.0/2.0's synchronous data binding system to provide well-known semantics for when DOM updates based on data changes have completed, since this is required to know when to measure item sizes and re-position them accordingly.  If the side effects of updating item data were async, a protocol would be needed to coordinate this process (e.g. a Promise-based API), which has implications for being able to render arbitrary DOM (including custom elements).

### API for updating data

By virtue of extending from Polymer's base class, `iron-list` exposes Polymer's [structured data API](https://www.polymer-project.org/2.0/docs/devguide/data-system#make-observable-changes) for making changes to the `items` array or objects within the array in a way observable to the list, such that the rendering is automatically updated.  Examples:

```js
const list = document.querySelector('iron-list#mylist');
list.push('items', {name: 'John'});            // Add to end of list
list.splice('items', 0, 1, {name: 'Sally'});   // Replace first item in list
list.set('items.3.name', 'Ben');               // Set items[3].name = 'Ben'
```

Using these API's provides enough informatino about the change that, when changes occur to data outside the viewport, the effective scroll position can be adjusted to avoid unpleasent sudden changes to the content visible to the user.  Also, when using `iron-list` within a larger app that is fully composed from templates using Polymer's data-bindings, information about changes made via these API's to the array data in one part of the application are communicated to the list as a special-case of polymer's normal property-based data-binding.

Alternatively, users can use immutable data patterns to update list data, which is typical among unidirectional state management such as when using e.g. Redux. Example:

```js
const list = document.querySelector('iron-list#mylist');
list.items = [{name: 'Junior'}, ...list.items];  // Add to beginning of list
```

However, in this case content may move on screen since the exact location of the change cannot be known without diffing the array (which is not currently implemented).

## Coordination with other elements

### `<iron-scroll-threshold>`

`iron-list` has no built-in mechanisms for e.g. lazy-loading more data into the list, however it was designed to be used with [`<iron-scroll-threshold>`](https://www.webcomponents.org/element/PolymerElements/iron-scroll-threshold/elements/iron-scroll-threshold) to implement such a pattern.  Example:

```html
<iron-scroll-threshold id="threshold" lower-threshold="200">
  <iron-list id="list" scroll-target="threshold">
    <template>
      <div>[[index]]</div>
    </template>
  </iron-list>
</iron-scroll-threshold>

<script>
threshold.addEventListener('lower-threshold', async e => {
  const resp = await fetch(`data.json?page=${currentPage++}`);
  const data = await resp.json();
  list.push('items', ...data);
  threshold.clearTriggers();
}
</script>
```

### `<iron-image>`

An issue that comes up with images in recycled lists is that simply changing an `<img>`'s `src` when recycling can lead to the stale image being shown until the network fetch for the image completes (despite the fact that other aspects of the rendering for the newly recycled item, e.g. `textContent` have changed, which can be extra confusing).  As such, it is recommended to use [`<iron-image>`](https://www.webcomponents.org/element/PolymerElements/iron-image/elements/iron-image) in `<iron-list>`, which has the feature of automatically blanking the image when the src is changed, with other options for e.g. showing a loading placeholder image until the image has loaded, fading the loaded image in, etc.

## Unimplemented Feature Requests
[Github enhancements list](https://github.com/PolymerElements/iron-list/issues?q=is%3Aopen+is%3Aissue+label%3Aenhancement)

* grouping/sections/dividers/headers
* collapsable sections
* sticky headers
* polymorphic templates (aka, non-regularized infinite scrolling)
* bottom-up mode
* horizontal mode
* drag-and-drop reordering
* multiple lists in one scrolling region
* text search (ctrl+f)

## Resources

- [API documentation](https://www.webcomponents.org/element/PolymerElements/iron-list) (API documentation)
- [Source code](https://github.com/PolymerElements/iron-list)
- [Demos](https://www.webcomponents.org/element/PolymerElements/iron-list/demo/demo/index.html)
