const DEFAULT_HEIGHT_ESTIMATE = 100;
const TEMPLATE = `
<style>
:host {
  /* Use flex to prevent children's margins from collapsing. Avoiding margin
   * collapsing is simpler and good enough to start with. */
  display: flex;
  flex-direction: column;
}

::slotted(*) {
  flex: 0 0 auto;
  display: block;
  position: relative;
}
</style>
<slot></slot>
`;

const {hasTop, getTop, setTop} = (() => {
  const top = new WeakMap();
  return {
    hasTop: element => top.has(element),
    getTop: element => top.get(element),
    setTop: (element, value) => {
      top.set(element, value);
      element.style.top = `${value}px`;
    },
  };
})();

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

    // READ

    const thisRect = this.getBoundingClientRect();

    // Update height estimates with visible elements.
    for (let child = this.firstChild; child !== null; child = child.nextSibling) {
      if (!child.hasAttribute('invisible')) {
        const rect = child.getBoundingClientRect();
        const style = window.getComputedStyle(child);
        estimatedHeights.set(child,
          window.parseFloat(style.marginTop, 10) +
          window.parseFloat(style.marginBottom, 10) +
          rect.height
        );
      }
    }

    // COMPUTE

    let newTop = new Map();
    let newInvisible = new Map();
    let sum = 0;
    let sumVisible = 0;
    for (let child = this.firstChild; child !== null; child = child.nextSibling) {
      const estimatedHeight = estimatedHeights.get(child);

      const visible =
        (0 <= thisRect.top + sum + estimatedHeight) &&
        (thisRect.top + sum <= window.innerHeight);

      if (visible) {
        const top = sum - sumVisible;
        if (!hasTop(child) || Math.abs(getTop(child) - top) >= 1) {
          newTop.set(child, top);
        }
        if (child.hasAttribute('invisible')) {
          newInvisible.set(child, false);
          this[_resizeObserver].observe(child);
        }
      } else {
        if (!child.hasAttribute('invisible')) {
          newInvisible.set(child, true);
          this[_resizeObserver].unobserve(child);
        }
      }

      sum += estimatedHeight;
      sumVisible += visible ? estimatedHeight : 0;
    }

    // WRITE

    this.style.height = `${sum}px`;
    if (newTop.size > 0 || newInvisible.size > 0) {
      for (const [element, top] of newTop) {
        setTop(element, top);
      }

      for (const [element, invisible] of newInvisible) {
        if (invisible) {
          element.setAttribute('invisible', '');
        } else {
          element.removeAttribute('invisible');
        }
      }

      this[_scheduleUpdate]();
    }
  }
}
