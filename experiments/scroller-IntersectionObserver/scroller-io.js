const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
:host {
  display: block;
  position: relative;
  overflow: auto;
}

#container {
  display: contents;
}

#scrollHeight {
  pointer-events: none;

  visibility: hidden;
  position: absolute;

  top: 0px;
  left: 0px;
  width: 100%;
  height: 1px;
  transform: translateY(-1px);
}

slot {
  visibility: hidden;
  display: block;
  position: absolute;

  width: 100%;
  height: 1px;
}

slot[name] {
  all: unset;
  display: block;
}

.sentinel {
  display: block;
  height: 1px;
  background-color: red;
}
</style>
<div id="container"></div>
<div id="scrollHeight"></div>
`;

const UNUSED_SLOT_NAME = `UNUSED-${Math.random().toString(32).substring(2)}`;

const _nextChildId = Symbol('ScrollerIO#_nextChildId');
const _childInfo = Symbol('ScrollerIO#_childInfo');
const _slotToChild = Symbol('ScrollerIO#_slotToChild');
const _container = Symbol('ScrollerIO#_container');
const _scrollHeight = Symbol('ScrollerIO#_scrollHeight');
const _mutationObserver = Symbol('ScrollerIO#_mutationObserver');
const _intersectionObserver = Symbol('ScrollerIO#_intersectionObserver');

const _insertChild = Symbol('ScrollerIO#_insertChild');
const _removeChild = Symbol('ScrollerIO#_removeChild');
const _showChild = Symbol('ScrollerIO#_showChild');
const _hideChild = Symbol('ScrollerIO#_hideChild');
const _mutationObserverCallback = Symbol('ScrollerIO#_mutationObserverCallback');
const _intersectionObserverCallback = Symbol('ScrollerIO#_intersectionObserverCallback');

class ScrollerIO extends HTMLElement {
  constructor() {
    super();

    [
      _mutationObserverCallback,
      _intersectionObserverCallback,
    ].forEach(symbol => { this[symbol] = this[symbol].bind(this); });

    this.attachShadow({mode: 'open'}).appendChild(
        TEMPLATE.content.cloneNode(true));

    this[_mutationObserver] =
        new MutationObserver(this[_mutationObserverCallback]);
    this[_mutationObserver].observe(this, {childList: true});

    this[_nextChildId] = 0;
    this[_childInfo] = new WeakMap();
    this[_slotToChild] = new WeakMap();
    this[_container] = this.shadowRoot.getElementById('container');
    this[_scrollHeight] = this.shadowRoot.getElementById('scrollHeight');
    this[_intersectionObserver] =
        new IntersectionObserver(this[_intersectionObserverCallback], {
          root: document.scrollingElement,
        });

    window.requestAnimationFrame(() => {
      this[_mutationObserverCallback]([{
        addedNodes: Array.from(this.children),
        removedNodes: [],
      }]);
      this[_showChild](this.children[0]);
    });
  }

  [_insertChild](child) {
    if (!this[_childInfo].has(child)) {
      const slotName = `child-${this[_nextChildId]++}`;

      child.slot = slotName;

      const slot = document.createElement('slot');
      slot.name = UNUSED_SLOT_NAME;
      this[_container].appendChild(slot);

      this[_intersectionObserver].observe(slot);

      this[_slotToChild].set(slot, child);
      this[_childInfo].set(child, {slotName, slot});
    }
  }

  [_removeChild](child) {
    if (this[_childInfo].has(child)) {
      const {slotName, slot} = this[_childInfo].get(child);
      this[_container].removeChild(slot);

      this[_slotToChild].delete(slot);
      this[_childInfo].delete(child);
    }
  }

  [_showChild](child) {
    const {slotName, slot} = this[_childInfo].get(child);

    slot.name = slotName;
    Object.assign(slot.style, {
      display: '',
      width: '',
      height: '',
    });

    const nextElementSibling = child.nextElementSibling;
    if (nextElementSibling) {
      const {slot} = this[_childInfo].get(nextElementSibling);
    }
  }

  [_hideChild](child) {
    const {slot} = this[_childInfo].get(child);
    const rect = slot.getBoundingClientRect();
    Object.assign(slot.style, {
      display: 'block',
      width: '100%',
      height: `${rect.height}px`,
    });
    slot.name = UNUSED_SLOT_NAME;
  }

  [_mutationObserverCallback](entries) {
    for (const {addedNodes, removedNodes} of entries) {
      for (const node of addedNodes) {
        this[_insertChild](node);
      }
      for (const node of removedNodes) {
        this[_removeChild](node);
      }
    }
  }

  [_intersectionObserverCallback](entries) {
    const newlyHidden = [];
    const newlyVisible = [];

    for (const entry of entries) {
      const child = this[_slotToChild].get(entry.target);
      if (!child) continue;

      if (entry.intersectionRatio <= 0) {
        this[_hideChild](child);
      } else {
        this[_showChild](child);
      }
    }
  }
}

customElements.define('scroller-io', ScrollerIO);
