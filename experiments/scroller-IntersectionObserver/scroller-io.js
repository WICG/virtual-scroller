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
  background-color: red;
}
</style>
<div id="spaceBefore"></div>
<slot></slot>
<div id="spaceAfter"></div>
`;

const _spaceBefore = Symbol('ScrollerIO#_spaceBefore');
const _spaceAfter = Symbol('ScrollerIO#_spaceAfter');
const _observer = Symbol('ScrollerIO#_observer');
const _observerCallback = Symbol('ScrollerIO#_observerCallback');
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

    this[_observerCallback] =
        this[_observerCallback].bind(this);

    this.attachShadow({mode: 'open'}).appendChild(
        TEMPLATE.content.cloneNode(true));

    this[_spaceBefore] = this.shadowRoot.getElementById('spaceBefore');
    this[_spaceAfter] = this.shadowRoot.getElementById('spaceAfter');

    this[_visibleRange] = new Range();
    this[_visibleRange].setStart(this, 0);
    this[_visibleRange].setEnd(this, 0);

    this[_observer] =
        new IntersectionObserver(this[_observerCallback], {
          root: document.scrollingElement,
        });
    this[_observer].observe(this[_spaceBefore]);
    this[_observer].observe(this[_spaceAfter]);

    this[_heightEstimator] = new HeightEstimator();

    window.requestAnimationFrame(() => {
      // TODO: This isn't the right place for this initialization logic.
      for (let child = this.firstElementChild; child !== null; child = child.nextElementSibling) {
        this[_hideChild](child);
      }


      this[_fillEnd]({
        boundingClientRect: this[_spaceAfter].getBoundingClientRect(),
        rootBounds: this.getBoundingClientRect(),
      });
    });
  }

  [_showChild](child) {
    child.removeAttribute('invisible');
  }

  [_hideChild](child) {
    child.setAttribute('invisible', '');
  }

  [_observerCallback](entries) {
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
    const thisRect = entry.rootBounds;


    // Add new elements to the start of the visible range.
    let next = this.childNodes[this[_visibleRange].startOffset].previousElementSibling;
    if (next !== null) {
      if (next.nodeType !== Node.ELEMENT_NODE) {
        next = next.nextElementSibling;
      }

      let beforeRect = entry.boundingClientRect;

      while (next !== null && rectsIntersect(thisRect, beforeRect)) {
        const scrollTop = this.scrollTop;
        this[_showChild](next);
        const nextRect = next.getBoundingClientRect();
        this.scrollTop = scrollTop + nextRect.height;
        this[_heightEstimator].set(next, nextRect.height);

        this[_visibleRange].setStartBefore(next);

        next = next.previousElementSibling;
        beforeRect = this[_spaceBefore].getBoundingClientRect();
      }

      // Trigger the callback.
      this[_observer].unobserve(this[_spaceBefore]);
      this[_observer].observe(this[_spaceBefore]);
    }


    // Remove elements from the end of the visible range.

    let end = this.childNodes[this[_visibleRange].endOffset];
    if (end.nodeType !== Node.ELEMENT_NODE) {
      end = end.previousElementSibling;
    }
    let endRect = end.getBoundingClientRect();
    this[_heightEstimator].set(end, endRect.height);

    const toHide = new Set();
    while (!rectIsVisible(endRect) || !rectsIntersect(thisRect, endRect)) {
      toHide.add(end);
      if (end.previousElementSibling === null) break;

      end = end.previousElementSibling;
      endRect = end.getBoundingClientRect();
      this[_heightEstimator].set(end, endRect.height);
    }
    this[_visibleRange].setEndAfter(end);

    for (const child of toHide) {
      this[_hideChild](child);
    }
    if (toHide.size > 0) {
      // Trigger the callback.
      this[_observer].unobserve(this[_spaceAfter]);
      this[_observer].observe(this[_spaceAfter]);
    }


    this[_updateScrollbar]();
  }

  [_fillEnd](entry) {
    const thisRect = entry.rootBounds;


    // Add new elements to the end of the visible range.
    let next = this.childNodes[this[_visibleRange].endOffset].nextElementSibling;
    if (next !== null) {
      let afterRect = entry.boundingClientRect;

      while (next !== null && rectsIntersect(thisRect, afterRect)) {
        const scrollTop = this.scrollTop;
        this[_showChild](next);
        this[_heightEstimator].set(next, next.getBoundingClientRect().height);
        this.scrollTop = scrollTop;
        this[_visibleRange].setEndAfter(next);

        next = next.nextElementSibling;
        afterRect = this[_spaceAfter].getBoundingClientRect();
      }

      // Trigger the callback.
      this[_observer].unobserve(this[_spaceAfter]);
      this[_observer].observe(this[_spaceAfter]);
    }


    // Remove elements from the start of the visible range.
    const toHide = new Set();
    let start = this.childNodes[this[_visibleRange].startOffset];
    if (start.nodeType !== Node.ELEMENT_NODE) {
      start = start.nextElementSibling;
    }
    let startRect = start.getBoundingClientRect();
    this[_heightEstimator].set(start, startRect.height);
    while (!rectIsVisible(startRect) || !rectsIntersect(thisRect, startRect)) {
      toHide.add(start);
      if (start.nextElementSibling === null) break;

      start = start.nextElementSibling;
      startRect = start.getBoundingClientRect();
      this[_heightEstimator].set(start, startRect.height);
    }
    this[_visibleRange].setStartBefore(start);

    for (const child of toHide) {
      this[_hideChild](child);
    }
    if (toHide.size > 0) {
      // Trigger the callback.
      this[_observer].unobserve(this[_spaceBefore]);
      this[_observer].observe(this[_spaceBefore]);
    }


    this[_updateScrollbar]();
  }

  [_updateScrollbar]() {
    let beforeHeight = 0;
    let afterHeight = 0;
    for (let child = this.firstElementChild; child !== null; child = child.nextElementSibling) {
      const result = this[_visibleRange].comparePoint(child, 0);

      if (result < 0) {
        beforeHeight += this[_heightEstimator].estimateHeight(child);
      } else if (result > 0) {
        afterHeight += this[_heightEstimator].estimateHeight(child);
      }
    }

    this[_spaceBefore].style.height = `${beforeHeight}px`;
    this[_spaceAfter].style.height = `${afterHeight}px`;
  }
}

customElements.define('scroller-io', ScrollerIO);
