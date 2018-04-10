export const Repeats = Superclass => class extends Superclass {
  constructor(config = {}) {
    super();
    const {
      container,
      items,
      first,
      num,
      itemKey,
      newChild,
      updateChild,
      removeChild,
    } = config;

    this._container = container;
    this._items = items;
    this._itemKeyFn = itemKey;
    this._newChildFn = newChild;
    this._updateChildFn = updateChild;
    this._removeChildFn =
        removeChild || (child => child.parentNode.removeChild(child));
    this._measureCallback = null;
    // Consider renaming this. firstVisibleIndex?
    this._first = first || 0;
    // Consider renaming this. count? visibleElements?
    this._num = num || Infinity;

    this.__incremental = false;

    // used only internally..
    // legacy from 1st approach to preact integration
    this._manageDom = true;
    // used to check if it is more perf if you don't care of dom order?
    this._maintainDomOrder = true;

    this._last = 0;
    this._prevFirst = 0;
    this._prevLast = 0;

    this._needsReset = false;
    this._pendingRender = null;

    // Contains child nodes in the rendered order.
    this._ordered = [];
    // this._pool = [];
    this._active = new Map();
    this._prevActive = new Map();
    // Both used for recycling purposes.
    this._keyToChild = new Map();
    this._childToKey = new WeakMap();

    // For debug.
    this.container._repeater = this;
    this._scheduleRender();
  }

  get container() {
    return this._container;
  }

  get first() {
    return this._first;
  }

  set first(idx) {
    if (typeof idx === 'number') {
      const len = this._items ? this._items.length : 0;
      const newFirst = Math.max(0, Math.min(idx, len - this._num));
      if (newFirst !== this._first) {
        this._first = newFirst;
        this._scheduleRender();
      }
    }
  }

  // API

  get num() {
    return this._num;
  }

  set num(n) {
    if (typeof n === 'number') {
      if (n !== this._num) {
        this._num = n;
        this.first = this._first;
        this._scheduleRender();
      }
    }
  }

  get items() {
    return this._items;
  }

  set items(arr) {
    if (arr !== this._items) {
      this._items = arr;
      this.first = this._first;
      this._needsReset = true;
      this._scheduleRender();
    }
  }

  get _incremental() {
    return this.__incremental;
  }

  set _incremental(inc) {
    if (inc !== this.__incremental) {
      this.__incremental = inc;
      this._scheduleRender();
    }
  }

  push(item) {
    this.splice(this._items.length, 0, item);
  }

  splice(start, deleteCount, ...replace) {
    if (start <= this._first + this._num &&
        (start >= this._first || start + deleteCount >= this._first ||
         start + replace.length >= this._first)) {
      this._needsReset = true;
      this._scheduleRender();
    }
    return this._items.splice(start, deleteCount, ...replace);
  }

  requestRemeasure() {
    this._needsRemeasure = true;
    this._scheduleRender();
  }

  // Core functionality

  _shouldRender() {
    return Boolean(this.items && this.container);
  }

  _scheduleRender() {
    if (!this._pendingRender && this._shouldRender()) {
      this._pendingRender = Promise.resolve().then(() => this._render());
    }
  }

  /**
   * Returns those children that are about to be displayed and that
   * require to be positioned. If reset or remeasure has been triggered,
   * all children are returned.
   * @return {{indices:Array<number>,children:Array<Element>}}
   */
  get _toMeasure() {
    return this._ordered.reduce((toMeasure, c, i) => {
      const idx = this._first + i;
      if (this._needsReset || this._needsRemeasure || idx < this._prevFirst ||
          idx > this._prevLast) {
        toMeasure.indices.push(idx);
        toMeasure.children.push(c);
      }
      return toMeasure;
    }, {indices: [], children: []});
  }

  /**
   * Measures each child bounds and builds a map of index/bounds to be passed to
   * the `_measureCallback`
   */
  async _measureChildren() {
    if (this._ordered.length > 0) {
      const {indices, children} = this._toMeasure;
      await Promise.resolve();
      const pm = await Promise.all(children.map(c => this._measureChild(c)));
      const mm = /** @type {{ number: { width: number, height: number } }} */
          (pm.reduce((out, cur, i) => {
            out[indices[i]] = cur;
            return out;
          }, {}));
      this._measureCallback(mm);
    }
  }

  _render() {
    // 1. create DOM
    // 2. measure DOM
    // 3. recycle DOM
    const rangeChanged =
        this._first !== this._prevFirst || this._num !== this._prevNum;
    if (rangeChanged || this._needsReset) {
      this._last = this._first +
          Math.min(this._num, this._items.length - this._first) - 1;
      if (this._num || this._prevNum) {
        if (this._needsReset) {
          this._reset(this._first, this._last);
        } else {
          this._discardHead();
          this._discardTail();
          this._addHead();
          this._addTail();
        }
      }
    }
    const shouldMeasure = this._num > 0 && this._measureCallback &&
        (rangeChanged || this._needsRemeasure || this._needsReset);
    // console.debug(`#${this.container.id} _render: ${this._num}/${
    //     this.items.length} ${this._first} -> ${this._last}
    //     (${this._prevNum}/${this.items.length} ${this._prevFirst} ->
    //     ${this._prevLast}) measure=${shouldMeasure}`);
    if (shouldMeasure) {
      this._measureChildren();
    }

    // Cleanup
    if (!this._incremental) {
      this._prevActive.forEach((idx, child) => this._unassignChild(child, idx));
      this._prevActive.clear();
    }

    this._prevFirst = this._first;
    this._prevLast = this._last;
    this._prevNum = this._num;
    this._needsReset = false;
    this._needsRemeasure = false;
    this._pendingRender = null;
  }

  _discardHead() {
    const o = this._ordered;
    for (let idx = this._prevFirst; o.length && idx < this._first; idx++) {
      this._unassignChild(o.shift(), idx);
    }
  }

  _discardTail() {
    const o = this._ordered;
    for (let idx = this._prevLast; o.length && idx > this._last; idx--) {
      this._unassignChild(o.pop(), idx);
    }
  }

  _addHead() {
    const start = this._first;
    const end = Math.min(this._last, this._prevFirst - 1);
    for (let idx = end; idx >= start; idx--) {
      const child = this._assignChild(idx);
      const item = this._items[idx];
      if (this._manageDom) {
        if (this._maintainDomOrder || !this._childIsAttached(child)) {
          this._insertBefore(child, this._firstChild);
        }
      }
      this._updateChild(child, item, idx);
      this._ordered.unshift(child);
    }
  }

  _addTail() {
    const start = Math.max(this._first, this._prevLast + 1);
    const end = this._last;
    for (let idx = start; idx <= end; idx++) {
      const child = this._assignChild(idx);
      const item = this._items[idx];
      if (this._manageDom) {
        if (this._maintainDomOrder || !this._childIsAttached(child)) {
          this._insertBefore(child, null);
        }
      }
      this._updateChild(child, item, idx);
      this._ordered.push(child);
    }
  }

  _reset(first, last) {
    const len = last - first + 1;
    // Explain why swap prevActive with active - affects _assignChild.
    const prevActive = this._active;
    this._active = this._prevActive;
    this._prevActive = prevActive;
    let currentMarker = this._manageDom && this._firstChild;
    this._ordered.length = 0;
    for (let n = 0; n < len; n++) {
      const idx = first + n;
      const item = this._items[idx];
      const child = this._assignChild(idx);
      this._ordered.push(child);
      if (this._manageDom) {
        if (currentMarker && this._maintainDomOrder) {
          if (currentMarker === this._node(child)) {
            currentMarker = this._nextSibling(child);
          } else {
            this._insertBefore(child, currentMarker);
          }
        } else if (!this._childIsAttached(child)) {
          this._insertBefore(child, null);
        }
      }
      this._updateChild(child, item, idx);
    }
  }

  _assignChild(idx) {
    const item = this._items[idx];
    const key = this._itemKeyFn ? this._itemKeyFn(item) : idx;
    let child;
    if (child = this._keyToChild.get(key)) {
      this._prevActive.delete(child);
    } else {
      child = this._newChild(item, idx);
      this._keyToChild.set(key, child);
      this._childToKey.set(child, key);
    }
    this._showChild(child);
    this._active.set(child, idx);
    return child;
  }

  _unassignChild(child, idx) {
    this._hideChild(child);
    if (this._incremental) {
      this._active.delete(child);
      this._prevActive.set(child, idx);
    } else {
      const key = this._childToKey.get(child);
      this._childToKey.delete(child);
      this._keyToChild.delete(key);
      this._active.delete(child);
      this._removeChild(child, this._items[idx], idx);
    }
  }

  // TODO: Is this the right name?
  get _firstChild() {
    return this._ordered.length ? this._node(this._ordered[0]) : null;
  }

  // Overridable abstractions for child manipulation

  _node(child) {
    return child;
  }

  _nextSibling(child) {
    return child.nextSibling;
  }

  _insertBefore(child, referenceNode) {
    this.container.insertBefore(child, referenceNode);
  }

  _childIsAttached(child) {
    return child.parentNode === this.container;
  }

  _hideChild(child) {
    child.style.display = 'none';
  }

  _showChild(child) {
    child.style.display = null;
  }

  /**
   *
   * @param {!Element} child
   * @return {{width: number, height: number, marginTop: number, marginBottom: number, marginLeft: number, marginRight: number}} childMeasures
   */
  _measureChild(child) {
    // offsetWidth doesn't take transforms in consideration,
    // so we use getBoundingClientRect which does.
    const {width, height} = child.getBoundingClientRect();
    // console.debug(`_measureChild #${this.container.id} > #${
    //     child.id}: height: ${height}px`);
    return Object.assign(
        {
          width,
          height,
        },
        getMargins(child));
  }

  _newChild(item, idx) {
    return this._newChildFn(item, idx);
  }

  _updateChild(child, item, idx) {
    if (this._updateChildFn) {
      this._updateChildFn(child, item, idx);
    }
  }

  _removeChild(child, item, idx) {
    this._removeChildFn(child, item, idx);
  }
}

function getMargins(el) {
  const style = window.getComputedStyle(el);
  // console.log(el.id, style.position);
  return {
    marginLeft: getMarginValue(style.marginLeft),
    marginRight: getMarginValue(style.marginRight),
    marginTop: getMarginValue(style.marginTop),
    marginBottom: getMarginValue(style.marginBottom),
  };
}

function getMarginValue(value) {
  value = value ? parseFloat(value) : NaN;
  return value !== value ? 0 : value;
}

export const VirtualRepeater = Repeats(class {});