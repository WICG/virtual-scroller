import {html, render} from '../../../../lit-html/lib/lit-extended.js';
import {list} from '../../../lit-html/lit-list.js';
import {Sample as BaseSample} from '../contacts.js';

export class Sample extends BaseSample {
    _setUp() {
        this.template = (item, idx) => html`
            <div
                style="padding: 10px; border-bottom: 1px solid #CCC; width: 100%; box-sizing: border-box;"
                on-input="${e => this._updateChildSize(idx, e)}"
            >
                <b>#${item.index} - ${item.name}</b>
                <p
                    contenteditable="true"
                    on-focus="${e => this._scrollToFocused(e)}"
                    on-blur="${e => this._commitChange(idx, 'longText', e.target.textContent)}"
                >
                    <span>${item.longText}</span>
                </p>
            </div>
        `;
    }

    render() {
        const {layout, items, template, resetValue} = this;
        render(html`
            ${list(items, template, {
                layout,
                resetValue
            })}
        `, document.body);
    }
}