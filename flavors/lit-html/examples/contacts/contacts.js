import {html, render} from '../../../../../../lit-html/lib/lit-extended.js';
import {list} from '../../lit-list.js';
import {Sample as BaseSample} from '../../../../examples/contacts/contacts.js';

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
            ${list({
                layout,
                items,
                template,
                resetValue
            })}
        `, document.body);
    }
}


// let template = (item, idx) =>
// html`
//     <div style="padding: 10px; border-bottom: 1px solid #CCC; width: 100%; box-sizing: border-box;">
//         <b>#${item.index}: ${item.name}</b>
//         <p>${item.longText}</p>
//     </div>
// `;

// let template = (item, idx) =>
// html`
//     <div style="padding: 10px; border-bottom: 1px solid #CCC; width: 100%; box-sizing: border-box;">
//         <img src="${item.image}" style="
//             float: right; margin 10px 20 px;
//             border-left: 8px solid purple; background: #DDD;
//             height: 73px; width: 73px;" />
//         #${item.index}: ${item.name}
//         <p>${item.longText}</p>
//     </div>
// `;

// let template = (item, idx) =>
//   html`
//     <div style="padding: 10px; border-bottom: 1px solid #CCC; position: absolute; box-sizing: border-box;">
//         ${item.name}
//     </div>
//   `;

// let template = (item, idx) => false ?
//     html`<li on-click=${() => console.log(item)}><input type="range" value="${idx}" min="0" max="999"></li>` :
//     html`<li on-click=${() => console.log(item)}>I am ${item}</li>`;

// function update() {
//     render(html`
//             ${list({
//                 layout,
//                 items,
//                 template,
//                 resetValue
//             })}
//     `, document.body);
// }
