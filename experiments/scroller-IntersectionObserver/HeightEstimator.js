export class HeightEstimator {
  constructor() {
    this._known = new Map();
  }

  set(item, height) {
    this._known.set(item, height);
  }

  delete(item) {
    this._known.delete(item);
  }

  estimateHeight(item) {
    if (this._known.has(item)) {
      return this._known.get(item);
    }

    const known = Array.from(this._known.values());
    return known.reduce((a, b) => a + b, 0) / known.length;
  }
};
