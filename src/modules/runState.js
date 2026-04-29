// Run state manager (GDD §2, §10).
// Owns all serialisable run data. Persists to localStorage.
// No DOM. No clock logic — timeMs here is the stored snapshot, not a live countdown.

import { TUNING } from '../config/tuning.js';

export const STORAGE_KEY_RUN   = 'bakuto_run';
export const STORAGE_KEY_CLOCK = 'bakuto_clock';  // referenced by clock.js

const FRESH_STATE = () => ({
  timeMs:            TUNING.run.startingTimeMs,              // 86_400_000 (24 h)
  dungeonLevel:      0,
  lastBackRoomLevel: 0,
  lastBossLevel:     0,   // set after Boss fight; distinguishes "in special" from "completed"
  cheatInventory:    [],                                     // array of cheat ids
  diceConfig:        [null, null, null, null, null, null],   // blank dice (GDD §5)
});

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a copy of the current run state from localStorage.
 * If no saved state exists, returns a fresh default state without persisting it.
 * @returns {ReturnType<typeof FRESH_STATE>}
 */
export function getRunState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RUN);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupt storage — fall through */ }
  return FRESH_STATE();
}

/**
 * Writes the given state object to localStorage, replacing any existing state.
 * @param {ReturnType<typeof FRESH_STATE>} state
 */
export function saveRunState(state) {
  localStorage.setItem(STORAGE_KEY_RUN, JSON.stringify(state));
}

/**
 * Full roguelite reset (GDD §10).
 * Wipes run state to fresh defaults and clears the clock's saved timestamp so
 * the next session starts with a clean 24-hour clock.
 */
export function resetRun() {
  localStorage.setItem(STORAGE_KEY_RUN, JSON.stringify(FRESH_STATE()));
  localStorage.removeItem(STORAGE_KEY_CLOCK);
}
