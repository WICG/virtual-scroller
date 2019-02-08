import {scroller} from '../../../lit-html/lit-scroller.mjs';
import {html, render} from '../../../node_modules/lit-html/lit-html.js';
import {itemType, Sample as BaseSample} from '../contacts.mjs';

export class Sample extends BaseSample {
  _setUp() {
    this.template = (idx) => {
      const item = this.items[idx];
      const type = itemType(item);
      if (type === 'contact') {
        // NOTE(valdrin): don't add spaces in `<p contenteditable>` so
        // lit-html can place its delimiter comments
        // https://github.com/Polymer/lit-html/issues/316
        return html`
                    <div
                        style="padding: 10px; border-bottom: 1px solid #CCC; width: 100%; box-sizing: border-box;"
                    >
                        <b>#${item.index} - ${item.first} ${item.last}</b>
                        <p
                            contenteditable
                            on-focus="${e => this._scrollToFocused(e)}"
                            on-blur="${
            e => this._commitChange(idx, 'longText', e.target)}"
                        >${item.longText}</p>
                    </div>`;
      }
      return html`
                <div style="color: white; background: #2222DD; padding: 10px; border-bottom: 1px solid #CCC; width: 100%; box-sizing: border-box;">
                    ${item.title}
                </div>`;
    };
  }

  _scrollToFocused(event) {
    // When user deletes all the content and then writes, the new content goes
    // as the first child. Likewise when the user hits the Return key, new
    // content is wrapped in a <div>.
    // We save lit-html markers so we can ensure they're at the
    // right place when the edits are finished.
    const el = event.target;
    el._startMarker = el.firstChild;
    el._endMarker = el.lastChild;
    super._scrollToFocused(event);
  }

  _commitChange(idx, prop, el) {
    // Ensure lit-html markers are always at the right place.
    el.insertBefore(el._startMarker, el.firstChild);
    el.appendChild(el._endMarker);
    super._commitChange(idx, prop, el.textContent);
  }

  render() {
    const {layout, items, template, container} = this;
    render(
        html`${scroller({layout, totalItems: items.length, template})}`,
        container);
  }
}
