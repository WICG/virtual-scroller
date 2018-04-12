import '../../virtual-list-element.js';
import {VirtualRepeater} from '../../virtual-repeater.js';

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