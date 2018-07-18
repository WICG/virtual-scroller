import {scroller} from '../../../lit-html/lit-scroller.js';
import {html, render} from '../../../node_modules/lit-html/lib/lit-extended.js';
import {getDims, getUrl, Sample as BaseSample} from '../photos.js';

export class Sample extends BaseSample {
  _setUp() {
    this.template = (idx) => {
      const item = this.items[idx];
      const dim = getDims(item, this.constraint);
      return html`
                <lazy-image src="${
          getUrl(item)}" style="position: absolute; height: ${
          dim.height}px; width: ${dim.width}px; background: ${
          (idx % 2) ? '#DDD' : '#CCC'};">
                    <h2 style="color: white; position: absolute; bottom: 0; width: 100%; marign: 0; padding: 0 1em; box-sizing: border-box; text-align: center; font-family: sans-serif; text-shadow: rgba(0, 0, 0, 0.5) 2px 2px;">${
          item.title}</h2>
                </lazy-image>
          `;
    }
  }

  render() {
    const {items, layout, template} = this;
    render(
        html`${scroller({totalItems: items.length, layout, template})}`,
        document.body);
  }
}