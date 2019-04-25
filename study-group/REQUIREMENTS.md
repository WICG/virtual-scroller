# Virtual scroller requirements

This document gathers the various features we've identified for a virtual scroller, along with their priority. If you disagree with these priorities, or would like to add additional features, please file an issue to discuss.

We use the following priority system:

- **P0** means that the we consider the element unusable if it does not include the feature. These need to be included in any "minimum viable product" (MVP) specification.
- **P1** means that we plan to include the feature in the MVP, but can drop it if it proves impossible, overly complex, or would delay delivering the value of the MVP.
- **P2** features will not be included in the MVP, and may never be included.

This document was created before the current [explainer](../README.md), based only on the study-group's studies, so it may feel a bit dated. But we think it's a valuable reference to refer back to at times.

## P0

- Accurate scrollbar position for elements that have been loaded
- Overall list structure supports screen readers and accessibility controls
- Heterogeneous elements
- Fallback element UI is possible (perhaps manually)
- Grid layout
- Overall scroller header and footer
- Configurable layout and style for elements in the scroller
- Clickable child elements

## P1

- Find in page (<kbd>Ctrl+F</kbd>) highlights elements that have been loaded
- Subgroups within the scroller (e.g. letter groupings for a contact list), with potentially-sticky headers
- Maintains scroll position across page load
- "Load more" button
- Ability to animate items in/out, with changing sizes
- Horizontal layout

## P2

- Built-in backing by a remote data source
- Built-in selectable children
- Built-in rearrangeable children
- Built-in pull to refresh
- Find in page (<kbd>Ctrl+F</kbd>) highlights elements that haven't been loaded from the server
- Accurate scrollbar position including elements that haven't been loaded from the server
- Discoverable by screen readers for elements that haven't been loaded from the server
- Animation coordination (like `UITableView`)
