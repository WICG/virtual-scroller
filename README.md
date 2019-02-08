# `<virtual-content>`

The `virtual-content` element manages the rendering state of its child nodes, removing those that would not be visible to the end user from the browser's layout and paint steps to improve the rendering performance of your page.

## API

Aside from the constraints given in this document, the `virtual-content` element currently introduces no new APIs. Use it as you would any other generic element: the `virtual-content` element will automatically begin managing the rendering state of any child nodes added to it.

### Possible additions

**Configurable height estimates**: Currently, the `virtual-content` element always assumes the height of newly added child nodes before their first render to be 100px and only updates this estimate when the element is rendered. In the future, a new API may be introduced to allow the user to explicitly set this height estimate or to use a different algorithm for computing / updating default estimates.

**Configurable layout**: Currently, the `virtual-content` element only supports a single, vertically-stacked set of child nodes. In the future, new APIs for performing more customized layouts might be added, ideally supporting 2D layouts like grids.

## Usage constraints

The `virtual-content` element makes some assumptions about styles applied to itself and its children so that it can correctly position them. Ideally, these constraints would be more user friendly, either by being strictly enforced or not existing. For now, we're just documenting them here.

### The `virtual-content` element

- The `virtual-content` element assumes that it is its child nodes' [containing block](https://drafts.csswg.org/css2/visuren.html#containing-block), and
uses `display: flex` to prevent its child nodes' margins from collapsing. Do not set the CSS `display` property of a `virtual-content` element to any value other than `none` (if not leaving it at its default) and do not change properties related to the alignment or positioning of items within flex containers (e.g. `flex-direction`, `justify-content`, etc.).

- Do not modify the `display`, `flex-direction`, `overflow-anchor`, or `height` CSS properties of the `virtual-content`.

- Nesting `virtual-content` elements is not supported.

### Children of the `virtual-content` element

- Child nodes' `invisible=""` attribute must not be changed manually.

- Child nodes must have an [outer display type](https://drafts.csswg.org/css-display/#outer-display-type) of `block` if their `display` property is not `none`.

  - For example, children may not be text nodes. *Text node children of the `virtual-content` element will be removed at an unspecified time before the next render.*

  - **TODO:** Currently this is enforced by styles in the shadow root of the `virtual-content` element with the CSS declaration `display: block !important;`. However, this is too strict, as `flex` and `grid` are also acceptable `display` values with `block` as their outer display type. Solving this issue might require new, split CSS `display` properties for inner and outer display types (e.g. `display-inner`, `display-outer`).

- Child nodes must not values for the following CSS properties: `position`, `float`, `top`, `right`, `bottom`, or `left`.

  - These properties are either overwritten by the `virtual-content` element to position the children, or are assumed to be their default value.

- Child nodes not have a CSS `margin` value less than zero.

## Possible extensions

On its own, the `virtual-content` element intentionally doesn't cover all of the situations a user might encounter when trying to virtualize an unrenderably large tree, or what the user might expect from other implementations of similar components. The `virtual-content` element itself is only meant to manage the rendering state of its children.

In particular, we want to get parity with the capabilities, usability, and demos of the [`traditional-virtualization` branch](https://github.com/valdrinkoshi/virtual-scroller/tree/traditional-virtualization). Probably that will be done by layering things on top of the base `virtual-content` element. Some notable things in the pipeline:

- A way of breaking up the initial parse costs for very large sets of children. Although the rendering costs are mitigated, the costs of parsing and element creation need to be broken up to avoid jank.
- A way of adding children lazily / on-demand based on scroll position. For example, loading more items when reaching the end of the list.

## Development

To work on the proof-of-concept implementation, ensure you have installed the npm dependencies and serve from the project root.

```bash
$ npm install
$ npm start
```

Then, navigate to the URL: <http://localhost:8081/demo>.

Since this prototype relies on [searchable invisible DOM](https://github.com/rakina/searchable-invisible-dom), you'll need to be using the latest Chrome Canary, with the Experimental Web Platform features flag turned on in `chrome://flags`.
