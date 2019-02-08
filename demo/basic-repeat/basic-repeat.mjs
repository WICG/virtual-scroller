import {VirtualRepeater} from '../../src/VirtualRepeater.mjs';
import {Stateful} from './stateful.mjs';

export const RepeaterControl = Superclass => class extends Superclass {
  constructor() {
    super();

    const items = [];
    for (let i = 0; i < 1000; i++) {
      items.push(`Item ${i}`);
    }

    if (!this.state) {
      this.state = {};
    }

    Object.assign(this.state, {first: 0, num: 10, items});

    document.addEventListener('keydown', e => {
      const inc = this._getIncrement(e);
      switch (e.code) {
        case 'ArrowUp':
          this.setState((prev) => ({
                          first: Math.min(
                              prev.items.length - prev.num - 1,
                              Math.max(0, prev.first - inc))
                        }));
          break;
        case 'ArrowDown':
          this.setState((prev) => ({first: prev.first + inc}));
          break;
        case 'ArrowRight':
          this.setState((prev) => ({num: prev.num + inc}));
          break;
        case 'ArrowLeft':
          this.setState((prev) => ({num: Math.max(0, prev.num - inc)}));
          break;
      }
    });
  }

  _getMods(e) {
    let mods = 0;
    if (e.shiftKey)
      mods++;
    if (e.altKey)
      mods++;
    if (e.metaKey)
      mods++;
    if (e.ctrlKey)
      mods++;
    return mods;
  }

  _getIncrement(e) {
    return Math.pow(4, this._getMods(e));
  }
};

export const Sample = RepeaterControl(Stateful(class {
  render() {
    if (!this._repeater) {
      this.ul = document.createElement('ul');
      document.body.appendChild(this.ul);

      this._repeater = new VirtualRepeater({
        container: this.ul,
        createElement: () => document.createElement('li'),
        updateElement: (child, idx) => {
          const item = this.state.items[idx];
          child.textContent = `${idx}: ${item}`;
          child.onclick = () => console.log(item)
        }
      });
    }
    const {items, num, first} = this.state;
    Object.assign(this._repeater, {totalItems: items.length, num, first});
  }
}));
