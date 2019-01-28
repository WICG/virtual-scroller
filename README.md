# `<virtual-content>`

The `virtual-content` element manages the rendering state of its child nodes,
removing those that would not be visible to the end user from the browser's
layout and paint steps to improve the rendering performance of your page.

## API

Aside from the constraints given in this document, the `virtual-content`
element currently has no user-facing API. Use the `virtual-content` element as
you would any other generic element: child nodes added and removed from the
`virtual-content` element will automatically have their rendering state
managed.

### Future API additions

- Currently, the `virtual-content` element estimates a uniform default height
for all child elements before the first time that element is rendered and only
changes this estimate when an element is rendered. In the future, an API may be
introduced to allow the user to explicitly set this height estimate or to use a
different algorithm for deciding on / updating default estimates.
- Alternate layouts. (e.g. 2D layouts, such as grids.)

## Usage Constraints

`virtual-content` elements are subject to the following restrictions:

- Users of the `virtual-content` element must not modify the values of its CSS
`display`, `flex-direction`, `overflow-anchor`, or `visibility` values.
- Nesting `virtual-content` elements is not supported.

Child nodes of the `virtual-content` element are subject to the following
restrictions:

- Child nodes' `invisible` attribute must not be changed manually.
- Child nodes must have an
[outer display type](https://www.w3.org/TR/css-display-3/#outer-display-type)
of `block` if their `display` property is not `none`.
  - For example, children must not be text nodes. Text node children of the
  `virtual-content` will be removed at an unspecified time before the next
  render.
  - **TODO:** Currently this is enforced by styles in the shadow root of the
  `virtual-content` element with the CSS declaration
  `display: block !important;`. However, this is too strict, as `flex` and
  `grid` are also acceptable `display` values with `block` as their outer
  display type.
- Child nodes must not set their CSS `position` value or any of `top`, `right`,
`bottom`, or `left`.
  - These properties are either overwritten by the `virtual-content` element to
  position them or are assumed to be their default value.
- Child nodes not have a CSS `margin` value less than zero.

## Possible extensions to `virtual-content`

On its own, the `virtual-content` element intentionally doesn't cover all of
the situations a user might encounter when trying to virtualize an unrenderably
large tree, or what the user might expect from other implementations of similar
components. The `virtual-content` element itself is only meant to manage the
rendering state of its children,

- Lazy / on-demand child insertion based on scroll position. (e.g. Loading more
items when reaching the end of the list.)
