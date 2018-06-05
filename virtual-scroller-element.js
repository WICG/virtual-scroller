import {default as Layout1dGrid} from './layouts/layout-1d-grid.js';
import {default as Layout1d} from './layouts/layout-1d.js';
import {VirtualScroller} from './virtual-scroller.js';

/** Properties */
const _scroller = Symbol();
const _createElement = Symbol();
const _updateElement = Symbol();
const _recycleElement = Symbol();
const _elementKey = Symbol();
const _nodePool = Symbol();
/** Functions */
const _render = Symbol();


export class VirtualScrollerElement extends HTMLElement {
  constructor() {
    super();
    this[_scroller] = null;
    // Default create/update/recycleElement.
    this[_nodePool] = [];
    let childTemplate = null;
    this[_createElement] = () => {
      if (this[_nodePool] && this[_nodePool].length) {
        return this[_nodePool].pop();
      }
      if (!childTemplate) {
        const template = this.querySelector('template');
        childTemplate = template && template.content.firstElementChild ?
            template.content.firstElementChild :
            document.createElement('div');
      }
      return childTemplate.cloneNode(true);
    };
    this[_updateElement] = (element, index) => element.textContent = index;
    this[_recycleElement] = (element) => this[_nodePool].push(element);
    this[_elementKey] = null;
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
    // Resets default recycling.
    if (this[_nodePool]) {
      this.recycleElement = null;
    }
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
    // Marks default recycling changed.
    this[_nodePool] = null;
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
