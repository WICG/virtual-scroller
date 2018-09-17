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
<slot name="visible"></slot>
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
      this[_fillEnd]();
    });
  }

  [_showChild](child) {
    const scrollTop = this.scrollTop;
    child.setAttribute('slot', 'visible');
    this.scrollTop = scrollTop;
    this[_heightEstimator].set(child, child.getBoundingClientRect().height);
  }

  [_hideChild](child) {
    this[_heightEstimator].set(child, child.getBoundingClientRect().height);
    child.removeAttribute('slot');
  }

  [_observerCallback](entries) {
    for (const entry of entries) {
      if (entry.target === this[_spaceAfter] && entry.intersectionRatio > 0) {
        this[_fillEnd]();
      }
    }
  }

  [_fillEnd]() {
    const firstElementChild = this.firstElementChild;
    if (!firstElementChild) return;

    if (this[_visibleRangeStart] === undefined) {
      this[_visibleRangeStart] = firstElementChild;
      this[_visibleRangeEnd] = firstElementChild;
      this[_showChild](firstElementChild);
    }

    let next = this[_visibleRangeEnd].nextElementSibling;
    if (next !== null) {
      const thisRect = this.getBoundingClientRect();
      let afterRect = this[_spaceAfter].getBoundingClientRect();

      while (next !== null && rectsIntersect(thisRect, afterRect)) {
        this[_visibleRangeEnd] = next;
        this[_showChild](next);
        next = next.nextElementSibling;

        afterRect = this[_spaceAfter].getBoundingClientRect();
      }

      // Trigger the callback.
      this[_observer].unobserve(this[_spaceAfter]);
      this[_observer].observe(this[_spaceAfter]);
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
        state = visibleState;
      }

      if (state === beforeState) {
        beforeHeight += this[_heightEstimator].estimateHeight(child);
      } else if (state === afterState) {
        afterHeight += this[_heightEstimator].estimateHeight(child);
      }

      if (child === this[_visibleRangeEnd]) {
        state = afterState;
      }
    }

    this[_spaceBefore].style.height = `${beforeHeight}px`;
    this[_spaceAfter].style.height = `${afterHeight}px`;
  }
}

customElements.define('scroller-io', ScrollerIO);
