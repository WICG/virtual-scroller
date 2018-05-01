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
const _items = Symbol();
const _list = Symbol();
const _newChild = Symbol();
const _updateChild = Symbol();
const _recycleChild = Symbol();
const _itemKey = Symbol();
const _grid = Symbol();
const _horizontal = Symbol();
const _scrollTarget = Symbol();
const _pendingRender = Symbol();
/** Functions */
const _render = Symbol();
const _scheduleRender = Symbol();


export class VirtualListElement extends HTMLElement {
  constructor() {
    super();
    this[_items] = null;
    this[_list] = null;
    this[_newChild] = null;
    this[_updateChild] = null;
    this[_recycleChild] = null;
    this[_itemKey] = null;
    this[_grid] = false;
    this[_horizontal] = false;
    this[_pendingRender] = null;
    this[_scrollTarget] = null;
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
  :host(:not([layout])) ::slotted(*), 
  :host([layout=vertical]) ::slotted(*) {
    max-width: 100%;
  }
  :host([layout=horizontal]) ::slotted(*) {
    max-height: 100%;
  }
</style>
<slot></slot>`;
    }
    this[_scrollTarget] = findScrollTarget(this);
    this[_scheduleRender]();
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

  get itemKey() {
    return this[_itemKey];
  }
  set itemKey(fn) {
    this[_itemKey] = fn;
    this[_scheduleRender]();
  }

  get layout() {
    const prefix = this[_horizontal] ? 'horizontal' : 'vertical';
    const suffix = this[_grid] ? '-grid' : '';
    return prefix + suffix;
  }
  set layout(layout) {
    const old = this.layout;
    this[_horizontal] = layout && layout.startsWith('horizontal');
    this[_grid] = layout && layout.endsWith('-grid');
    layout = this.layout;
    // Reflect to attribute.
    if (old !== layout) {
      this.setAttribute('layout', layout);
    }
    this[_scheduleRender]();
  }

  get items() {
    return this[_items];
  }
  set items(items) {
    this[_items] = items;
    this[_scheduleRender]();
  }

  requestReset() {
    if (this[_list]) {
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
      this[_list] = new VirtualList({container: this});
    }
    const list = this[_list];
    list.scrollTarget = this[_scrollTarget];

    const {newChild, updateChild, recycleChild, itemKey, items} = this;
    Object.assign(list, {newChild, updateChild, recycleChild, itemKey, items});

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

function findScrollTarget(node) {
  // Search for element that scrolls up the parent tree.
  while (node && node !== document.body) {
    if (node.nodeType === Node.ELEMENT_NODE && scrolls(node)) {
      // Found it!
      return node;
    }
    node = node.host || node.assignedSlot || node.parentNode;
  }
  return null;
}

function scrolls(element) {
  // Check inline style to avoid forcing layout.
  const inlineInfo = scrollInfo(element.style);
  if (inlineInfo.x || inlineInfo.y) {
    return true;
  }
  const computedInfo = scrollInfo(getComputedStyle(element));
  return computedInfo.x || computedInfo.y;
}

function scrollInfo(style) {
  const x = style.overflowX === 'auto' || style.overflowX === 'scroll';
  const y = style.overflowY === 'auto' || style.overflowY === 'scroll';
  return {x, y};
}