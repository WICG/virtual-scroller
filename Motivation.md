# Why a virtual scroller?

As explained in [the README](./README.md), virtualized content is an important and common pattern on the web, but it's a hard one to get right. Here we dive into those arguments further, to justify why we believe this is an important feature to provide out of the box with the web platform.

## Performance

**The most important reason that we believe that virtual scrollers are a good pattern, and that we want to provide a solution as part of the web's standard library, is because they are one of the most effective things developers can do to get reliably good rendering performance.**

Good rendering performance is about rendered DOM size. Fundamentally, having a lot of rendered DOM nodes causes significant performance impact in ways that browsers can only optimize so much.

It’s not uncommon to see pages with tens of thousands of DOM nodes, and on those pages, style recalcs and layouts are often quite expensive in unpredictable ways (e.g. changing a class name ends up causing a huge DOM subtree to recalc and relayout).

Native mobile platforms immediately steer you towards a virtualized view. As a result, apps are naturally in a pit of success because they just don’t end up with thousands of views that the OS framework needs to manage.

If most pages on the web defaulted to using a virtualized view, then many of the performance problems we see would never happen in the first place.

## Standardization

So, we think virtual scrollers can have a huge impact on performance. Why bake it into the browser, instead of continuing with the current trend of hoping web developers use libraries? There are a few reasons.

One of the primary impacts of standardization is as a coordination function, to shift the ecosystem. As such, we think having a standard virtual scroller element in the browser will have a big impact on usage. Using virtualized content—which, per the above, is key to building fast pages on the web—would be considerably easier and require considerably less expertise.

We'd like to get to a world where the browser's built-in virtual scroller is good enough, and easy enough to use, to make it a default path for most web pages. Imagine not just virtualized contact lists or social media streams, but also long-form articles where each paragraph is virtualized, or GitHub issue threads where each comment is virtualized. (The [virtualized single-page HTML Standard](https://github.com/valdrinkoshi/virtual-scroller/tree/virtual-content/demo/html-standard) is a good demo in this vein.) Any scrollable content should end up in a virtual scroller.

For example, if you go look at any Cocoa (iOS) starter tutorial, the first code they tell you to write is to use a `UITableView` (a virtualized view). It’s hard to imagine how we could get starter tutorials to point developers to virtualized views if there isn’t at least one variant built into the browser. ("OK, so first pick a framework; these three are popular this week. Make sure to learn it in enough detail to understand how third party components fit into those frameworks. Then, if you're using React, React Virtualized is good, and works this way, but has these caveats... If you're using Angular...")

Shipping a virtual scroller with the browser also means that developers only need to ship the code for their virtualized view over the wire if they need to do something bespoke. This makes the web easier to develop on for everyone, increases the pit of success for developers, and improves the experience for users who are now interfacing with more lightweight sites.

## Layering

While we do want a standardized virtual scroller that ships with the browser, we insist on [building it in a layered way](https://extensiblewebmanifesto.org/), on top of primitives that web developers can already access. This is in contrast to other semi-recent HTML controls, like `<details>` or `<dialog>`, which cannot be replicated on top of primitives.

This layered approach ensures that all the primitives that make for a good virtual scroller are also accessible to other frameworks building virtualization solutions. This includes already-existing primitives like `IntersectionObserver`, `ResizeObserver`, and shadow DOM, as well as still-speculative primitives like [display locking](https://github.com/chrishtr/display-locking/), designed to solve the problems of accessibility, indexability, find-in-page, in-page anchors, and other ways in which the disconnect between content and DOM cause user experience issues.

In particular, we don't insist that the virtual-scroller element we ship with the browser be the perfect solution for 100% of virtualized content cases. We're aiming more for 90%. This is inevitable; higher-level APIs need to be more opinionated than lower-level primitives, so they can’t meet all the developer needs. As such, it’s critical that people who have other needs can meet them with the same richness as browser built-ins. The layered strategy for virtual scroller ensures this. It also gives an easy transition path for existing virtualized content solutions and libraries which do fall within that 90% case: they can, over time, port their implementations to be a wrapper around the browser built-in one, with even more (likely framework-specific) opinions.
