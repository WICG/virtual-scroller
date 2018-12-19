import {ChildManager, _spliceChildren} from './ChildManager.js';

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

const {setInvisible, getInvisible} = (() => {
  const invisible = new Set();
  return {
    getInvisible: element => invisible.has(element),
    setInvisible: (element, value) => {
      const isInvisible = invisible.has(element);
      if (value && !isInvisible) {
        element.setAttribute('invisible', '');
        invisible.add(element);
      } else if (!value && isInvisible) {
        element.removeAttribute('invisible');
        invisible.delete(element);
      }
    },
  };
})();

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

const _estimatedHeights = Symbol('_estimatedHeights');
const _updateRAFToken = Symbol('_updateRAFToken');

const _scheduleUpdate = Symbol('_scheduleUpdate');
const _update = Symbol('_update');

export class VirtualContent extends ChildManager(HTMLElement) {
  constructor() {
    super();
    this[_scheduleUpdate] = this[_scheduleUpdate].bind(this);
    this[_update] = this[_update].bind(this);

    this.attachShadow({mode: 'open'}).innerHTML = TEMPLATE;

    this[_estimatedHeights] = [];
    this[_updateRAFToken] = undefined;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('resize', this[_scheduleUpdate], {passive: true});
    window.addEventListener('scroll', this[_scheduleUpdate], {passive: true});
  }

  disconnectedCallback() {
    super.connectedCallback();
    window.removeEventListener('resize', this[_scheduleUpdate], {passive: true});
    window.removeEventListener('scroll', this[_scheduleUpdate], {passive: true});
  }

  [_spliceChildren](index, deleteCount, ...newChildren) {
    super[_spliceChildren](index, deleteCount, ...newChildren);

    const estimatedHeights = this[_estimatedHeights];

    for (const child of newChildren) {
      setInvisible(child);
    }
    estimatedHeights.splice(
      index,
      deleteCount,
      ...newChildren.map(child => DEFAULT_HEIGHT_ESTIMATE),
    );

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
    for (let child = this.firstChild, i = 0; child !== null; child = child.nextSibling, i++) {
      if (!getInvisible(child)) {
        const rect = child.getBoundingClientRect();
        const style = window.getComputedStyle(child);
        estimatedHeights[i] =
          window.parseFloat(style.marginTop, 10) +
          window.parseFloat(style.marginBottom, 10) +
          rect.height;
      }
    }

    // COMPUTE

    let newTop = new Map();
    let newInvisible = new Map();
    let sum = 0;
    let sumVisible = 0;
    for (let child = this.firstChild, i = 0; child !== null; child = child.nextSibling, i++) {
      const estimatedHeight = estimatedHeights[i];

      const visible =
        (0 <= thisRect.top + sum + estimatedHeight) &&
        (thisRect.top + sum <= window.innerHeight);

      if (visible) {
        const top = sum - sumVisible;
        if (!hasTop(child) || Math.abs(getTop(child) - top) >= 1) {
          newTop.set(child, top);
        }
        if (getInvisible(child)) {
          newInvisible.set(child, false);
        }
      } else {
        if (!getInvisible(child)) {
          newInvisible.set(child, true);
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
        setInvisible(element, invisible);
      }

      this[_scheduleUpdate]();
    }
  }
}
