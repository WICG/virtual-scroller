import Layout from '../../layouts/layout-1d.js';
import {VirtualList} from '../../virtual-list.js';
import {VirtualRepeater} from '../../virtual-repeater.js';

class ListElement extends HTMLElement {
  connectedCallback() {
    this.style.display = 'block';
    this.style.position = 'relative';
    this.style.contain = 'strict';
    this._updateList();
  }

  set newChild(newChild) {
    this._newChild = this._newChild || newChild;
    this._updateList();
  }

  set items(items) {
    this._items = items;
    this._updateList();
  }

  _updateList() {
    if (!this._list && !this.isConnected) {
      return;
    }
    if (!this._newChild) {
      return;
    }
    if (!this._list) {
      const layout = new Layout();
      layout._overhang = 800;
      layout._list = this;
      layout._itemSize.y = 1000000;

      this._list =
          new VirtualList({container: this, layout, newChild: this._newChild});
    }
    this._list.items = this._items;
  }
}

customElements.define('virtual-list', ListElement);

class RepeaterElement extends HTMLElement {
  connectedCallback() {
    this._updateRepeater();
  }

  _updateRepeater() {
    if (!this._repeater && !this.isConnected) {
      return;
    }
    if (!this._newChild) {
      return;
    }
    if (!this._repeater) {
      this._repeater =
          new VirtualRepeater({container: this, newChild: this._newChild});
    }
    this._repeater.first = this._first;
    this._repeater.num = this._num;
    this._repeater.items = this._items;
  }

  set newChild(newChild) {
    this._newChild = this._newChild || newChild;
    this._updateList();
  }

  set items(items) {
    this._items = items;
    this._updateRepeater();
  }

  set first(first) {
    this._first = first;
    this._updateRepeater();
  }

  set num(num) {
    this._num = num;
    this._updateRepeater();
  }

  static get observedAttributes() {
    return ['num', 'first'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this[name] = Number(newVal);
    this._updateRepeater();
  }
}

customElements.define('virtual-repeater', RepeaterElement);