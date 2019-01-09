const DEFAULT_HEIGHT_ESTIMATE = 100;
const TEMPLATE = `
<style>
:host {
  /* Use flex to prevent children's margins from collapsing. Avoiding margin
   * collapsing is simpler and good enough to start with. */
  display: flex;
  flex-direction: column;

  /* Prevent the automatic scrolling between writes and later measurements,
   * which can invalidate previous layout. */
  overflow-anchor: none;
}

::slotted(*) {
  flex: 0 0 auto;
  display: block;
  position: relative;
}
</style>
<slot></slot>
`;

const _mutationObserver = Symbol('_mutationObserver');
const _mutationObserverCallback = Symbol('_mutationObserverCallback');
const _resizeObserver = Symbol('_resizeObserver');
const _resizeObserverCallback = Symbol('_resizeObserverCallback');

const _estimatedHeights = Symbol('_estimatedHeights');
const _updateRAFToken = Symbol('_updateRAFToken');

const _scheduleUpdate = Symbol('_scheduleUpdate');
const _update = Symbol('_update');

export class VirtualContent extends HTMLElement {
  constructor() {
    super();

    this[_mutationObserverCallback] = this[_mutationObserverCallback].bind(this);
    this[_resizeObserverCallback] = this[_resizeObserverCallback].bind(this);
    this[_scheduleUpdate] = this[_scheduleUpdate].bind(this);
    this[_update] = this[_update].bind(this);

    this.attachShadow({mode: 'open'}).innerHTML = TEMPLATE;

    this[_mutationObserver] = new MutationObserver(this[_mutationObserverCallback]);
    this[_mutationObserver].observe(this, {childList: true});
    this[_resizeObserver] = new ResizeObserver(this[_resizeObserverCallback]);

    this[_estimatedHeights] = new WeakMap();
    this[_updateRAFToken] = undefined;
  }

  connectedCallback() {
    window.addEventListener('scroll', this[_scheduleUpdate], {passive: true});
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this[_scheduleUpdate], {passive: true});
  }

  [_mutationObserverCallback](records) {
    const removedNodes = new Set();
    const addedNodes = new Set();

    for (const record of records) {
      for (const node of record.removedNodes) {
        if (addedNodes.has(node)) {
          addedNodes.delete(node);
        } else {
          removedNodes.add(node);
        }
      }
      for (const node of record.addedNodes) {
        if (removedNodes.has(node)) {
          removedNodes.delete(node);
        } else {
          addedNodes.add(node);
        }
      }
    }

    const nonElements = [];
    for (const node of addedNodes) {
      if (!(node instanceof Element)) {
        nonElements.push(node);
      }
    }
    for (const node of nonElements) {
      this.removeChild(node);
      addedNodes.delete(node);
    }

    const estimatedHeights = this[_estimatedHeights];

    for (const node of addedNodes) {
      node.setAttribute('invisible', '');
      estimatedHeights.set(node, DEFAULT_HEIGHT_ESTIMATE);
    }

    this[_scheduleUpdate]();
  }

  [_resizeObserverCallback]() {
    this[_scheduleUpdate]();
  }

  [_scheduleUpdate]() {
    if (this[_updateRAFToken] !== undefined) return;

    this[_updateRAFToken] = window.requestAnimationFrame(this[_update]);
  }

  [_update]() {
    this[_updateRAFToken] = undefined;

    const childNodes = this.childNodes;
    const estimatedHeights = this[_estimatedHeights];
    const updateHeightEstimate = (child) => {
      if (!child.hasAttribute('invisible')) {
        const childRect = child.getBoundingClientRect();
        const style = window.getComputedStyle(child);
        const height =
          window.parseFloat(style.marginTop, 10) +
          window.parseFloat(style.marginBottom, 10) +
          childRect.height;
        estimatedHeights.set(child, height);
      }
      return estimatedHeights.get(child);
    };
    const thisRect = this.getBoundingClientRect();

    let sum = 0;
    let sumVisible = 0;
    for (let child = this.firstChild; child !== null; child = child.nextSibling) {
      let estimatedHeight = updateHeightEstimate(child);

      const maybeInViewport =
        (0 <= thisRect.top + sum + estimatedHeight) &&
        (thisRect.top + sum <= window.innerHeight);

      if (maybeInViewport) {
        if (child.hasAttribute('invisible')) {
          child.removeAttribute('invisible');
          this[_resizeObserver].observe(child);
          estimatedHeight = updateHeightEstimate(child);
        }

        const isInViewport =
          (0 <= thisRect.top + sum + estimatedHeight) &&
          (thisRect.top + sum <= window.innerHeight);

        if (isInViewport) {
          const currentTop = window.parseFloat(window.getComputedStyle(child).top, 10);
          const nextTop = sum - sumVisible;
          if (Math.abs(currentTop - nextTop) >= 1) {
            child.style.top = `${nextTop}px`;
          }
          sumVisible += estimatedHeight;
        } else {
          child.setAttribute('invisible', '');
          this[_resizeObserver].unobserve(child);
        }
      } else {
        if (!child.hasAttribute('invisible')) {
          child.setAttribute('invisible', '');
          this[_resizeObserver].unobserve(child);
        }
      }

      sum += estimatedHeight;
    }

    this.style.height = `${sum}px`;
  }
}
