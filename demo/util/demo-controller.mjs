import * as Util from './util.mjs';

/**
 * Create a string of |wordCount| words.
 */
function words(wordCount) {
  let result = '';
  for (let i = 0; i < wordCount; i++) {
    result += ' word';
  }
  return result;
}

const NUM_WORDS = 50;
const WORDS = words(NUM_WORDS);
const DEFAULT_ELEMENT_COUNT = 10000;


const TEMPLATE = `
<div id=status>
</div>
<div id=buttons>
  <div>
    items:
    <button class=count>1000</button>
    <button class=count>10000</button>
    <button class=count>100000</button>
  </div>
  <button id=swap></button>
</div>
`;

/**
 * Displays buttons that change the number of elements in a container
 * and also whether the container is a virtual-scroller or a plain
 * div. It also displays the current count and container type.
 */
export class DemoController extends HTMLElement {
  _count = DEFAULT_ELEMENT_COUNT;
  _container;

  _swapButton;
  _statusDiv;

  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'closed'});
    shadowRoot.innerHTML = TEMPLATE;

    const buttons = shadowRoot.getElementById('buttons');
    for (const button of buttons.getElementsByClassName('count')) {
      button.onclick = e => {
        this._setCount(parseInt(e.target.textContent));
      };
    }

    this._swapButton = shadowRoot.getElementById('swap');
    this._swapButton.onclick = () => {
      this._swap();
    };
    this._statusDiv = shadowRoot.getElementById('status');
  }

  /**
   * Set the container that will be managed by the controller.
   */
  setContainer(container) {
    this._container = container;
    this._updateContainer();
  }

  _setCount =
      count => {
        this._count = count;
        this._updateContainer();
      }

  _getSwappedLocalName =
      () => {
        return this._container.localName === 'div' ? 'virtual-scroller' : 'div';
      }

  _updateSwapButton =
      () => {
        this._swapButton.textContent = 'swap to ' + this._getSwappedLocalName();
      }

  _swap =
      () => {
        const swapTo = this._getSwappedLocalName();
        const swapIn = document.createElement(swapTo);
        Util.swapElement(this._container, swapIn);
        this._container = swapIn;
        this._updateSwapButton();
        this._updateStatus();
      }

  _updateStatus() {
    const localName = this._container ? this._container.localName : 'None';
    this._statusDiv.textContent =
        `count: ${this._count}. element: ${localName}`;
  }

  _updateContainer() {
    this._updateStatus();
    if (this._container === null) {
      return;
    }
    const children = this._container.children;
    while (children.length > this._count) {
      children[0].remove();
    }
    if (children.length < this._count) {
      const divs = new DocumentFragment();
      for (let i = children.length; i < this._count; i++) {
        const newDiv = document.createElement('div');
        newDiv.innerHTML = `${i} ${WORDS}`;
        newDiv.id = 'p' + i;
        divs.append(newDiv);
      }
      this._container.appendChild(divs);
    }
    this._updateSwapButton();
  }
}

customElements.define('demo-controller', DemoController);
