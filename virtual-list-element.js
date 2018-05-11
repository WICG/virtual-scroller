import {VirtualList} from './virtual-list.js';

// Lazily loaded Layout classes.
const dynamicImports = {};
async function importLayoutClass(url) {
  if (!dynamicImports[url]) {
    dynamicImports[url] = import(url).then(module => module.default);
  }
  return await dynamicImports[url];
}

/** Properties */
const _list = Symbol();
const _newChild = Symbol();
const _updateChild = Symbol();
const _recycleChild = Symbol();
const _childKey = Symbol();
const _grid = Symbol();
const _horizontal = Symbol();
const _pendingRender = Symbol();
/** Functions */
const _render = Symbol();
const _scheduleRender = Symbol();


export class VirtualListElement extends HTMLElement {
  constructor() {
    super();
    this[_list] = null;
    this[_newChild] = null;
    this[_updateChild] = null;
    this[_recycleChild] = null;
    this[_childKey] = null;
    this[_grid] = false;
    this[_horizontal] = false;
    this[_pendingRender] = null;
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({mode: 'open'}).innerHTML = `
<style>
  :host {
    display: block;
    position: relative;
    contain: strict;
    height: 150px;
    overflow: auto;
  }
  :host([layout=vertical]) ::slotted(*) {
    width: 100%;
  }
  :host([layout=horizontal]) ::slotted(*) {
    height: 100%;
  }
</style>
<slot></slot>`;
      // Default layout.
      if (!this.layout) {
        this.layout = 'vertical';
      }
    }
    this[_scheduleRender]();
  }

  static get observedAttributes() {
    return ['layout', 'size'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this[name] = newVal;
  }

  get newChild() {
    return this[_newChild];
  }
  set newChild(fn) {
    this[_newChild] = fn;
    this[_scheduleRender]();
  }

  get updateChild() {
    return this[_updateChild];
  }
  set updateChild(fn) {
    this[_updateChild] = fn;
    this[_scheduleRender]();
  }

  get recycleChild() {
    return this[_recycleChild];
  }
  set recycleChild(fn) {
    this[_recycleChild] = fn;
    this[_scheduleRender]();
  }

  get childKey() {
    return this[_childKey];
  }
  set childKey(fn) {
    this[_childKey] = fn;
    this[_scheduleRender]();
  }

  get layout() {
    return this.getAttribute('layout');
  }
  set layout(layout) {
    this[_horizontal] = layout.startsWith('horizontal');
    this[_grid] = layout.endsWith('-grid');
    if (this.layout !== layout) {
      this.setAttribute('layout', layout);
      this[_scheduleRender]();
    }
  }

  get size() {
    return +this.getAttribute('size');
  }

  set size(v) {
    if (this.size !== +v) {
      this.setAttribute('size', +v);
      this[_scheduleRender]();
    }
  }

  requestReset() {
    if (this[_list] && !this[_pendingRender]) {
      this[_list].requestReset();
    }
  }

  [_scheduleRender]() {
    if (!this[_pendingRender]) {
      this[_pendingRender] = Promise.resolve().then(() => {
        this[_pendingRender] = null;
        this[_render]();
      });
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

    if (!this[_list]) {
      this[_list] = new VirtualList({container: this, scrollTarget: this});
    }
    const list = this[_list];

    const {newChild, updateChild, recycleChild, childKey, size} = this;
    Object.assign(list, {newChild, updateChild, recycleChild, childKey, size});

    const Layout = await importLayoutClass(
        this[_grid] ? './layouts/layout-1d-grid.js' : './layouts/layout-1d.js');
    const direction = this[_horizontal] ? 'horizontal' : 'vertical';
    if (list.layout instanceof Layout === false ||
        list.layout.direction !== direction) {
      list.layout = new Layout({direction});
    }
  }
}
customElements.define('virtual-list', VirtualListElement);