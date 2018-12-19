export const _spliceChildren = Symbol('_spliceChildren');

export const ChildManager = (Superclass) => {
  return class extends Superclass {
    connectedCallback() {
      const nonElementChildren = [];

      let i = 0;
      for (const child of this.childNodes) {
        if (!(child instanceof Element)) {
          nonElementChildren.push(child);
        }
      }

      const nonElementChildrenCount = nonElementChildren.length;
      if (nonElementChildrenCount > 0) {
        for (const child of nonElementChildren) {
          child.remove();
        }
        console.warn(`${nonElementChildrenCount} children were removed.`);
      }

      this[_spliceChildren](0, 0, ...this.childNodes);
    }

    [_spliceChildren](index, deleteCount, ...addedChildren) {
      //
    }

    // Node
    // https://dom.spec.whatwg.org/#interface-node
    insertBefore(node, child) {}
    appendChild(node) {}
    replaceChild(node, child) {}
    removeChild(child) {}

    // ParentNode
    // https://dom.spec.whatwg.org/#interface-parentnode
    prepend(...nodes) {}
    append(...nodes) {}

    // Element
    // https://dom.spec.whatwg.org/#interface-element
    insertAdjacentElement(where, element) {}
    insertAdjacentText(where, data) {}

    // Element
    // https://w3c.github.io/DOM-Parsing/#extensions-to-the-element-interface
    get innerHTML() { return super.innerHTML; }
    set innerHTML(value) {}
    get outerHTML() { return super.outerHTML; }
    set outerHTML(value) {}
    insertAdjacentHTML(position, text) {}

    // HTMLElement
    // https://html.spec.whatwg.org/multipage/dom.html#htmlelement
    get innerText() { return super.innerText; }
    set innerText(value) {}
  }
}
