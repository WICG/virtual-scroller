# virtualScroller(items, template, direction)

`virtualScroller` directive can be configured with 3 properties:
- `totalItems (number)`, the total number of items.
- `template (Function)`, generates the DOM for each data item.
- `direction (string)` (optional), layout direction, can be set to "vertical" (default) or "horizontal".

```js
const render = () => html`
  <ul>
    ${virtualScroller(items.length, (index) => html`
      <li>${index}: ${items[index].name}</li>`)}
  </ul>
`;
```