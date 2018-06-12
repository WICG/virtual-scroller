const kMinFlingVelocityValue = 0.4;
const kTouchSlopValue = 5;

class VelocityTracker {
  constructor(target) {
    this.target = target;

    this._recentTouchMoves = [];
    this.velocityX = 0;
    this._timeWindow = 50;

    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
  }

  start() {
    this.target.addEventListener('touchstart', this._onTouchStart);
    this.target.addEventListener('touchmove', this._onTouchMove);
    this.target.addEventListener('touchend', this._onTouchEnd);
  }

  stop() {
    this._recentTouchMoves = [];
    this.velocityX = 0;
    this.target.removeEventListener('touchstart', this._onTouchStart);
    this.target.removeEventListener('touchmove', this._onTouchMove);
    this.target.removeEventListener('touchend', this._onTouchEnd);
  }

  _pruneHistory(timeStamp) {
    for (let i = 0; i < this._recentTouchMoves.length; ++i) {
      if (this._recentTouchMoves[i].timeStamp > timeStamp - this._timeWindow) {
        this._recentTouchMoves = this._recentTouchMoves.slice(i);
        return;
      }
    }
    this._recentTouchMoves = [];
  }

  _update(e) {
    this._pruneHistory(e.timeStamp);
    this._recentTouchMoves.push(e);

    const oldestTouchMove = this._recentTouchMoves[0];

    const deltaX = e.changedTouches[0].clientX - oldestTouchMove.changedTouches[0].clientX;
    const deltaT = e.timeStamp - oldestTouchMove.timeStamp;

    if (deltaT > 0) {
      this.velocityX = deltaX / deltaT;
    } else {
      this.velocityX = 0;
    }
  }

  _onTouchStart(e) {
    this._recentTouchMoves.push(e);
    this.velocityX = 0;
  }

  _onTouchMove(e) {
    this._update(e);
  }

  _onTouchEnd(e) {
    this._update(e);
    this._recentTouchMoves = [];
  }
}

class DismissableItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <div>
        <slot></slot>
      </div>
    `;

    this.tracker = new VelocityTracker(this);

    this.position = 0;
    this.itemIndex = 0;
    this.width = 0;

    this.state = "initial";

    this.addEventListener('touchstart', this._onTouchStart.bind(this));
    this.addEventListener('touchmove', this._onTouchMove.bind(this));
    this.addEventListener('touchend', this._onTouchEnd.bind(this));
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

    collapseAnim.onfinish = () => {
      this.setPosition(0);
      const event = new CustomEvent('remove', { index: this.itemIndex });
      this.dispatchEvent(event);
    }
  }

  settle(targetPosition) {
    this.state = "initial";

    const basePosition = this.position;
    if (targetPosition === basePosition) {
      return;
    }

    this.position = targetPosition;
    const baseOpacity = this.style.opacity;

    const currentY = this.style.transform.split(',')[1];

    const isDismiss = targetPosition !== 0;

    const animation = this.animate([
      { transform: `translate(${basePosition}px,${currentY}`, opacity: baseOpacity },
      { transform: `translate(${targetPosition}px,${currentY}`, opacity: isDismiss ? 0 : 1}
    ], { 
      duration: Math.abs(targetPosition - basePosition) * 0.5,
      iterations: 1
    });

    animation.onfinish = () => {
      if (isDismiss) {
        this._dismiss();
      } else {
        this.setPosition(0);
      }
    }
  }

  fling(velocityX) {
    this.state = "initial";
    const basePosition = this.position;
    const targetPosition = velocityX < 0 ? -this.width : this.width;

    const baseOpacity = this.style.opacity;

    const currentY = this.style.transform.split(',')[1];

    const animation = this.animate([
      { transform: `translate(${basePosition}px,${currentY}`, opacity: baseOpacity },
      { transform: `translate(${targetPosition}px,${currentY}`, opacity: 0 }
    ], { 
      duration: Math.abs(targetPosition - basePosition) / Math.abs(velocityX),
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
    this.state = "initial";

    this.startX = e.changedTouches[0].clientX;
    this.startY = e.changedTouches[0].clientY;
    this.startPosition = 0;
  }

  _onTouchMove(e) { 
    if (this.state == "initial") {
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

      this.state = "dragging";
      this.width = this.offsetWidth;
      this.tracker.start();
    }

    if (this.state == "dragging") {
      e.preventDefault();
      const deltaX = e.changedTouches[0].clientX - this.startX;
      this.position = this.startPosition + deltaX;
      this.setPosition(this.position);
    }
  }

  _onTouchEnd(e) { 
    this.tracker.stop();

    if (this.state == "dragging") {
      const velocity = this.tracker.velocityX;
      if (Math.abs(velocity) > kMinFlingVelocityValue) {
        this.fling(velocity);
        return;
      }
      this._settleToClosestPosition();
    }
  }
}

customElements.define('dismissable-item', DismissableItem);