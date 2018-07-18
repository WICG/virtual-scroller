import {VirtualScroller} from '../virtual-scroller.mjs';

import {PreactMixin, Repeat} from './preact-repeater.mjs';

export class Scroller extends Repeat {
  componentDidMount() {
    this._repeater = new PreactScroller({
      container: this._wrapper.base,
      component: this.props.component,
      layout: this.props.layout
    });
    this._updateRepeater(this.props);
  }

  _updateRepeater(props) {
    this._repeater.totalItems = props.totalItems;
  }
}

export const PreactScroller = PreactMixin(VirtualScroller);