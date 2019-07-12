const emptyImg =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

class ContactElement extends HTMLElement {
  #img;
  #label;
  #counter;
  #renderCount = 0;
  #contact;

  connectedCallback() {
    if (this.shadowRoot) {
      return;
    }
    this.attachShadow({mode: 'open'}).innerHTML = `
<style>
  :host {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 10px;
    box-sizing: border-box;
    border-bottom: 1px solid #eee;
    will-change: transform;
  }
  :host([sortable]) {
    transition: transform 200ms ease-in-out;
  }
  img {
    width: 50px;
    height: 50px;
    margin-right: 15px;
    border-radius: 50%;
    background-color: lightgray;
  }
  label {
    width: 100%;
    flex: 1;
  }
  button {
    background-color: transparent;
    border: none;
    outline: none;
  }
  :host(:not([sortable])) #counter,
  :host(:not([sortable])) button {
    display: none;
  }
</style>
<img id="img">
<label id="label"></label>
<span id="counter"></span>
<button id="up">🔼</button>
<button id="down">🔽</button>`;

    this.#img = this.shadowRoot.querySelector('#img');
    this.#label = this.shadowRoot.querySelector('label');
    this.#counter = this.shadowRoot.querySelector('#counter');

    const up = this.shadowRoot.querySelector('#up');
    up.addEventListener('click', () => this.dispatchEvent(new Event('moveup')));
    const down = this.shadowRoot.querySelector('#down');
    down.addEventListener(
        'click', () => this.dispatchEvent(new Event('movedown')));

    if (this.contact) {
      this.#render();
    }
    // Animate only after the first render.
    this.style.transition = 'none';
    window.requestIdleCallback(() => {
 this.style.transition = null;
});
  }

  get contact() {
    return this.#contact;
  }

  set contact(contact) {
    if (contact !== this.#contact) {
      this.#contact = contact;
      this.#render();
    }
  }

  #render = () => {
    if (!this.shadowRoot) {
      return;
    }
    const contact = this.contact || {};
    this.#img.src = contact.image || emptyImg;
    this.#label.textContent = contact.name;
    this.#label.style.color = contact.color || null;
    this.#counter.textContent = `render count: ${++this.#renderCount}`;
  }
}

customElements.define('contact-element', ContactElement);
