const kMinFlingVelocityValue = 0.4;
const kTouchSlopValue = 5;

class VelocityTracker {
  constructor() {
    this._recentTouchMoves = [];
    this._timeWindow = 50;
  }

  _pruneHistory(timeStamp) {
    const index = this._recentTouchMoves.findIndex((touch) => {
      return touch.timeStamp > timeStamp - this._timeWindow;
    });
    this._recentTouchMoves.splice(0, index + 1);
  }

  update(e) {
    this._pruneHistory(e.timeStamp);
    this._recentTouchMoves.push(e);

    const oldestTouchMove = this._recentTouchMoves[0];

    const deltaX = e.changedTouches[0].clientX - oldestTouchMove.changedTouches[0].clientX;
    const deltaT = e.timeStamp - oldestTouchMove.timeStamp;

    return {
      velocityX: (deltaT > 0) ? deltaX / deltaT : 0
    };
  }
}

class DismissableItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = '<slot></slot>';

    this.position = 0;
    this.itemIndex = 0;
    this.width = 0;
    this.state = 'initial';
    this.addEventListener('touchstart', this);
    this.addEventListener('touchmove', this);
    this.addEventListener('touchend', this);
  }

  handleEvent(event) {
    switch(event.type) {
      case 'touchstart':
        this._onTouchStart(event);
        break;
      case 'touchmove':
        this._onTouchMove(event);
        break;
      case 'touchend':
        this._onTouchEnd(event);
        break;
    }
  }

  setPosition(position) {
    this.width = this.offsetWidth;
    this.style.opacity = (this.width - Math.abs(position)) / this.width;
    const currentY = this.style.transform.split(',')[1];
    this.style.transform = `translate(${position}px, ${currentY}`;
  }

  _dismiss() {
    this.style.opacity = 0;
    const height = getComputedStyle(this).height;

    const collapseAnim = this.animate([
      { height }, { height: '0px'}
    ], { 
      duration: 100,
      iterations: 1
    });

    collapseAnim.onfinish = this._fireRemove.bind(this);
  }

  _fireRemove() {
    this.setPosition(0);

    const event = new CustomEvent('remove', { 
      detail: { itemIndex: this.itemIndex },
      bubbles: true
    });
    this.dispatchEvent(event);
  }

  settle(targetPosition) {
    this.state = 'initial';
    if (targetPosition === this.position) {
      return;
    }

    const currentY = this.style.transform.split(',')[1];
    const isDismiss = targetPosition !== 0;

    const animation = this.animate([
      { transform: `translate(${this.position}px,${currentY}`, opacity: this.style.opacity },
      { transform: `translate(${targetPosition}px,${currentY}`, opacity: isDismiss ? 0 : 1}
    ], { 
      duration: Math.abs(targetPosition - this.position) * 0.5,
      iterations: 1
    });

    this.position = targetPosition;
    animation.onfinish = () => isDismiss ? this._dismiss() : this.setPosition(0);
  }

  fling(velocityX) {
    this.state = 'initial';
    const targetPosition = velocityX < 0 ? -this.width : this.width;

    const currentY = this.style.transform.split(',')[1];

    const animation = this.animate([
      { transform: `translate(${this.position}px,${currentY}`, opacity: this.style.opacity },
      { transform: `translate(${targetPosition}px,${currentY}`, opacity: 0 }
    ], { 
      duration: Math.abs(targetPosition - this.position) / Math.abs(velocityX),
      iterations: 1
    });

    animation.onfinish = this._dismiss.bind(this);
  }

  _settleToClosestPosition() {
    const fraction = this.position / this.width;
    if (fraction > 0.5) {
      this.settle(this.width);
    } else if (fraction < -0.5) {
      this.settle(-this.width);
    } else {
      this.settle(0);
    }
  } 

  _onTouchStart(e) { 
    this.state = 'initial';
    this.startX = e.changedTouches[0].clientX;
    this.startY = e.changedTouches[0].clientY;
    this.startPosition = 0;
  }

  _onTouchMove(e) { 
    if (this.state == 'initial') {
      const deltaX = e.changedTouches[0].clientX - this.startX;
      const deltaY = e.changedTouches[0].clientY - this.startY;

      if (deltaX ** 2 + deltaY ** 2 < kTouchSlopValue ** 2) {
        e.preventDefault();
        return;
      }

      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        this._settleToClosestPosition();
        return;
      }

      this.state = 'dragging';
      this.width = this.offsetWidth;
    }

    if (this.state == 'dragging') {
      this._tracker = this._tracker || new VelocityTracker();
      this._tracker.update(e);

      e.preventDefault();
      const deltaX = e.changedTouches[0].clientX - this.startX;
      this.position = this.startPosition + deltaX;
      this.setPosition(this.position);
    }
  }

  _onTouchEnd(e) { 
    const velocity = this._tracker.update(e).velocityX;
    this._tracker = null;

    if (this.state == 'dragging') {
      if (Math.abs(velocity) > kMinFlingVelocityValue) {
        this.fling(velocity);
        return;
      }
      this._settleToClosestPosition();
    }
  }
}

customElements.define('dismissable-item', DismissableItem);