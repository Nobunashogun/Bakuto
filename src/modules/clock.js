// Real-time clock (GDD §3).
//
// Mechanism: every write stores { savedMs, epochMs } in localStorage.
// getRemainingMs() = max(0, savedMs - (Date.now() - epochMs)).
// Closing and reopening the game correctly drains the clock — no background
// process needed.
//
// No DOM except the optional visibilitychange guard in startClock.

import { STORAGE_KEY_CLOCK } from './runState.js';

// Callback stored at module scope so deductTimeMs can fire it immediately
// without waiting for the next interval tick.
let _onZeroCallback = null;
let _intervalId     = null;
let _visibilityHandler = null;

// ─── Storage ──────────────────────────────────────────────────────────────────

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLOCK);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupt — fall through */ }
  return null;
}

function persist(savedMs, epochMs) {
  localStorage.setItem(STORAGE_KEY_CLOCK, JSON.stringify({ savedMs, epochMs }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Writes the initial anchor. Call once on run start or resume before startClock.
 * @param {number} startMs  Remaining milliseconds to begin counting from.
 */
export function initClock(startMs) {
  persist(startMs, Date.now());
}

/**
 * Returns current remaining milliseconds, accounting for real elapsed time.
 * Always >= 0.
 */
export function getRemainingMs() {
  const data = load();
  if (!data) return 0;
  return Math.max(0, data.savedMs - (Date.now() - data.epochMs));
}

/** Alias — same resource, same value. */
export const getCurrentTimeMs = getRemainingMs;

/**
 * Adds ms to the clock (pot win, BAD FOR THEM income).
 * @param {number} ms
 */
export function addTimeMs(ms) {
  const current = getRemainingMs();
  persist(current + ms, Date.now());
}

/**
 * Deducts ms from the clock (blind fee, cheat cost).
 * Floors at 0. Fires onZeroCallback immediately if the clock hits zero —
 * does not wait for the next interval tick.
 * @param {number} ms
 * @returns {number} New remaining ms.
 */
export function deductTimeMs(ms) {
  const current = getRemainingMs();
  const next = Math.max(0, current - ms);
  persist(next, Date.now());
  if (next <= 0 && _onZeroCallback) {
    const cb = _onZeroCallback;
    _stopClock();
    cb();
  }
  return next;
}

/**
 * Starts the clock loop.
 * - Fires onZeroCallback synchronously if remaining is already <= 0 on call
 *   (handles returning to a dead run after the game was closed).
 * - Polls every 500 ms.
 * - Adds a visibilitychange guard so background tab throttling can't delay
 *   the callback by more than the next focus event.
 *
 * @param {() => void} onZeroCallback
 * @returns {() => void} stopClock — call to cancel the loop.
 */
export function startClock(onZeroCallback) {
  _onZeroCallback = onZeroCallback;

  // Dead-on-arrival check.
  if (getRemainingMs() <= 0) {
    _onZeroCallback = null;
    onZeroCallback();
    return _stopClock;
  }

  function _check() {
    if (getRemainingMs() <= 0) {
      const cb = _onZeroCallback;
      _stopClock();
      cb();
    }
  }

  _intervalId = setInterval(_check, 500);

  // Only wire visibilitychange in browser environments.
  if (typeof document !== 'undefined') {
    _visibilityHandler = () => {
      if (document.visibilityState === 'visible') _check();
    };
    document.addEventListener('visibilitychange', _visibilityHandler);
  }

  return _stopClock;
}

/**
 * Applies a signed clock delta from fightFlow.resolveTurn.
 *   positive delta → addTimeMs  (AI landed on player's BAD cheat)
 *   negative delta → deductTimeMs  (player landed on own GOOD cheat)
 * Using deductTimeMs for negative deltas ensures the zero-callback fires
 * immediately if the cost drains the clock to 0 (GDD §8, issue #5).
 *
 * @param {number} delta  Positive = gain, negative = deduct.
 * @returns {number} New remaining ms.
 */
export function applyClockDelta(delta) {
  if (delta < 0) return deductTimeMs(-delta);
  if (delta > 0) addTimeMs(delta);
  return getRemainingMs();
}

function _stopClock() {
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  if (_visibilityHandler !== null && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', _visibilityHandler);
    _visibilityHandler = null;
  }
  _onZeroCallback = null;
}
