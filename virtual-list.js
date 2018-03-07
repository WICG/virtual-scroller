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
        this._notifyStable = this._notifyStable.bind(this);

        this._pendingUpdateView = null;
    }

    set container(node) {
        super.container = node;
        if (!this._listening) {
            // TODO: Listen on actual container
            window.addEventListener('scroll', e => this._scheduleUpdateView());
            window.addEventListener('resize', e => this._scheduleUpdateView());

            node.addEventListener('listResized', e => {
                if (e.target !== this && typeof this._layout.updateChildSizes === 'function') {
                    e.stopPropagation();
                    const child = e.path[e.path.findIndex(el => el === this) - 1];
                    const item = this._active.get(child);
                    // TODO: Should be able to remove this check when we stop hiding children
                    if (item) {
                        this._layout.updateChildSizes({
                            [item]: super._measureChild(child)
                        });    
                    }
                }
            }, true);
            this._listening = true;
        }
        this._scheduleUpdateView();
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

    set sizeCallback(fn) {
        this._sizeCallback = fn;
    }

    _attachLayout(layout) {
        this._detachLayout();
        this._layout = layout;
        // For easier debugging.
        this._layout._repeater = this;
        layout.addListener('size', this._sizeContainer);
        layout.addListener('position', this._positionChildren);
        layout.addListener('range', this._adjustRange);
        layout.addListener('scrollError', this._correctScrollError);
        if (typeof layout.updateChildSizes === 'function') {
            // Invoked by `Repeats` mixin, `m` is a map of `{ idx : {width: height:} }`
            this._measureCallback = m => layout.updateChildSizes(m);
        }
        this._scheduleUpdateView();
    }

    _detachLayout() {
        if (this._layout) {
            // For easier debugging.
            this._layout._repeater = null;
            this._layout.removeListener('size', this._sizeContainer);
            this._layout.removeListener('position', this._positionChildren);
            this._layout.removeListener('range', this._adjustRange);
            this._layout.removeListener('scrollError', this._correctScrollError);
            this._measureCallback = null;
            this._layout = null;    
        }
    }

    _scheduleUpdateView() {
        if (!this._pendingUpdateView && this._shouldRender()) {
            this._pendingUpdateView = Promise.resolve().then(() => this._updateView());
            // window.requestAnimationFrame(() => this._updateView());
        }
    }

    _updateView() {
        this._layout.totalItems = this._items.length;
        // Containers can be shadowRoots, so get the host.
        const listBounds = (this._container.host || this._container).getBoundingClientRect();
        // TODO(valdrin): exit early if 0x0 bounds
        const scrollerWidth = window.innerWidth;
        const scrollerHeight = window.innerHeight;
        const x = Math.max(0, -listBounds.x);
        const y = Math.max(0, -listBounds.y);
        const xMin = Math.max(0, Math.min(scrollerWidth, listBounds.left));
        const yMin = Math.max(0, Math.min(scrollerHeight, listBounds.top));
        const xMax = Math.max(0, Math.min(scrollerWidth, Infinity/*listBounds.right*/));
        const yMax = Math.max(0, Math.min(scrollerHeight, Infinity/*listBounds.bottom*/));
        this._layout.viewportSize = {
            x: xMax - xMin,
            y: yMax - yMin
        }
        this._layout.scrollTo({x, y});
        this._pendingUpdateView = null;
    }

    _sizeContainer(size) {
        Object.keys(size).forEach(key => {
            const prop = (key === 'width') ? 'minWidth' : 'minHeight';
            // Containers can be shadowRoots, so get the host.
            (this._container.host || this._container).style[prop] = size[key] + 'px';
        });
    }

    _notifyStable() {
        if (typeof this._sizeCallback === 'function') {
            this._sizeCallback();
            this._sizeCallback = null;
        }
        // Containers can be shadowRoots, so check also the host.
        else if ((this._container === this || this._container.host === this) && this.offsetParent) {
            this.dispatchEvent(new Event('listResized', {bubbles: true}));
        }
    }

    async _positionChildren(pos) {
        await Promise.resolve();
        const k = this._kids;
        Object.keys(pos).forEach(key => {
            const {x, y} = pos[key];
            const c = key - this._first;
            const n = k[c];
            if (n) {
                n.style.position = 'absolute';
                n.style.transform = `Translate3d(${x}px, ${y}px, 0)`;
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
        return Boolean(super._shouldRender() && this._layout);
    }

    _render() {
        super._render();
        if (this._stable) {
            this._notifyStable();
        }
    }

    _correctScrollError(err) {
        const {x, y} = err;
        window.scroll(window.scrollX - x, window.scrollY - y);
    }

    _measureChild(child) {
        const lists = child.querySelectorAll('virtual-list');
        if (lists.length) {
            this._layout._estimate = false;
            const listSizes = [...lists].map(l => new Promise(resolve => l.sizeCallback = resolve));
            return Promise.all(listSizes).then(() => super._measureChild(child));
        }
        return super._measureChild(child);
    }
};

export const VirtualList = RepeatsAndScrolls(class {});