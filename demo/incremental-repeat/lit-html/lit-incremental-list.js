import {html, render} from '../../../../lit-html/lib/lit-extended.js';
import {repeat} from '../../../lit-html/lit-incremental-repeater.js';

class LitIncrementalListElement extends HTMLElement {
  constructor() {
    super();
    this.style.display = 'block';
    this._chunk = 1;
    this._template = (item, idx) =>
        html`<li on-click=${() => console.log(item)}>${idx}: ${item}</li>`;
  }

  get chunk() {
    return this._chunk;
  }

  set chunk(c) {
    this._chunk = c;
    this._scheduleRender();
  }

  get items() {
    return this._items;
  }

  set items(arr) {
    this._items = arr;
    this._scheduleRender();
  }

  get template() {
    return this._template;
  }

  set template(t) {
    this._template = t;
    this._scheduleRender();
  }

  static get observedAttributes() {
    return ['chunk'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this[name] = Number(newVal);
  }

  _scheduleRender() {
    if (!this._asyncRender) {
      this._asyncRender = Promise.resolve().then(() => this.render());
    }
  }

  render() {
    this._asyncRender = null;
    const {chunk, items, template} = this;
    render(html`${repeat({items, chunk, template})}`, this);
  }
}

customElements.define('lit-incremental-list', LitIncrementalListElement);