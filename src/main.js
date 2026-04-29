import { getRunState, resetRun, STORAGE_KEY_CLOCK } from './modules/runState.js';
import { initClock, startClock } from './modules/clock.js';
import { mountClockDebugOverlay } from './renderers/clockDisplay.js';

function boot() {
  const state = getRunState();

  // If no clock anchor exists yet, write one now using the stored timeMs.
  // This handles: fresh run, returning from closure, and post-reset reload.
  if (!localStorage.getItem(STORAGE_KEY_CLOCK)) {
    initClock(state.timeMs);
  }

  // Start the live countdown. resetRun clears both run state and the clock
  // anchor so the next boot begins from a clean 24-hour run.
  startClock(() => {
    resetRun();
    // TODO: show death screen, then reload Ofisu — wired in a later session.
  });

  // DEBUG: visible countdown overlay. Remove when proper UI is in place.
  mountClockDebugOverlay();

  // TODO: mount Ofisu / dungeon screens — wired in the screen session.
}

boot();
