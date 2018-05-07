import {list} from '../../../lit-html/lit-list.js';
import {html, render} from '../../../node_modules/lit-html/lib/lit-extended.js';
import {itemType, Sample as BaseSample, strip} from '../contacts.js';

export class Sample extends BaseSample {
  _setUp() {
    this.template = (item, idx) => {
      const type = itemType(item);
      if (type === 'contact') {
        return html`
                    <div
                        style="padding: 10px; border-bottom: 1px solid #CCC; width: 100%; box-sizing: border-box;"
                        on-input="${e => this._updateItemSize(idx, e)}"
                    >
                        <b>#${item.index} - ${item.first} ${item.last}</b>
                        <p
                            contenteditable="true"
                            on-focus="${e => this._scrollToFocused(e)}"
                            on-blur="${
            e => this._commitChange(idx, 'longText', e.target)}"
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

  _commitChange(idx, prop, el) {
    if (idx === -1)
      return;
    // Restore old value, lit-html will handle the update
    // https://github.com/Polymer/lit-html/issues/316
    const newVal = strip(el.textContent);
    const prevVal = strip(this.items[idx][prop]);
    el.textContent = prevVal;
    super._commitChange(idx, prop, newVal);
  }

  render() {
    const {layout, items, template, container} = this;
    render(html`${list({layout, items, template})}`, container);
  }
}