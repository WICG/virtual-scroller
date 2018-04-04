import {IncrementalRepeats} from '../../incremental-repeater.js';

class IncrementalListElement extends IncrementalRepeats
(HTMLElement) {
  connectedCallback() {
    this.container = this;
    this.newChildFn = this.getNewChild.bind(this);
    this.updateChildFn = this.updateChild.bind(this);
    // Wait for distribution.
    Promise.resolve().then(() => {
      this._template =
          this.querySelector('template').content.querySelector('*');
    });
  }

  getNewChild() {
    return this._template.cloneNode(true);
  }

  updateChild(child, item, idx) {
    child.querySelector('.idx').textContent = idx;
    child.querySelector('.value').textContent = item;
    child.onclick = () => console.log(item)
  }

  static get observedAttributes() {
    return ['chunk'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this[name] = Number(newVal);
  }
}

customElements.define('incremental-list', IncrementalListElement);