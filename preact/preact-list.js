import {VirtualList} from '../virtual-list.js';

import {PreactMixin, Repeat} from './preact-repeater.js';

export class List extends Repeat {
  componentDidMount() {
    this._repeater = new PreactList({
      container: this._wrapper.base,
      component: this.props.component,
      layout: this.props.layout
    });
    this._updateRepeater(this.props);
  }

  _updateRepeater(props) {
    this._repeater.size = props.size;
  }
}

export const PreactList = PreactMixin(VirtualList);