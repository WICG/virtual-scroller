import {_scrollerConfig, ItemSource, VirtualScrollerElement} from './virtual-scroller-element.js';

export {ItemSource};

export class VirtualContentElement extends VirtualScrollerElement {
  get[_scrollerConfig]() {
    return {container: this, scrollTarget: findScrollTarget(this.parentNode)};
  }
}
customElements.define('virtual-content', VirtualContentElement);

function findScrollTarget(node) {
  // Search for element that scrolls up the parent tree.
  while (node && node !== document.body) {
    if (node.nodeType === Node.ELEMENT_NODE && scrolls(node)) {
      // Found it!
      return node;
    }
    node = node.host || node.assignedSlot || node.parentNode;
  }
  return null;
}

function scrolls(element) {
  // Check inline style to avoid forcing layout.
  const inlineInfo = scrollInfo(element.style);
  if (inlineInfo.x || inlineInfo.y) {
    return true;
  }
  const computedInfo = scrollInfo(getComputedStyle(element));
  return Boolean(computedInfo.x || computedInfo.y);
}

function scrollInfo(style) {
  const x = style.overflowX === 'auto' || style.overflowX === 'scroll';
  const y = style.overflowY === 'auto' || style.overflowY === 'scroll';
  return {x, y};
}
