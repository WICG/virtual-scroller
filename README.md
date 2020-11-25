# A built-in virtual scroller for the web platform

This repository hosts explorations for a new web platform feature, a virtual scroller control. The idea of a virtual scroller is to provide a scrolling "viewport" onto some content, allow extremely large numbers of elements to exist, but maintain high performance by only paying the cost for those that are currently visible. Traditionally, we say that the non-visible content is _virtualized_.

## Current status

This project is no longer being actively developed.

## Why a virtual scroller?

Virtualized content is a popular and important pattern on the web. Most content uses it in some form: the https://m.twitter.com and https://facebook.com feeds; Google Photos and YouTube comments; and many news sites which have an automatic "scroll to next article" feature. Most popular frameworks have at least one high-usage virtualization component, e.g. [React Virtualized](https://bvaughn.github.io/react-virtualized/) with [~290K weekly downloads](https://www.npmjs.com/package/react-virtualized). See the [infinite list study group](https://github.com/domenic/infinite-list-study-group) for more research on existing virtualization solutions, both on the web and in other platforms like iOS.

At the same time, virtual scrollers are complex and hard to get right. In fact, having a first-class experience with virtualized content is currently impossible, because browsers don't expose the right hooks: things like accessible landmark navigation, find in page, or intra-page anchor navigation are based solely on DOM structure, and virtualized content is by definition not in the DOM. Additionally, today's virtualized content does not work with search engine crawlers, which means that sites that care about search engine ranking are unable to apply this important performance technique. This is bad for the web.

We believe that, like native platforms, the web deserves a first-class virtual scroller implementation that works out of the box.

For more details on the motivation, see [Motivation.md](./Motivation.md).

## Sample code

```html
<!--
  virtual-scroller lives in a built-in module and needs to be imported before use.
  (The name of the module is subject to change.)
-->
<script type="module">
import "std:virtual-scroller";
</script>

<!--
  The <virtual-scroller> will manage the rendering of its children.
  It will prioritize rendering things that are in the viewport and not render
  children that are far away, such that we are only paying as little rendering
  cost as possible while still allowing them to work with find-in-page,
  accessibility features, focus navigation, fragment URL navigation, etc.
-->
<virtual-scroller id='scroller'>
  <div>Item 1</div>
  <div>Item 2</div>
  ...
  <div>Item 1000</div>
</virtual-scroller>

<script>
// You can add, remove, modify children of the <virtual-scroller> as you would
// a regular element, using DOM APIs.
scroller.append(...newChildren);

// When the set of actually-rendered children is about to change,
// the <virtual-scroller> will fire a "rangechange" event with the
// new range of rendered children.
scroller.addEventListener('rangechange', (event) => {
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

* Be flexible enough to be used for various kinds of scrolling, larger-than-viewport content, from news articles to typeaheads to contact lists to photo galleries.
* Only pay the rendering costs for _visible_ child elements of the scroller (with some margin).
* Allow contents of the scroller to work with find-in-page, accessibility features, focus, fragment URL navigation, etc., just as they would in a non-virtualized context.
* Be flexible enough to allow developers to integrate advanced features and behaviors, such as groupings, sticky headers, animations, swiping, item selection, etc.
* Support 1D horizontal/1D vertical/2D wrapped-grid layouts.

## Non-goals

* Allow data that are not part of the DOM to work with find-in-page, accessibility, etc. The DOM remains the source of truth for these browser features, not e.g. the server-side, or other in-memory JavaScript data structures. See [below](#almost-infinite-data-from-the-server) for more elaboration.

And, at least in v1, the following are out of scope:

* Built-in support for advanced features and behaviors, such as those mentioned above.
* Support infinite-grid (spreadsheet-like), multi-column (content continues from bottom of col(N) to top of col(N+1)) or masonry layouts.

## Proposed APIs

### `<virtual-scroller>` element

The `<virtual-scroller>` element represents a container that will manage the rendering of its children.
The children of this element might not get rendered/updated if they are not near or in the viewport.
The element is aware of changes to the viewport, as well as to its own size, and will manage the rendered state of its children accordingly.

Its children can be any element.
Semantically, the element is similar to a `<div>`, with the addition of focus on only the visible contents when the element overflows its container and is scrolled.

The sizes and other layout values of the non-rendered children, which might affect scrollbar height, etc., are approximate sizes and might not be always accurate.
The rendered children always have accurate style and layout values, just like other normal DOM nodes.

All children, rendered or non-rendered, will work with find-in-page, focus navigation, fragment URL navigation, and accessibility technology, just like normal DOM nodes.

### `rangechange` event

Fired when `<virtual-scroller>` is about to render a new range of items, e.g. because the user scrolled.
This will fire at `requestAnimationFrame` timing, i.e. before the browser is about to paint.

The event has the following properties:

* `first`: an integer, the 0-based index of the first children currently rendered.
* `last`: an integer, the 0-based index of the last children currently rendered.
* `bubbles`: false
* `cancelable`: false
* `composed`: false

As an example, this can be used to delay more costly rendering work.
For example, a scrolling code listing could perform just-in-time syntax highlighting on lines right before they become visible, leaving the un-adorned code accessible by find-in-page/etc. but improving the code's appearance before the user sees it.

_TODO: do we need `first` and `last` on the event, or should we just use the properties of the element?_

### `rangeFirst` and `rangeLast` getters

These return 0-based indices giving the first and last children currently rendered.

_TODO: these names are kind of bad?_

### Constraints and effects

Ideally, we would like there to be zero constraints on the contents of the `<virtual-scroller>` element, or on the virtual-scroller element itself.

Similarly, we would like to avoid any observable effects on the element or its children. Just like how `<select>` does not cause its `<option>` elements to change observably when you open the select box, ideally `<virtual-scroller>` should not cause observable effects on its children as the user scrolls around.

This may prove difficult to specify or implement. In reality, we expect to have to add constraints such as:

* Overriding the default values for certain CSS properties (and ignoring web developer attempts to set them).
* Having degenerate behavior if visual order does not match DOM order (e.g. via `flex-order` or `position: absolute`).

And the control may influence its children via effects such as:

* Changing the computed style of children (observable via `getComputedStyle(child)`).
* Changing the display-locked status of children (observable via `child.displayLock.locked`).
* Changing the layout of non-visible children's descendants (observable via e.g. `child.children[0].getBoundingClientRect()`).

Figuring out the exact set of constraints (including what happens when they're violated), and the exact set of effects, is a key blocker for standardization that we expect to address over time.

## Use cases

### Cases this proposal covers well

This design is intended to cover the following cases:

* Short (10-100 item) scrollers.
  Previously, virtualizing such scrollers was done rarely, as virtualization caused sacrifices in developer and user experience.
  We are hopeful that with a first-class virtualization element in the web platform, it will become more expected to use `<virtual-scroller>` in places where overflow-scrolling `<div>`s were previously seen, thus [improving overall UI performance](./Motivation.md#performance).

* Medium (100-10&nbsp;000 item) scrollers.
  This is where virtual scrollers have traditionally thrived.
  We also want to expand this category to include not just traditional list- or feed-like scenarios, but also cases like news articles.

* Large (10&nbsp;000+ item) scrollers, where data is added progressively.
  As long as the data can be held in memory, `<virtual-scroller>` ensures that there are no rendering costs, and so can scale indefinitely.
  An example here would be any interface where scrolling down loads more content from the server, indefinitely, such as a social feed or a busy person's inbox.

  However, note that adding a large amount of data _at once_ is tricky with this API; see below.

### Very large amounts of initial data

Consider the cases of the [singlepage HTML specification](http://html.spec.whatwg.org/), or of long-but-finite lists such as a large company directory.

We believe that all these scenarios are still suited for use with this virtual scroller control.
As long as the data could feasibly fit in memory in any form, the user experience will be best if it is stored in the DOM, inside a virtual scroller that makes the rendering costs of out-of-viewport items zero.
This allows access to the data by browser features, such as find-in-page or accessibility tooling, as well as by search engines.

However, using the above API in these scenarios suffers from the problem of initial page load costs.
Trying to server-render all of the items as `<virtual-scroller>` children, or trying to do an initial JSON-to-HTML client-render pass, will jank the page.
For example, just the parsing time alone for the single-page HTML specification [can take 0.6–4.4 seconds](https://github.com/valdrinkoshi/virtual-scroller/pull/92).
And there are staging problems in trying to deliver large amounts of HTML while the `"std:virtual-scroller"` module is still being imported, which could prevent it from properly avoiding initial rendering costs.

As such we think there is still room for improvement in these scenarios, e.g. with an API that makes it easy to progressively stream data during idle time to allow the initial few screenfuls to render ASAP and without jank.
We will be exploring this problem over time, after we feel confident that we can specify and implement a solution for the core use cases.

### Almost-infinite data from the server

A consistent point of confusion about the virtual scroller proposal is how it purports to solve cases like social feeds, where there is an "almost infinite" amount of data available.

This proposal's answer is that: if you were going to have the data in memory anyway, then it should be in the `<virtual-scroller>`, and thus accessible to the browser or other technologies (such as search engines) that operate on the DOM.
But, if you were going to leave the data on the server, then it is fine to continue leaving it on the server, even with a `<virtual-scroller>` in play.

For example, in one session while browsing https://m.twitter.com/, it limited itself to only keeping 5 tweets in the DOM at one time, using traditional virtualization techniques.
However, it appeared to have about 100 tweets in memory (available for display even if the user goes offline).
And, when the user began scrolling toward the bottom of the page, it queried the server to increase the amount of in-memory tweets it had available.
With a native `<virtual-scroller>` in the browser, which mitigates the rendering costs while still allowing you to keep items in the DOM, we're hopeful that it'd be possible to keep those 100+ tweets as DOM nodes, not just in-memory JavaScript values that are locked away from find-in-page and friends.

This proposed design does mean that there could be things on the Twitter servers which are not findable by find-in-page, because they have not yet been pulled from the server and into the DOM.
That is OK.
Find-in-page is not meant to be find-in-site, and users of social feeds are able to understand the idea that not everything is yet loaded.
What is harder for them to understand is when they saw a phrase, they scroll past it by 100 pixels, and then find-in-page can't see it anymore, because it's been moved out of the DOM.
`<virtual-scroller>` addresses this latter problem.

## Alternatives considered

### Using traditional virtualization

Previously, we intended to specify a traditional approach to virtualization for the built-in virtual scroller.
With that approach, the element would map JavaScript values ("items") to DOM element children, putting only a small portion of the items in the DOM, with callbacks for creating, updating, and recycling the DOM elements given an item.

However, this approach suffers the same problem as existing traditionally-virtualized scrollers regarding accessibility, find-in-page, fragment URL and focus navigation, etc., all of which depend on having the content be part of the DOM to work correctly.
This is a known issue with traditional virtualization, which web developers have to grapple with today, trading off these functionalities with the performance improvement.
As we intend for the built-in virtual scroller to be a standard building block that a lot of web authors would use or build on, we don't want to continue having this disadvantage.

In other words, given the problem of too much DOM causing bad performance, traditional virtualization is managing the symptoms, by decreasing the amount of DOM. For a standard solution, we want to tackle the core problem head-on.

### [Find-in-page APIs](https://github.com/rakina/find-in-page-api)

As mentioned in the [previous section](#using-traditional-virtualization), we want to make features like find-in-page work with the built-in virtual scroller.
We have briefly considered adding a set of find-in-page APIs to the web platform, that would support cases like giving the web author a way to completely override the find-in-page command, or interacting with and adding results to the user agent's built-in find-in-page functionality.

However, designing these APIs proved to be quite challenging, given the breadth of find-in-page user interfaces across browsers.
Worse, providing a find-in-page-specific solution might unintentionally become a disadvantage for other things like accessibility: web developers might be inclined to think that a virtual scroller that works with find-in-page is good enough, and not think about the remainder of the missing functionality caused by virtualization.

### Libraries

Another approach would be to standardize and implement only the low-level primitives which allow mitigating the cost of DOM, i.e. [display locking](https://github.com/WICG/display-locking/).
We would then leave the building of high-level virtual scroller APIs to libraries.

We fully expect that some applications and libraries will take this route, and even encourage it when appropriate.
But we still believe there is value in providing a high-level virtual scroller control built into the platform, for the 90% case.
For more on our reasoning, see [the motivation document](./Motivation.md)'s ["Standardization"](./Motivation.md#standardization) and ["Layering"](./Motivation.md#layering) sections.

## Sample implementations

### Chrome

Launch chrome with flags `--enable-blink-features=DisplayLocking,BuiltInModuleAll`
to get a working virtual-scroller element.

## Demos

https://github.com/fergald/virtual-scroller-demos
