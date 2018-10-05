import {HeightEstimator} from './HeightEstimator.js';

const sortIOEntriesByTargetDocumentPosition = (a, b) => {
  return (a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_PRECEDING) ? 1 : -1;
};

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

#spacerStart, #spacerEnd {
  will-change: height;
  width: 100%;
  background-color: #fff0f0;
}

::slotted(*) {
  display: block !important;
  position: relative !important;
  margin: 0px !important;
  contain: layout !important;
}
</style>
<div id="spacerStart"></div>
<slot></slot>
<div id="spacerEnd"></div>
`;

const _spacerStart = Symbol('VirtualContent#[_spacerStart]');
const _spacerStartHeight = Symbol('VirtualContent#[_spacerStartHeight]');
const _spacerEnd = Symbol('VirtualContent#[_spacerEnd]');
const _spacerEndHeight = Symbol('VirtualContent#[_spacerEndHeight]');

const _thisObserverCallback = Symbol('VirtualContent#[_thisObserverCallback]');
const _thisObserver = Symbol('VirtualContent#[_thisObserver]');
const _spacerObserverCallback = Symbol('VirtualContent#[_spacerObserverCallback]');
const _spacerObserver = Symbol('VirtualContent#[_spacerObserver]');
const _childObserverCallback = Symbol('VirtualContent#[_childObserverCallback]');
const _childObserver = Symbol('VirtualContent#[_childObserver]');

const _hiddenStartRange = Symbol('VirtualContent#[_hiddenStartRange]');
const _hiddenEndRange = Symbol('VirtualContent#[_hiddenEndRange]');
const _nextHiddenStartRange = Symbol('VirtualContent#[_nextHiddenStartRange]');
const _nextHiddenEndRange = Symbol('VirtualContent#[_nextHiddenEndRange]');

const _heightEstimator = Symbol('VirtualContent#[_heightEstimator]');

const _showChild = Symbol('VirtualContent#[_showChild]');
const _hideChild = Symbol('VirtualContent#[_hideChild]');
const _childIsVisible = Symbol('VirtualContent#[_childIsVisible]');
const _hideNextVisibleRange = Symbol('VirtualContent#[_hideNextVisibleRange]');

const _moveStart = Symbol('VirtualContent#[_moveStart]');
const _expandStart = Symbol('VirtualContent#[_expandStart]');
const _moveEnd = Symbol('VirtualContent#[_moveEnd]');
const _expandEnd = Symbol('VirtualContent#[_expandEnd]');

const _flushPending = Symbol('VirtualContent#[_flushPending]');
const _childrenPendingShow = Symbol('VirtualContent#[_childrenPendingShow]');
const _childrenPendingHide = Symbol('VirtualContent#[_childrenPendingHide]');
const _enqueueShow = Symbol('VirtualContent#[_enqueueShow]');
const _enqueueHide = Symbol('VirtualContent#[_enqueueHide]');
const _enqueueFlush = Symbol('VirtualContent#[_enqueueFlush]');
const _flush = Symbol('VirtualContent#[_flush]');

const _updateSpacers = Symbol('VirtualContent#[_updateSpacers]');

export class VirtualContent extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({mode: 'open'}).appendChild(
        TEMPLATE.content.cloneNode(true));

    this[_spacerStart] = this.shadowRoot.getElementById('spacerStart');
    this[_spacerStartHeight] = 0;
    this[_spacerEnd] = this.shadowRoot.getElementById('spacerEnd');
    this[_spacerEndHeight] = 0;

    this[_hiddenStartRange] = new Range();
    this[_hiddenStartRange].setStart(this, 0);
    this[_hiddenStartRange].setEnd(this, 0);

    // TODO: Reading child nodes in the constructor is technically not allowed...
    const childNodesLength = this.childNodes.length;
    this[_hiddenEndRange] = new Range();
    this[_hiddenEndRange].setStart(this, childNodesLength);
    this[_hiddenEndRange].setEnd(this, childNodesLength);

    this[_nextHiddenStartRange] = this[_hiddenStartRange].cloneRange();
    this[_nextHiddenEndRange] = this[_hiddenEndRange].cloneRange();

    this[_thisObserverCallback] = this[_thisObserverCallback].bind(this);
    this[_thisObserver] = new IntersectionObserver(this[_thisObserverCallback], {
      rootMargin: `${ROOT_MARGIN_PX}px`,
    });
    this[_thisObserver].observe(this);

    this[_spacerObserverCallback] = this[_spacerObserverCallback].bind(this);
    this[_spacerObserver] = new IntersectionObserver(this[_spacerObserverCallback], {
      rootMargin: `${ROOT_MARGIN_PX}px`,
    });

    this[_childObserverCallback] = this[_childObserverCallback].bind(this);
    this[_childObserver] = new IntersectionObserver(this[_childObserverCallback], {
      rootMargin: `${ROOT_MARGIN_PX}px`,
    });

    this[_heightEstimator] = new HeightEstimator();

    this[_flush] = this[_flush].bind(this);
    this[_flushPending] = false;
    this[_childrenPendingShow] = new Set();
    this[_childrenPendingHide] = new Set();

    window.requestAnimationFrame(() => {
      this.normalize();

      // TODO: This isn't the right place for this initialization logic.
      let child = this.firstChild;
      while (child !== null) {
        // Remove text that would become a zero-height box.
        if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim() === '') {
          const next = child.nextSibling;
          this.removeChild(child);
          child = next;
          continue;
        }

        // Replace all children with block elements.
        if (child.nodeType !== Node.ELEMENT_NODE) {
          const newDiv = document.createElement('div');
          this.insertBefore(newDiv, child);
          newDiv.appendChild(child);
          child = newDiv;
        }

        this[_hideChild](child);
        child = child.nextSibling;
      }

      // Set `_nextHiddenEndRange` to cover all children so that
      // `_updateSpacers` will include them in the esimate for `_spacerStartHeight`.
      // TODO: Is it correct to replace this section with a call to `_flush`?
      this[_nextHiddenEndRange].setStart(this, 0);
      this[_updateSpacers]();
      this[_hiddenEndRange] = this[_nextHiddenEndRange].cloneRange();

      // Wait for the browser to set the initial scroll position. This might
      // not be the top because the browser may try to keep the scroll position
      // consistent between refreshes.
      window.setTimeout(() => {
        this[_spacerObserver].observe(this[_spacerStart]);
        this[_spacerObserver].observe(this[_spacerEnd]);
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

  appendChild(fragment) {
    if (!(fragment instanceof DocumentFragment)) {
      const newFragment = new DocumentFragment();
      newFragment.appendChild(fragment);
      fragment = newFragment;
    }

    let child = fragment.firstChild;
    while (child !== null) {
      // Remove text that would become a zero-height box.
      if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim() === '') {
        const next = child.nextSibling;
        fragment.removeChild(child);
        child = next;
        continue;
      }

      // Replace all children with block elements.
      if (child.nodeType !== Node.ELEMENT_NODE) {
        const newDiv = document.createElement('div');
        fragment.insertBefore(newDiv, child);
        newDiv.appendChild(child);
        child = newDiv;
      }

      this[_hideChild](child);
      child = child.nextSibling;
    }
    super.appendChild(fragment);

    const length = this.childNodes.length;
    this[_nextHiddenEndRange].setEnd(this, length);
    this[_updateSpacers](true);
    this[_hiddenEndRange].setEnd(this, length);

    this[_spacerObserver].unobserve(this[_spacerStart]);
    this[_spacerObserver].observe(this[_spacerStart]);
    this[_spacerObserver].unobserve(this[_spacerEnd]);
    this[_spacerObserver].observe(this[_spacerEnd]);
  }

  [_hideNextVisibleRange]() {
    const childNodes = this.childNodes;
    let estimatedAdjustedHeight = 0;

    for (let i = this[_nextHiddenStartRange].endOffset; i < this[_nextHiddenEndRange].startOffset; i++) {
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

    return estimatedAdjustedHeight;
  }

  [_thisObserverCallback](entries) {
    const childNodes = this.childNodes;
    let didMoveToEdge = false;

    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      if (entry.target !== this) {
        throw new Error('IntersectionObserverEntry target was not `this`.');
      }

      // Move to the start.
      if (entry.rootBounds.top < entry.boundingClientRect.top &&
          entry.boundingClientRect.top < entry.rootBounds.bottom &&
          entry.rootBounds.bottom < entry.boundingClientRect.bottom) {
        this[_hideNextVisibleRange]();
        this[_nextHiddenStartRange].setEnd(this, 0);
        this[_nextHiddenEndRange].setStart(this, 0);
        this[_expandEnd](entry.rootBounds.bottom - entry.boundingClientRect.top);
        didMoveToEdge = true;
      }

      // Move to the end.
      if (entry.boundingClientRect.top < entry.rootBounds.top &&
          entry.rootBounds.top < entry.boundingClientRect.bottom &&
          entry.boundingClientRect.bottom < entry.rootBounds.bottom) {
        this[_hideNextVisibleRange]();
        const childNodesLength = childNodes.length;
        this[_nextHiddenStartRange].setEnd(this, childNodesLength);
        this[_nextHiddenEndRange].setStart(this, childNodesLength);
        this[_expandStart](entry.boundingClientRect.bottom - entry.rootBounds.top);
        didMoveToEdge = true;
      }
    }

    if (didMoveToEdge) {
      // Throw away any pending entries from the spacer observer (which may
      // have been invalidated by sliding the visible region to an edge) and
      // recompute.
      this[_spacerObserver].takeRecords();
      this[_spacerObserver].unobserve(this[_spacerStart]);
      this[_spacerObserver].observe(this[_spacerStart]);
      this[_spacerObserver].unobserve(this[_spacerEnd]);
      this[_spacerObserver].observe(this[_spacerEnd]);
    }
  }

  [_spacerObserverCallback](entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      if (entry.target === this[_spacerStart]) {
        const fillDifference = entry.boundingClientRect.bottom - entry.rootBounds.bottom;
        if (fillDifference < SEQUENTIAL_ACCESS_CUTOFF_PX) {
          this[_expandStart](entry.intersectionRect.height + 1);
        } else {
          this[_moveStart](fillDifference, entry.intersectionRect.height + 1);
        }
      } else if (entry.target === this[_spacerEnd]) {
        const fillDifference = entry.rootBounds.top - entry.boundingClientRect.top;
        if (fillDifference < SEQUENTIAL_ACCESS_CUTOFF_PX) {
          this[_expandEnd](entry.intersectionRect.height + 1);
        } else {
          this[_moveEnd](fillDifference, entry.intersectionRect.height + 1);
        }
      }
    }
  }

  [_moveStart](distance, fillHeight) {
    const childNodes = this.childNodes;

    // Hide all currently visible nodes.
    let estimatedAdjustedHeight = this[_hideNextVisibleRange]();

    // Move all newly hidden elements into the end range.
    this[_nextHiddenEndRange].setStart(this, this[_nextHiddenStartRange].endOffset);

    // Slide the now-mutual hidden area bounds backward until reaching the
    // first node that should appear within the viewport.
    let adjustedIndex = this[_nextHiddenEndRange].startOffset;
    for (let i = adjustedIndex - 1; i >= 0 && estimatedAdjustedHeight < distance; i--) {
      const child = childNodes[i];
      estimatedAdjustedHeight += this[_heightEstimator].estimateHeight(child);
      adjustedIndex = i;
    }
    this[_nextHiddenStartRange].setEnd(this, adjustedIndex);
    this[_nextHiddenEndRange].setStart(this, adjustedIndex);

    this[_expandStart](fillHeight);
  }

  [_expandStart](distance) {
    // Add new elements to the start of the visible range.
    let estimatedAddedHeight = 0;
    let next = this.childNodes[this[_nextHiddenStartRange].endOffset] || null;
    let previousSibling = next === null ? this.lastChild : next.previousSibling;
    let nextFirstVisibleNode = undefined;

    while (previousSibling !== null && estimatedAddedHeight < distance) {
      this[_enqueueShow](previousSibling);
      estimatedAddedHeight += this[_heightEstimator].estimateHeight(previousSibling);
      nextFirstVisibleNode = previousSibling;
      next = previousSibling;
      previousSibling = next.previousSibling;
    }

    if (nextFirstVisibleNode !== undefined) {
      this[_nextHiddenStartRange].setEndBefore(nextFirstVisibleNode);
    }
  }

  [_moveEnd](distance, fillHeight) {
    const childNodes = this.childNodes;
    const childNodesLength = childNodes.length;

    // Hide all currently visible nodes.
    let estimatedAdjustedHeight = this[_hideNextVisibleRange]();

    // Move all newly hidden elements into the start range.
    this[_nextHiddenStartRange].setEnd(this, this[_nextHiddenEndRange].startOffset);

    // Slide the now-mutual hidden area bounds forward until reaching the first
    // node that should appear within the viewport.
    let adjustedIndex = this[_nextHiddenStartRange].endOffset;
    for (let i = adjustedIndex; i < childNodesLength && estimatedAdjustedHeight < distance; i++) {
      const child = childNodes[i];
      estimatedAdjustedHeight += this[_heightEstimator].estimateHeight(child);
      adjustedIndex = i;
    }
    this[_nextHiddenStartRange].setEnd(this, adjustedIndex);
    this[_nextHiddenEndRange].setStart(this, adjustedIndex);

    this[_expandEnd](fillHeight);
  }

  [_expandEnd](distance) {
    // Add new elements to the end of the visible range.
    let estimatedAddedHeight = 0;
    let next = this.childNodes[this[_nextHiddenEndRange].startOffset] || null;
    let nextLastVisibleNode = undefined;

    while (next !== null && estimatedAddedHeight < distance) {
      this[_enqueueShow](next);
      estimatedAddedHeight += this[_heightEstimator].estimateHeight(next);
      nextLastVisibleNode = next;
      next = next.nextSibling;
    }

    if (nextLastVisibleNode !== undefined) {
      this[_nextHiddenEndRange].setStartAfter(nextLastVisibleNode);
    }
  }

  [_childObserverCallback](entries) {
    // Only pay attention to the last entry for any given target.
    const lastEntryForNode = new Map();
    for (const entry of entries) {
      lastEntryForNode.set(entry.target, entry);
    }

    const newHiddenStartChildEntries = [];
    const newHiddenEndChildEntries = [];

    for (const entry of lastEntryForNode.values()) {
      const child = entry.target;
      this[_heightEstimator].set(child, entry.boundingClientRect.height);

      if (entry.isIntersecting) continue;

      const rootRect = entry.rootBounds;
      const childRect = entry.boundingClientRect;

      if (childRect.bottom < rootRect.top) {
        newHiddenStartChildEntries.push(entry);
      } else if (rootRect.bottom < childRect.top) {
        newHiddenEndChildEntries.push(entry);
      }

      this[_enqueueHide](child);
    }

    if (newHiddenStartChildEntries.length > 0) {
      // Find the last newly hidden child on the start side of the visible set
      // and set the next start range's end to after that child.
      newHiddenStartChildEntries.sort(sortIOEntriesByTargetDocumentPosition);
      while (newHiddenStartChildEntries.length > 0) {
        const child = newHiddenStartChildEntries.pop().target;
        if (!this[_nextHiddenStartRange].intersectsNode(child)) {
          this[_nextHiddenStartRange].setEndAfter(child);
          break;
        }
      }
    }

    if (newHiddenEndChildEntries.length > 0) {
      // Find the first newly hidden child on the end side of the visible set
      // and set the next end range's start to before that child.
      newHiddenEndChildEntries.sort(sortIOEntriesByTargetDocumentPosition).reverse();
      while (newHiddenEndChildEntries.length > 0) {
        const child = newHiddenEndChildEntries.pop().target;
        if (!this[_nextHiddenEndRange].intersectsNode(child)) {
          this[_nextHiddenEndRange].setStartBefore(child);
          break;
        }
      }
    }
  }

  [_enqueueShow](child) {
    if (this[_childrenPendingHide].has(child)) {
      this[_childrenPendingHide].delete(child);
    }
    if (!this[_childIsVisible](child)) {
      this[_childrenPendingShow].add(child);
    }
    this[_enqueueFlush]();
  }

  [_enqueueHide](child) {
    if (this[_childrenPendingShow].has(child)) {
      this[_childrenPendingShow].delete(child);
    }
    if (this[_childIsVisible](child)) {
      this[_childrenPendingHide].add(child);
    }
    this[_enqueueFlush]();
  }

  [_enqueueFlush]() {
    if (this[_flushPending]) return;
    this[_flushPending] = true;

    window.requestAnimationFrame(this[_flush]);
  }

  [_flush]() {
    this[_flushPending] = false;

    // Save the bounding rect of the first element in the intersection between
    // the old and new visible ranges, if any.
    const intersectionStartIndex = Math.max(
        this[_hiddenStartRange].endOffset,
        this[_nextHiddenStartRange].endOffset);
    const intersectionEndIndex = Math.min(
        this[_hiddenEndRange].startOffset,
        this[_nextHiddenEndRange].startOffset);
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
    for (const child of this[_childrenPendingHide]) {
      this[_heightEstimator].set(child, child.getBoundingClientRect().height);
    }

    for (const child of this[_childrenPendingHide]) {
      this[_hideChild](child);
    }
    this[_childrenPendingHide].clear();

    for (const child of this[_childrenPendingShow]) {
      this[_showChild](child);
    }
    this[_childrenPendingShow].clear();

    // Update the start and end spacers.
    this[_updateSpacers]();

    // Set the current ranges to the updated ranges.
    this[_hiddenStartRange].setEnd(this, this[_nextHiddenStartRange].endOffset);
    this[_hiddenEndRange].setStart(this, this[_nextHiddenEndRange].startOffset);

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
    this[_spacerObserver].unobserve(this[_spacerStart]);
    this[_spacerObserver].observe(this[_spacerStart]);
    this[_spacerObserver].unobserve(this[_spacerEnd]);
    this[_spacerObserver].observe(this[_spacerEnd]);
  }

  [_updateSpacers](force = false) {
    const childNodes = this.childNodes;

    // Estimate the change in the start spacer height.
    const nextHiddenStartRangeEndOffset = this[_nextHiddenStartRange].endOffset;
    if (nextHiddenStartRangeEndOffset === 0) {
      this[_spacerStartHeight] = 0;
    } else if (force) {
      let startEstimate = 0;
      for (let i = 0; i < nextHiddenStartRangeEndOffset; i++) {
        startEstimate += this[_heightEstimator].estimateHeight(childNodes[i]);
      }
      this[_spacerStartHeight] = Math.max(0, startEstimate);
    } else {
      const hiddenStartRangeEndOffset = this[_hiddenStartRange].endOffset;

      const startChangeStartIndex =
          Math.min(hiddenStartRangeEndOffset, nextHiddenStartRangeEndOffset);
      const startChangeEndIndex =
          Math.max(hiddenStartRangeEndOffset, nextHiddenStartRangeEndOffset);

      let startChangeEstimate = 0;
      for (let i = startChangeStartIndex; i < startChangeEndIndex; i++) {
        startChangeEstimate += this[_heightEstimator].estimateHeight(childNodes[i]);
      }

      const startEstimate = startChangeEstimate *
          Math.sign(nextHiddenStartRangeEndOffset - hiddenStartRangeEndOffset);

      this[_spacerStartHeight] = Math.max(0, this[_spacerStartHeight] + startEstimate);
    }

    this[_spacerStart].style.height = `${this[_spacerStartHeight]}px`;

    // Estimate the change in the end spacer height.
    const nextHiddenEndRangeStartOffset = this[_nextHiddenEndRange].startOffset;
    if (nextHiddenEndRangeStartOffset === childNodes.length) {
      this[_spacerEndHeight] = 0;
    } else if (force) {
      let endEstimate = 0;
      for (let i = nextHiddenEndRangeStartOffset; i < childNodes.length; i++) {
        endEstimate += this[_heightEstimator].estimateHeight(childNodes[i]);
      }
      this[_spacerEndHeight] = Math.max(0, endEstimate);
    } else {
      const hiddenEndRangeStartOffset = this[_hiddenEndRange].startOffset;

      const endChangeStartIndex =
          Math.min(hiddenEndRangeStartOffset, nextHiddenEndRangeStartOffset);
      const endChangeEndIndex =
          Math.max(hiddenEndRangeStartOffset, nextHiddenEndRangeStartOffset);

      let endChangeEstimate = 0;
      for (let i = endChangeStartIndex; i < endChangeEndIndex; i++) {
        endChangeEstimate += this[_heightEstimator].estimateHeight(childNodes[i]);
      }

      const endEstimate = endChangeEstimate *
          Math.sign(hiddenEndRangeStartOffset - nextHiddenEndRangeStartOffset);

      this[_spacerEndHeight] = Math.max(0, this[_spacerEndHeight] + endEstimate);
    }

    this[_spacerEnd].style.height = `${this[_spacerEndHeight]}px`;
  }
};

customElements.define('virtual-content', VirtualContent);
