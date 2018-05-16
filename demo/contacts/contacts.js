import Layout from '../../layouts/layout-1d.js';
import {VirtualList} from '../../virtual-list.js';

const scrollMethod = document.createElement('div').scrollIntoViewIfNeeded ?
    'scrollIntoViewIfNeeded' :
    'scrollIntoView';

export const itemType = item => item.image ? 'contact' : 'header';

export class Sample {
  constructor() {
    this.items = [];
    this._pool = {};
    this.container = document.body;
    this.layout = new Layout({direction: 'vertical', _overhang: 800});
    this.resetValue = {image: 'http://via.placeholder.com/73x73&text=+'};

    // TODO: Sample hack; should be handled by the base repeater, or a mixin for
    // same
    window.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        const edgeChild = e.shiftKey ? 'firstChild' : 'lastChild';
        const adjElement =
            e.shiftKey ? 'nextElementSibling' : 'previousElementSibling';
        let edge = this.container[edgeChild];
        while (edge.nodeType !== 1 || edge.style.display === 'none') {
          edge = edge[adjElement];
        }
        const edgeChildFocused = document.activeElement === edge ||
            edge.contains(document.activeElement);
        if (edgeChildFocused) {
          e.preventDefault();
        }
      }
    });

    document.body.style.margin = 0;
    document.body.style.minHeight = '1000000px';

    this._setUp();
  }

  _setUp() {
    const listProps = {
      layout: this.layout,
      container: this.container,
      newChild: (idx) => {
        const item = this.items[idx];
        const type = itemType(item);
        const pool = this._pool[type] || (this._pool[type] = []);
        const recycled = pool.pop();
        if (recycled) {
          return recycled;
        } else {
          if (type === 'contact') {
            const card = document.createElement('div');
            card.style =
                'padding: 10px; border-bottom: 1px solid #CCC; width: 100%; box-sizing: border-box;';
            const name = document.createElement('b');
            const text = document.createElement('p');
            text.contentEditable = true;
            card.appendChild(name);
            card.appendChild(text);

            card.addEventListener(
                'input', e => this._updateItemSize(card['_idx'], e));
            text.addEventListener('focus', e => this._scrollToFocused(e));
            text.addEventListener(
                'blur',
                e => this._commitChange(
                    card['_idx'], 'longText', e.target.textContent));

            return card;
          } else {
            const header = document.createElement('div');
            header.style =
                'color: white; background: #2222DD; padding: 10px; border-bottom: 1px solid #CCC; width: 100%; box-sizing: border-box;';
            return header;
          }
        }
      },
      updateChild: (child, idx) => {
        const item = this.items[idx];
        if (itemType(item) === 'contact') {
          child._idx = idx;
          child.querySelector('b').textContent =
              `#${item.index} - ${item.first} ${item.last}`;
          child.querySelector('p').textContent = item.longText;
        } else {
          child.textContent = item.title;
        }
      },
      recycleChild: (child, idx) => {
        const item = this.items[idx];
        const type = itemType(item);
        if (type === 'contact') {
          child._idx = -1;
          child.querySelector('b').textContent = '';
          child.querySelector('p').textContent = '';
        }
        this._pool[type].push(child);
      },
      // resetValue: this.resetValue
    };
    this.list = new VirtualList(listProps);
  }

  render() {
    this.list.totalItems = this.items.length;
  }

  async load(data) {
    const resp = await fetch(data);
    const contacts = await resp.json();
    let prev;
    this.items = contacts.sort((a, b) => a.last < b.last ? -1 : 1)
                     .reduce((items, item) => {
                       let cur = item.last.substr(0, 1);
                       if (prev !== cur) {
                         items.push({title: cur});
                       }
                       items.push(item);
                       prev = cur;
                       return items;
                     }, []);
    this.render();
  }

  // Quick and dirty support for updating data, scrolling to a physical child,
  // and informing layout of a change in child totalItems, to demo/test related
  // use cases

  _scrollToFocused({target}) {
    setTimeout(() => target.parentNode[scrollMethod](true), 0);
  }

  _commitChange(idx, prop, newVal) {
    if (idx === -1)
      return;
    const prevVal = this.items[idx][prop];
    if (newVal !== prevVal) {
      this.items[idx][prop] = newVal;
      // HACK(valdrin) Ideally we'd only do this.list.requestReset(),
      // but since lit-repeater & preact-repeater don't give access to that
      // method, we force reset by altering the items length.
      this.items.length++;
      this.render();
      this.items.length--;
      this.render();
    }
  }

  _updateItemSize(idx, {currentTarget}) {
    this.layout.updateItemSizes({
      [idx]: {
        width: currentTarget.offsetWidth,
        height: currentTarget.offsetHeight
      }
    });
    this.layout.reflowIfNeeded();
  }
}