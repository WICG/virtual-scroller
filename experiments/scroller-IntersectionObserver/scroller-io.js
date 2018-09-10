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
      for (const child of Array.from(this.children)) {
        this[_showChild](child);

        if (this[_visibleRangeStart] === undefined) {
          this[_visibleRangeStart] = child;
        }
        this[_visibleRangeEnd] = child;

        if (this.scrollHeight > this.clientHeight) {
          break;
        }
      }
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
        const next = this[_visibleRangeEnd].nextElementSibling;
        if (next) {
          this[_visibleRangeEnd] = next;
          this[_showChild](next);
        }
      }
    }
    console.groupEnd();
  }
}

customElements.define('scroller-io', ScrollerIO);
