# virtualList(items, template, direction)

`virtualList` directive can be configured with 3 properties:
- `items (Array)`, the data model.
- `template (Function)`, generates the DOM for each data item.
- `direction (string)` (optional), layout direction, can be set to "vertical" (default) or "horizontal".

```js
const render = () => html`
  <ul>
    ${virtualList(items, (i, index) => html`
      <li>${index}: ${i.name}</li>`)}
  </ul>
`;
```