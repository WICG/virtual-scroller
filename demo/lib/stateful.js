export const Stateful = Superclass => class extends Superclass {
  constructor() {
    super();

    this._pendingStateUpdates = [];
    if (!this.state) {
      this.state = {};
    }
    this._mergeState = (function(update) {
                         Object.assign(this.state, update(this.state));
                       }).bind(this);
  }

  setState(update) {
    let fn;
    if (typeof update === 'object') {
      fn = (prevState) => update;
    } else if (typeof update === 'function') {
      fn = update;
    }

    if (fn) {
      this._pendingStateUpdates.push(fn);
      if (this._pendingStateUpdates.length === 1) {
        Promise.resolve().then(() => this._updateState());
      }
    }
  }

  _updateState() {
    this._pendingStateUpdates.forEach(this._mergeState);
    this._pendingStateUpdates.length = 0;
    if (typeof this.render === 'function') {
      this.render();
    }
  }
}