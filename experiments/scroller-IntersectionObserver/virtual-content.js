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
const _nextHiddenBeforeRange = Symbol('VirtualContent#_nextHiddenBeforeRange');
const _nextHiddenAfterRange = Symbol('VirtualContent#_nextHiddenAfterRange');

const _heightEstimator = Symbol('VirtualContent#_heightEstimator');

const _showChild = Symbol('VirtualContent#_showChild');
const _hideChild = Symbol('VirtualContent#_hideChild');
const _childIsVisible = Symbol('VirtualContent#_childIsVisible');

const _expandStart = Symbol('VirtualContent#_expandStart');
const _expandEnd = Symbol('VirtualContent#_expandEnd');
const _moveEnd = Symbol('VirtualContent#_moveEnd');
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

    this[_nextHiddenBeforeRange] = this[_hiddenBeforeRange].cloneRange();
    this[_nextHiddenAfterRange] = this[_hiddenAfterRange].cloneRange();

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

      // Wait for the browser to set the initial scroll position. This might
      // not be the top because the browser may try to keep the scroll position
      // consistent between refreshes.
      window.setTimeout(() => {
        this[_spaceObserver].observe(this[_spaceBefore]);
        this[_spaceObserver].observe(this[_spaceAfter]);
      }, 0);

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

  [_childIsVisible](child) {
    return !child.hasAttribute('invisible');
  }

  [_spaceObserverCallback](entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      if (entry.target === this[_spaceBefore]) {
        const fillDifference = entry.boundingClientRect.bottom - entry.rootBounds.bottom;
        if (fillDifference < 1000) {
          this[_expandStart](entry);
        } else {
          console.warn('NOT IMPLEMENTED: `this[_moveStart](entry, fillDifference);`');
          this[_expandStart](entry);
        }
      } else if (entry.target === this[_spaceAfter]) {
        const fillDifference = entry.rootBounds.top - entry.boundingClientRect.top;
        if (fillDifference < 1000) {
          this[_expandEnd](entry);
        } else {
          this[_moveEnd](entry, fillDifference);
        }
      }
    }
  }

  [_expandStart](entry) {
    // Add new elements to the start of the visible range.
    let estimatedAddedHeight = 0;
    let next = this.childNodes[this[_hiddenBeforeRange].endOffset] || null;
    while (next !== null && next.previousSibling !== null && estimatedAddedHeight < (entry.intersectionRect.height + 1)) {
      const previousSibling = next.previousSibling;
      this[_enqueueShow](previousSibling);
      estimatedAddedHeight += this[_heightEstimator].estimateHeight(previousSibling);
      this[_nextHiddenBeforeRange].setEndBefore(previousSibling);

      next = previousSibling;
    }
  }

  [_moveEnd](entry, difference) {
    console.log('_moveEnd', entry, difference);

    const childNodes = this.childNodes;
    let estimatedAdjustedHeight = 0;

    // Hide all currently visible nodes in the before area.
    for (let i = this[_hiddenBeforeRange].endOffset; i < this[_hiddenAfterRange].startOffset; i++) {
      const child = childNodes[i];

      if (this[_childIsVisible](child)) {
        const height = child.getBoundingClientRect().height;
        estimatedAdjustedHeight += height;
        this[_heightEstimator].set(child, height);
        this[_enqueueHide](child);
      } else {
        estimatedAdjustedHeight += this[_heightEstimator].estimateHeight(child);
      }
    }
    this[_hiddenBeforeRange].setEnd(this, this[_hiddenAfterRange].startOffset);

    // Slide the now-mutual hidden area bounds forward until reaching the first
    // node that should appear within the viewport.
    let moveIndex = this[_hiddenBeforeRange].endOffset;
    while (estimatedAdjustedHeight < difference) {
      const child = childNodes[moveIndex];
      estimatedAdjustedHeight += this[_heightEstimator].estimateHeight(child);
      moveIndex++;
    }
    this[_hiddenBeforeRange].setEnd(this, moveIndex);
    this[_hiddenAfterRange].setStart(this, moveIndex);

    this[_expandEnd](entry);
  }

  [_expandEnd](entry) {
    // Add new elements to the end of the visible range.
    let estimatedAddedHeight = 0;
    let next = this.childNodes[this[_hiddenAfterRange].startOffset] || null;
    while (next !== null && estimatedAddedHeight < (entry.intersectionRect.height + 1)) {
      this[_enqueueShow](next);
      estimatedAddedHeight += this[_heightEstimator].estimateHeight(next);
      this[_nextHiddenAfterRange].setStartAfter(next);

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
          !this[_nextHiddenBeforeRange].intersectsNode(child)) {
        this[_nextHiddenBeforeRange].setEndAfter(child);
      } else if (entry.rootBounds.bottom < entry.boundingClientRect.top &&
          !this[_nextHiddenAfterRange].intersectsNode(child)) {
        this[_nextHiddenAfterRange].setStartBefore(child);
      }

      this[_enqueueHide](child);
    }
  }

  [_enqueueShow](child) {
    if (this[_flushPendingToHide].has(child)) {
      this[_flushPendingToHide].delete(child);
    }
    if (!this[_childIsVisible](child)) {
      this[_flushPendingToShow].add(child);
    }
    this[_enqueueFlush]();
  }

  [_enqueueHide](child) {
    if (this[_flushPendingToShow].has(child)) {
      this[_flushPendingToShow].delete(child);
    }
    if (this[_childIsVisible](child)) {
      this[_flushPendingToHide].add(child);
    }
    this[_enqueueFlush]();
  }

  [_enqueueFlush]() {
    if (this[_flushPending]) return;
    this[_flushPending] = true;

    window.requestAnimationFrame(() => this[_flush]());
  }

  [_flush]() {
    this[_flushPending] = false;

    // Save the bounding rect of the first element in the intersection between
    // the old and new visible ranges, if any.
    const intersectionStartIndex = Math.max(
        this[_hiddenBeforeRange].endOffset,
        this[_nextHiddenBeforeRange].endOffset);
    const intersectionEndIndex = Math.min(
        this[_hiddenAfterRange].startOffset,
        this[_nextHiddenAfterRange].startOffset);
    const firstIntersectionElement =
        intersectionStartIndex < intersectionEndIndex ?
        this.childNodes[intersectionStartIndex] :
        undefined;
    const firstIntersectionElementStartRect =
        firstIntersectionElement !== undefined ?
        firstIntersectionElement.getBoundingClientRect() :
        undefined;

    // Given that we just forced layout to get the intersection position, go
    // ahead and request the bounds for all the elements that we're about to
    // hide and give them to the height estimator.
    //
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

    // Set the current ranges to the updated ranges.
    this[_hiddenBeforeRange] = this[_nextHiddenBeforeRange].cloneRange();
    this[_hiddenAfterRange] = this[_nextHiddenAfterRange].cloneRange();

    // Update the space before and space after divs.
    this[_updateScrollbar]();

    // If there was an element in both the old and new visible regions, make
    // sure its in the same viewport-relative position.
    if (firstIntersectionElement !== undefined) {
      const firstIntersectionElementEndRect =
          firstIntersectionElement.getBoundingClientRect();
      // TODO: `document.scrollingElement` here should really be whatever
      // element happens to be the scroll parent of this element.
      document.scrollingElement.scrollTop +=
          firstIntersectionElementEndRect.top - firstIntersectionElementStartRect.top;
    }

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
