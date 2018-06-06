export const _getLength = Symbol();
export const _item = Symbol();
export const _key = Symbol();

export class ItemSource {
  constructor({getLength, item, key}) {
    if (typeof getLength !== 'function') {
      throw new TypeError('getLength option must be a function');
    }
    if (typeof item !== 'function') {
      throw new TypeError('item option must be a function');
    }
    if (typeof key !== 'function') {
      throw new TypeError('key option must be a function');
    }

    this[_getLength] = getLength;
    this[_item] = item;
    this[_key] = key;
  }

  static fromArray(array, key) {
    if (!Array.isArray(array)) {
      throw new TypeError('First argument to fromArray() must be an array');
    }
    if (typeof key !== 'function' && key !== undefined) {
      throw new TypeError(
          'Second argument to fromArray() must be a function or undefined');
    }

    return new this({
      getLength() {
        return array.length;
      },
      item(index) {
        return array[index];
      },
      key(index) {
        return key ? key(array[index], index) : array[index];
      }
    });
  }

  get length() {
    return this[_getLength]();
  }
}
