import {html, render} from '../../../../lit-html/lib/lit-extended.js';
import {list} from '../../../lit-html/lit-list.js';
import {Sample as BaseSample, getDims, getUrl} from '../photos.js';

export class Sample extends BaseSample {
    _setUp() {
        this.template = (item, idx) => {
            const dim = getDims(item, this.constraint);
            return html`
                <lazy-image src="${getUrl(item)}" style="position: absolute; height: ${dim.height}px; width: ${dim.width}px; background: ${(idx % 2) ? '#DDD' : '#CCC'};">
                    <h2 style="color: white; position: absolute; bottom: 0; width: 100%; marign: 0; padding: 0 1em; box-sizing: border-box; text-align: center; font-family: sans-serif; text-shadow: rgba(0, 0, 0, 0.5) 2px 2px;">${item.title}</h2>
                </lazy-image>
          `;
        }        
    }

    render() {
        render(html`
                ${list(this)}
        `, document.body);
    }
}