import {html, render} from '../../../../lit-html/lib/lit-extended.js';
import {repeat} from '../../../lit-html/lit-repeater.js';
import {Sample as BaseSample} from '../basic-repeat.js';

export class Sample extends BaseSample {
    render() {
        if (!this.template) {
            this.template = (item, idx) => html`
                <li on-click=${() => console.log(item)}>${idx}: ${item}</li>
            `;
        }
        const {first, num, items} = this.state;
        const {template} = this;
        render(html`
            <ul>
                ${repeat(items, template, {first, num})}
            </ul>
        `, document.body);
    }
}