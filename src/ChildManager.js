export const _spliceChildren = Symbol('_spliceChildren');

const _initialSpliceComplete = Symbol('_initialSpliceComplete');

export const ChildManager = (Superclass) => {
  return class extends Superclass {
    constructor() {
      super();
      this[_initialSpliceComplete] = false;
    }

    connectedCallback() {
      this[_spliceChildren](0, 0, ...this.childNodes);
      this[_initialSpliceComplete] = true;
    }

    [_spliceChildren](indexOrRefChild, deleteCount, ...addedChildren) {
      if (!this[_initialSpliceComplete]) return;

      let refChild = indexOrRefChild;
      if (typeof indexOrRefChild === "number") {
        refChild = this.firstChild;
        for (let i = 0; i < indexOrRefChild; i++) {
          refChild = refChild.nextSibling;
        }
      }

      for (let i = deleteCount; i > 0; i--) {
        refChild = refChild.nextSibling;
        refChild.remove();
      }

      if (addedChildren.length > 0) {
        const fragment = new DocumentFragment();
        fragment.append(...addedChildren);
        super.insertBefore(fragment, refChild);
      }
    }

    // Node
    // https://dom.spec.whatwg.org/#interface-node
    insertBefore(node, child) {
      if (node instanceof DocumentFragment) {
        this[_spliceChildren](child, 0, ...node.childNodes);
      } else {
        this[_spliceChildren](child, 0, node);
      }
    }
    appendChild(node) {
      if (node instanceof DocumentFragment) {
        this[_spliceChildren](null, 0, ...node.childNodes);
      } else {
        this[_spliceChildren](null, 0, node);
      }
    }
    replaceChild(node, child) {
      if (node instanceof DocumentFragment) {
        this[_spliceChildren](child, 1, ...node.childNodes);
      } else {
        this[_spliceChildren](child, 1, node);
      }
    }
    removeChild(child) {
      this[_spliceChildren](child, 1);
    }

    // ParentNode
    // https://dom.spec.whatwg.org/#interface-parentnode
    prepend(...nodes) {
      nodes = nodes.map(x => typeof x === "string" ? new Text(x) : x);
      this[_spliceChildren](this.firstChild, 0, ...nodes);
    }
    append(...nodes) {
      nodes = nodes.map(x => typeof x === "string" ? new Text(x) : x);
      this[_spliceChildren](null, 0, ...nodes);
    }

    // Element
    // https://dom.spec.whatwg.org/#interface-element
    insertAdjacentElement(where, element) {
      if (position === 'afterbegin' || position === 'beforeend') {
        this[_spliceChildren](
          position === 'afterbegin' ? this.firstChild : null,
          0,
          element,
        );
      } else {
        super.insertAdjacentElement(position, text);
      }
    }
    insertAdjacentText(where, data) {
      if (position === 'afterbegin' || position === 'beforeend') {
        this[_spliceChildren](
          position === 'afterbegin' ? this.firstChild : null,
          0,
          new Text(data),
        );
      } else {
        super.insertAdjacentText(position, text);
      }
    }

    // Element
    // https://w3c.github.io/DOM-Parsing/#extensions-to-the-element-interface
    get innerHTML() { return super.innerHTML; }
    set innerHTML(value) {
      const range = new Range();
      range.selectNodeContents(this);
      const fragment = range.createContextualFragment(value);
      this[_spliceChildren](
          this.firstChild, this.childNodes.length, ...fragment.childNodes);
    }
    insertAdjacentHTML(position, text) {
      if (position === 'afterbegin' || position === 'beforeend') {
        const range = new Range();
        range.selectNodeContents(this);
        const fragment = range.createContextualFragment(text);
        this[_spliceChildren](
          position === 'afterbegin' ? this.firstChild : null,
          0,
          ...fragment.childNodes,
        );
      } else {
        super.insertAdjacentHTML(position, text);
      }
    }

    // HTMLElement
    // https://html.spec.whatwg.org/multipage/dom.html#htmlelement
    get innerText() { return super.innerText; }
    set innerText(value) {
      this[_spliceChildren](
          this.firstChild, this.childNodes.length, new Text(value));
    }
  }
}
