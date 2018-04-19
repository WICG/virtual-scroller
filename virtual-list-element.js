import {VirtualList} from './virtual-list.js';

/** Properties */
const _items = Symbol();
const _list = Symbol();
const _newChild = Symbol();
const _updateChild = Symbol();
const _recycleChild = Symbol();
const _layoutType = Symbol();
/** Functions */
const _render = Symbol();

export class VirtualListElement extends HTMLElement {
  constructor() {
    super();
    this[_items] = null;
    this[_list] = null;
    this[_newChild] = null;
    this[_updateChild] = null;
    this[_recycleChild] = null;
    this[_layoutType] = 'vertical';
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({mode: 'open'}).innerHTML = `
<style>
  :host {
    display: block;
    position: relative;
    contain: strict;
  }
  ::slotted(*) {
    box-sizing: border-box;
    max-width: 100%;
    max-height: 100%;
  }
</style>
<slot></slot>`;
    }
    this[_render]();
  }

  static get observedAttributes() {
    return ['layout'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'layout') {
      this.layout = newVal;
    }
  }

  get newChild() {
    return this[_newChild];
  }
  set newChild(fn) {
    this[_newChild] = fn;
    this[_render]();
  }

  get updateChild() {
    return this[_updateChild];
  }
  set updateChild(fn) {
    this[_updateChild] = fn;
    this[_render]();
  }

  get recycleChild() {
    return this[_recycleChild];
  }
  set recycleChild(fn) {
    this[_recycleChild] = fn;
    this[_render]();
  }

  get layout() {
    return this[_layoutType];
  }
  set layout(layout) {
    layout = layout || 'vertical';
    if (this[_layoutType] !== layout) {
      this[_layoutType] = layout;
      this[_render]();
      if (this[_list]) {
        this[_list].requestReset();
      }
    }
  }

  get items() {
    return this[_items];
  }
  set items(items) {
    this[_items] = items;
    this[_render]();
  }

  requestReset() {
    if (this[_list]) {
      this[_list].requestReset();
    }
  }

  [_render]() {
    if (!this.newChild) {
      return;
    }
    if (!this[_list]) {
      // Delay init to first connected as list needs to measure
      // sizes of container and children.
      if (!this.isConnected) {
        return;
      }
      this[_list] = new VirtualList({container: this});
    }

    const {newChild, updateChild, recycleChild, items} = this;
    Object.assign(this[_list], {
      newChild,
      updateChild,
      recycleChild,
      items,
    });

    const direction =
        this.layout.startsWith('horizontal') ? 'horizontal' : 'vertical';
    const url = this.layout.endsWith('-grid') ? './layouts/layout-1d-grid.js' :
                                                './layouts/layout-1d.js';
    const importPromise = import(url);
    importPromise.then(module => {
      const Layout = module.default;
      const layout = this[_list].layout;
      if (layout instanceof Layout) {
        layout.direction = direction;
      } else {
        this[_list].layout = new Layout({
          direction,
          itemSize: {width: 10000, height: 10000},
        });
      }
    });
  }
}
customElements.define('virtual-list', VirtualListElement);