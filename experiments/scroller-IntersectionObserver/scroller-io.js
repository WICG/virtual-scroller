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
  position: relative;
  overflow: auto;
}

#spaceBefore, #spaceAfter {
  min-height: 1px;
  width: 100%;
  background-color: #fff8f8;
}

::slotted(*) {
  border-width: 1px 0px;
  border-style: dotted;
  border-color: magenta;
}
</style>
<div id="spaceBefore"></div>
<slot></slot>
<div id="spaceAfter"></div>
`;

const _spaceBefore = Symbol('ScrollerIO#_spaceBefore');
const _spaceAfter = Symbol('ScrollerIO#_spaceAfter');
const _spaceObserverCallback = Symbol('ScrollerIO#_spaceObserverCallback');
const _spaceObserver = Symbol('ScrollerIO#_spaceObserver');
const _childObserverCallback = Symbol('ScrollerIO#_childObserverCallback');
const _childObserver = Symbol('ScrollerIO#_childObserver');
const _visibleRange = Symbol('ScrollerIO#_visibleRange');
const _heightEstimator = Symbol('ScrollerIO#_heightEstimator');

const _showChild = Symbol('ScrollerIO#_showChild');
const _hideChild = Symbol('ScrollerIO#_hideChild');
const _fillStart = Symbol('ScrollerIO#_fillStart');
const _fillEnd = Symbol('ScrollerIO#_fillEnd');
const _updateScrollbar = Symbol('ScrollerIO#_updateScrollbar');

class ScrollerIO extends HTMLElement {
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
    this[_spaceObserver] =
        new IntersectionObserver(this[_spaceObserverCallback], {
          root: document.scrollingElement,
        });
    this[_spaceObserver].observe(this[_spaceBefore]);
    this[_spaceObserver].observe(this[_spaceAfter]);

    this[_childObserverCallback] = this[_childObserverCallback].bind(this);
    this[_childObserver] =
        new IntersectionObserver(this[_childObserverCallback], {
          root: document.scrollingElement,
        });

    this[_heightEstimator] = new HeightEstimator();

    window.requestAnimationFrame(() => {
      // TODO: This isn't the right place for this initialization logic.
      for (let child = this.firstElementChild; child !== null; child = child.nextElementSibling) {
        this[_hideChild](child);
      }

      this.setAttribute('ready', '');

      this[_fillEnd]({
        rootBounds: this.getBoundingClientRect(),
        boundingClientRect: this[_spaceAfter].getBoundingClientRect(),
      });
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

  [_childObserverCallback](entries) {
    const lastEntryAlreadyProcessed = new Set();
    let needsScrollbarUpdate = false;

    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry.isIntersecting) return;

      const child = entry.target;
      if (lastEntryAlreadyProcessed.has(child)) {
        continue;
      }
      lastEntryAlreadyProcessed.add(child);

      this[_heightEstimator].set(child, entry.boundingClientRect.height);

      if (this[_visibleRange].intersectsNode(child)) {
        if (entry.boundingClientRect.bottom < entry.rootBounds.top) {
          this[_visibleRange].setStartAfter(child);
        } else if (entry.rootBounds.bottom < entry.boundingClientRect.top) {
          this[_visibleRange].setEndBefore(child);
        }
      }
      this[_childObserver].unobserve(child);
      this[_hideChild](child);
      needsScrollbarUpdate = true;
    }

    if (needsScrollbarUpdate) {
      this[_updateScrollbar]();
    }
  }

  [_fillStart](entry) {
  }

  [_fillEnd](entry) {
    const thisRect = entry.rootBounds;

    // Add new elements to the end of the visible range.
    let next = this.childNodes[this[_visibleRange].endOffset].nextElementSibling;
    if (next !== null) {
      const scrollTop = this.scrollTop;
      this[_showChild](next);
      this[_childObserver].observe(next);
      this.scrollTop = scrollTop;

      this[_visibleRange].setEndAfter(next);
      this[_heightEstimator].set(next, next.getBoundingClientRect().height);

      // Trigger the callback.
      this[_spaceObserver].unobserve(this[_spaceAfter]);
      this[_spaceObserver].observe(this[_spaceAfter]);
    }

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

customElements.define('scroller-io', ScrollerIO);
