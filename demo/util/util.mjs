/**
 * Replaces |swapOut| with |swapIn| in the DOM. Reparent all children
 * and copy all attributes.
*/
export function swapElement(swapOut, swapIn) {
  for (const a of swapOut.getAttributeNames()) {
    swapIn.setAttribute(a, swapOut.getAttribute(a));
  }
  swapIn.append(...swapOut.childNodes);
  swapOut.replaceWith(swapIn);
}

/**
 * Returns a promise which delays for |delayMs|.
 */
export function delay(delayMs) {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * Calls |callback| every frame, passing in a count of the frames
 * elapsed and the RAF timestamp.
 */
export function everyFrame(callback) {
  let i = 0;
  function update(timestamp) {
    callback(i, timestamp);
    schedule();
    i++;
  }
  function schedule() {
    window.requestAnimationFrame(
      update
    );
  }
  schedule();
}
