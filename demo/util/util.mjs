/**
 * Replaces |swapOut| with |swapIn| in the DOM. Reparent all children
 * and copy all attributes.
*/
export function swapElement(swapOut, swapIn) {
  while (swapOut.childNodes.length > 0) {
    swapIn.appendChild(swapOut.firstChild);
  }
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
