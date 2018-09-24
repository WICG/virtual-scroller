const _initialEstimate = Symbol('HeightEstimator#[_initialEstimate]');
const _known = Symbol('HeightEstimator#[_known]');
const _total = Symbol('HeightEstimator#[_total]');
const _count = Symbol('HeightEstimator#[_count]');

export class HeightEstimator {
  constructor({initialEstimate = 16} = {}) {
    this[_initialEstimate] = initialEstimate;
    this[_known] = new Map();
    this[_total] = 0;
    this[_count] = 0;
  }

  set(item, height) {
    if (this[_known].has(item)) {
      const currentHeight = this[_known].get(item);
      this[_known].set(item, height);
      this[_total] += height - currentHeight;
    } else {
      this[_known].set(item, height);
      this[_total] += height;
      this[_count] += 1;
    }
  }

  delete(item) {
    if (this[_known].has(item)) {
      const height = this[_known].get(item);
      this[_known].delete(item);
      this[_total] -= height;
      this[_count] -= 1;
    }
  }

  estimateHeight(item) {
    if (this[_total] === 0) {
      return this[_initialEstimate];
    }

    if (this[_known].has(item)) {
      return this[_known].get(item);
    }

    return this[_total] / this[_count];
  }
};
