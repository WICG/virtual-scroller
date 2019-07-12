function redP(textContent) {
  const p = document.createElement('p');
  p.style.color = 'red';
  p.textContent = textContent;
  return p;
}

/**
 * Checks that the features needed are present in the browser. If not,
 * it places error messages inside |element|.

 **/
export function confirm(element) {
  if (element.displayLock === undefined) {
    element.appendChild(redP('Display Locking is not available'));
  }

  if (!customElements.get('virtual-scroller')) {
    const div = redP('virtual-scroller is not available');
    element.appendChild(div);
    customElements.whenDefined('virtual-scroller').then(() => {
      div.remove();
    });
  }
}
