const _initialEstimate = Symbol('HeightEstimator#[_initialEstimate]');
const _known = Symbol('HeightEstimator#[_known]');
const _total = Symbol('HeightEstimator#[_total]');
const _count = Symbol('HeightEstimator#[_count]');

export class HeightEstimator {
  constructor({initialEstimate = 64} = {}) {
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

  // Produces either the last generated or provided estimate or creates and
  // stores a new estimate and returns that. The generated estimate for a node
  // should be stored so that it isn't regenerated and potentially changed when
  // new estimates are inserted.
  estimateHeight(item) {
    if (this[_total] === 0 || this[_count] === 0) {
      const estimate = this[_initialEstimate];
      this[_known].set(item, estimate);
      return estimate;
    }

    if (this[_known].has(item)) {
      return this[_known].get(item);
    }

    const estimate = this[_total] / this[_count];
    this[_known].set(item, estimate);
    return estimate;
  }
};
