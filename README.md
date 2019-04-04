# A built-in virtual scroller for the web platform

This repository hosts explorations for a new web platform feature, a virtual scroller control. The idea of a virtual scroller is to provide a scrolling "viewport" onto some content, allow extremely large numbers of elements to exist, but maintain high performance by only paying the cost for those that are currently visible. Traditionally, we say that the non-visible content is _virtualized_.

## Why a virtual scroller?

Virtualized content is a popular and important pattern on the web. Most content uses it in some form: the https://m.twitter.com and https://facebook.com feeds; Google Photos and YouTube comments; and many news sites which have an automatic "scroll to next article" feature. Most popular frameworks have at least one high-usage virtualization component, e.g. [React Virtualized](https://bvaughn.github.io/react-virtualized/) with [~290K weekly downloads](https://www.npmjs.com/package/react-virtualized). See the [infinite list study group](https://github.com/domenic/infinite-list-study-group) for more research on existing virtualization solutions, both on the web and in other platforms like iOS.

At the same time, virtual scrollers are complex and hard to get right. In fact, having a first-class experience with virtualized content is currently impossible, because browsers don't expose the right hooks: things like accessible landmark navigation, find in page, or intra-page anchor navigation are based solely on DOM structure, and virtualized content is by definition not in the DOM. Additionally, today's virtualized content does not work with search engine crawlers, which means that sites that care about search engine ranking are unable to apply this important performance technique. This is bad for the web.

We believe that, like native platforms, the web deserves a first-class virtual scroller implementation that works out of the box.

For more details on the motivation, see [Motivation.md](./Motivation.md).

## Sample code

```html
// The <virtual-content> will manage the rendering of its children.
// It will prioritize rendering things that are in the viewport and not render
// children that are far away, such that we are only paying as little rendering
// cost as possible while still allowing them to work with find-in-page,
// accessibility features, focus navigation, fragment url navigation etc.
<virtual-content id='content'>
	<div>Item 1</div>
	<div>Item 2</div>
	...
	<div>Item 1000</div>
</virtual-content>

<script>
// You can add, remove, modify children of the <virtual-content> as you would
// on a regular element, using DOM APIs.
content.appendChild(newChildren);

// When the set of actually-rendered children changed, the <virtual-content>
// will fire a "rangechange" event with the new range of rendered children.
content.addEventListener('rangechange', (event) => {
  if (event.first === 0) {
    console.log('rendered first item.');
  }
  if (event.last === scroller.children.length - 1) {
    console.log('rendered last item.');
    // Perhaps you would want to load more data for display!
  }
});
</script>
```

## Goals

* Allowing web authors to use this for various kinds of scrollable content.
* Allowing contents of the scroller to be only causing rendering costs only when necessary.
* Allowing contents of the scroller to work with find-in-page, accessibility features, focus, fragement URL navigation, etc. as they would work on a non-virtualized state.
// TODO add more

## Non-goals

* Allowing data that are not materialized into DOM to work with find-in-page, accessibility, etc.
// TODO add more

## Proposed APIs

### <virtual-content> element
//TODO

### `rangechange` event

Fired when the scroller has finished rendering a new range of items, e.g. because the user scrolled.
The event has the following properties:
* `first`: an integer, the 0-based index of the first children currently rendered.
* `last`: an integer, the 0-based index of the last children currently rendered.
* `bubbles`: false 
* `cancelable`: false
* `composed`: false

### Constraints
// TODO

## Alternatives considered

### Using traditional virtualization
// TODO

### [Find-in-page APIs](https://github.com/rakina/find-in-page-api)
// TODO 

### Libraries
// TODO