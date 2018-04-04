import {h, render} from '../../../../preact/dist/preact.esm.js';
import {List} from '../../../preact/preact-list.js';
import {getDims, getUrl, Sample as BaseSample} from '../photos.js';

export class Sample extends BaseSample {
  _setUp() {
    const sample = this;
    this.component = function() {
      const {item, idx} = this.props;
      if (item) {
        const dim = getDims(item, sample.constraint);
        return h(
            'lazy-image',
            {
              src: getUrl(item),
              style: {
                position: 'absolute',
                height: `${dim.height}px`,
                width: `${dim.width}px`,
                background: idx % 2 ? '#DDD' : '#CCC'
              }
            },
            h('h2',
              {
                style: {
                  color: 'white',
                  position: 'absolute',
                  bottom: 0,
                  width: '100%',
                  marign: 0,
                  padding: '0 1em',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  fontFamily: 'sans-serif',
                  textShadow: 'rgba(0, 0, 0, 0.5) 2px 2px'
                }
              },
              item.title));
      }
    }
  }

  render() {
    const {layout, items, component, resetValue, _root} = this;
    render(
        h(List, {
          layout,
          items,
          component,
          resetValue,
          ref: c => this._root = c.base
        }),
        document.body,
        _root);
  }
}
