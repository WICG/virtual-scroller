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
  #count = DEFAULT_ELEMENT_COUNT;
  #container;

  #swapButton;
  #statusDiv;

  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'closed'});
    shadowRoot.innerHTML = TEMPLATE;

    const buttons = shadowRoot.getElementById('buttons');
    for (const button of buttons.getElementsByClassName('count')) {
      button.onclick = e => {
        this.#setCount(parseInt(e.target.textContent));
      };
    }

    this.#swapButton = shadowRoot.getElementById('swap');
    this.#swapButton.onclick = () => {
      this.#swap();
    };
    this.#statusDiv = shadowRoot.getElementById('status');
  }

  /**
   * Set the container that will be managed by the controller.
   */
  setContainer(container) {
    this.#container = container;
    this.#updateContainer();
  }

  #setCount =
      count => {
        this.#count = count;
        this.#updateContainer();
      }

  #getSwappedLocalName =
      () => {
        return this.#container.localName === 'div' ? 'virtual-scroller' : 'div';
      }

  #updateSwapButton =
      () => {
        this.#swapButton.textContent = 'swap to ' + this.#getSwappedLocalName();
      }

  #swap =
      () => {
        const swapTo = this.#getSwappedLocalName();
        const swapIn = document.createElement(swapTo);
        Util.swapElement(this.#container, swapIn);
        this.#container = swapIn;
        this.#updateSwapButton();
        this.#updateStatus();
      }

  #updateStatus =
      () => {
        const localName = this.#container ? this.#container.localName : 'None';
        this.#statusDiv.textContent =
            `count: ${this.#count}. element: ${localName}`;
      }

  #updateContainer = () => {
    this.#updateStatus();
    if (this.#container === null) {
      return;
    }
    const children = this.#container.children;
    while (children.length > this.#count) {
      children[0].remove();
    }
    if (children.length < this.#count) {
      const divs = new DocumentFragment();
      for (let i = children.length; i < this.#count; i++) {
        const newDiv = document.createElement('div');
        newDiv.innerHTML = `${i} ${WORDS}`;
        newDiv.id = 'p' + i;
        divs.append(newDiv);
      }
      this.#container.appendChild(divs);
    }
    this.#updateSwapButton();
  }
}

customElements.define('demo-controller', DemoController);
