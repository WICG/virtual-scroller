export class ContactDataSource {
  constructor() {
    this._delay = 1000;
    this._allContacts = null;
    this._loading = false;
    this._loadedAll = false;
  }
  get loadedAll() {
    return this._loadedAll;
  }
  get loading() {
    return this._loading;
  }
  get delay() {
    return this._delay;
  }
  set delay(delayMs) {
    this._delay = delayMs;
  }
  async getContacts(count) {
    this._loading = true;
    if (!this._allContacts) {
      this._allContacts =
          await fetch('contacts/contacts.json').then(resp => resp.json());
    }
    // Simulate slow server load...
    await new Promise(resolve => setTimeout(resolve, this._delay));
    const res = this._allContacts.splice(0, count);
    this._loadedAll = this._allContacts.length === 0;
    this._loading = false;
    return res;
  }
}
