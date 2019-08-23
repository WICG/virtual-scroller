// Conveniently import all of the demo stuff.
import '../util/confirm-features.mjs';
import '../util/fps-display.mjs';
import '../util/demo-controller.mjs';
// Import this dynamically. If virtual-scroller is not available, the
// demo will still work.
import('std:elements/virtual-scroller');

const dc = document.getElementById('dc');
const vs = document.getElementById('vs');
dc.setContainer(vs);
