import * as util from '../util/util.mjs';

// All loads after the first will be delayed by this much.
const DELAY_MS = 1000;

export class ContactDataSource {
  _delayMs = 0;
  _allContacts = null;
  _loading = false;
  _loadedAll = false;

  get loadedAll() {
    return this._loadedAll;
  }

  get loading() {
    return this._loading;
  }

  async getNextContacts(count) {
    this._loading = true;
    if (!this._allContacts) {
      this._allContacts =
          await fetch('contacts/contacts.json').then(resp => resp.json());
    }
    // Simulate slow server load...
    await util.delay(this._delayMs);
    const res = this._allContacts.splice(0, count);
    this._loadedAll = this._allContacts.length === 0;
    this._loading = false;
    // After the first load, simulate a delay.
    this._delayMs = DELAY_MS;
    return res;
  }
}
