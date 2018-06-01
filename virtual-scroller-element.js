import {default as Layout1dGrid} from './layouts/layout-1d-grid.js';
import {default as Layout1d} from './layouts/layout-1d.js';
import {VirtualScroller} from './virtual-scroller.js';

/** Properties */
const _scroller = Symbol();
const _createElement = Symbol();
const _updateElement = Symbol();
const _recycleElement = Symbol();
const _elementKey = Symbol();
const _firstConnected = Symbol();
/** Functions */
const _render = Symbol();


export class VirtualScrollerElement extends HTMLElement {
  constructor() {
    super();
    this[_scroller] = null;
    this[_createElement] = null;
    this[_updateElement] = null;
    this[_recycleElement] = null;
    this[_elementKey] = null;
    this[_firstConnected] = false;
  }

  connectedCallback() {
    if (!this[_firstConnected]) {
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
      // Set default values.
      if (!this.layout) {
        this.layout = 'vertical';
      }
      if (!this.anchor) {
        this.anchor = 'start';
      }
      // Enables rendering.
      this[_firstConnected] = true;
    }
    this[_render]();
  }

  static get observedAttributes() {
    return ['anchor', 'layout', 'totalitems'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this[_render]();
  }

  get anchor() {
    return this.getAttribute('anchor');
  }
  set anchor(anchor) {
    this.setAttribute('anchor', anchor);
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

  get recycleElement() {
    return this[_recycleElement];
  }
  set recycleElement(fn) {
    this[_recycleElement] = fn;
    this[_render]();
  }

  get elementKey() {
    return this[_elementKey];
  }
  set elementKey(fn) {
    this[_elementKey] = fn;
    this[_render]();
  }

  requestReset() {
    if (this[_scroller]) {
      this[_scroller].requestReset();
    }
  }

  scrollTo(index, offset = 0) {
    if (this[_scroller]) {
      this[_scroller].layout.scrollAnchor = {index, offset};
      this[_scroller].layout.reflowIfNeeded();
    }
  }

  [_render]() {
    // Wait first connected as scroller needs to measure
    // sizes of container and children.
    if (!this[_firstConnected] || !this.createElement) {
      return;
    }
    if (!this[_scroller]) {
      this[_scroller] =
          new VirtualScroller({container: this, scrollTarget: this});
    }
    const scroller = this[_scroller];

    const layoutAttr = this.layout;
    const Layout = layoutAttr.endsWith('-grid') ? Layout1dGrid : Layout1d;
    const direction =
        layoutAttr.startsWith('horizontal') ? 'horizontal' : 'vertical';
    const layout = scroller.layout instanceof Layout &&
            scroller.layout.direction === direction ?
        scroller.layout :
        new Layout({direction});
    const anchorAttr = this.anchor;
    const anchor = anchorAttr === 'end' ? 1 : anchorAttr === 'middle' ? 0.5 : 0;
    layout.itemAnchor = layout.viewportAnchor = anchor;

    const {
      createElement,
      updateElement,
      recycleElement,
      elementKey,
      totalItems
    } = this;
    Object.assign(scroller, {
      layout,
      createElement,
      updateElement,
      recycleElement,
      elementKey,
      totalItems
    });
  }
}
customElements.define('virtual-scroller', VirtualScrollerElement);