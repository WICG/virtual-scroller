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
    const position = getComputedStyle(this.container).position;
    if (!position || position === 'static') {
      this.container.style.position = 'relative';
    }
    if (typeof this.layout.updateChildSizes === 'function') {
      this._measureCallback = m => this.layout.updateChildSizes(m);
    }
    this.layout.addListener('position', this._positionChildren.bind(this));
    this.layout.addListener('size', this._sizeContainer.bind(this));
    this.layout.addListener('range', this._adjustRange.bind(this));
    this.layout.addListener('scrollError', this._correctScrollError.bind(this));

    // TODO: Listen on actual container
    addEventListener('scroll', this._scheduleUpdateView.bind(this));
    addEventListener('resize', this._scheduleUpdateView.bind(this));
    this._updateItemsCount();
    this._scheduleUpdateView();
  }

  get layout() {
    return this._layout;
  }

  get items() {
    return super.items;
  }

  set items(arr) {
    super.items = arr;
    this._updateItemsCount();
  }

  splice(start, deleteCount, ...replace) {
    super.splice(start, deleteCount, ...replace);
    this._updateItemsCount();
  }

  requestUpdateView() {
    this._scheduleUpdateView();
  }

  // Rename _ordered to _kids?
  get _kids() {
    return this._ordered;
  }

  _updateItemsCount() {
    if (this.layout) {
      this.layout.totalItems = this._items ? this._items.length : 0;
    }
  }

  _scheduleUpdateView() {
    if (!this._pendingUpdateView) {
      this._pendingUpdateView =
          Promise.resolve().then(() => this._updateView());
      // window.requestAnimationFrame(() => this._updateView());
    }
  }

  _updateView() {
    this._pendingUpdateView = null;

    // Containers can be shadowRoots, so get the host.
    const listBounds =
        (this.container.host || this.container).getBoundingClientRect();

    // Avoid updating viewport if container is not visible.
    this._isContainerVisible = listBounds.width || listBounds.height ||
        listBounds.top || listBounds.left;
    if (!this._isContainerVisible) {
      return;
    }

    const scrollerWidth = window.innerWidth;
    const scrollerHeight = window.innerHeight;
    const x = Math.max(0, -listBounds.x);
    const y = Math.max(0, -listBounds.y);
    const xMin = Math.max(0, Math.min(scrollerWidth, listBounds.left));
    const yMin = Math.max(0, Math.min(scrollerHeight, listBounds.top));
    const xMax =
        Math.max(0, Math.min(scrollerWidth, Infinity /*listBounds.right*/));
    const yMax =
        Math.max(0, Math.min(scrollerHeight, Infinity /*listBounds.bottom*/));
    this.layout.viewportSize = {x: xMax - xMin, y: yMax - yMin};
    this.layout.scrollTo({x, y});
  }

  _sizeContainer(size) {
    Object.keys(size).forEach(key => {
      const prop = (key === 'width') ? 'minWidth' : 'minHeight';
      // Containers can be shadowRoots, so get the host.
      (this.container.host || this.container).style[prop] = size[key] + 'px';
    });
  }

  async _positionChildren(pos) {
    await Promise.resolve();
    const kids = this._kids;
    const maxWidth = this.layout.direction === 'horizontal' ? null : '100%';
    const maxHeight = this.layout.direction === 'vertical' ? null : '100%';
    Object.keys(pos).forEach(key => {
      const idx = key - this._first;
      const child = kids[idx];
      if (child) {
        const {x, y} = pos[key];
        // console.debug(`_positionChild #${this.container.id} > #${child.id}:
        // top ${y}`);
        child.style.position = 'absolute';
        child.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        child.style.maxWidth = maxWidth;
        child.style.maxHeight = maxHeight;
      }
    });
  }

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

  _shouldRender() {
    return Boolean(this._isContainerVisible && super._shouldRender());
  }

  _correctScrollError(err) {
    window.scroll(window.scrollX - err.x, window.scrollY - err.y);
  }

  _notifyStable() {
    // override.
  }
};

export const VirtualList = RepeatsAndScrolls(class {});