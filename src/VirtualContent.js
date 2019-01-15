function composedTreeParent(node) {
  return node.assignedSlot || node.host || node.parentNode;
}

function nearestScrollingAncestor(node) {
  for (node = composedTreeParent(node); node !== null; node = composedTreeParent(node)) {
    if (node.nodeType === Node.ELEMENT_NODE && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }
  return null;
}

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
  flex: 0 0 auto !important;
  display: block !important;
  position: relative !important;
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
const _onScroll = Symbol('_onScroll');
const _onActivateinvisible = Symbol('_onActivateinvisible');

export class VirtualContent extends HTMLElement {
  constructor() {
    super();

    this[_mutationObserverCallback] = this[_mutationObserverCallback].bind(this);
    this[_resizeObserverCallback] = this[_resizeObserverCallback].bind(this);
    this[_scheduleUpdate] = this[_scheduleUpdate].bind(this);
    this[_update] = this[_update].bind(this);
    this[_onScroll] = this[_onScroll].bind(this);
    this[_onActivateinvisible] = this[_onActivateinvisible].bind(this);

    this.attachShadow({mode: 'open'}).innerHTML = TEMPLATE;

    this[_mutationObserver] = new MutationObserver(this[_mutationObserverCallback]);
    this[_mutationObserver].observe(this, {childList: true});
    this[_resizeObserver] = new ResizeObserver(this[_resizeObserverCallback]);

    this[_estimatedHeights] = new WeakMap();
    this[_updateRAFToken] = undefined;

    this.addEventListener('activateinvisible', this[_onActivateinvisible], {capture: true});
  }

  connectedCallback() {
    window.addEventListener('scroll', this[_onScroll], {passive: true, capture: true});
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this[_onScroll], {passive: true, capture: true});
  }

  [_mutationObserverCallback](records) {
    const estimatedHeights = this[_estimatedHeights];

    for (const record of records) {
      for (const node of record.removedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Removed children should have be made visible again and we should
          // unobserve them with the resize observer.
          this[_resizeObserver].unobserve(node);
          node.removeAttribute('invisible');
          estimatedHeights.delete(node);
        }
      }

      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Added children should be invisible initially.
          node.setAttribute('invisible', '');
          estimatedHeights.set(node, DEFAULT_HEIGHT_ESTIMATE);
        } else {
          // Remove non-element children because we can't control their
          // invisibility state or even prevent them from being rendered using
          // CSS (they aren't distinctly selectable).

          // These records are not coalesced, so test that the node is actually
          // a child of this node before removing it.
          if (node.parentNode === this) {
            this.removeChild(node);
          }
        }
      }
    }

    this[_scheduleUpdate]();
  }

  [_resizeObserverCallback]() {
    this[_scheduleUpdate]();
  }

  [_onScroll]() {
    this[_scheduleUpdate]();
  }

  [_onActivateinvisible](e) {
    // Find the child containing the target and synchronously update, forcing
    // that child to be visible. The browser will automatically scroll to that
    // element because it is visible, which will trigger another update to make
    // the surrounding nodes visible.
    const child = e.target;
    while (child.parentNode !== this) {
      child = child.parentNode;
    }
    this[_update]({forceVisible: new Set([child])});
  }

  [_scheduleUpdate]() {
    if (this[_updateRAFToken] !== undefined) return;

    this[_updateRAFToken] = window.requestAnimationFrame(this[_update]);
  }

  [_update]({forceVisible = new Set()} = {}) {
    this[_updateRAFToken] = undefined;

    const thisRect = this.getBoundingClientRect();
    // Don't attempt to update / run layout if this element isn't in a
    // renderable state (e.g. disconnected, invisible, etc.).
    if (
      thisRect.top === 0 &&
      thisRect.left === 0 &&
      thisRect.width === 0 &&
      thisRect.height === 0
    ) return;

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

    const previouslyVisible = new Set();
    for (let child = this.firstChild; child !== null; child = child.nextSibling) {
      if (!child.hasAttribute('invisible')) {
        previouslyVisible.add(child);
      }
    }

    let beforePreviouslyVisible = previouslyVisible.size > 0;
    let sum = 0;
    let sumVisible = 0;
    for (let child = this.firstChild; child !== null; child = child.nextSibling) {
      if (beforePreviouslyVisible && previouslyVisible.has(child)) {
        beforePreviouslyVisible = false;
      }

      let estimatedHeight = updateHeightEstimate(child);

      const maybeInViewport =
        (0 <= thisRect.top + sum + estimatedHeight) &&
        (thisRect.top + sum <= window.innerHeight);

      if (maybeInViewport || forceVisible.has(child)) {
        if (child.hasAttribute('invisible')) {
          child.removeAttribute('invisible');
          this[_resizeObserver].observe(child);
          const lastEstimatedHeight = estimatedHeight;
          estimatedHeight = updateHeightEstimate(child);
          if (beforePreviouslyVisible) {
            const scrollingAncestor = nearestScrollingAncestor(this);
            if (scrollingAncestor !== null) {
              scrollingAncestor.scrollBy(0, estimatedHeight - lastEstimatedHeight);
            }
          }
        }

        const isInViewport =
          (0 <= thisRect.top + sum + estimatedHeight) &&
          (thisRect.top + sum <= window.innerHeight);

        if (isInViewport || forceVisible.has(child)) {
          child.style.top = `${sum - sumVisible}px`;
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
