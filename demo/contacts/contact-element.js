class ContactElement extends HTMLElement {
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

    this._img = this.shadowRoot.querySelector('#img');
    this._label = this.shadowRoot.querySelector('label');
    this._counter = this.shadowRoot.querySelector('#counter');
    this._renderCount = 0;

    const up = this.shadowRoot.querySelector('#up');
    up.addEventListener('click', () => this.dispatchEvent(new Event('moveup')));
    const down = this.shadowRoot.querySelector('#down');
    down.addEventListener(
        'click', () => this.dispatchEvent(new Event('movedown')));

    this.contact && this._render();
  }
  get contact() {
    return this._contact;
  }
  set contact(contact) {
    if (contact !== this._contact) {
      this._contact = contact;
      this._render();
    }
  }
  _render() {
    if (!this.shadowRoot)
      return;
    const contact = this.contact || {};
    if (contact.image) {
      this._img.src = contact.image;
    }
    this._label.textContent = contact.name;
    this._label.style.color = contact.color;
    this._counter.textContent = `render count: ${++this._renderCount}`;
  }
}
customElements.define('contact-element', ContactElement);