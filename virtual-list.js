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
        this._scheduleUpdateView = this._scheduleUpdateView.bind(this);
        this._onListConnected = this._onListConnected.bind(this);

        this._layoutItemSize = {};

        this._childLists = new Map();
        this._parentList = null;
        this._parentListChild = null;

        this._pendingUpdateView = null;
    }

    set container(node) {
        if (this._container) {
            this._container.removeEventListener('listConnected', this._onListConnected);
            this._container._list = null;
            this._childLists = new Map();
            this._parentList = null;
            this._parentListChild = null;
        }

        super.container = node;

        if (!this._container) {
            return;
        }

        this._container._list = this;

        // TODO: Listen on actual container
        // NOTE: addEventListener already handles the deduplication of listeners.
        window.addEventListener('scroll', this._scheduleUpdateView);
        window.addEventListener('resize', this._scheduleUpdateView);
        /*
        this._container.addEventListener('listConnected', this._onListConnected);
        const whenReady = this._container.isConnected ?
            cb => cb() :
            cb => Promise.resolve().then(cb);
        whenReady(() => {
            // console.debug(`#${this._container.id} connected`);
            const event = new Event('listConnected', {
                bubbles: true,
                cancelable: true,
                composed: true,
            });
            this._container.dispatchEvent(event);
        });
        */
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

    requestUpdateView() {
        Object.assign(this._layout._itemSize, this._layoutItemSize);
        this._scheduleUpdateView();
    }

    // Rename _ordered to _kids?
    get _kids() {
        return this._ordered;
    }

    _onListConnected(event) {
        const path = event.composedPath();
        const childList = path[0]._list;
        if (childList === this) {
            return;
        }
        event.stopPropagation();

        // This list has nested lists, so disable estimation.
        this._layout._estimate = false;

        const idx = path.findIndex(el => el._list === this);
        const child = path[idx - 1];

        // console.debug(`#${this._container.id} > #${child.id} > #${childList._container.id}`);

        let childLists = this._childLists.get(child);
        if (!childLists) {
            childLists = [];
            this._childLists.set(child, childLists);
        }
        childLists.push(childList);
        childList._parentList = this;
        childList._parentListChild = child;
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
        if (!this._pendingUpdateView && this._shouldRender()) {
            this._pendingUpdateView = Promise.resolve().then(() => this._updateView());
            // window.requestAnimationFrame(() => this._updateView());
        }
    }

    _updateView() {
        this._layout.totalItems = this._items.length;
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
            // console.debug(`#${this._container.id} stable, invoke sizeCallback`);
            this._sizeCallback();
            this._sizeCallback = null;
        } else if (this._parentList) {
            this._parentList._updateChildSize(this._parentListChild);
        }
    }

    async _updateChildSize(child) {
        // TODO: Should be able to remove the _active check when we
        // stop hiding children
        if ('function' !== typeof this._layout.updateChildSizes ||
            false === this._active.has(child)) {
            return;
        }
        const item = this._active.get(child);
        return Promise.resolve()
            .then(() => this._measureChild(child))
            .then((size) => this._layout.updateChildSizes({
                [item]: size
            }));
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
        if (range.remeasure) {
            this.requestRemeasure();
        }
        this._stable = range.stable;
        this._incremental = !(range.stable);
        if (!this._pendingRender && this._stable) {
            this._notifyStable();
        }
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
        window.scroll(window.scrollX - err.x, window.scrollY - err.y);
    }

    _measureChild(child) {
        const childLists = this._childLists.get(child);
        if (childLists) {
            // console.debug(`_measureChild #${this._container.id} > #${child.id}: pending... #${childLists[0]._container.id}`);
            const listSizes = childLists.map(list => new Promise(resolve => {
                list._sizeCallback = resolve;
            }));
            return Promise.all(listSizes)
                // .then(() => console.debug(`_measureChild #${this._container.id} > #${child.id}: ready!!! #${childLists[0]._container.id}`))
                .then(() => super._measureChild(child));
        }
        return super._measureChild(child);
    }
};

export const VirtualList = RepeatsAndScrolls(class {});