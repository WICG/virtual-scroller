import {h, render} from '../../../node_modules/preact/dist/preact.esm.js';
import {Scroller} from '../../../preact/preact-scroller.js';
import {getDims, getUrl, Sample as BaseSample} from '../photos.js';

export class Sample extends BaseSample {
  _setUp() {
    const sample = this;
    this.component = function() {
      const {idx} = this.props;
      const item = sample.items[idx];
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
        h(Scroller, {
          layout,
          totalItems: items.length,
          component,
          resetValue,
          ref: c => {
            this._root = c.base;
            // preact-list wraps the rendered content in a div while the
            // sizing styles are applied to body by BaseSample, so
            // we copy the body styles to _root.
            this._root.setAttribute(
                'style', document.body.getAttribute('style'));
            document.body.removeAttribute('style');
          }
        }),
        document.body,
        _root);
  }
}
