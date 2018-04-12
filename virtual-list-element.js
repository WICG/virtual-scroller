import Layout from './layouts/layout-1d.js';
import {VirtualList} from './virtual-list.js';

export class VirtualListElement extends HTMLElement {
  constructor() {
    super();
    this._items = null;
    this._template = null;
    this._direction = 'vertical';
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
</style>
<slot></slot>`;
    }
    this._render();
  }

  static get observedAttributes() {
    return ['direction'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'direction') {
      this.direction = newVal;
    }
  }

  set template(template) {
    if (!this._template) {
      if (typeof template === 'function') {
        this._template = {newChild: template};
      } else {
        this._template = template;
      }
      this._render();
    }
  }

  get direction() {
    return this._direction;
  }

  set direction(dir) {
    if (this._direction !== dir) {
      this._direction = dir;
      this._render();
    }
  }

  get items() {
    return this._items;
  }

  set items(items) {
    if (this._items !== items) {
      this._items = items;
      this._render();
    }
  }

  get first() {
    return this._list ? this._list.first : 0;
  }

  get num() {
    return this._list ? this._list.num : 0;
  }

  requestReset() {
    if (this._list) {
      this._list.requestReset();
    }
  }

  /**
   * @protected
   */
  _render() {
    if (!this._template) {
      return;
    }
    if (!this._list) {
      // Delay init to first connected as list needs to measure
      // sizes of container and children.
      if (!this.isConnected) {
        return;
      }
      const {newChild, updateChild, recycleChild} = this._template;
      this._layout = new Layout({itemSize: {height: 10000}, _overhang: 1000});
      this._list = new VirtualList({
        container: this,
        layout: this._layout,
        newChild,
        updateChild,
        recycleChild,
      });
    }
    this._list.items = this._items;
    this._layout.direction = this._direction;
  }
}
customElements.define('virtual-list', VirtualListElement);