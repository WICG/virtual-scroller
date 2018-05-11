import {repeat} from '../../../lit-html/lit-repeater.js';
import {html, render} from '../../../node_modules/lit-html/lib/lit-extended.js';
import {Sample as BaseSample} from '../basic-repeat.js';

export class Sample extends BaseSample {
  render() {
    if (!this.template) {
      this.template = (idx) => html`
                <li on-click=${() => console.log(item)}>${idx}: ${
          this.state.items[idx]}</li>
            `;
    }
    const {first, num, items} = this.state;
    const {template} = this;
    render(
        html`
            <ul>
                ${repeat({
          first,
          num,
          totalItems: items.length,
          template
        })}
            </ul>
        `,
        document.body);
  }
}