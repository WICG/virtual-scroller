import {h, render} from '../../../node_modules/preact/dist/preact.mjs';
import {Scroller} from '../../../preact/preact-scroller.js';
import {itemType, Sample as BaseSample} from '../contacts.js';

export class Sample extends BaseSample {
  _setUp() {
    const sample = this;
    this.container = null;
    this.component = function() {
      const {idx} = this.props;
      const item = sample.items[idx];
      if (!item)
        return;

      const type = itemType(item);
      if (type === 'contact') {
        return h(
            'div',
            {
              style: {
                padding: '10px',
                borderBottom: '1px solid #CCC',
                width: '100%',
                boxSizing: 'border-box'
              },
            },
            h('b', null, `#${item.index} - ${item.first} ${item.last}`),
            h('p',
              {
                contentEditable: true,
                onFocus: e => sample._scrollToFocused(e),
                onBlur: e =>
                    sample._commitChange(idx, 'longText', e.target.textContent)
              },
              item.longText));
      }
      return h(
          'div',
          {
            style: {
              color: 'white',
              background: '#2222DD',
              padding: '10px',
              borderBottom: '1px solid #CCC',
              width: '100%',
              boxSizing: 'border-box'
            }
          },
          item.title);
    }
  }

  async load(data) {
    await super.load(data);
    document.body.style.minHeight = null;
  }

  render() {
    const {layout, items, component, resetValue} = this;
    render(
        h(Scroller, {
          layout,
          totalItems: items.length,
          component,
          resetValue,
          ref: n => this.container = n.base
        }),
        document.body,
        this.container);
  }
}