export const Repeats = Superclass => class extends Superclass {
  constructor(config) {
    super();

    this._createElementFn = null;
    this._updateElementFn = null;
    this._recycleElementFn = null;
    this._elementKeyFn = null;

    this._measureCallback = null;

    this._totalItems = 0;
    // Consider renaming this. firstVisibleIndex?
    this._first = 0;
    // Consider renaming this. count? visibleElements?
    this._num = Infinity;

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
    this._needsRemeasure = false;
    this._pendingRender = null;

    // Contains child nodes in the rendered order.
    this._ordered = [];
    // this._pool = [];
    this._active = new Map();
    this._prevActive = new Map();
    // Both used for recycling purposes.
    this._keyToChild = new Map();
    this._childToKey = new WeakMap();
    // Used to keep track of measures by index.
    this._indexToMeasure = {};
    // Used to debounce _measureChildren calls.
    this._measuringId = -1;

    if (config) {
      Object.assign(this, config);
    }
  }

  // API

  get container() {
    return this._container;
  }
  set container(container) {
    if (container === this._container) {
      return;
    }
    if (this._container) {
      // Remove children from old container.
      this._ordered.forEach((child) => this._removeChild(child));
    }

    this._container = container;

    if (container) {
      // Insert children in new container.
      this._ordered.forEach((child) => this._insertBefore(child, null));
    } else {
      this._ordered.length = 0;
      this._active.clear();
      this._prevActive.clear();
    }
    this.requestReset();
  }

  get createElement() {
    return this._createElementFn;
  }
  set createElement(fn) {
    if (fn !== this._createElementFn) {
      this._createElementFn = fn;
      this._keyToChild.clear();
      this.requestReset();
    }
  }

  get updateElement() {
    return this._updateElementFn;
  }
  set updateElement(fn) {
    if (fn !== this._updateElementFn) {
      this._updateElementFn = fn;
      this.requestReset();
    }
  }

  get recycleElement() {
    return this._recycleElementFn;
  }
  set recycleElement(fn) {
    if (fn !== this._recycleElementFn) {
      this._recycleElementFn = fn;
      this.requestReset();
    }
  }

  get elementKey() {
    return this._elementKeyFn;
  }
  set elementKey(fn) {
    if (fn !== this._elementKeyFn) {
      this._elementKeyFn = fn;
      this._keyToChild.clear();
      this.requestReset();
    }
  }

  get first() {
    return this._first;
  }

  set first(idx) {
    if (typeof idx === 'number') {
      const newFirst = Math.max(0, Math.min(idx, this._totalItems - this._num));
      if (newFirst !== this._first) {
        this._first = newFirst;
        this._scheduleRender();
      }
    }
  }

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

  get totalItems() {
    return this._totalItems;
  }

  set totalItems(num) {
    // TODO(valdrin) should we check if it is a finite number?
    // Technically, Infinity would break Layout, not VirtualRepeater.
    if (typeof num === 'number' && num !== this._totalItems) {
      this._totalItems = num;
      this.first = this._first;
      this.requestReset();
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

  requestReset() {
    this._needsReset = true;
    this._scheduleRender();
  }

  requestRemeasure() {
    this._needsRemeasure = true;
    this._scheduleRender();
  }

  // Core functionality

  /**
   * @protected
   */
  _shouldRender() {
    return Boolean(this.container && this.createElement);
  }

  /**
   * @private
   */
  _scheduleRender() {
    if (!this._pendingRender) {
      this._pendingRender = requestAnimationFrame(() => {
        this._pendingRender = null;
        if (this._shouldRender()) {
          this._render();
        }
      });
    }
  }

  /**
   * Returns those children that are about to be displayed and that
   * require to be positioned. If reset or remeasure has been triggered,
   * all children are returned.
   * @return {{indices:Array<number>,children:Array<Element>}}
   * @private
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
   * @private
   */
  _measureChildren({indices, children}) {
    let pm = children.map(
        (c, i) => this._indexToMeasure[indices[i]] || this._measureChild(c));
    const mm = /** @type {{ number: { width: number, height: number } }} */
        (pm.reduce((out, cur, i) => {
          out[indices[i]] = this._indexToMeasure[indices[i]] = cur;
          return out;
        }, {}));
    this._measureCallback(mm);
  }

  /**
   * @protected
   */
  _render() {
    const rangeChanged =
        this._first !== this._prevFirst || this._num !== this._prevNum;
    // Create/update/recycle DOM.
    if (rangeChanged || this._needsReset) {
      this._last =
          this._first + Math.min(this._num, this._totalItems - this._first) - 1;
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
    if (this._needsRemeasure || this._needsReset) {
      this._indexToMeasure = {};
    }
    // Retrieve DOM to be measured.
    // Do it right before cleanup and reset of properties.
    const shouldMeasure = this._num > 0 && this._measureCallback &&
        (rangeChanged || this._needsRemeasure || this._needsReset);
    const toMeasure = shouldMeasure ? this._toMeasure : null;

    // Cleanup.
    if (!this._incremental) {
      this._prevActive.forEach((idx, child) => this._unassignChild(child, idx));
      this._prevActive.clear();
    }
    // Reset internal properties.
    this._prevFirst = this._first;
    this._prevLast = this._last;
    this._prevNum = this._num;
    this._needsReset = false;
    this._needsRemeasure = false;

    // Notify render completed.
    this._didRender();
    // Measure DOM.
    if (toMeasure) {
      this._measureChildren(toMeasure);
    }
  }

  /**
   * Invoked after DOM is updated, and before it gets measured.
   * @protected
   */
  _didRender() {
  }

  /**
   * @private
   */
  _discardHead() {
    const o = this._ordered;
    for (let idx = this._prevFirst; o.length && idx < this._first; idx++) {
      this._unassignChild(o.shift(), idx);
    }
  }

  /**
   * @private
   */
  _discardTail() {
    const o = this._ordered;
    for (let idx = this._prevLast; o.length && idx > this._last; idx--) {
      this._unassignChild(o.pop(), idx);
    }
  }

  /**
   * @private
   */
  _addHead() {
    const start = this._first;
    const end = Math.min(this._last, this._prevFirst - 1);
    for (let idx = end; idx >= start; idx--) {
      const child = this._assignChild(idx);
      if (this._manageDom) {
        if (this._maintainDomOrder || !this._childIsAttached(child)) {
          this._insertBefore(child, this._firstChild);
        }
      }
      if (this.updateElement) {
        this.updateElement(child, idx);
      }
      this._ordered.unshift(child);
    }
  }

  /**
   * @private
   */
  _addTail() {
    const start = Math.max(this._first, this._prevLast + 1);
    const end = this._last;
    for (let idx = start; idx <= end; idx++) {
      const child = this._assignChild(idx);
      if (this._manageDom) {
        if (this._maintainDomOrder || !this._childIsAttached(child)) {
          this._insertBefore(child, null);
        }
      }
      if (this.updateElement) {
        this.updateElement(child, idx);
      }
      this._ordered.push(child);
    }
  }

  /**
   * @param {number} first
   * @param {number} last
   * @private
   */
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
      if (this.updateElement) {
        this.updateElement(child, idx);
      }
    }
  }

  /**
   * @param {number} idx
   * @private
   */
  _assignChild(idx) {
    const key = this.elementKey ? this.elementKey(idx) : idx;
    let child;
    if (child = this._keyToChild.get(key)) {
      this._prevActive.delete(child);
    } else {
      child = this.createElement(idx);
      this._keyToChild.set(key, child);
      this._childToKey.set(child, key);
    }
    this._showChild(child);
    this._active.set(child, idx);
    return child;
  }

  /**
   * @param {*} child
   * @param {number} idx
   * @private
   */
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
      if (this.recycleElement) {
        this.recycleElement(child, idx);
      } else if (this._node(child).parentNode) {
        this._removeChild(child);
      }
    }
  }

  // TODO: Is this the right name?
  /**
   * @private
   */
  get _firstChild() {
    return this._ordered.length && this._childIsAttached(this._ordered[0]) ?
        this._node(this._ordered[0]) :
        null;
  }

  // Overridable abstractions for child manipulation
  /**
   * @protected
   */
  _node(child) {
    return child;
  }
  /**
   * @protected
   */
  _nextSibling(child) {
    return child.nextSibling;
  }
  /**
   * @protected
   */
  _insertBefore(child, referenceNode) {
    this._container.insertBefore(child, referenceNode);
  }
  /**
   * @protected
   */
  _childIsAttached(child) {
    const node = this._node(child);
    return node && node.parentNode === this._container;
  }
  /**
   * @protected
   */
  _hideChild(child) {
    if (child.style) {
      child.style.display = 'none';
    }
  }
  /**
   * @protected
   */
  _showChild(child) {
    if (child.style) {
      child.style.display = null;
    }
  }

  /**
   *
   * @param {!Element} child
   * @return {{width: number, height: number, marginTop: number, marginBottom: number, marginLeft: number, marginRight: number}} childMeasures
   * @protected
   */
  _measureChild(child) {
    // offsetWidth doesn't take transforms in consideration,
    // so we use getBoundingClientRect which does.
    const {width, height} = child.getBoundingClientRect();
    // console.debug(`_measureChild #${this._container.id} > #${
    //     child.id}: height: ${height}px`);
    return Object.assign({width, height}, getMargins(child));
  }

  /**
   * Remove child.
   * Override to control child removal.
   *
   * @param {*} child
   * @protected
   */
  _removeChild(child) {
    child.parentNode.removeChild(child);
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