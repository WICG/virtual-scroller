import {Repeats} from './virtual-repeater.js';

export const RepeatsAndScrolls = Superclass => class extends Repeats(Superclass) {
    constructor() {
        super();
        this._num = 0;
        this._first = -1;
        this._last = -1;
        this._prevFirst = -1;
        this._prevLast = -1;
        this._sizeCallback = null;
        this._adjustRange = this._adjustRange.bind(this);
        this._correctScrollError = this._correctScrollError.bind(this);
        this._sizeContainer = this._sizeContainer.bind(this);
        this._positionChildren = this._positionChildren.bind(this);
        this._scheduleUpdateView = this._scheduleUpdateView.bind(this);

        this._layoutItemSize = {};

        this._pendingUpdateView = null;
        // Used to block rendering until layout viewport is setup.
        this._canRender = false;
    }

    set container(node) {
        if (node === this._container) {
            return;
        }
        if (this._container) {
            console.warn('container can be set only once.');
            return;
        }

        this._container = node;

        // Ensure container is a positioned element.
        const position = getComputedStyle(node).position;
        if (!position || position === 'static') {
            node.style.position = 'relative';
        }

        // TODO: Listen on actual container
        window.addEventListener('scroll', this._scheduleUpdateView);
        window.addEventListener('resize', this._scheduleUpdateView);
        
        this._updateItemsCount();
        this._scheduleUpdateView();
    }

    set layout(layout) {
        if (layout !== this._layout) {
            this._attachLayout(layout);
        }
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
        Object.assign(this._layout._itemSize, this._layoutItemSize);
        this._scheduleUpdateView();
    }

    // Rename _ordered to _kids?
    get _kids() {
        return this._ordered;
    }

    _updateItemsCount() {
        // Wait to have both container and layout, so that size updates
        // can be correctly managed.
        if (this._container && this._layout) {
            this._layout.totalItems = this._items ? this._items.length : 0;
        }
    }

    _attachLayout(layout) {
        this._detachLayout();
        this._layout = layout;
        layout.addListener('size', this._sizeContainer);
        layout.addListener('position', this._positionChildren);
        layout.addListener('range', this._adjustRange);
        layout.addListener('scrollError', this._correctScrollError);
        if (typeof layout.updateChildSizes === 'function') {
            // Invoked by `Repeats` mixin, `m` is a map of `{ idx : {width: height:} }`
            this._measureCallback = m => layout.updateChildSizes(m);
        }
        this._updateItemsCount();
        this._scheduleUpdateView();
    }

    _detachLayout() {
        if (this._layout) {
            this._layout.removeListener('size', this._sizeContainer);
            this._layout.removeListener('position', this._positionChildren);
            this._layout.removeListener('range', this._adjustRange);
            this._layout.removeListener('scrollError', this._correctScrollError);
            this._measureCallback = null;
            this._layout = null;
        }
    }

    _scheduleUpdateView() {
        if (!this._pendingUpdateView && this._container && this._layout) {
            this._pendingUpdateView = Promise.resolve().then(() => this._updateView());
            // window.requestAnimationFrame(() => this._updateView());
        }
    }

    _updateView() {
        Object.assign(this._layoutItemSize, this._layout._itemSize);
        // Containers can be shadowRoots, so get the host.
        const listBounds = (this._container.host || this._container).getBoundingClientRect();
        const scrollerWidth = window.innerWidth;
        const scrollerHeight = window.innerHeight;
        const x = Math.max(0, -listBounds.x);
        const y = Math.max(0, -listBounds.y);
        const xMin = Math.max(0, Math.min(scrollerWidth, listBounds.left));
        const yMin = Math.max(0, Math.min(scrollerHeight, listBounds.top));
        const xMax = Math.max(0, Math.min(scrollerWidth, Infinity /*listBounds.right*/ ));
        const yMax = Math.max(0, Math.min(scrollerHeight, Infinity /*listBounds.bottom*/ ));
        this._layout.viewportSize = {
            x: xMax - xMin,
            y: yMax - yMin
        }
        this._layout.scrollTo({
            x,
            y
        });
        this._pendingUpdateView = null;
        this._canRender = true;
    }

    _sizeContainer(size) {
        Object.keys(size).forEach(key => {
            const prop = (key === 'width') ? 'minWidth' : 'minHeight';
            // Containers can be shadowRoots, so get the host.
            (this._container.host || this._container).style[prop] = size[key] + 'px';
        });
    }

    async _positionChildren(pos) {
        await Promise.resolve();
        const kids = this._kids;
        const maxWidth = this._layout.direction === 'horizontal' ? null : '100%';
        const maxHeight = this._layout.direction === 'vertical' ? null : '100%';
        Object.keys(pos).forEach(key => {
            const idx = key - this._first;
            const child = kids[idx];
            if (child) {
                const {
                    x,
                    y
                } = pos[key];
                // console.debug(`_positionChild #${this._container.id} > #${child.id}: top ${y}`);
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
        if (range.remeasure) {
            this.requestRemeasure();
        }
        this._stable = range.stable;
        this._incremental = !(range.stable);
    }

    _shouldRender() {
        return Boolean(super._shouldRender() && this._canRender);
    }

    _correctScrollError(err) {
        window.scroll(window.scrollX - err.x, window.scrollY - err.y);
    }
};

export const VirtualList = RepeatsAndScrolls(class {});