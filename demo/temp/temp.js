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

  static get observedAttributes() {
    return ['direction'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this[name] = newVal;
  }

  set template(template) {
    if (!this._template) {
      this._template = template;
      this._updateList();
    }
  }

  set direction(dir) {
    this._direction = dir;
    this._updateList();
  }

  set items(items) {
    this._items = items;
    this._updateList();
  }

  _updateList() {
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
      this._layout = new Layout();
      this._layout._overhang = 800;
      this._layout._itemSize.y = 1000000;
      this._list = new VirtualList({
        container: this,
        layout: this._layout,
        newChild,
        updateChild,
        recycleChild,
      });
      this._layout._list = this._list;
    }
    this._list.items = this._items;
    this._layout.direction = this._direction;
  }
}

customElements.define('virtual-list', ListElement);

class RepeaterElement extends HTMLElement {
  static get observedAttributes() {
    return ['num', 'first'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this[name] = Number(newVal);
  }

  set template(template) {
    if (!this._template) {
      this._template = template;
      this._updateRepeater();
    }
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

  _updateRepeater() {
    if (!this._template) {
      return;
    }
    if (!this._repeater) {
      const {newChild, updateChild, recycleChild} = this._template;
      this._repeater = new VirtualRepeater({
        container: this,
        newChild,
        updateChild,
        recycleChild,
      });
    }
    this._repeater.first = this._first;
    this._repeater.num = this._num;
    this._repeater.items = this._items;
  }
}

customElements.define('virtual-repeater', RepeaterElement);