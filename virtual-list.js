import {Repeats} from './virtual-repeater.js';
import Layout from './layouts/layout-1d.js';

export const RepeatsAndScrolls = Superclass => class extends Repeats(Superclass) {
    constructor() {
        super();
        this._num = 1;
        this._first = 0;
        this._last = 1;
        this._sizeCallback = null;
        this._adjustRange = this._adjustRange.bind(this);
        this._correctScrollError = this._correctScrollError.bind(this);
        this._sizeContainer = this._sizeContainer.bind(this);
        this._positionChildren = this._positionChildren.bind(this);
        this._notifyStable = this._notifyStable.bind(this);
        
        this._pendingUpdateView = null;
    }

    set container(node) {
        if (this._container) this._container._list = null;
        super.container = node;
        if (this._container) this._container._list = this;
        // console.debug(this.id, 'container #' + this._container.id, 'listening? ' + this._listening);
        if (!this._listening) {
            // TODO: Listen on actual container
            window.addEventListener('scroll', e => this._scheduleUpdateView());
            window.addEventListener('resize', e => this._scheduleUpdateView());

            node.addEventListener('listResized', e => {
                if (typeof this._layout.updateChildSizes !== 'function') return;
                const path = e.composedPath();
                const nestedList = path[0]._list;
                if (nestedList === this) return;

                e.stopPropagation();
                const child = path[path.findIndex(el => el._list === this) - 1];
                // TODO: Should be able to remove this check when we stop hiding children
                if (!this._active.has(child)) return;
                const item = this._active.get(child);
                this._layout.updateChildSizes({
                    [item]: super._measureChild(child)
                });
            }, true);

            node.addEventListener('listConnected', e => {
                const path = e.composedPath();
                const nestedList = path[0]._list;
                if (nestedList === this) return;
                e.stopPropagation();
                const parentListIdx = path.findIndex(el => el._list === this);
                const parentListChild = path[parentListIdx - 1];
                parentListChild._nestedLists = parentListChild._nestedLists || [];
                parentListChild._nestedLists.push(nestedList);
                nestedList._parentList = this;
                nestedList._parentListChild = parentListChild;
                // console.debug(`#${nestedList._container.id} < #${parentListChild.id} < #${this._container.id}`);
            }, true);
            const whenReady = this._container.isConnected ? cb => cb() : cb => Promise.resolve().then(cb);
            whenReady(() => {
                // console.debug(`#${this._container.id} fire listConnected`);
                const event = new Event('listConnected', {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                });
                //this._container.dispatchEvent(event);
            });
            this._listening = true;
        }
        // console.debug(this.id, 'container #' + this._container.id, 'listening! ' + this._listening);
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
        this._layout._list = this;
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
            this._layout._list = null;
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
            // console.debug(`#${this._container.id} stable, invoke sizeCallback`);
            this._sizeCallback();
            this.sizeCallback = null;
        }
        else if (this._parentList) {
            // console.debug(`#${this._container.id} stable, invoke #${this._parentList._container.id}._updateChildSize(#${this._parentListChild.id})`)
            //this._parentList._updateChildSize(this._parentListChild);
            // this.requestRemeasure();
            this._container.dispatchEvent(new Event('listResized', {
                bubbles: true,
                cancelable: true,
                composed: true,
            }));
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
                // console.debug(`_positionChild #${this._container.id} > #${n.id}: top ${y}`);
                n.style.position = 'absolute';
                n.style.transform = `translate3d(${x}px, ${y}px, 0)`;
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

    _updateChildSize(child) {
        if (typeof this._layout.updateChildSizes !== 'function') return;
        // TODO: Should be able to remove this check when we stop hiding children
        if (!this._active.has(child)) return;
        const item = this._active.get(child);
        this._layout.updateChildSizes({
            [item]: super._measureChild(child)
        });    
    }

    _measureChild(child) {
        if (child._nestedLists && child._nestedLists.length) {
            this._layout._estimate = false;
            const nestedList = child._nestedLists[0];
            // console.debug(`_measureChild #${this._container.id} > #${child.id}: pending... #${nestedList._container.id}`);
            const listSizes = child._nestedLists.map(l => new Promise(resolve => {
                // if (l._stable) {
                //     resolve();
                // } else {
                    l.sizeCallback = () => {
                        resolve();
                    };
                // }
            }));
            return Promise.all(listSizes).then(() => {
                // console.debug(`_measureChild #${this._container.id} > #${child.id}: ready!!! #${child._nestedLists[0]._container.id}`);
                return super._measureChild(child);
            });
        }
        return super._measureChild(child);
    }
};

export const VirtualList = RepeatsAndScrolls(class {});

export const VirtualVerticalList = class extends VirtualList {
    constructor() {
        super();
        this.layout = new Layout();
    }
    get layout() {
        return this._layout;
    }
    set layout(layout) {
        super.layout = layout;
    }
};