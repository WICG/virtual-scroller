import {VirtualList} from './virtual-list.js';

/** Properties */
const _items = Symbol();
const _list = Symbol();
const _newChild = Symbol();
const _updateChild = Symbol();
const _recycleChild = Symbol();
const _grid = Symbol();
const _horizontal = Symbol();
const _pendingRender = Symbol();
/** Functions */
const _render = Symbol();

// Lazily loaded Layout classes.
const dynamicImports = {};
const LayoutClass = async (url) => {
  if (!dynamicImports[url]) {
    dynamicImports[url] = import(url).then(module => module.default);
  }
  return await dynamicImports[url];
};

export class VirtualListElement extends HTMLElement {
  constructor() {
    super();
    this[_items] = null;
    this[_list] = null;
    this[_newChild] = null;
    this[_updateChild] = null;
    this[_recycleChild] = null;
    this[_grid] = false;
    this[_horizontal] = false;
    this[_pendingRender] = false;
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
    const prefix = this[_horizontal] ? 'horizontal' : 'vertical';
    const suffix = this[_grid] ? '-grid' : '';
    return prefix + suffix;
  }
  set layout(layout) {
    this[_horizontal] = layout && layout.startsWith('horizontal');
    this[_grid] = layout && layout.endsWith('-grid');
    this[_render]();
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

  async[_render]() {
    if (!this.newChild) {
      return;
    }
    // Delay init to first connected as list needs to measure
    // sizes of container and children.
    if (!this[_list] && !this.isConnected) {
      return;
    }
    if (this[_pendingRender]) {
      return;
    }
    this[_pendingRender] = true;

    if (!this[_list]) {
      this[_list] = new VirtualList({container: this});
    }
    const list = this[_list];

    const direction = this[_horizontal] ? 'horizontal' : 'vertical';
    const url =
        this[_grid] ? './layouts/layout-1d-grid.js' : './layouts/layout-1d.js';
    const Layout = await LayoutClass(url);
    const layout =
        list.layout instanceof Layout && list.layout.direction === direction ?
        list.layout :
        new Layout({direction});

    const {newChild, updateChild, recycleChild, items} = this;
    Object.assign(list, {newChild, updateChild, recycleChild, items, layout});
    this[_pendingRender] = false;
  }
}
customElements.define('virtual-list', VirtualListElement);