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
