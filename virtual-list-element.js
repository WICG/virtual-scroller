import Layout from '../../layouts/layout-1d.js';
import {VirtualList} from './virtual-list.js';

export class VirtualListElement extends HTMLElement {
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

  set direction(dir) {
    this._direction = dir;
    this._render();
  }

  set items(items) {
    this._items = items;
    this._render();
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
      this._layout = new Layout({_overhang: 1000, itemSize: {y: 10000}});
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