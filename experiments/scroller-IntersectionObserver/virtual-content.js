import {HeightEstimator} from './HeightEstimator.js';

// Elements further than this distance outside of viewport bounds will not be
// rendered. This value is a tradeoff between keeping a sufficient buffer of
// visible elements (so that scrolling doesn't often result in empty regions
// becoming visible) and the general cost to show or hide elements in general.
const ROOT_MARGIN_PX = window.screen.availHeight;

// When scrolling, if the user scrolls to a position that keeps the viewport
// within this distance of the previous viewport's position and its margin,
// then currently visible elements will not be hidden before attempting to move
// to the new position - all elements between the two positions will be
// rendered. Otherwise, all currently visible elements are hidden and a new
// position and set of visible elements are determined based on current height
// estimates. Note: After moving within this distance, elements that have
// become positioned outside of the viewport and margin will still be hidden.
const SEQUENTIAL_ACCESS_CUTOFF_PX = window.screen.availHeight;

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
:host {
  display: block;
  will-change: contents;
}

#spaceBefore, #spaceAfter {
  will-change: height;
  width: 100%;
  background-color: #fff0f0;
}

::slotted(*) {
  display: block !important;
  position: relative !important;
  margin: 0px !important;
  contain: content !important;
}
</style>
<div id="spaceBefore"></div>
<slot></slot>
<div id="spaceAfter"></div>
`;

const _heightBefore = Symbol('VirtualContent#_heightBefore');
const _heightAfter = Symbol('VirtualContent#_heightAfter');
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

const _moveStart = Symbol('VirtualContent#_moveStart');
const _expandStart = Symbol('VirtualContent#_expandStart');
const _moveEnd = Symbol('VirtualContent#_moveEnd');
const _expandEnd = Symbol('VirtualContent#_expandEnd');

const _flushPending = Symbol('VirtualContent#_flushPending');
const _flushPendingToShow = Symbol('VirtualContent#_flushPendingToShow');
const _flushPendingToHide = Symbol('VirtualContent#_flushPendingToHide');
const _enqueueShow = Symbol('VirtualContent#_enqueueShow');
const _enqueueHide = Symbol('VirtualContent#_enqueueHide');
const _enqueueFlush = Symbol('VirtualContent#_enqueueFlush');
const _flush = Symbol('VirtualContent#_flush');

const _updateSpace = Symbol('VirtualContent#_updateSpace');

class VirtualContent extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({mode: 'open'}).appendChild(
        TEMPLATE.content.cloneNode(true));

    this[_heightBefore] = 0;
    this[_heightAfter] = 0;
    this[_spaceBefore] = this.shadowRoot.getElementById('spaceBefore');
    this[_spaceAfter] = this.shadowRoot.getElementById('spaceAfter');

    this[_hiddenBeforeRange] = new Range();
    this[_hiddenBeforeRange].setStart(this, 0);
    this[_hiddenBeforeRange].setEnd(this, 0);

    // TODO: Reading child nodes in the constructor is technically not allowed...
    const childNodesLength = this.childNodes.length;
    this[_hiddenAfterRange] = new Range();
    this[_hiddenAfterRange].setStart(this, childNodesLength);
    this[_hiddenAfterRange].setEnd(this, childNodesLength);

    this[_nextHiddenBeforeRange] = this[_hiddenBeforeRange].cloneRange();
    this[_nextHiddenAfterRange] = this[_hiddenAfterRange].cloneRange();

    this[_spaceObserverCallback] = this[_spaceObserverCallback].bind(this);
    this[_spaceObserver] = new IntersectionObserver(this[_spaceObserverCallback], {
      rootMargin: `${ROOT_MARGIN_PX}px`,
    });

    this[_childObserverCallback] = this[_childObserverCallback].bind(this);
    this[_childObserver] = new IntersectionObserver(this[_childObserverCallback], {
      rootMargin: `${ROOT_MARGIN_PX}px`,
    });

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

      // Set `_nextHiddenAfterRange` to cover all children so that
      // `_updateSpace` will include them in the esimate for `_heightBefore`.
      // TODO: Is it correct to replace this section with a call to `_flush`?
      this[_nextHiddenAfterRange].setStart(this, 0);
      this[_updateSpace]();
      this[_hiddenAfterRange] = this[_nextHiddenAfterRange].cloneRange();

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
        if (fillDifference < (ROOT_MARGIN_PX + SEQUENTIAL_ACCESS_CUTOFF_PX)) {
          this[_expandStart](entry);
        } else {
          this[_moveStart](entry, fillDifference);
        }
      } else if (entry.target === this[_spaceAfter]) {
        const fillDifference = entry.rootBounds.top - entry.boundingClientRect.top;
        if (fillDifference < (ROOT_MARGIN_PX + SEQUENTIAL_ACCESS_CUTOFF_PX)) {
          this[_expandEnd](entry);
        } else {
          this[_moveEnd](entry, fillDifference);
        }
      }
    }
  }

  [_moveStart](entry, difference) {
    const childNodes = this.childNodes;
    let estimatedAdjustedHeight = 0;

    // Hide all currently visible nodes.
    for (let i = this[_nextHiddenBeforeRange].endOffset; i < this[_nextHiddenAfterRange].startOffset; i++) {
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

    // Move all newly hidden elements into the after range.
    this[_nextHiddenAfterRange].setStart(this, this[_nextHiddenBeforeRange].endOffset);

    // Slide the now-mutual hidden area bounds backward until reaching the
    // first node that should appear within the viewport.
    let adjustedIndex = this[_nextHiddenAfterRange].startOffset;
    for (let i = adjustedIndex - 1; i >= 0 && estimatedAdjustedHeight < difference; i--) {
      const child = childNodes[i];
      estimatedAdjustedHeight += this[_heightEstimator].estimateHeight(child);
      adjustedIndex = i;
    }
    this[_nextHiddenBeforeRange].setEnd(this, adjustedIndex);
    this[_nextHiddenAfterRange].setStart(this, adjustedIndex);

    this[_expandStart](entry);
  }

  [_expandStart](entry) {
    // Add new elements to the start of the visible range.
    let estimatedAddedHeight = 0;
    let next = this.childNodes[this[_nextHiddenBeforeRange].endOffset] || null;
    while (next !== null && next.previousSibling !== null && estimatedAddedHeight < (entry.intersectionRect.height + 1)) {
      const previousSibling = next.previousSibling;
      this[_enqueueShow](previousSibling);
      estimatedAddedHeight += this[_heightEstimator].estimateHeight(previousSibling);
      this[_nextHiddenBeforeRange].setEndBefore(previousSibling);

      next = previousSibling;
    }
  }

  [_moveEnd](entry, difference) {
    const childNodes = this.childNodes;
    const childNodesLength = childNodes.length;
    let estimatedAdjustedHeight = 0;

    // Hide all currently visible nodes.
    for (let i = this[_nextHiddenBeforeRange].endOffset; i < this[_nextHiddenAfterRange].startOffset; i++) {
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

    // Move all newly hidden elements into the before range.
    this[_nextHiddenBeforeRange].setEnd(this, this[_nextHiddenAfterRange].startOffset);

    // Slide the now-mutual hidden area bounds forward until reaching the first
    // node that should appear within the viewport.
    let adjustedIndex = this[_nextHiddenBeforeRange].endOffset;
    for (let i = adjustedIndex; i < childNodesLength && estimatedAdjustedHeight < difference; i++) {
      const child = childNodes[i];
      estimatedAdjustedHeight += this[_heightEstimator].estimateHeight(child);
      adjustedIndex = i;
    }
    this[_nextHiddenBeforeRange].setEnd(this, adjustedIndex);
    this[_nextHiddenAfterRange].setStart(this, adjustedIndex);

    this[_expandEnd](entry);
  }

  [_expandEnd](entry) {
    // Add new elements to the end of the visible range.
    let estimatedAddedHeight = 0;
    let next = this.childNodes[this[_nextHiddenAfterRange].startOffset] || null;
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

    // Update the space before and space after divs.
    this[_updateSpace]();

    // Set the current ranges to the updated ranges.
    this[_hiddenBeforeRange] = this[_nextHiddenBeforeRange].cloneRange();
    this[_hiddenAfterRange] = this[_nextHiddenAfterRange].cloneRange();

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

  [_updateSpace]() {
    const childNodes = Array.from(this.childNodes);

    // Estimate the change in `_spaceBefore`.
    const hiddenBeforeRangeEndOffset = this[_hiddenBeforeRange].endOffset;
    const nextHiddenBeforeRangeEndOffset = this[_nextHiddenBeforeRange].endOffset;

    const beforeChangeStartIndex =
        Math.min(hiddenBeforeRangeEndOffset, nextHiddenBeforeRangeEndOffset);
    const beforeChangeEndIndex =
        Math.max(hiddenBeforeRangeEndOffset, nextHiddenBeforeRangeEndOffset);

    let beforeChangeEstimate = 0;
    for (let i = beforeChangeStartIndex; i < beforeChangeEndIndex; i++) {
      beforeChangeEstimate += this[_heightEstimator].estimateHeight(childNodes[i]);
    }

    const beforeEstimate = beforeChangeEstimate *
        Math.sign(nextHiddenBeforeRangeEndOffset - hiddenBeforeRangeEndOffset);

    // Estimate the change in `_spaceAfter`.
    const hiddenAfterRangeStartOffset = this[_hiddenAfterRange].startOffset;
    const nextHiddenAfterRangeStartOffset = this[_nextHiddenAfterRange].startOffset;

    const afterChangeStartIndex =
        Math.min(hiddenAfterRangeStartOffset, nextHiddenAfterRangeStartOffset);
    const afterChangeEndIndex =
        Math.max(hiddenAfterRangeStartOffset, nextHiddenAfterRangeStartOffset);

    let afterChangeEstimate = 0;
    for (let i = afterChangeStartIndex; i < afterChangeEndIndex; i++) {
      afterChangeEstimate += this[_heightEstimator].estimateHeight(childNodes[i]);
    }

    const afterEstimate = afterChangeEstimate *
        Math.sign(hiddenAfterRangeStartOffset - nextHiddenAfterRangeStartOffset);

    this[_heightBefore] = Math.max(0, this[_heightBefore] + beforeEstimate);
    this[_heightAfter] = Math.max(0, this[_heightAfter] + afterEstimate);
    this[_spaceBefore].style.height = `${this[_heightBefore]}px`;
    this[_spaceAfter].style.height = `${this[_heightAfter]}px`;
  }
}

customElements.define('virtual-content', VirtualContent);
