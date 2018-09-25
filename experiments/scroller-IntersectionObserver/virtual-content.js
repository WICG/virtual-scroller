import {HeightEstimator} from './HeightEstimator.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
:host {
  display: block;
}

#spaceBefore, #spaceAfter {
  width: 100%;
  background-color: #fff0f0;
}

::slotted(*) {
  display: block !important;
  position: relative !important;
  margin: 0px !important;
  contain: content !important;
  border: 1px dashed magenta !important;
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

const _hiddenBeforeRange = Symbol('VirtualContent#_hiddenBeforeRange');
const _hiddenAfterRange = Symbol('VirtualContent#_hiddenAfterRange');

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

    this[_hiddenBeforeRange] = new Range();
    this[_hiddenBeforeRange].setStart(this, 0);
    this[_hiddenBeforeRange].setEnd(this, 0);

    this[_hiddenAfterRange] = new Range();
    this[_hiddenAfterRange].setStart(this, 0);
    // TODO: Reading child nodes in the constructor is technically not allowed...
    this[_hiddenAfterRange].setEnd(this, this.childNodes.length);

    this[_spaceObserverCallback] = this[_spaceObserverCallback].bind(this);
    this[_spaceObserver] = new IntersectionObserver(this[_spaceObserverCallback]);

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
        // Replace all children with block elements.
        if (child.nodeType !== Node.ELEMENT_NODE) {
          const newDiv = document.createElement('div');
          this.insertBefore(newDiv, child);
          newDiv.appendChild(child);
          child = newDiv;
        }
        this[_hideChild](child);
      }

      this[_updateScrollbar]();

      this[_spaceObserver].observe(this[_spaceBefore]);
      this[_spaceObserver].observe(this[_spaceAfter]);

      this.setAttribute('ready', '');
    });
  }

  [_showChild](child) {
    child.removeAttribute('invisible');
    this[_childObserver].observe(child);
  }

  [_hideChild](child) {
    this[_childObserver].unobserve(child);
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
    let next = this.childNodes[this[_hiddenBeforeRange].endOffset] || null;
    while (next !== null && next.previousSibling !== null && estimatedAddedHeight < (entry.boundingClientRect.bottom - entry.rootBounds.top + 1)) {
      const previousSibling = next.previousSibling;
      this[_enqueueShow](previousSibling);
      estimatedAddedHeight += this[_heightEstimator].estimateHeight(previousSibling);
      this[_hiddenBeforeRange].setEndBefore(previousSibling);

      next = previousSibling;
    }
  }

  [_fillEnd](entry) {
    // Add new elements to the end of the visible range.
    let estimatedAddedHeight = 0;
    let next = this.childNodes[this[_hiddenAfterRange].startOffset] || null;
    while (next !== null && estimatedAddedHeight < (entry.rootBounds.bottom - entry.boundingClientRect.top + 1)) {
      this[_enqueueShow](next);
      estimatedAddedHeight += this[_heightEstimator].estimateHeight(next);
      this[_hiddenAfterRange].setStartAfter(next);

      next = next.nextSibling;
    }
  }

  [_childObserverCallback](entries) {
    // Only pay attention to the last entry for any given target.
    const lastEntryForNode = new Map();
    for (const entry of entries) {
      lastEntryForNode.set(entry.target, entry);
    }

    for (const [child, entry] of lastEntryForNode) {
      this[_heightEstimator].set(child, entry.boundingClientRect.height);

      if (entry.isIntersecting) continue;

      if (entry.boundingClientRect.bottom < entry.rootBounds.top &&
          !this[_hiddenBeforeRange].intersectsNode(child)) {
        this[_hiddenBeforeRange].setEndAfter(child);
      } else if (entry.rootBounds.bottom < entry.boundingClientRect.top &&
          !this[_hiddenAfterRange].intersectsNode(child)) {
        this[_hiddenAfterRange].setStartBefore(child);
      }

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

    // Given that we just forced layout to get the intersection position, go
    // ahead and request the bounds for all the elements that we're about to
    // hide and give them to the height estimator.
    // NOTE: Do not interleave calls to `getBoundingClientRect` with
    // `#[_hideChild]` - this thrashes layout.
    for (const child of this[_flushPendingToHide]) {
      this[_heightEstimator].set(child, child.getBoundingClientRect().height);
    }

    for (const child of this[_flushPendingToHide]) {
      this[_hideChild](child);
    }
    this[_flushPendingToHide].clear();

    for (const child of this[_flushPendingToShow]) {
      this[_showChild](child);
    }
    this[_flushPendingToShow].clear();

    // Update the space before / space after divs.
    this[_updateScrollbar]();

    // Force the observer to check the intersections of both spacing elements
    // again on the next frame.
    this[_spaceObserver].unobserve(this[_spaceBefore]);
    this[_spaceObserver].observe(this[_spaceBefore]);
    this[_spaceObserver].unobserve(this[_spaceAfter]);
    this[_spaceObserver].observe(this[_spaceAfter]);
  }

  [_updateScrollbar]() {
    const childNodes = Array.from(this.childNodes);
    const childNodesLength = childNodes.length;

    const hiddenBeforeRange = this[_hiddenBeforeRange];
    const hiddenBeforeRangeStartOffset = hiddenBeforeRange.startOffset;
    const hiddenBeforeRangeEndOffset = hiddenBeforeRange.endOffset;

    let beforeEstimate = 0;
    for (let i = hiddenBeforeRangeStartOffset; i < hiddenBeforeRangeEndOffset; i++) {
      const node = childNodes[i];
      beforeEstimate += this[_heightEstimator].estimateHeight(node);
    }

    const hiddenAfterRange = this[_hiddenAfterRange];
    const hiddenAfterRangeStartOffset = hiddenAfterRange.startOffset;
    const hiddenAfterRangeEndOffset = hiddenAfterRange.endOffset;

    let afterEstimate = 0;
    for (let i = hiddenAfterRangeStartOffset; i < hiddenAfterRangeEndOffset; i++) {
      const node = childNodes[i];
      afterEstimate += this[_heightEstimator].estimateHeight(node);
    }

    this[_spaceBefore].style.height = `${beforeEstimate}px`;
    this[_spaceAfter].style.height = `${afterEstimate}px`;
  }
}

customElements.define('virtual-content', VirtualContent);
