import {HeightEstimator} from './HeightEstimator.js';

const rectsIntersect = (a, b) => (
  !(b.right < a.left || a.right < b.left) &&
  !(b.bottom < a.top || a.bottom < b.top)
);


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
const _visibleRangeStart = Symbol('ScrollerIO#_visibleRangeStart');
const _visibleRangeEnd = Symbol('ScrollerIO#_visibleRangeEnd');
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

    this[_visibleRangeStart] = undefined;
    this[_visibleRangeEnd] = undefined;

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

      const firstElementChild = this.firstElementChild;
      if (this[_visibleRangeStart] === undefined) {
        this[_visibleRangeStart] = firstElementChild;
        this[_visibleRangeEnd] = firstElementChild;
        this[_showChild](firstElementChild);
      }

      this[_fillEnd]();
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
      if (entry.target === this[_spaceBefore] && entry.isIntersecting) {
        this[_fillStart]();
      }
      if (entry.target === this[_spaceAfter] && entry.isIntersecting) {
        this[_fillEnd]();
      }
    }
  }

  [_fillStart]() {
    const thisRect = this.getBoundingClientRect();


    // Add new elements to the start of the visible range.
    let next = this[_visibleRangeStart].previousElementSibling;
    if (next !== null) {
      let beforeRect = this[_spaceBefore].getBoundingClientRect();

      while (next !== null && rectsIntersect(thisRect, beforeRect)) {
        const scrollTop = this.scrollTop;
        this[_showChild](next);
        const nextRect = next.getBoundingClientRect();
        this.scrollTop = scrollTop + nextRect.height;
        this[_heightEstimator].set(next, nextRect.height);

        this[_visibleRangeStart] = next;

        next = next.previousElementSibling;
        beforeRect = this[_spaceBefore].getBoundingClientRect();
      }

      // Trigger the callback.
      this[_observer].unobserve(this[_spaceBefore]);
      this[_observer].observe(this[_spaceBefore]);
    }


    // Remove elements from the end of the visible range.
    const toHide = new Set();
    let end = this[_visibleRangeEnd];
    let endRect = end.getBoundingClientRect();
    this[_heightEstimator].set(end, endRect.height);
    while ((endRect.width === 0 && endRect.height === 0) || !rectsIntersect(thisRect, endRect)) {
      toHide.add(end);
      if (end.previousElementSibling === null) break;

      end = end.previousElementSibling;
      endRect = end.getBoundingClientRect();
      this[_heightEstimator].set(end, endRect.height);
    }
    this[_visibleRangeEnd] = end;

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

  [_fillEnd]() {
    const thisRect = this.getBoundingClientRect();


    // Add new elements to the end of the visible range.
    let next = this[_visibleRangeEnd].nextElementSibling;
    if (next !== null) {
      let afterRect = this[_spaceAfter].getBoundingClientRect();

      while (next !== null && rectsIntersect(thisRect, afterRect)) {
        const scrollTop = this.scrollTop;
        this[_showChild](next);
        this[_heightEstimator].set(next, next.getBoundingClientRect().height);
        this.scrollTop = scrollTop;
        this[_visibleRangeEnd] = next;

        next = next.nextElementSibling;
        afterRect = this[_spaceAfter].getBoundingClientRect();
      }

      // Trigger the callback.
      this[_observer].unobserve(this[_spaceAfter]);
      this[_observer].observe(this[_spaceAfter]);
    }


    // Remove elements from the start of the visible range.
    const toHide = new Set();
    let start = this[_visibleRangeStart];
    let startRect = start.getBoundingClientRect();
    this[_heightEstimator].set(start, startRect.height);
    while ((startRect.width === 0 && startRect.height === 0) || !rectsIntersect(thisRect, startRect)) {
      toHide.add(start);
      if (start.nextElementSibling === null) break;

      start = start.nextElementSibling;
      startRect = start.getBoundingClientRect();
      this[_heightEstimator].set(start, startRect.height);
    }
    this[_visibleRangeStart] = start;

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
    const beforeState = Symbol('beforeState');
    const visibleState = Symbol('visibleState');
    const afterState = Symbol('afterState');

    let state = beforeState;
    let beforeHeight = 0;
    let afterHeight = 0;
    for (let child = this.firstElementChild; child !== null; child = child.nextElementSibling) {
      if (child === this[_visibleRangeStart]) {
        if (state !== beforeState) {
          throw new Error("Invalid state.");
        }
        state = visibleState;
      }

      if (state === beforeState) {
        beforeHeight += this[_heightEstimator].estimateHeight(child);
      } else if (state === afterState) {
        afterHeight += this[_heightEstimator].estimateHeight(child);
      }

      if (child === this[_visibleRangeEnd]) {
        if (state !== visibleState) {
          throw new Error("Invalid state.");
        }
        state = afterState;
      }
    }

    this[_spaceBefore].style.height = `${beforeHeight}px`;
    this[_spaceAfter].style.height = `${afterHeight}px`;
  }
}

customElements.define('scroller-io', ScrollerIO);
