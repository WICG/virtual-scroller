import {Repeats} from './virtual-repeater.js';

export const RepeatsAndScrolls = Superclass => class extends Repeats
(Superclass) {
  constructor(config = {}) {
    super(config);
    this._layout = config.layout;
    this._num = 0;
    this._first = -1;
    this._last = -1;
    this._prevFirst = -1;
    this._prevLast = -1;

    this._pendingUpdateView = null;
    this._isContainerVisible = false;

    // Ensure container is a positioned element.
    const position = getComputedStyle(this._container).position;
    if (!position || position === 'static') {
      this._container.style.position = 'relative';
    }
    if (typeof this._layout.updateItemSizes === 'function') {
      this._measureCallback = m => this._layout.updateItemSizes(m);
    }
    this._layout.addEventListener(
        'scrollsizechange', (event) => this._sizeContainer(event.detail));
    this._layout.addEventListener(
        'scrollerrorchange', (event) => this._correctScrollError(event.detail));
    this._layout.addEventListener(
        'itempositionchange', (event) => this._positionChildren(event.detail));
    this._layout.addEventListener(
        'rangechange', (event) => this._adjustRange(event.detail));

    // TODO: Listen on actual container
    addEventListener('scroll', () => this._scheduleUpdateView());
    addEventListener('resize', () => this._scheduleUpdateView());
    this._updateItemsCount();
    this._scheduleUpdateView();
  }

  get items() {
    return super.items;
  }

  set items(arr) {
    super.items = arr;
    this._updateItemsCount();
  }

  requestReset() {
    super.requestReset();
    this._updateItemsCount();
  }

  requestUpdateView() {
    this._scheduleUpdateView();
  }

  // Rename _ordered to _kids?
  /**
   * @protected
   */
  get _kids() {
    return this._ordered;
  }

  /**
   * @private
   */
  _updateItemsCount() {
    if (this._layout) {
      this._layout.totalItems = this._items ? this._items.length : 0;
    }
  }
  /**
   * @private
   */
  _scheduleUpdateView() {
    if (!this._pendingUpdateView) {
      this._pendingUpdateView =
          Promise.resolve().then(() => this._updateView());
      // window.requestAnimationFrame(() => this._updateView());
    }
  }
  /**
   * @private
   */
  _updateView() {
    this._pendingUpdateView = null;

    // Containers can be shadowRoots, so get the host.
    const listBounds =
        (this._container.host || this._container).getBoundingClientRect();

    // Avoid updating viewport if container is not visible.
    this._isContainerVisible = listBounds.width || listBounds.height ||
        listBounds.top || listBounds.left;
    if (!this._isContainerVisible) {
      return;
    }

    const scrollerWidth = window.innerWidth;
    const scrollerHeight = window.innerHeight;
    const xMin = Math.max(0, Math.min(scrollerWidth, listBounds.left));
    const yMin = Math.max(0, Math.min(scrollerHeight, listBounds.top));
    const xMax = Math.max(0, scrollerWidth);
    const yMax = Math.max(0, scrollerHeight);
    this._layout.viewportSize = {width: xMax - xMin, height: yMax - yMin};
    const left = Math.max(0, -listBounds.x);
    const top = Math.max(0, -listBounds.y);
    this._layout.scrollTo({top, left});
  }
  /**
   * @private
   */
  _sizeContainer(size) {
    Object.keys(size).forEach(key => {
      const prop = (key === 'width') ? 'minWidth' : 'minHeight';
      // Containers can be shadowRoots, so get the host.
      (this._container.host || this._container).style[prop] = size[key] + 'px';
    });
  }
  /**
   * @private
   */
  async _positionChildren(pos) {
    await Promise.resolve();
    const kids = this._kids;
    const maxWidth = this._layout.direction === 'horizontal' ? null : '100%';
    const maxHeight = this._layout.direction === 'vertical' ? null : '100%';
    Object.keys(pos).forEach(key => {
      const idx = key - this._first;
      const child = kids[idx];
      if (child) {
        const {top, left} = pos[key];
        // console.debug(`_positionChild #${this._container.id} > #${child.id}:
        // top ${top}`);
        child.style.position = 'absolute';
        child.style.transform = `translate3d(${left}px, ${top}px, 0)`;
        child.style.maxWidth = maxWidth;
        child.style.maxHeight = maxHeight;
      }
    });
  }
  /**
   * @private
   */
  _adjustRange(range) {
    this.num = range.num;
    this.first = range.first;
    this._incremental = !(range.stable);
    if (range.remeasure) {
      this.requestRemeasure();
    } else if (range.stable) {
      this._notifyStable();
    }
  }
  /**
   * @protected
   */
  _shouldRender() {
    return Boolean(this._isContainerVisible && super._shouldRender());
  }
  /**
   * @private
   */
  _correctScrollError(err) {
    window.scroll(window.scrollX - err.left, window.scrollY - err.top);
  }
  /**
   * @protected
   */
  _notifyStable() {
    this._container.dispatchEvent(new Event('stable'));
  }
};

export const VirtualList = RepeatsAndScrolls(class {});