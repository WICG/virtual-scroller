import {repeat} from '../../lit-incremental-repeater.js';
import {html, render} from '../../../../../../lit-html/lib/lit-extended.js';

class LitIncrementalListElement extends HTMLElement {

    constructor() {
        super();
        this.style.display = 'block';
        this.chunk = 1;
        this.template = (item, idx) =>
            html`<li on-click=${() => console.log(item)}>${idx}: ${item}</li>`;
    }

    get items() {
        return this._items;
    }

    set items(arr) {
        this._items = arr;
        this._scheduleRender();
    }

    static get observedAttributes() {
        return ['chunk'];
    }

    attributeChangedCallback(name, oldVal, newVal) {
        this[name] = Number(newVal);
        this._scheduleRender();
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