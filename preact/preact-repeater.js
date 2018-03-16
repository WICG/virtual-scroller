import {VirtualRepeater} from '../virtual-repeater.js';
import {Component, h, render} from '../../preact/dist/preact.esm.js';

export class Repeat extends Component {
    componentWillMount() {
        this._repeater = new PreactRepeater();        
    }
    componentDidMount() {
        this._repeater.container = this._wrapper.base;
        this._updateRepeater(this.props);
    }

    _updateRepeater(props) {
        const {first, num, items, component} = props;
        Object.assign(this._repeater, {first, num, items, component});
        // this._repeater.render();
    }

    componentWillReceiveProps(nextProps) {
        this._updateRepeater(nextProps);
    }

    shouldComponentUpdate() {
        return false;
    }

    render({wrapper, style}) {
        return h(() => h(wrapper || 'div', {style}), {ref: c => this._wrapper = c});
    }
}

export const PreactMixin = Superclass => class extends Superclass {
    constructor() {
        super();
        this._component = null;
        this._offscreen = document.createElement('div');
    }

    set component(component) {
        if (component !== this._component) {
            this._component = component;
            this._needsRender = true;
            this._needsReset = true;
        }
    }

    get _kids() {
        return this._ordered.map(c => c.instance.base);
    }

    _getNewChild() {
        const child = {
            vNode: h(this._component, {ref: n => child.instance = n})
        };
        render(child.vNode, this._offscreen);
        return child;
    }

    _updateChild(child, item, idx) {
        child.vNode.attributes = {item, idx};
        render(child.vNode, this._container, child.instance.base);
    }

    _node(child) {
        return child.instance.base;
    }

    _nextSibling(child) {
        return super._nextSibling(child.instance.base);
    }

    _insertBefore(child, referenceNode) {
        super._insertBefore(child.instance.base, referenceNode);
    }

    _childIsAttached(child) {
        return super._childIsAttached(child.instance.base);
    }

    _hideChild(child) {
        super._hideChild(child.instance.base);
    }

    _showChild(child) {
        if (this._childIsAttached(child)) {
            super._showChild(child.instance.base);
        }
    }

    __removeChild(child) {
        super.__removeChild(child.instance.base);
    }

    _measureChild(child) {
        return super._measureChild(child.instance.base);
    }
}

export const PreactRepeater = PreactMixin(VirtualRepeater);