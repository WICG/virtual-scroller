import * as util from '../util/util.mjs';

// All loads after the first will be delayed by this much.
const DELAY_MS = 1000;

export class ContactDataSource {
  #delayMs = 0;
  #allContacts = null;
  #loading = false;
  #loadedAll = false;

  get loadedAll() {
    return this.#loadedAll;
  }
  get loading() {
    return this.#loading;
  }
  get delay() {
    return this.#delayMs;
  }
  set delay(delayMs) {
    this.#delayMs = delayMs;
  }

  async getNextContacts(count) {
    this.#loading = true;
    if (!this.#allContacts) {
      this.#allContacts =
          await fetch('contacts/contacts.json').then(resp => resp.json());
    }
    // Simulate slow server load...
    await util.delay(this.#delayMs);
    const res = this.#allContacts.splice(0, count);
    this.#loadedAll = this.#allContacts.length === 0;
    this.#loading = false;
    // After the first load, simulate a delay.
    this.#delayMs = DELAY_MS;
    return res;
  }
}
