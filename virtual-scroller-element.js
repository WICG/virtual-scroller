import {default as Layout1dGrid} from './layouts/layout-1d-grid.js';
import {default as Layout1d} from './layouts/layout-1d.js';
import {VirtualScroller} from './virtual-scroller.js';

/** Properties */
const _scroller = Symbol();
const _newChild = Symbol();
const _updateChild = Symbol();
const _recycleChild = Symbol();
const _childKey = Symbol();
/** Functions */
const _render = Symbol();


export class VirtualScrollerElement extends HTMLElement {
  constructor() {
    super();
    this[_scroller] = null;
    this[_newChild] = null;
    this[_updateChild] = null;
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
    return ['anchor', 'layout', 'totalitems'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this[_render]();
  }

  /**
   * Possible values: null (default), "middle", "end".
   *
   * Set to null to use the first visible item an anchor and to preserve its
   * top/left visible position during size changes.
   *
   * Set to "middle" to use the item in the center of the viewport as an anchor
   * and to preserve its middle/center position during size changes.
   *
   * Set to "end" to use the last visible item as an anchor and to preserve its
   * bottom/right visible position during size changes.
   *
   * @property {string|null}
   */
  get anchor() {
    return this.getAttribute('anchor') || null;
  }
  set anchor(anchor) {
    if (anchor) {
      this.setAttribute('anchor', anchor);
    } else {
      this.removeAttribute('anchor');
    }
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

  /**
   * Scrolls to a specified index, optionally with an offset (pixels).
   *
   * @param {number} index
   * @param {number} offset
   */
  scrollTo(index, offset = 0) {
    if (this[_scroller]) {
      this[_scroller].layout.scrollAnchor = {index, offset};
      this[_scroller].layout.reflowIfNeeded();
    }
  }

  [_render]() {
    if (!this.newChild) {
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
    const anchor =
        this.anchor === 'end' ? 1 : this.anchor === 'middle' ? 0.5 : 0;
    layout.itemAnchor = layout.viewportAnchor = anchor;

    const {newChild, updateChild, recycleChild, childKey, totalItems} = this;
    Object.assign(
        scroller,
        {layout, newChild, updateChild, recycleChild, childKey, totalItems});
  }
}
customElements.define('virtual-scroller', VirtualScrollerElement);