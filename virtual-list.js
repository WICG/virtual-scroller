import {Repeats} from './virtual-repeater.js';

export const RepeatsAndScrolls = Superclass => class extends Repeats
(Superclass) {
  constructor(config = {}) {
    super(config);
    this._num = 0;
    this._first = -1;
    this._last = -1;
    this._prevFirst = -1;
    this._prevLast = -1;

    this._pendingUpdateView = null;
    this._isContainerVisible = false;

    this._handleLayoutEvent = this._handleLayoutEvent.bind(this);
    this._scheduleUpdateView = this._scheduleUpdateView.bind(this);

    // Ensure container is a positioned element.
    const position = getComputedStyle(this._container).position;
    if (!position || position === 'static') {
      this._container.style.position = 'relative';
    }
    // Finally, set layout.
    if (config.layout) {
      this.layout = config.layout;
    }
  }

  get layout() {
    return this._layout;
  }

  set layout(layout) {
    if (layout === this._layout) {
      return;
    }
    const prevLayout = this._layout;

    if (prevLayout) {
      this._measureCallback = null;
      prevLayout.removeEventListener(
          'scrollsizechange', this._handleLayoutEvent);
      prevLayout.removeEventListener(
          'scrollerrorchange', this._handleLayoutEvent);
      prevLayout.removeEventListener(
          'itempositionchange', this._handleLayoutEvent);
      prevLayout.removeEventListener('rangechange', this._handleLayoutEvent);
      removeEventListener('scroll', this._scheduleUpdateView);
      removeEventListener('resize', this._scheduleUpdateView);
    }

    this._layout = layout;

    if (layout) {
      if (typeof layout.updateItemSizes === 'function') {
        this._measureCallback = layout.updateItemSizes.bind(layout);
      }
      layout.addEventListener('scrollsizechange', this._handleLayoutEvent);
      layout.addEventListener('scrollerrorchange', this._handleLayoutEvent);
      layout.addEventListener('itempositionchange', this._handleLayoutEvent);
      layout.addEventListener('rangechange', this._handleLayoutEvent);
      addEventListener('scroll', this._scheduleUpdateView);
      addEventListener('resize', this._scheduleUpdateView);
      this._updateItemsCount();
      this._scheduleUpdateView();
    }
  }

  requestReset() {
    super.requestReset();
    this._updateItemsCount();
  }

  requestUpdateView() {
    if (this._layout) {
      this._scheduleUpdateView();
    }
  }

  /**
   * @param {!Event} event
   * @private
   */
  _handleLayoutEvent(event) {
    switch (event.type) {
      case 'scrollsizechange':
        this._sizeContainer(event.detail);
        break;
      case 'scrollerrorchange':
        this._correctScrollError(event.detail);
        break;
      case 'itempositionchange':
        this._positionChildren(event.detail);
        break;
      case 'rangechange':
        this._adjustRange(event.detail);
        break;
      default:
        console.warn('event ' + event.type + ' not handled');
    }
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
    // Containers can be shadowRoots, so get the host.
    const container = this._container.host || this._container;
    Object.keys(size).forEach(key => {
      const prop = (key === 'width') ? 'minWidth' : 'minHeight';
      container.style[prop] = size[key] + 'px';
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
    const {first, num} = this;
    const last = first + num;
    this._container.dispatchEvent(
        new CustomEvent('rangechange', {detail: {first, last}}));
  }
};

export const VirtualList = RepeatsAndScrolls(class {});