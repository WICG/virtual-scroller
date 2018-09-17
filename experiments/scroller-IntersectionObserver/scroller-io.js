const rectsIntersect = (a, b) => {
  return (
    !(b.right < a.left || a.right < b.left) &&
    !(b.bottom < a.top || a.bottom < b.top)
  );
};


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

const _visibleRangeStart = Symbol('ScrollerIO#_visibleRangeStart');
const _visibleRangeEnd = Symbol('ScrollerIO#_visibleRangeEnd');

const _showChild = Symbol('ScrollerIO#_showChild');
const _hideChild = Symbol('ScrollerIO#_hideChild');

const _observer = Symbol('ScrollerIO#_observer');
const _observerCallback = Symbol('ScrollerIO#_observerCallback');

const _fillEnd = Symbol('ScrollerIO#_fillEnd');

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

    window.requestAnimationFrame(() => {
      this[_fillEnd]();
    });
  }

  [_showChild](child) {
    const scrollTop = this.scrollTop;
    child.setAttribute('slot', 'visible');
    this.scrollTop = scrollTop;
  }

  [_hideChild](child) {
    child.removeAttribute('slot');
  }

  [_observerCallback](entries) {
    console.group('_observerCallback');
    for (const entry of entries) {
      console.log(entry);
      if (entry.target === this[_spaceAfter] && entry.intersectionRatio > 0) {
        console.log(entry.target);
        this[_fillEnd]();
      }
    }
    console.groupEnd();
  }

  [_fillEnd]() {
    const firstElementChild = this.firstElementChild;
    if (!firstElementChild) return;

    if (this[_visibleRangeStart] === undefined) {
      this[_visibleRangeStart] = firstElementChild;
      this[_visibleRangeEnd] = firstElementChild;
      this[_showChild](this[_visibleRangeStart]);
    }

    let next = this[_visibleRangeEnd].nextElementSibling;
    if (next !== null) {
      console.log('next', next);
      const thisRect = this.getBoundingClientRect();
      let afterRect;

      do {
        this[_visibleRangeEnd] = next;
        this[_showChild](next);
        afterRect = this[_spaceAfter].getBoundingClientRect();

        next = next.nextElementSibling;
      } while (rectsIntersect(thisRect, afterRect));
    }
  }
}

customElements.define('scroller-io', ScrollerIO);
