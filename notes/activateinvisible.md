# `activateinvisible` behavior

## Introduction

This document contains notes exploring the behavior of the `activateinvisible`
event, with some specific cases related to `<virtual-scroller>`.

When describing examples, elements are referenced by a CSS selector that would
uniquely select that element. For find-in-page (FIP) related examples,
inter-element whitespace should be ignored. Also, the following terms are used:

- **source action** &mdash; An action taken by the user or UA that, to be
considered successfully completed, implies that some number of elements
currently having the `invisible` attribute should have that attribute removed.
- **subject elements** &mdash; These are the specific elements, currently hidden
using the `invisible` attribute, that the UA wants to show in response to a
source action. An element is not a subject element (but may still be an
occluding element) if it could be replaced by all of its child elements (e.g.
excluding text nodes) without invalidating the intent of the source action.

  In this tree, if the user were to search for "abc", then all of `#A`, `#B`,
  and `#C` would be both subject elements and occluding elements:

  ```html
  <div id="A" invisible>
    a
    <span id="B" invisible>b</span>
    <span id="C" invisible>c</span>
  </div>
  ```

  However, if the user were to search for just "bc", then all of `#A`, `#B` and
  `#C` would remain occluding elements, but only `#B` and `#C` would be subject
  elements.

- **occluding elements** &mdash; These are the subject elements and all
ancestors of a subject element with the `invisible` attribute. To be able to
show the subject elements, all occluding elements would at least need their
`invisible` attribute removed.

## Source actions of `activateinvisible` events

### Same-page anchor link navigation

Clicking a link which should navigate to a specified element on the same page
should cause the referenced node to be made visible.

In this tree, clicking `#link` should navigate to `#A`:

```html
<a id="link" href="#A">Go to 'A'</a>
<div id="A" invisible>A</div>
```

### Find in page (FIP)

When the user searches for text in the page, matches may be found inside
elements with the `invisible` attribute.

In this tree, searching for "invisible element" should make `#A` visible:

```html
<span id="A" invisible>This is an invisible element.</span>
```

## Situations affecting `activateinvisible` behavior

Deciding the appropriate behavior for `activateinvisible` requires looking at
possible DOM structures that affect how the information conveyed by an
`activateinvisible` event is interpreted by a listener, as well as the expected
scope of that listener's response.

### Ancestors with the `invisible` attribute (occluding elements)

Any of an element's ancestors may occlude it by having the `invisible`
attribute. When the UA wants to inform author code that some set of elements
with the `invisible` attribute should be made visible, the `activateinvisible`
event(s) it dispatches must provide sufficient information to make all of those
ancestors visible. Particularly, if an invisible element is a descendant of one
or more other invisible elements, the code controlling the visibility of each
invisible ancestor should be able to respond effectively.

```html
<div invisible>
  <div>
    <div invisible>
      <p invisible>
        This section is currently invisible. The `invisible` attribute would
        need to be removed from all of its ancestors to make it visible.
      </p>
    </div>
  </div>
</div>
```

#### Occluding elements in other shadow roots

Occluding elements may be spread across many shadow roots. Shadow roots are used
for encapsulating styles and DOM structure, and events that move across shadow
roots have their targets adjusted between steps during dispatch to reflect this
intent. This may have implications for the `activateinvisible` event because
responsibility for managing the DOM across these trees (and, more specifically,
the `invisible` attribute) is expected to be distributed. The
`activateinvisible` event needs to be a sufficient coordination mechanism for
loosely-coupled controllers, each with responsibility for separate regions.

```html
<div invisible>
  <div>
    <!-- shadow -->
    <p invisible>This sentence is currently invisible.</p>
    <!-- /shadow -->
  </div>
</div>
```

Note: Same-page anchor navigation is currently the only action implemented to
cause `activateinvisible` events and this behavior currently only allows
navigation to anchors that are in the main document - not those inside a shadow
root (currently). However, FIP must be able to find elements inside shadow
roots. The current behavior for activating occluding elements is to dispatch a
separate `activateinvisible` event to all occluding elements. This solves the
issue of occluding elements being spread across shadow roots; however, if we
were to try to reduce the number of events by only dispatching them to the
'true' target elements, then we would need to at least set the `composed` and
`bubbles` flags on the event. Also, as mentioned later in this document, there
are other issues surrounding ordering that result from `activateinvisible` being
dispatched individually to occluding elements.

### Visibility changes with many subject elements

Some actions, such as find-in-page, may have many subject elements.

For example, if the user searches for "abc" in this tree, the match may be
spread across a range:

```html
<span invisible>a</span>
<span invisible>bc</span>
```

In this tree, some sections of the matching range are not occluded:

```html
<span invisible>a</span>
b
<span invisible>c</span>
```

In this tree, the matching range does not completely contain some elements:

```html
<span invisible>a</span>
<span id="partiallyMatched">
  b
  <span invisible>c</span>
  def <!-- This text node is not part of the match. -->
</span>
```

In general, subject elements are only 'containable' by a DOM range. Even then,
the source action is not necessarily relevant to all elements in a containing
range.

Source actions may result in subject element sets having combinations of these
situations. Consider what happens when the user searches for "bcdefg" in a page
containing this tree:

```html
<div invisible>
  <!-- shadow -->
  <div invisible>
    <div>
      <span invisible>
        <!-- shadow -->
        <span invisible>a</span>
        <span>b</span>            <!-- START -->
        <span invisible>c</span>
        <!-- /shadow -->
      </span>
      <span invisible>
        <!-- shadow -->
        <span invisible>d</span>
        <span>e</span>
        <span invisible>f</span>
        <!-- /shadow -->
      </span>
      <span>
        <!-- shadow -->
        <span invisible>g</span>  <!-- END -->
        <span>h</span>
        <span invisible>i</span>
        <!-- /shadow -->
      </span>
    </div>
  </div>
  <!-- /shadow -->
</div>
```

This search would result in many subject elements, some of which which occlude
others, as well as many non-subject occluding elements, some of which are in
different shadow roots.

### Nested components controlling visibility

When components that are meant to control the visibility of their descendants
in some way are nested, the order of their responses to `activateinvisible`
events is important. If these components expect to be in a particular visibility
state before performing some action, then they need to be able to detect what
state they are in or be sure that their response is occuring at a particular
time that guarantees a particular state.

```html
<virtual-scroller id="outer">
  <div id="A" invisible>A</div>
  <virtual-scroller id="inner" invisible>
    <div id="B" invisible>B</div>
    <div id="C" invisible>C</div>
  </virtual-scroller>
  <div id="D" invisible>D</div>
</virtual-scroller>
```

The above example includes two nested `<virtual-scroller>` elements, each of
which has separate responsibility to control the visibility of their own child
elements. `#outer` controls the visibility of `#A`, `#inner`, and `#D`; while
`#inner` controls the visibility of `#B` and `#D`. Consider what happens when
the user searches for "B" and the UA wants to make `#B` visible. Each
`<virtual-scroller>` needs its children to be visible - more specifically, laid
out - so that it can retrieve a valid measurement and position them correctly.
However, if each `<virtual-scroller>` responds in a single, atomic step, a
problem arises:

- If `#B` receives the first event, causing `#inner` to respond first, then
`#inner` can't correctly measure `#B` because `#outer` has not yet made `#inner`
(an ancestor of `#B`) visible.
- If `#inner` receives the first event, causing `#outer` to respond first, then
`#outer` may not be able to correctly measure `#inner` because `#inner` has not
yet made `#B` visible and `#B` may contribute to the size of `#inner` when
visible.

Should elements watching for `activateinvisible` events use two listeners
(capturing and non-capturing) so that they can (a) remove any necessary
`invisible` attributes before descendants and (b) perform measurement and layout
after those descendants? Does this situation force `activateinvisible` to be
composed and/or bubbling?
