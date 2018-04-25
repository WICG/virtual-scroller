import {Repeats} from './virtual-repeater.js';

export class RangeChangeEvent extends Event {
  constructor(type, init) {
    super(type, init);
    this._first = Math.floor(init.first || 0);
    this._last = Math.floor(init.last || 0);
  }
  get first() {
    return this._first;
  }
  get last() {
    return this._last;
  }
}

export const RepeatsAndScrolls = Superclass => class extends Repeats
(Superclass) {
  constructor(config) {
    super();
    this._num = 0;
    this._first = -1;
    this._last = -1;
    this._prevFirst = -1;
    this._prevLast = -1;

    this._pendingUpdateView = null;
    this._isContainerVisible = false;
    this._containerElement = null;
    this._layout = null;
    this._containerScrolls = false;
    // Keep track of original inline style of the container,
    // so it can be restored when container is changed.
    this._containerInlineStyle = null;
    // A sentinel element that sizes the container when
    // it is a scrolling element.
    this._containerSizer = null;
    // We keep track of the scroll size to support changing container.
    this._scrollSize = null;

    if (config) {
      Object.assign(this, config);
    }
  }

  get container() {
    return this._container;
  }
  set container(container) {
    super.container = container;

    const oldEl = this._containerElement;
    // Consider document fragments as shadowRoots.
    const newEl =
        (container && container.nodeType === Node.DOCUMENT_FRAGMENT_NODE) ?
        container.host :
        container;
    if (oldEl === newEl) {
      return;
    }

    if (oldEl) {
      if (this._containerInlineStyle) {
        oldEl.setAttribute('style', this._containerInlineStyle);
      } else {
        oldEl.removeAttribute('style');
      }
      this._containerInlineStyle = null;
      this._updateScrollListener(false);
    } else {
      // First time container was setup, add listeners only now.
      addEventListener('scroll', this, {passive: true});
      addEventListener('resize', this);
    }

    this._containerElement = newEl;

    if (newEl) {
      this._containerInlineStyle = newEl.getAttribute('style') || null;
      this._computeContainerScrolls();
      this._sizeContainer(this._scrollSize);
      this._scheduleUpdateView();
    }
  }

  get layout() {
    return this._layout;
  }
  set layout(layout) {
    if (layout === this._layout) {
      return;
    }

    if (this._layout) {
      this._measureCallback = null;
      this._layout.removeEventListener('scrollsizechange', this);
      this._layout.removeEventListener('scrollerrorchange', this);
      this._layout.removeEventListener('itempositionchange', this);
      this._layout.removeEventListener('rangechange', this);
      // Reset container size so layout can get correct viewport size.
      if (this._containerElement) {
        this._sizeContainer();
        this.requestRemeasure();
      }
    }

    this._layout = layout;

    if (this._layout) {
      if (typeof this._layout.updateItemSizes === 'function') {
        this._measureCallback = this._layout.updateItemSizes.bind(this._layout);
      }
      this._layout.addEventListener('scrollsizechange', this);
      this._layout.addEventListener('scrollerrorchange', this);
      this._layout.addEventListener('itempositionchange', this);
      this._layout.addEventListener('rangechange', this);
      this._scheduleUpdateView();
    }
  }

  requestReset() {
    super.requestReset();
    this._scheduleUpdateView();
  }

  /**
   * @param {!Event} event
   * @private
   */
  handleEvent(event) {
    switch (event.type) {
      case 'scroll':
        if (!this._containerScrolls ||
            event.target === this._containerElement) {
          this._scheduleUpdateView();
        }
        break;
      case 'resize':
        this._scheduleUpdateView();
        break;
      case 'scrollsizechange':
        this._sizeContainer(event.detail);
        this._scrollSize = event.detail;
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
        console.warn('event not handled', event);
    }
  }
  /**
   * @private
   */
  _computeContainerScrolls() {
    if (!this._containerElement) {
      return;
    }
    const style = getComputedStyle(this._containerElement);
    const scrolls = (style.overflow === 'auto' || style.overflow === 'scroll');
    if (this._containerScrolls !== scrolls) {
      this._containerScrolls = scrolls;
      this._updateScrollListener(scrolls);
    }
  }
  /**
   * @private
   */
  _updateScrollListener(scrolls) {
    if (scrolls) {
      this._containerElement.addEventListener('scroll', this, {passive: true});
      if (!this._containerSizer) {
        this._containerSizer = document.createElement('div');
        this._containerSizer.style.width = '1px';
        this._containerSizer.style.height = '1px';
        this._containerSizer.style.position = 'absolute';
        this._containerSizer.textContent = ' ';
      }
      this._container.prepend(this._containerSizer);
    } else {
      this._containerElement.removeEventListener(
          'scroll', this, {passive: true});
      if (this._containerSizer) {
        this._containerSizer.remove();
      }
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
  _scheduleUpdateView() {
    if (!this._pendingUpdateView && this._container && this._layout) {
      this._pendingUpdateView =
          Promise.resolve().then(() => this._updateView());
    }
  }
  /**
   * @private
   */
  _updateView() {
    this._pendingUpdateView = null;

    this._layout.totalItems = this._items ? this._items.length : 0;

    const listBounds = this._containerElement.getBoundingClientRect();
    // Avoid updating viewport if container is not visible.
    this._isContainerVisible = Boolean(
        listBounds.width || listBounds.height || listBounds.top ||
        listBounds.left);
    if (!this._isContainerVisible) {
      return;
    }

    let width, height, top, left;
    if (this._containerScrolls) {
      width = listBounds.width;
      height = listBounds.height;
      left = this._containerElement.scrollLeft;
      top = this._containerElement.scrollTop;
    } else {
      const scrollerWidth = window.innerWidth;
      const scrollerHeight = window.innerHeight;
      const xMin = Math.max(0, Math.min(scrollerWidth, listBounds.left));
      const yMin = Math.max(0, Math.min(scrollerHeight, listBounds.top));
      const xMax = this._layout.direction === 'vertical' ?
          Math.max(0, Math.min(scrollerWidth, listBounds.right)) :
          scrollerWidth;
      const yMax = this._layout.direction === 'vertical' ?
          scrollerHeight :
          Math.max(0, Math.min(scrollerHeight, listBounds.bottom));
      width = xMax - xMin;
      height = yMax - yMin;
      left = Math.max(0, -listBounds.x);
      top = Math.max(0, -listBounds.y);
    }
    this._layout.viewportSize = {width, height};

    this._layout.scrollTo({top, left});
  }
  /**
   * @private
   */
  _sizeContainer(size) {
    if (this._containerScrolls) {
      const left = size && size.width ? size.width - 1 : 0;
      const top = size && size.height ? size.height - 1 : 0;
      this._containerSizer.style.transform =
          `translate3d(${left}px, ${top}px, 0)`;
    } else {
      const style = this._containerElement.style;
      style.minWidth = size && size.width ? size.width + 'px' : null;
      style.minHeight = size && size.height ? size.height + 'px' : null;
    }
  }
  /**
   * @private
   */
  async _positionChildren(pos) {
    await Promise.resolve();
    const kids = this._kids;
    Object.keys(pos).forEach(key => {
      const idx = key - this._first;
      const child = kids[idx];
      if (child) {
        const {top, left} = pos[key];
        // console.debug(`_positionChild #${this._container.id} > #${child.id}:
        // top ${top}`);
        child.style.position = 'absolute';
        child.style.transform = `translate3d(${left}px, ${top}px, 0)`;
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
    return Boolean(
        this._isContainerVisible && this._layout && super._shouldRender());
  }
  /**
   * @private
   */
  _correctScrollError(err) {
    if (this._containerScrolls) {
      this._containerElement.scrollTop += err.top;
      this._containerElement.scrollLeft += err.left;
    } else {
      window.scroll(window.scrollX - err.left, window.scrollY - err.top);
    }
  }
  /**
   * @protected
   */
  _notifyStable() {
    const {first, num} = this;
    const last = first + num;
    this._container.dispatchEvent(
        new RangeChangeEvent('rangechange', {first, last}));
  }
};

export const VirtualList = RepeatsAndScrolls(class {});