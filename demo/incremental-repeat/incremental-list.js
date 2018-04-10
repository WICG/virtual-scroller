import {IncrementalRepeats} from '../../incremental-repeater.js';

class IncrementalListElement extends IncrementalRepeats
(HTMLElement) {
  get _container() {
    return super._container;
  }

  set _container(_) {
    super._container = this;
  }

  _newChild(item, idx) {
    this._template = this._template ||
        this.querySelector('template').content.querySelector('*');
    const child = this._template.cloneNode(true);
    child.querySelector('.idx').textContent = idx;
    child.querySelector('.value').textContent = item;
    child.onclick = () => console.log(item);
    return child;
  }

  static get observedAttributes() {
    return ['chunk'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this[name] = Number(newVal);
  }
}

customElements.define('incremental-list', IncrementalListElement);