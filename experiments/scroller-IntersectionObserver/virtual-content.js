import {HeightEstimator} from './HeightEstimator.js';

const rectsIntersect = (a, b) => (
  !(b.right < a.left || a.right < b.left) &&
  !(b.bottom < a.top || a.bottom < b.top)
);

const rectIsVisible = r => (r.width !== 0 && r.height !== 0);


const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
:host {
  display: block;
}

#spaceBefore, #spaceAfter {
  min-height: 1px;
  width: 100%;
  background-color: #fff0f0;
}

::slotted(*) {
  border: 1px dotted magenta;
}
</style>
<div id="spaceBefore"></div>
<slot></slot>
<div id="spaceAfter"></div>
`;

const _spaceBefore = Symbol('VirtualContent#_spaceBefore');
const _spaceAfter = Symbol('VirtualContent#_spaceAfter');
const _spaceObserverCallback = Symbol('VirtualContent#_spaceObserverCallback');
const _spaceObserver = Symbol('VirtualContent#_spaceObserver');
const _childObserverCallback = Symbol('VirtualContent#_childObserverCallback');
const _childObserver = Symbol('VirtualContent#_childObserver');
const _visibleRange = Symbol('VirtualContent#_visibleRange');
const _heightEstimator = Symbol('VirtualContent#_heightEstimator');

const _showChild = Symbol('VirtualContent#_showChild');
const _hideChild = Symbol('VirtualContent#_hideChild');
const _fillStart = Symbol('VirtualContent#_fillStart');
const _fillEnd = Symbol('VirtualContent#_fillEnd');
const _updateScrollbar = Symbol('VirtualContent#_updateScrollbar');

const _flushPending = Symbol('VirtualContent#_flushPending');
const _flushPendingToShow = Symbol('VirtualContent#_flushPendingToShow');
const _flushPendingToHide = Symbol('VirtualContent#_flushPendingToHide');
const _enqueueShow = Symbol('VirtualContent#_enqueueShow');
const _enqueueHide = Symbol('VirtualContent#_enqueueHide');
const _enqueueFlush = Symbol('VirtualContent#_enqueueFlush');
const _flush = Symbol('VirtualContent#_flush');

class VirtualContent extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({mode: 'open'}).appendChild(
        TEMPLATE.content.cloneNode(true));

    this[_spaceBefore] = this.shadowRoot.getElementById('spaceBefore');
    this[_spaceAfter] = this.shadowRoot.getElementById('spaceAfter');

    this[_visibleRange] = new Range();
    this[_visibleRange].setStart(this, 0);
    this[_visibleRange].setEnd(this, 0);

    this[_spaceObserverCallback] = this[_spaceObserverCallback].bind(this);
    this[_spaceObserver] = new IntersectionObserver(this[_spaceObserverCallback]);
    this[_spaceObserver].observe(this[_spaceBefore]);
    this[_spaceObserver].observe(this[_spaceAfter]);

    this[_childObserverCallback] = this[_childObserverCallback].bind(this);
    this[_childObserver] = new IntersectionObserver(this[_childObserverCallback]);

    this[_heightEstimator] = new HeightEstimator();

    this[_flushPending] = false;
    this[_flushPendingToShow] = new Set();
    this[_flushPendingToHide] = new Set();

    window.requestAnimationFrame(() => {
      this.normalize();

      // TODO: This isn't the right place for this initialization logic.
      for (let child = this.firstChild; child !== null; child = child.nextSibling) {
        if (child.nodeType !== Node.ELEMENT_NODE) {
          const newDiv = document.createElement('div');
          this.insertBefore(newDiv, child);
          newDiv.appendChild(child);
          child = newDiv;
        }
        this[_hideChild](child);
      }

      this[_updateScrollbar]();

      this.setAttribute('ready', '');
    });
  }

  [_showChild](child) {
    child.removeAttribute('invisible');
  }

  [_hideChild](child) {
    child.setAttribute('invisible', '');
  }

  [_spaceObserverCallback](entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      if (entry.target === this[_spaceBefore]) {
        this[_fillStart](entry);
      } else if (entry.target === this[_spaceAfter]) {
        this[_fillEnd](entry);
      }
    }
  }

  [_fillStart](entry) {
    // Add new elements to the start of the visible range.
    let estimatedAddedHeight = 0;
    let next = this.childNodes[this[_visibleRange].startOffset] || null
    if (next !== null && next.previousSibling !== null && estimatedAddedHeight < entry.intersectionRect.height) {
      const previousSibling = next.previousSibling;
      this[_enqueueShow](previousSibling);
      this[_childObserver].observe(previousSibling);
      this[_visibleRange].setStartBefore(previousSibling);

      // Trigger the callback.
      this[_spaceObserver].unobserve(this[_spaceBefore]);
      this[_spaceObserver].observe(this[_spaceBefore]);

      next = previousSibling;
    }
  }

  [_fillEnd](entry) {
    // Add new elements to the end of the visible range.
    let estimatedAddedHeight = 0;
    let next = this.childNodes[this[_visibleRange].endOffset] || null;
    while (next !== null && estimatedAddedHeight < entry.intersectionRect.height) {
      this[_enqueueShow](next);
      estimatedAddedHeight += this[_heightEstimator].estimateHeight(next);
      this[_childObserver].observe(next);
      this[_visibleRange].setEndAfter(next);

      // Trigger the callback.
      this[_spaceObserver].unobserve(this[_spaceAfter]);
      this[_spaceObserver].observe(this[_spaceAfter]);

      next = next.nextSibling;
    }
  }

  [_childObserverCallback](entries) {
    for (const entry of entries) {
      const child = entry.target;
      this[_heightEstimator].set(child, entry.boundingClientRect.height);

      if (entry.isIntersecting) return;

      if (this[_visibleRange].intersectsNode(child)) {
        if (entry.boundingClientRect.bottom < entry.rootBounds.top) {
          this[_visibleRange].setStartAfter(child);
        } else if (entry.rootBounds.bottom < entry.boundingClientRect.top) {
          this[_visibleRange].setEndBefore(child);
        }
      }

      this[_childObserver].unobserve(child);
      this[_enqueueHide](child);
    }
  }

  [_enqueueShow](child) {
    if (this[_flushPendingToHide].has(child)) {
      this[_flushPendingToHide].delete(child);
    }
    this[_flushPendingToShow].add(child);
    this[_enqueueFlush]();
  }

  [_enqueueHide](child) {
    if (this[_flushPendingToShow].has(child)) {
      this[_flushPendingToShow].delete(child);
    }
    this[_flushPendingToHide].add(child);
    this[_enqueueFlush]();
  }

  [_enqueueFlush]() {
    if (this[_flushPending]) return;
    this[_flushPending] = true;

    window.requestAnimationFrame(() => this[_flush]());
  }

  [_flush]() {
    this[_flushPending] = false;

    for (const child of this[_flushPendingToHide]) {
      this[_hideChild](child);
    }
    this[_flushPendingToHide].clear();

    for (const child of this[_flushPendingToShow]) {
      this[_showChild](child);
    }
    this[_flushPendingToShow].clear();

    this[_updateScrollbar]();
  }

  [_updateScrollbar]() {
    const childNodes = this.childNodes;
    const childNodesLength = childNodes.length;
    const visibleRange = this[_visibleRange];
    const visibleRangeStartOffset = visibleRange.startOffset;
    const visibleRangeEndOffset = visibleRange.endOffset;

    let beforeEstimate = 0;
    for (let i = 0; i < visibleRangeStartOffset; i++) {
      const node = childNodes[i];
      beforeEstimate += this[_heightEstimator].estimateHeight(node);
    }

    let afterEstimate = 0;
    for (let i = visibleRangeEndOffset; i < childNodesLength; i++) {
      const node = childNodes[i];
      afterEstimate += this[_heightEstimator].estimateHeight(node);
    }

    this[_spaceBefore].style.height = `${beforeEstimate}px`;
    this[_spaceAfter].style.height = `${afterEstimate}px`;
  }
}

customElements.define('virtual-content', VirtualContent);
