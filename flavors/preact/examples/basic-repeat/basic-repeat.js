import {h, render, Component} from '../../../../../../preact/dist/preact.esm.js';
import {Repeat} from '../../preact-repeater.js';
import {RepeaterControl} from '../../../../examples/basic-repeat/basic-repeat.js';

export const Sample = RepeaterControl(class extends Component {
    constructor() {
        super();

        this.state = {
            component: function() { return h('li', null, `${this.props.idx}: ${this.props.item}`); },
            wrapper: 'ul'
        }
    }

    render() {
        const {items, first, num, component, wrapper} = this.state;
        return h(Repeat, {items, first, num, component, wrapper});
    }
});