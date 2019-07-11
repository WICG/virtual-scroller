export class ContactDataSource {
  #delay = 1000;
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
    return this.#delay;
  }
  set delay(delayMs) {
    this.#delay = delayMs;
  }

  async getNextContacts(count) {
    this.#loading = true;
    if (!this.#allContacts) {
      this.#allContacts =
          await fetch('contacts/contacts.json').then(resp => resp.json());
    }
    // Simulate slow server load...
    await new Promise(resolve => setTimeout(resolve, this.#delay));
    const res = this.#allContacts.splice(0, count);
    this.#loadedAll = this.#allContacts.length === 0;
    this.#loading = false;
    return res;
  }
}
