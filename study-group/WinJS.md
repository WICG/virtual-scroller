# WinJS `ListView`

- Study Author: [@domenic](https://github.com/domenic)
- Platform: web / Windows 8

## Background on WinJS

[WinJS](http://try.buildwinjs.com/) is a Microsoft project originally designed to allow writing Windows 8 "Metro" applications in JavaScript and HTML. It has since grown into a cross-platform JavaScript library, [maintained on GitHub](https://github.com/winjs/winjs).

The project appears to be [in maintenance mode](https://github.com/winjs/winjs#status). However, I think it's especially worth investigating as it's a recent attempt to build an operating system's worth of UI controls using web technologies.

## Essential sample code

### With imperative rendering

```js
const items = getTonsAndTonsOfItems();
window.itemList = new WinJS.Binding.List(items);

window.templateProcessor = async itemPromise => {
  const item = await itemPromise;
  // item has various other useful properties: e.g. index, isOnScreen

  const div = document.createElement("div");
  div.textContent = item.data.text;
  return div;
};

// Some sort of security precaution:
// http://try.buildwinjs.com/tutorial/1Basics/markSupport/
WinJS.Utilities.markSupportedForProcessing(window.templateProcessor);

```

```html
<div data-win-control="WinJS.UI.ListView"
     data-win-options="{
       itemDataSource: itemsList.dataSource,
       itemTemplate: templateProcessor,
       layout: { type: WinJS.UI.ListLayout }
     }">
</div>
```

[Live demo, including all supporting code](https://jsbin.com/kuyemit/edit?html,output)

### With custom placeholders while data loads

```js
window.templateProcessor = itemPromise => {
  const div = document.createElement("div");
  div.textContent = "...";

  return {
    element: div,
    renderComplete: Promise.all([delay(1000 * Math.random()), itemPromise]).then(([,item]) => {
      div.textContent = item.data.text;
    })
  };
};
```

[Live demo, including all supporting code](https://jsbin.com/habubas/edit?html,output)

### With declarative template stamping

```js
const items = getTonsAndTonsOfItems();
window.itemList = new WinJS.Binding.List(items);
```

```html
<div id="template" data-win-control="WinJS.Binding.Template" style="display: none">
  <div data-win-bind="textContent: text"></div>
</div>

<div data-win-control="WinJS.UI.ListView"
     data-win-options="{
       itemDataSource: itemsList.dataSource,
       itemTemplate: select('#template'),
       layout: { type: WinJS.UI.ListLayout }
     }">
</div>
```

[Live demo, including all supporting code](https://jsbin.com/sovobeh/edit?html,output)

## Resulting DOM structure

```html
<div data-win-control="WinJS.UI.ListView"
     data-win-options="... as given ..."
     class="win-disposable win-listview win-element-resize"
     role="listbox" aria-multiselectable="true" tabindex="-1"
     style="position: relative;">
  <div tabindex="0" aria-hidden="true"></div>
  <div tabindex="-1" role="group" class="win-viewport win-vertical" style="opacity: 1;" aria-label="Scrolling Container">
    <div id="element__86" aria-flowto="element__2"></div>
    <div class="win-headercontainer" style="opacity: 1;"></div>
    <div class="win-surface win-listlayout win-nocssgrid _win-dynamic-containersize-0 win-structuralnodes win-single-itemsblock" style="width: 682px; opacity: 1;">
      <div class="_win-proxy"></div>
      <div class="win-itemscontainer win-uniformlistlayout" style="height: 8671px;">
        <div class="win-itemscontainer-padder"></div>
        <div class="win-itemsblock">
          <div class="win-container win-container-even">
            <div class="win-itembox">
              <div tabindex="0" class="win-item" id="element__2" x-ms-aria-flowfrom="element__86" role="option" aria-setsize="299" aria-posinset="1" aria-flowto="element__16">1</div>
            </div>
          </div>
          <div class="win-container win-container-odd">
            <div class="win-itembox">
              <div tabindex="0" class="win-item" id="element__16" x-ms-aria-flowfrom="element__2" role="option" aria-setsize="299" aria-posinset="2" aria-flowto="element__17">2</div>
            </div>
          </div>
          ... repeats for 44 total items ...
          <div class="win-container win-container-even win-backdrop"></div>
          <div class="win-container win-container-odd win-backdrop"></div>
          ... repeats for 255 total placeholders ...
        </div>
      </div>
    </div>
    <div class="win-footercontainer" style="opacity: 1; min-height: 0px;"></div>
    <div id="element__87" x-ms-aria-flowfrom="element__28"></div>
  </div>
  <div tabindex="0" aria-hidden="true"></div>
  <div aria-hidden="true" style="position:absolute;left:50%;top:50%;width:0px;height:0px;" tabindex="-1"></div>
  <div style="animation-name: WinJS-node-inserted; animation-duration: 0.01s; position: absolute;"></div>
</div>
```

## Customization options

`ListView` is an industrial-strength control. Without even diving into the API documentation, you can tell from the Microsoft-provided demos that there are a lot of axes of customization:

- List vs. grid layout vs. cell spanning layout vs. custom layout.
- Ability to create "groupings" of items within the list, with a header per grouping
- Ability to select one or more items in the list
- Headers and footers
- A boolean switch to make the items drag-drop reorderable, which will reorder both the UI and the underlying data
- A separate boolean switch to make the items draggable in general, e.g. to other parts of the UI; combines well with the previous one
- A `footervisibilitychanged` event which provides an opportunity to know when to load more data
- CSS classes, `win-container-even` and `win-container-odd`, which allow striping. (This seems unnecessary given that `:nth-of-type` would work fine?)

Note that the control comes with a default height of `400px`; it does not try to automatically infer from the items.

## API

Going through the API documentation, here are some highlights not mentioned above:

- **Events**: various item dragging events, an item being "invoked" (clicked), keyboard navigation, loading state changes, selection changes
- **Methods**: `elementFromIndex()`, `indexOfElement()`, some stuff related to loading of pages (??), some stuff that should never need to be called for re-doing layout
- **Properties**: `currentItem`; `groupDataSource` vs. `itemDataSource`; `indexOf{First|Last}Visible`, properties for controlling how many items to "load" (render) before/after the currently-visible ones

## Miscellaneous thoughts and takeaways

- The idea of requiring the data source to be wrapped into a custom class is interesting and perhaps useful. This avoids the diffing that many modern frameworks do.
- The reliance on global variables to hook things up is very sad.
- The way in which it modifies your markup, to insert classes, ARIA, `tabindex`, etc., is a little sad. We may be able to avoid some of this with shadow DOM?
- They appear to dynamically create a CSS rule to set the placeholder items to be the same size as the other items. I haven't dug into the code to see what heuristic they use here (e.g., what happens if different items are different sizes).
- It's heartening to see that both grid and list layouts appear to use the same DOM structure, with only CSS differences. Cell-spanning layout appears to use additional inline CSS to set `with`, `height`, and CSS grid properties.
- It seems to use some concept of "page" to control loading behavior. I think this just means "how many items can fit on the screen".
- The "item" abstraction, passed to the renderer function, is interesting; I can't find any API documentation for it, but it makes some sense. I don't quite understand why it's a promise, i.e. I don't understand in what scenario it might take some time to acquire the promise. But the framework for returning a custom placeholder then filling it in later seems nice.

## Resources

- [Comprehensive API documentation](https://docs.microsoft.com/en-us/previous-versions/windows/apps/br211837(v=win.10))
- [Optimizing `ListView` item rendering](https://blogs.msdn.microsoft.com/windowsappdev/2013/06/17/optimizing-listview-item-rendering/) blog post
- Relevant tutorial sections:
  - [Binding lists](http://try.buildwinjs.com/tutorial/2WinJS_Binding/bindingList/) shows how they expect you to wrap your data in a `WinJS.Binding.List`. To introduce this concept it uses a separate control, `Repeater`, which is much simpler than `ListView`.
  - [Projections](http://try.buildwinjs.com/tutorial/3Control_Manipulation/projections/) talks about how you can create new `WinJS.Binding.List` instances "projected" from the original, e.g. a sorted one.
  - [Binding templates](http://try.buildwinjs.com/tutorial/2WinJS_Binding/bindingTemplates/) shows how to use a `ListView` to stamp out templates
  - [Function rendering](http://try.buildwinjs.com/tutorial/3Control_Manipulation/functionRend/) (i.e. imperative rendering) is the lower-level technology that underlies the template binding
- Demos:
  - [The new playground](http://try.buildwinjs.com/playground/) has three relevant demos, each of which demonstrate different ways to customize the `ListView`
  - [The former playground](http://winjs.azurewebsites.net/) has the same demos with different presentation
  - [This interactive demo](http://winjs.azurewebsites.net/pages/listview/options/default.html) lets you customize all the different options individually
