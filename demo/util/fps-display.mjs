import * as Util from './util.mjs';

const TEMPLATE = `
<style>
  .fps { width: 23%; float: left; text-align: right; padding-right: 2% }
</style>

  <div id=fps>
    <div class=fps><span class=place>0</span> FPS</div>
    <div class=fps><span class=place>0</span> FPS</div>
    <div class=fps><span class=place>0</span> FPS</div>
    <div class=fps><span class=place>0</span> FPS</div>
  </div>
`;

const MS_PER_SECOND = 1000;

/**
 * Displays frames-per-second performance of the page for recent frames.
 */
export class FpsDisplay extends HTMLElement {
  #lastTime = null;
  #fps;

  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'closed'});
    shadowRoot.innerHTML = TEMPLATE;
    this.#fps = shadowRoot.getElementById('fps')
      .getElementsByClassName('place');
    Util.everyFrame((n, timestamp) => {
      this.#update(n, timestamp);
    });
  }

  #update = (n, timestamp) => {
    if (this.#lastTime !== null) {
      const delta = timestamp - this.#lastTime;
      this.#fps[n % this.#fps.length].innerText =
        (MS_PER_SECOND / delta).toFixed(2);
    }
    this.#lastTime = timestamp;
  }
}

customElements.define('fps-display', FpsDisplay);
