function redDiv(textContent) {
  const div = document.createElement('div');
  div.style.color = 'red';
  div.textContent = textContent;
  return div;
}

/**
 * Checks that the features needed are present in the browser. If not,
 * it places error messages inside |element|.

 **/
export function confirm(element) {
  if (!element['displayLock']) {
    element.appendChild(redDiv('Display Locking is not available'));
  }

  if (!customElements.get('virtual-scroller')) {
    let div = redDiv('virtual-scroller is not available');
    element.appendChild(div);
    customElements.whenDefined('virtual-scroller').then(() => {
      div.remove();
    });
  }
}
