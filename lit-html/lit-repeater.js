import {directive, NodePart} from '../../lit-html/lit-html.js';
import {VirtualRepeater} from '../virtual-repeater.js';

export const LitMixin = Superclass => class extends Superclass {
  constructor(config) {
    const {
      part,
      template,
      recycle,
    } = config;
    if (recycle) {
      const recycledParts = [];
      config.newChild = () =>
          recycledParts.pop() || new NodePart(part.instance, null, null);
      config.recycleChild = (part) => recycledParts.push(part);
    } else {
      config.newChild = () => new NodePart(part.instance, null, null);
      config.updateChild = (part, item, idx) =>
          part.setValue(template(item, idx));
    }
    super(config);
  }

  // Lit-specific overrides for node manipulation
  get _kids() {
    return this._ordered.map(p => p.startNode.nextElementSibling);
  }

  _node(part) {
    return part.startNode;
  }

  _nextSibling(part) {
    return part.endNode.nextSibling;
  }

  _insertBefore(part, referenceNode) {
    if (referenceNode === null) {
      referenceNode = part.endNode;
    }
    if (!this._childIsAttached(part)) {
      // Inserting new part
      part.startNode = document.createTextNode('');
      part.endNode = document.createTextNode('');
      super._insertBefore(part.startNode, referenceNode);
      super._insertBefore(part.endNode, referenceNode);
    } else {
      // Inserting existing part
      const boundary = part.endNode.nextSibling;
      if (referenceNode !== part.startNode && referenceNode !== boundary) {
        // Part is not already in the right place
        for (let node = part.startNode; node !== boundary;) {
          const n = node.nextSibling;
          super._insertBefore(node, referenceNode);
          node = n;
        }
      }
    }
  }

  _childIsAttached(part) {
    return Boolean(part.startNode);
  }

  _hideChild(part) {
    let node = part.startNode.nextSibling;
    while (node && node !== part.endNode) {
      if (node.style) {
        node.style.display = 'none';
      }
      node = node.nextSibling;
    }
  }

  _showChild(part) {
    if (!this._childIsAttached(part)) {
      return;
    }
    let node = part.startNode.nextSibling;
    while (node && node !== part.endNode) {
      if (node.style) {
        node.style.display = null;
      }
      node = node.nextSibling;
    }
  }

  _measureChild(part) {
    // Currently, we assume there's only one node in the part (between start and
    // end nodes)
    return super._measureChild(part.startNode.nextElementSibling);
  }

  __removeChild(part) {
    let node = part.startNode.nextSibling;
    while (node !== part.endNode) {
      const next = node.nextSibling;
      super.__removeChild(node);
      node = next;
    }
  }
};

export const LitRepeater = LitMixin(VirtualRepeater);

export const containerFromPart = async (part) => {
  /**
   * Handle the case where the part is rendered in the top container, e.g.
   *
   *    const myList = html`${list({items, template, layout})}`;
   *    render(myList, document.body);
   *
   * We wait a microtask to give time to the part to be rendered.
   */
  while (!part.startNode.isConnected) {
    await Promise.resolve();
  }
  return part.startNode.parentNode;
};

const partToRepeater = new WeakMap();
export const repeat = (config = {}) => directive(async part => {
  let repeater = partToRepeater.get(part);
  if (!repeater) {
    const container = await containerFromPart(part);
    repeater = new LitRepeater({
      part,
      container,
      template: config.template,
      recycle: config.recycle,
    });
    partToRepeater.set(part, repeater);
  }
  const {first, num, items} = config;
  Object.assign(repeater, {first, num, items});
});