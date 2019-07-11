/**
 * Replaces |swapOut| with |swapIn| in the DOM. Reparent all children
 * and copy all attributes.
*/
export function swapElement(swapOut, swapIn) {
  swapIn.append(...swapOut.childNodes);
  for (const a of swapOut.getAttributeNames()) {
    swapIn.setAttribute(a, swapOut.getAttribute(a));
  }
  swapOut.replaceWith(swapIn);
}

/**
 * Returns a promise which delays for |delayMs|.
 */
export function delay(delayMs) {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}
