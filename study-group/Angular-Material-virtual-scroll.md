# Angular Material's Virtual Scroll
* Study author: [@mmalerba](https://github.com/mmalerba)
* Platform: web

## Background on Angular Material
[Angular Material](https://material.angular.io/) is a Google project to provide
[Material Design](https://material.io/) components for the [Angular](https://angular.io/) framework.
In addition to providing the Material Design components themselves, Angular Material publishes a
Component Development Kit (CDK) which exposes some of the building blocks used in Angular Material
that may be useful to developers of other Angular component libraries.

The `<cdk-virtual-scroll-viewport>` (and related components) are components currently being
developed for the CDK to provide virtual scrolling functionality. Code will go into a
[feature branch](https://github.com/angular/material2/tree/virtual-scroll) during development. The
[initial PR](https://github.com/angular/material2/pull/9316) sets up much of the infrastructure and
implements a simple fixed item size virtual scrolling strategy. More features and virtual scrolling
strategies will be added in future PRs. This document covers the current implementation + planned
work for the near future.

## Motivating use cases
There are a number of Angular Material components that would benefit from having the option to
virtualize scrolling (although we don't want to force users to use virtual scrolling with any of
these components):

* [Accordion](https://material.angular.io/components/expansion/overview#accordion) with many
  expandable panels
* [Autocomplete](https://material.angular.io/components/autocomplete/overview) with many options
* [Datepicker](https://material.angular.io/components/datepicker/overview) (for ability to scroll
  through years, in addition to clicking forward/back)
* [List](https://material.angular.io/components/list/overview) with many items
* [Select](https://material.angular.io/components/select/overview) with many options
* [Table](https://material.angular.io/components/table/overview) with lots of data
* Tree (currently being implemented) with many nodes

## Overview
The Angular Material implementation of virtual scroll will be divided into a number of smaller
pieces each with its own responsibilities.

### `cdk-virtual-scroll-viewport`
Will be responsible for managing the state of the viewport. This includes things like:

1. Monitoring scroll and resize events
2. Updating the offset for the rendered portion of the data
3. Updating the spacer element to reflect our best estimate of the size of the entire scrollable
   content 
4. Keeping track of if whether we're virtualizing in the horizontal or vertical direction

### `*cdkVirtualForOf`
Will be responsible for managing the items themselves. This includes things like:

1. Diffing changes to the rendered range of items and stamping out new template instances as needed
2. Caching item instances that are no longer needed so they can be recycled later
3. Measuring the size of the rendered DOM corresponding to a given item

### `VirtualScrollStrategy`
Will be responsible for deciding what range of data to render. This is merely an interface that will
have different implementations. For example we will likely have an implementation that assumes
equal-sized items, one that measures items, and one that disables virtualization and just renders
everything (we don't want any of the Angular Material components to force virtualization on users
since it may be detrimental to accessibility). The strategy can be set globally using Angular's
dependency injection system or on a case-by-case basis using Angular Directives (e.g. adding the
`itemSize="xxx"` attribute to a `cdk-virtual-scroll-viewport` will automatically switch the
`VirtualScrollStrategy` to a fixed item size one.)

### `DataSource`
Will be responsible for fetching the data (whether it be all in memory, loading additional data from
the server as the user gets close to the end of the currently loaded data, etc). The user can either
pass a `DataSource` that implements fetching logic or just pass a simple array and have a static
`DataSource` created automatically.

## Essential sample code
```ts
@Component({...})
class MyComponent {
  names = ['Domenic', 'Ojan', ...];
}
```

```html
<cdk-virtual-scroll-container [itemSize]="50">
  <div *cdkVirtualForOf="let name of names">{{name}}</div>
</cdk-virtual-scroll-container>
```

## Resulting DOM structure
```html
<cdk-virtual-scroll-viewport class="cdk-virtual-scroll-viewport"
                             style="overflow:auto; ...">
  <div class="cdk-virtual-scroll-content-wrapper"
       style="position:absolute; transform:translateY(200px); ...">
    <div>Domenic</div>
    <div>Ojan</div>
    ...
  </div>
  <div class="cdk-virtual-scroll-spacer"
       style="position:absolute; transform:translateY(10000px); ..."></div>
</cdk-virtual-scroll-viewport>
```

## Customization options
- Supports horizontal & vertical scroll direction
- Easily swappable scroll strategies and mechanisms to change strategy for entire app, portions of
  the app, or individual virtual scroller containers
- Easily swappable data sources for different async strategies (e.g. placeholder elements vs
  changing the size of the list)
- Supports element and attribute selectors (useful in situations where children need to be a
  specific tag name, e.g. a `<ul>` with `<li>` children)
- Supports `0..*` HTML nodes per list item (useful in situations where you can't wrap, e.g. stamping
  out `<li>` elements

## API
- `@Input() direction` - The direction to virtualize (vertical or horizontal)
- `@Input() cdkVirtualForOf` - Sets the data source
- `@Output() startIndex` - The index of the first visible item
- `scrollTo(position)` - scroll to the given scroll position
- `scrollToIndex(index)` - scroll to the given index in the list
- `VirtualScrollStrategy` settable through dependency injection or directives
- `VirtualScrollStrategy` implementations have buffer parameters that user can adjust

## Noteworthy features & implementation details

### Plan for variable size items
I've done some research and experimentation into how to handle variable sized items, and have a plan
for how to do it, but haven't implemented it yet. My first thought was to just measure the scroll
delta on each scroll event, estimate how many items I need to render to fill the new space, based on
the average of items I've seen so far (with additional render-measure cycles if necessary), and then
remove the items that have moved off screen. The problem with this, however, is that the scroll
delta can be very large if the user takes the scroll handle and whips it to the bottom. At this
point I'm essentially rendering the entire list, only to delete most of it shortly after.

Instead I believe a better solution would be to use the strategy above only if the scroll delta is
less than the size of the viewport. If it's greater than the size of the viewport the user isn't
going to notice any discontinuities, so just estimate where you should be in the list and render
that part. The problem now is that if I jump to somewhere in the middle of the list and then slowly
scroll backward it may turn out that my estimate was wrong and when I get to the top there will be a
gap or some elements that are stuck beyond the start of the viewport. To mitigate this I will monitor
the error between my current position and my latest estimate as I scroll up and correct it more and
more aggressively the closer I get to the top (I imagine something like "reduce the error by
percent-scrolled-toward-top * total-error", so by the time I get to the top the error is completely
corrected).

This will be implemented as a separate scroll strategy. If users know the size of their items they
can use the more performant fixed size strategy, and if they don't they can use this strategy.

### Support for `<ul>`, `<table>`, etc.
Some elements have certain requirements for their children (e.g. `<ul>` must have `<li>` children).
In order to support these elements in our virtual scrolling solution we will allow both element and
attribute selectors. For example:

```html
<table cdkVirtualScrollViewport>
  <tbody cdkVirtualScrollContent>
    <tr *cdkVirtualForOf="let row of data">
      <td>{{row.cols[0]}}</td>
      <td>{{rows.cols[1]}}</td>
    </tr>
  </tbody>
</table>
```

```html
<cdk-virtual-scroll-viewport>
  <ul cdkVirtualScrollContent>
    <li *cdkVirtualForOf="let item of data">{{item.name}}</li>
  </ul>
</cdk-virtual-scroll-viewport>
```

### Viewport and content resizing
We should be able to automatically handle rendering additional content when the viewport or content
resizes. We can detect changes as follows:

- viewport shrinks - we don't care about this case, we'll just have slightly more content rendered
  than necessary until the next scroll event
- viewport grows - we can use `IntersectionObserver` to know if the bottom of the rendered content
  crosses the bottom of the viewport and render more content
- content shrinks - we can use the same `IntersectionObserver` to catch this case
- content grows - we don't really care about detecting this case either, our estimated content size
  will just be incorrect until the next scroll event

### Template instance recycling
As the user scrolls and template instances go off the edge of the viewport the `CdkVirtualForOf`
removes them from the DOM and adds them to a template cache. Later when new template instances need
to be created, the instances from the cache are rebound to the new data and added back into the DOM.
This is less expensive than constantly creating and destroying instances. We will likely want to put
some cap on our template cache to prevent wasting too much memory.

## Resources
- [Feature branch](https://github.com/angular/material2/tree/virtual-scroll)
- [Initial PR](https://github.com/angular/material2/pull/9316) (not yet merged)
