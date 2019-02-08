# A built-in virtual scroller for the web platform

This repository hosts explorations and prototypes for a new web platform feature, a virtual scroller control. The idea of a virtual scroller is to provide a scrolling "viewport" onto some content, allow extremely large numbers of elements to exist, but maintain high performance by only paying the cost for those that are currently visible. Traditionally, we say that the non-visible content is _virtualized_.

## Why a virtual scroller?

Virtualized content is a popular and important pattern on the web. Most content uses it in some form: the https://m.twitter.com and https://facebook.com feeds; Google Photos and YouTube comments; and many news sites which have an automatic "scroll to next article" feature. Most popular frameworks have at least one high-usage virtualization component, e.g. [React Virtualized](https://bvaughn.github.io/react-virtualized/) with [~290K weekly downloads](https://www.npmjs.com/package/react-virtualized). See the [infinite list study group](https://github.com/domenic/infinite-list-study-group) for more research on existing virtualization solutions, both on the web and in other platforms like iOS.

At the same time, virtual scrollers are complex and hard to get right. In fact, having a first-class experience with virtualized content is currently impossible, because browsers don't expose the right hooks: things like accessible landmark navigation, find in page, or intra-page anchor navigation are based solely on DOM structure, and virtualized content is by definition not in the DOM. Additionally, today's virtualized content does not work with search engine crawlers, which means that sites that care about search engine ranking are unable to apply this important performance technique. This is bad for the web.

We believe that, like native platforms, the web deserves a first-class virtual scroller implementation that works out of the box.

For more details on the motivation, see [Motivation.md](./Motivation.md).

## Prototypes

We are not yet near the point of standardization, and are first working on proving out what the result should look like via JavaScript prototypes. So far this repository hosts two prototype implementations, each in separate branches:

### Traditional virtualization

The [`traditional-virtualization`](https://github.com/valdrinkoshi/virtual-scroller/tree/traditional-virtualization) branch hosts our first attempt, a `<virtual-scroller>` custom element. This is a full-featured virtual scroller, with architecture and API similar to many studied in the infinite list study group. It maps JavaScript values ("items") to DOM elements, with callbacks for creating, updating, and recycling the DOM elements given an item.

The implementation had not been battle-tested or performance-optimized, but the branch contains many demos to prove out the design: things like dismissable items, grids, or integration with UI frameworks. As such, it represents a desired baseline for what capabilities we hope to be possible with a virtual scroller.

However, we realized that this traditional approach to virtualization has the fundamental drawbacks mentioned above: it breaks accessibility, find-in-page, indexability, etc. As such, we started on a new approach...

### `<virtual-content>`

The [`virtual-content`](https://github.com/valdrinkoshi/virtual-scroller/tree/virtual-content) branch starts from scratch, building on the [searchable invisible DOM](https://github.com/rakina/searchable-invisible-dom) proposal. For now, it only contains the `<virtual-content>` element, which manages the searchable-invisible-ness of its children. It does not contain any notion of item, or DOM creation/updating/recycling; it operates directly on its DOM element children. Importantly, unlike traditional virtualization, all of these children are present, even if the majority of them are (searchable-)invisible.

This new approach, while simple to use, is fairly powerful! Furthermore, preliminary tests and demos show that it does solve the fundamental problems mentioned above: with Blink's flagged implementation of searchable invisible DOM, the resulting virtualized content can still be found by find-in-page, or intra-page anchor navigation, or tabbed to, or found by search engine indexers. (Accessibile landmark navigation support is up next!)

But, there is much more work to do to show that this approach is feasible. We need to re-build the demos corpus to attain parity with the `traditional-virtualization` branch, to show that all the desired user experiences and framework integrations are still possible. And we need to work out an easy-to-use solution for populating the `<virtual-content>` element's initial set of children, without causing jank.
