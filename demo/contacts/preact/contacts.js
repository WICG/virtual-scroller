import {h, render} from '../../../../preact/dist/preact.esm.js';
import {List} from '../../../preact/preact-list.js';
import {Sample as BaseSample, itemType} from '../contacts.js';

export class Sample extends BaseSample {
    _setUp() {
        const sample = this;
        this.container = null;
        this.component = function() {
            const {item, idx} = this.props;
            if (!item) return;

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
                        onInput: e => sample._updateChildSize(idx, e),
                    },
                    h('b', null, `#${item.index} - ${item.first} ${item.last}`),
                    h('p', {
                        contentEditable: true,
                        onFocus: e => sample._scrollToFocused(e),
                        onBlur: e => sample._commitChange(idx, 'longText', e.target.textContent)
                    }, item.longText)
                );
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
                item.title
            );
        }
    }

    async load(data) {
        await super.load(data);
        document.body.style.minHeight = null;
    }

    render() {
        const {layout, items, component, resetValue} = this;
        render(
            h(List, {layout, items, component, resetValue, ref: n => this.container = n.base}),
            document.body,
            this.container
        );
    }
}