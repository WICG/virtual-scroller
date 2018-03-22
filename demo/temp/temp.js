import {Repeats} from '../../virtual-repeater.js';
import {RepeatsAndScrolls} from '../../virtual-list.js';
import Layout from '../../layouts/layout-1d.js';

class ListElement extends RepeatsAndScrolls(HTMLElement) {

    connectedCallback() {
        this.container = this;
        this.layout = new Layout();

        this._layout._overhang = 800;
        this._layout._list = this;
        this._layout._itemSize.y = 1000000;

        this.style.display = 'block';
        this.style.position = 'relative';
        this.style.contain = 'strict';
    }
}

customElements.define('virtual-list', ListElement);

class RepeaterElement extends Repeats(HTMLElement) {
    
    connectedCallback() {
        this.container = this;
    }

    static get observedAttributes() {
        return ['num', 'first'];
    }

    attributeChangedCallback(name, oldVal, newVal) {
        this[name] = Number(newVal);
    }
}

customElements.define('virtual-repeater', RepeaterElement);