// Debug clock overlay — HH:MM:SS countdown, fixed top-right corner.
// Driven by requestAnimationFrame; independent of the clock interval.
// Remove this overlay in a later session once proper UI is in place.

import { getRemainingMs } from '../modules/clock.js';

let _rafId = null;
let _el    = null;

function formatMs(ms) {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return (
    String(h).padStart(2, '0') + ':' +
    String(m).padStart(2, '0') + ':' +
    String(s).padStart(2, '0')
  );
}

/** Appends the debug overlay to document.body and starts updating it. */
export function mountClockDebugOverlay() {
  if (_el) return; // already mounted

  _el = document.createElement('div');
  _el.id = 'clock-debug';
  Object.assign(_el.style, {
    position:      'fixed',
    top:           '8px',
    right:         '8px',
    background:    'rgba(0, 0, 0, 0.80)',
    color:         '#ff4040',
    fontFamily:    'monospace',
    fontSize:      '13px',
    padding:       '3px 8px',
    zIndex:        '9999',
    pointerEvents: 'none',
    letterSpacing: '1px',
    userSelect:    'none',
  });
  document.body.appendChild(_el);

  function tick() {
    if (_el) _el.textContent = formatMs(getRemainingMs());
    _rafId = requestAnimationFrame(tick);
  }
  _rafId = requestAnimationFrame(tick);
}

/** Removes the overlay and cancels the animation loop. */
export function unmountClockDebugOverlay() {
  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }
  if (_el) {
    _el.remove();
    _el = null;
  }
}
