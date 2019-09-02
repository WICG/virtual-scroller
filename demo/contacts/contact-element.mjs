const emptyImg =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

class ContactElement extends HTMLElement {
  _img;
  _label;
  _counter;
  _renderCount = 0;
  _contact;

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
    display: inline-block;
    height: 90%;
    margin-right: 15px;
    border-radius: 50%;
    background-color: lightgray;
  }
  #inline-block {
    display: inline-block;
    height: 100%;
    vertical-align: top;
  }
  #container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }
  label {
    width: 100%;
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
<div id=inline-block>
  <div id=container>
    <label id="label"></label>
  </div>
</div>
<span id="counter"></span>
<button id="up">🔼</button>
<button id="down">🔽</button>`;

    this._img = this.shadowRoot.querySelector('#img');
    this._label = this.shadowRoot.querySelector('label');
    this._counter = this.shadowRoot.querySelector('#counter');

    const up = this.shadowRoot.querySelector('#up');
    up.addEventListener('click', () => this.dispatchEvent(new Event('moveup')));
    const down = this.shadowRoot.querySelector('#down');
    down.addEventListener(
        'click', () => this.dispatchEvent(new Event('movedown')));

    if (this.contact) {
      this._render();
    }
    // Animate only after the first render.
    this.style.transition = 'none';
    window.requestIdleCallback(() => {
      this.style.transition = null;
    });
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

  _render = () => {
    if (!this.shadowRoot) {
      return;
    }
    const contact = this.contact || {};
    this._img.src = contact.image || emptyImg;
    this._label.textContent = contact.name;
    this._label.style.color = contact.color || null;
    this._counter.textContent = `render count: ${++this._renderCount}`;
  }
}

customElements.define('contact-element', ContactElement);
