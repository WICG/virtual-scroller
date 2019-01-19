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

#emptySpaceSentinelContainer {
  contain: size layout style;
  pointer-events: none;
  visibility: hidden;
  overflow: visible;
  position: relative;
  height: 0px;
}

#emptySpaceSentinelContainer > div {
  contain: strict;
  position: absolute;
}

::slotted(*) {
  flex: 0 0 auto !important;
  display: block !important;
  position: relative !important;
}
</style>
<div id="emptySpaceSentinelContainer"></div>
<slot></slot>
`;

const _intersectionObserver = Symbol('_intersectionObserver');
const _intersectionObserverCallback = Symbol('_intersectionObserverCallback');
const _mutationObserver = Symbol('_mutationObserver');
const _mutationObserverCallback = Symbol('_mutationObserverCallback');
const _resizeObserver = Symbol('_resizeObserver');
const _resizeObserverCallback = Symbol('_resizeObserverCallback');

const _estimatedHeights = Symbol('_estimatedHeights');
const _updateRAFToken = Symbol('_updateRAFToken');
const _emptySpaceSentinelContainer = Symbol('_emptySpaceSentinelContainer');

const _scheduleUpdate = Symbol('_scheduleUpdate');
const _update = Symbol('_update');
const _onActivateinvisible = Symbol('_onActivateinvisible');

export class VirtualContent extends HTMLElement {
  constructor() {
    super();

    this[_intersectionObserverCallback] = this[_intersectionObserverCallback].bind(this);
    this[_mutationObserverCallback] = this[_mutationObserverCallback].bind(this);
    this[_resizeObserverCallback] = this[_resizeObserverCallback].bind(this);
    this[_scheduleUpdate] = this[_scheduleUpdate].bind(this);
    this[_update] = this[_update].bind(this);
    this[_onActivateinvisible] = this[_onActivateinvisible].bind(this);

    this.attachShadow({mode: 'open'}).innerHTML = TEMPLATE;

    this[_intersectionObserver] = new IntersectionObserver(this[_intersectionObserverCallback]);
    this[_intersectionObserver].observe(this);
    this[_mutationObserver] = new MutationObserver(this[_mutationObserverCallback]);
    // NOTE: This MutationObserver will not necessarily recieve records for
    // elements that were children of this element at parse time, if the parse
    // time doesn't take long enough that the parser inserts its children in
    // different tasks.
    // TODO: Find the earliest time that `childNodes` can be read, handle those
    // elements as other inserted elements are, and start observation at that
    // point. Then, update the `updateHeightEstimate` function in `#[_update]`
    // as mentioned in its comment.
    this[_mutationObserver].observe(this, {childList: true});
    this[_resizeObserver] = new ResizeObserver(this[_resizeObserverCallback]);

    this[_estimatedHeights] = new WeakMap();
    this[_updateRAFToken] = undefined;
    this[_emptySpaceSentinelContainer] = this.shadowRoot.getElementById('emptySpaceSentinelContainer');

    this.addEventListener('activateinvisible', this[_onActivateinvisible], {capture: true});
  }

  connectedCallback() {
    this[_scheduleUpdate]();
  }

  [_intersectionObserverCallback](entries) {
    for (const entry of entries) {
      const target = entry.target;
      const isIntersecting = entry.isIntersecting;

      // Update if this element has moved into or out of the viewport.
      if (target === this) {
        this[_scheduleUpdate]();
        break;
      }

      const targetParent = target.parentNode;

      // Update if an empty space sentinel has moved into the viewport.
      if (targetParent === this[_emptySpaceSentinelContainer] && isIntersecting) {
        this[_scheduleUpdate]();
        break;
      }

      // Update if a child has moved out of the viewport.
      if (targetParent === this && !isIntersecting) {
        this[_scheduleUpdate]();
        break;
      }
    }
  }

  [_mutationObserverCallback](records) {
    const estimatedHeights = this[_estimatedHeights];

    for (const record of records) {
      for (const node of record.removedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Removed children should have be made visible again and we should
          // unobserve them with the resize observer.
          this[_resizeObserver].unobserve(node);
          this[_intersectionObserver].unobserve(node);
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

    const thisClientRect = this.getBoundingClientRect();
    // Don't read or store layout information if this element isn't in a
    // renderable state (e.g. disconnected, invisible, `display: none`, etc.).
    const isRenderable = !(
      thisClientRect.top === 0 &&
      thisClientRect.left === 0 &&
      thisClientRect.width === 0 &&
      thisClientRect.height === 0
    );

    const estimatedHeights = this[_estimatedHeights];
    const updateHeightEstimate = (child) => {
      if (isRenderable && !child.hasAttribute('invisible')) {
        const childClientRect = child.getBoundingClientRect();
        const style = window.getComputedStyle(child);
        const height =
          window.parseFloat(style.marginTop, 10) +
          window.parseFloat(style.marginBottom, 10) +
          childClientRect.height;
        estimatedHeights.set(child, height);
      }
      // TODO: This use of DEFAULT_HEIGHT_ESTIMATE is meant to catch elements
      // that were not passed through the MutationObserver. After finding and
      // updating the use of the MutationObserver to handle children that it
      // does not see, change this back to just `estimatedHeights.get(child)`.
      return estimatedHeights.has(child) ? estimatedHeights.get(child) : DEFAULT_HEIGHT_ESTIMATE;
    };

    const previouslyVisible = new Set();
    for (let child = this.firstChild; child !== null; child = child.nextSibling) {
      if (!child.hasAttribute('invisible')) {
        previouslyVisible.add(child);
      }
    }

    let beforePreviouslyVisible = previouslyVisible.size > 0;
    let nextTop = 0;
    let renderedHeight = 0;

    let currentInvisibleRunHeight = 0;
    let nextEmptySpaceSentinel = this[_emptySpaceSentinelContainer].firstChild;
    const maybeInsertEmptySpaceSentinel = () => {
      if (currentInvisibleRunHeight > 0) {
        let sentinel = nextEmptySpaceSentinel;
        if (nextEmptySpaceSentinel === null) {
          sentinel = document.createElement('div');
          this[_emptySpaceSentinelContainer].appendChild(sentinel);
        }
        nextEmptySpaceSentinel = sentinel.nextSibling;

        const sentinelStyle = sentinel.style;
        sentinelStyle.top = `${nextTop - currentInvisibleRunHeight}px`;
        sentinelStyle.height = `${currentInvisibleRunHeight}px`,

        this[_intersectionObserver].observe(sentinel);

        currentInvisibleRunHeight = 0;
      }
    };

    for (let child = this.firstChild; child !== null; child = child.nextSibling) {
      if (beforePreviouslyVisible && previouslyVisible.has(child)) {
        beforePreviouslyVisible = false;
      }

      let estimatedHeight = updateHeightEstimate(child);

      const childClientTop = thisClientRect.top + nextTop;
      const maybeInViewport =
        (0 <= childClientTop + estimatedHeight) &&
        (childClientTop <= window.innerHeight);
      const childForceVisible = forceVisible.has(child);

      if (maybeInViewport || childForceVisible) {
        if (child.hasAttribute('invisible')) {
          child.removeAttribute('invisible');
          this[_resizeObserver].observe(child);
          this[_intersectionObserver].observe(child);

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
          (0 <= childClientTop + estimatedHeight) &&
          (childClientTop <= window.innerHeight);

        if (isInViewport || childForceVisible) {
          maybeInsertEmptySpaceSentinel();

          child.style.top = `${nextTop - renderedHeight}px`;
          renderedHeight += estimatedHeight;
        } else {
          child.setAttribute('invisible', '');
          this[_resizeObserver].unobserve(child);
          this[_intersectionObserver].unobserve(child);

          currentInvisibleRunHeight += estimatedHeight;
        }
      } else {
        if (!child.hasAttribute('invisible')) {
          child.setAttribute('invisible', '');
          this[_resizeObserver].unobserve(child);
          this[_intersectionObserver].unobserve(child);
        }

        currentInvisibleRunHeight += estimatedHeight;
      }

      nextTop += estimatedHeight;
    }

    maybeInsertEmptySpaceSentinel();

    while (nextEmptySpaceSentinel !== null) {
      const sentinel = nextEmptySpaceSentinel;
      nextEmptySpaceSentinel = sentinel.nextSibling;

      this[_intersectionObserver].unobserve(sentinel);
      sentinel.remove();
    }

    this.style.height = `${nextTop}px`;
  }
}
