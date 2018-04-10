import {directive, NodePart} from '../../lit-html/lit-html.js';
import {VirtualRepeater} from '../virtual-repeater.js';

export const LitMixin = Superclass => class extends Superclass {
  constructor(config) {
    const pool = [];
    const {part, template} = config;
    Object.assign(config, {
      container: part.startNode.parentNode,
      newChild: () => pool.pop() || new NodePart(part.instance, null, null),
      updateChild: (part, item, idx) => part.setValue(template(item, idx)),
      recycleChild: (part) => pool.push(part),
    });
    super(config);
    this._hostPart = part;
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
      referenceNode = this._hostPart.endNode;
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
};

export const LitRepeater = LitMixin(VirtualRepeater);

const partToRepeater = new WeakMap();
export const repeat = (config = {}) => directive(part => {
  let repeater = partToRepeater.get(part);
  if (!repeater) {
    repeater = new LitRepeater({part, template: config.template});
    partToRepeater.set(part, repeater);
  }
  const {first, num, items} = config;
  Object.assign(repeater, {first, num, items});
});