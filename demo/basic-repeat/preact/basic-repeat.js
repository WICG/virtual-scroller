import {Component, h, render} from '../../../node_modules/preact/dist/preact.esm.js';
import {Repeat} from '../../../preact/preact-repeater.js';
import {RepeaterControl} from '../basic-repeat.js';

export const Sample = RepeaterControl(class extends Component {
  constructor() {
    super();

    const state = {
      component: function() {
        const idx = this.props.idx;
        const item = state.items[idx];
        return h('li', null, `${idx}: ${item}`);
      },
      wrapper: 'ul'
    };
    this.state = state;
  }

  render() {
    const {items, first, num, component, wrapper} = this.state;
    return h(Repeat, {totalItems: items.length, first, num, component, wrapper});
  }
});