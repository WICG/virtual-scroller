import {default as Layout1dGrid} from './layouts/layout-1d-grid.js';
import {default as Layout1d} from './layouts/layout-1d.js';
import {VirtualScroller} from './virtual-scroller.js';

/** Properties */
const _scroller = Symbol();
const _createElement = Symbol();
const _updateElement = Symbol();
const _recycleChild = Symbol();
const _childKey = Symbol();
/** Functions */
const _render = Symbol();


export class VirtualScrollerElement extends HTMLElement {
  constructor() {
    super();
    this[_scroller] = null;
    this[_createElement] = null;
    this[_updateElement] = null;
    this[_recycleChild] = null;
    this[_childKey] = null;
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
  :host([hidden]) {
    display: none;
  }
  ::slotted(*) {
    box-sizing: border-box;
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
    this[_render]();
  }

  static get observedAttributes() {
    return ['layout', 'totalitems'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this[_render]();
  }

  get layout() {
    return this.getAttribute('layout');
  }
  set layout(layout) {
    this.setAttribute('layout', layout);
  }

  get totalItems() {
    return +this.getAttribute('totalitems');
  }
  set totalItems(v) {
    this.setAttribute('totalitems', +v);
  }

  get createElement() {
    return this[_createElement];
  }
  set createElement(fn) {
    this[_createElement] = fn;
    this[_render]();
  }

  get updateElement() {
    return this[_updateElement];
  }
  set updateElement(fn) {
    this[_updateElement] = fn;
    this[_render]();
  }

  get recycleChild() {
    return this[_recycleChild];
  }
  set recycleChild(fn) {
    this[_recycleChild] = fn;
    this[_render]();
  }

  get childKey() {
    return this[_childKey];
  }
  set childKey(fn) {
    this[_childKey] = fn;
    this[_render]();
  }

  requestReset() {
    if (this[_scroller]) {
      this[_scroller].requestReset();
    }
  }

  [_render]() {
    if (!this.createElement) {
      return;
    }
    // Delay init to first connected as scroller needs to measure
    // sizes of container and children.
    if (!this[_scroller] && !this.isConnected) {
      return;
    }

    if (!this[_scroller]) {
      this[_scroller] =
          new VirtualScroller({container: this, scrollTarget: this});
    }
    const scroller = this[_scroller];

    const Layout = this.layout.endsWith('-grid') ? Layout1dGrid : Layout1d;
    const direction =
        this.layout.startsWith('horizontal') ? 'horizontal' : 'vertical';
    const layout = scroller.layout instanceof Layout &&
            scroller.layout.direction === direction ?
        scroller.layout :
        new Layout({direction});

    const {createElement, updateElement, recycleChild, childKey, totalItems} =
        this;
    Object.assign(scroller, {
      layout,
      createElement,
      updateElement,
      recycleChild,
      childKey,
      totalItems
    });
  }
}
customElements.define('virtual-scroller', VirtualScrollerElement);