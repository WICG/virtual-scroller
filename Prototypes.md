## Prototypes

This repository hosts two prototype implementations, each in separate branches:

### Traditional virtualization

The [`traditional-virtualization`](https://github.com/valdrinkoshi/virtual-scroller/tree/traditional-virtualization) branch hosts our first attempt, a `<virtual-scroller>` custom element. This is a full-featured virtual scroller, with architecture and API similar to many studied in the infinite list study group. It maps JavaScript values ("items") to DOM elements, with callbacks for creating, updating, and recycling the DOM elements given an item.

The implementation had not been battle-tested or performance-optimized, but the branch contains many demos to prove out the design: things like dismissable items, grids, or integration with UI frameworks. As such, it represents a desired baseline for what capabilities we hope to be possible with a virtual scroller.

However, we realized that this traditional approach to virtualization has the fundamental drawbacks mentioned above: it breaks accessibility, find-in-page, indexability, etc. As such, we started on a new approach...

### `<virtual-content>`

The [`virtual-content`](https://github.com/valdrinkoshi/virtual-scroller/tree/virtual-content) branch starts from scratch, building on the [searchable invisible DOM](https://github.com/rakina/searchable-invisible-dom) proposal. For now, it only contains the `<virtual-content>` element, which manages the searchable-invisible-ness of its children. It does not contain any notion of item, or DOM creation/updating/recycling; it operates directly on its DOM element children. Importantly, unlike traditional virtualization, all of these children are present, even if the majority of them are (searchable-)invisible.

This new approach, while simple to use, is fairly powerful! Furthermore, preliminary tests and demos show that it does solve the fundamental problems mentioned above: with Blink's flagged implementation of searchable invisible DOM, the resulting virtualized content can still be found by find-in-page, or intra-page anchor navigation, or tabbed to, or found by search engine indexers. (Accessibile landmark navigation support is up next!)

But, there is much more work to do to show that this approach is feasible. We need to re-build the demos corpus to attain parity with the `traditional-virtualization` branch, to show that all the desired user experiences and framework integrations are still possible. And we need to work out an easy-to-use solution for populating the `<virtual-content>` element's initial set of children, without causing jank.

## Talk at Chrome Dev Summit 2018

At Chrome Dev Summit 2018, Gray Norton presented on our work so far. Give it a watch!

[![virtual-scroller at Chrome Dev Summit 2018](http://img.youtube.com/vi/UtD41bn6kJ0/0.jpg)](http://www.youtube.com/watch?v=UtD41bn6kJ0)