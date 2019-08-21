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
  #counter = 0;
  #fps

  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'closed'});
    shadowRoot.innerHTML = TEMPLATE;
    this.#fps = shadowRoot.getElementById('fps')
      .getElementsByClassName('place');
    this.#scheduleUpdate();
  }

  #scheduleUpdate = () => {
    requestAnimationFrame(ts => {
      this.#update(ts);
    });
  }

  #update = timestamp => {
    if (this.#lastTime !== null) {
      const delta = timestamp - this.#lastTime;
      this.#fps[this.#counter++ % this.#fps.length].innerText =
        (MS_PER_SECOND / delta).toFixed(2);
    }
    this.#lastTime = timestamp;
    this.#scheduleUpdate();
  }
}

customElements.define('fps-display', FpsDisplay);
