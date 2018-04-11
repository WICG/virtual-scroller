import {IncrementalRepeater} from '../../incremental-repeater.js';

class IncrementalListElement extends HTMLElement {
  connectedCallback() {
    this._updateRepeater();
  }

  set items(items) {
    this._items = items;
    this._updateRepeater();
  }

  set chunk(c) {
    this._chunk = c;
    this._updateRepeater();
  }

  _updateRepeater() {
    if (!this._repeater && !this.isConnected) {
      return;
    }
    this._template = this._template ||
        this.querySelector('template').content.querySelector('*');
    if (!this._template) {
      return;
    }
    if (!this._repeater) {
      this._repeater = new IncrementalRepeater({
        container: this,
        newChild: (item, idx) => {
          const child = this._template.cloneNode(true);
          child.querySelector('.idx').textContent = idx;
          child.querySelector('.value').textContent = item;
          child.onclick = () => console.log(item);
          return child;
        }
      });
    }
    this._repeater.chunk = this._chunk;
    this._repeater.items = this._items;
  }

  static get observedAttributes() {
    return ['chunk'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this[name] = Number(newVal);
  }
}

customElements.define('incremental-list', IncrementalListElement);