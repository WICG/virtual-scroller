import {html, render} from '../../../../lit-html/lib/lit-extended.js';
import {list} from '../../../lit-html/lit-list.js';
import {itemType, Sample as BaseSample} from '../contacts.js';

export class Sample extends BaseSample {
  _setUp() {
    this.template = (item, idx) => {
      const type = itemType(item);
      if (type === 'contact') {
        return html`
                    <div
                        style="padding: 10px; border-bottom: 1px solid #CCC; width: 100%; box-sizing: border-box;"
                        on-input="${e => this._updateChildSize(idx, e)}"
                    >
                        <b>#${item.index} - ${item.first} ${item.last}</b>
                        <p
                            contenteditable="true"
                            on-focus="${e => this._scrollToFocused(e)}"
                            on-blur="${
            e => this._commitChange(idx, 'longText', e.target.textContent)}"
                        >
                            ${item.longText}
                        </p>
                    </div>`;
      }
      return html`
                <div style="color: white; background: #2222DD; padding: 10px; border-bottom: 1px solid #CCC; width: 100%; box-sizing: border-box;">
                    ${item.title}
                </div>`;
    };
  }

  render() {
    const {layout, items, template, resetValue, container} = this;
    render(html`${list({layout, items, template})}`, container);
  }
}