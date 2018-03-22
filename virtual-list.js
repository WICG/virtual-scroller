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

        this._pendingUpdateView = null;

        this._isContainerVisible = false;
        this._containerRO = new ResizeObserver(this._handleContainerResize.bind(this));
        this._childRO = new ResizeObserver(this._handleChildResize.bind(this));
    }

    set container(node) {
        if (this._container) {
            console.warn('container can be set only once.');
            return;
        }
        super.container = node;

        this._containerRO.observe(this._container);

        // TODO: Listen on actual container
        window.addEventListener('scroll', this._scheduleUpdateView);
    }

    set layout(layout) {
        if (layout !== this._layout) {
            this._attachLayout(layout);
        }
    }

    set items(arr) {
        if (arr !== this._items) {
            super.items = arr;
            this._scheduleUpdateView();
        }
    }

    // Rename _ordered to _kids?
    get _kids() {
        return this._ordered;
    }

    _attachLayout(layout) {
        this._detachLayout();
        this._layout = layout;
        layout.addListener('size', this._sizeContainer);
        layout.addListener('position', this._positionChildren);
        layout.addListener('range', this._adjustRange);
        layout.addListener('scrollError', this._correctScrollError);
        this._scheduleUpdateView();
    }

    _detachLayout() {
        if (this._layout) {
            this._layout.removeListener('size', this._sizeContainer);
            this._layout.removeListener('position', this._positionChildren);
            this._layout.removeListener('range', this._adjustRange);
            this._layout.removeListener('scrollError', this._correctScrollError);
            this._layout = null;
        }
    }

    _scheduleUpdateView() {
        if (!this._pendingUpdateView && this._shouldRender()) {
            this._pendingUpdateView = Promise.resolve().then(() => this._updateView());
        }
    }

    _updateView() {
        this._layout.totalItems = this._items.length;
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
            }
        });
    }

    _adjustRange(range) {
        this.num = range.num;
        this.first = range.first;
        this._stable = range.stable;
        this._incremental = !(range.stable);
        if (range.remeasure) {
            this._scheduleRender();
        }
    }

    _shouldRender() {
        return Boolean(super._shouldRender() && this._layout && this._isContainerVisible);
    }

    _render() {
        // Unobserve old children.
        this._childRO.disconnect();

        super._render();

        // Observe new children.
        if (this._layout.updateChildSizes) {
            this._kids.forEach((child) => this._childRO.observe(child));
        }
    }

    _correctScrollError(err) {
        window.scroll(window.scrollX - err.x, window.scrollY - err.y);
    }

    _handleContainerResize(entries) {
        // Include also padding.
        const cr = entries[0].contentRect;
        const width = cr.left + cr.right;
        const height = cr.top + cr.bottom;

        // console.debug('container changed size', {width, height});

        const wasVisible = this._isContainerVisible;
        this._isContainerVisible = width > 0 || height > 0;

        if (!wasVisible) {
            // console.debug('container became visible', this._layout.itemSize);
            this._scheduleUpdateView();
        } else if (!this._isContainerVisible) {
            this._childRO.disconnect();
        }
    }

    _handleChildResize(entries) {
        const mm = {};
        for (let entry of entries) {
            const idx = this._kids.indexOf(entry.target);
            if (idx === -1) {
                throw Error('Resized element not found.');
            }
            // Include also padding.
            const cr = entry.contentRect;
            const width = cr.left + cr.right;
            const height = cr.top + cr.bottom;
            const measure = Object.assign({width, height}, this._getMargins(entry.target));

            mm[this._first + idx] = measure;

            // console.debug(`#${this._container.id} > #${entry.target.id} height: ${measure.height}`);
        }
        this._layout.updateChildSizes(mm);
    }

    _getMargins(el) {
        const style = window.getComputedStyle(el);
        // console.log(el.id, style.position);
        return {
            marginLeft: this._getMarginValue(style.marginLeft),
            marginRight: this._getMarginValue(style.marginRight),
            marginTop: this._getMarginValue(style.marginTop),
            marginBottom: this._getMarginValue(style.marginBottom),
        };
    }
    
    _getMarginValue(value) {
        value = value ? parseFloat(value) : NaN;
        return value !== value ? 0 : value;
    }
};

export const VirtualList = RepeatsAndScrolls(class {});