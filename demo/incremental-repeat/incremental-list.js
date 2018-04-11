import {IncrementalRepeater} from '../../incremental-repeater.js';

class IncrementalListElement extends HTMLElement {
  connectedCallback() {
    this._updateRepeater();
  }

  static get observedAttributes() {
    return ['chunk'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this[name] = Number(newVal);
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
}

customElements.define('incremental-list', IncrementalListElement);