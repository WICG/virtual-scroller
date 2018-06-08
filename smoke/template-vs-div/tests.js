
import {HtmlSpec} from '../../node_modules/streaming-spec/HtmlSpec.js';
import {iterateStream} from '../../node_modules/streaming-spec/iterateStream.js';

const SPEC_URL = 'https://html.spec.whatwg.org/';
let specElements = null;
let specHTML = null;

const getElements = async () => {
  const spec = new HtmlSpec();
  const stream = spec.advance();
  for await (const _ of iterateStream(stream)) {
  }
  // Collect elements, cleanup internal variables and generated iframe
  // so they can be garbage collected.
  const elements = spec._elements;
  spec._elements = null;
  document.querySelector('iframe').remove();
  return elements;
};

const wait = () =>
    new Promise(r => requestAnimationFrame(() => requestIdleCallback(r)));


export const streamsTime = async () => {
  await wait();
  const start = performance.now();
  await getElements();
  return performance.now() - start;
};

export const renderTime = async (elem) => {
  if (!specElements) {
    specElements = await getElements();
  }
  await wait();
  // Use document fragment if elem is a template.
  const container = elem.content || elem;
  const start = performance.now();
  specElements.forEach(child => container.appendChild(child));
  // Force layout and paint.
  elem.offsetHeight;
  getComputedStyle(elem).height;
  return performance.now() - start;
};

export const innerHTMLTime = async (container) => {
  if (!specHTML) {
    const resp = await fetch(SPEC_URL);
    specHTML = await resp.text();
  }
  await wait();
  const start = performance.now();
  container.innerHTML = specHTML;
  // Force layout and paint.
  container.offsetHeight;
  getComputedStyle(container).height;
  return performance.now() - start;
};
