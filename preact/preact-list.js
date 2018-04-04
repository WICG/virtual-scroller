import {VirtualList} from '../virtual-list.js';

import {PreactMixin, Repeat} from './preact-repeater.js';

export class List extends Repeat {
  componentWillMount() {
    this._repeater = new PreactList();
  }

  _updateRepeater(props) {
    const {items, component, layout} = props;
    Object.assign(this._repeater, {items, component, layout});
    // this._repeater.render();
  }
}

export const PreactList = PreactMixin(VirtualList);