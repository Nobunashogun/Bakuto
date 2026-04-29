// Dungeon progression (GDD §2, §4).
// Pure state management — no DOM, no dice.

import { TUNING, getTierForLevel, isBackRoomLevel } from '../config/tuning.js';
import { getRunState, saveRunState } from './runState.js';

// ── Depth tier ────────────────────────────────────────────────────────────────

/**
 * Returns the depth tier number (1 | 2 | 3 | 4) for a regular dungeon level.
 * @param {number} level
 * @returns {1|2|3|4}
 */
export function getDepthTier(level) {
  return TUNING.tiers.indexOf(getTierForLevel(level)) + 1;
}

// ── Special level detection ───────────────────────────────────────────────────

/**
 * True if the level triggers the Back Room + Boss sequence (every 7 regular levels).
 * @param {number} level
 * @returns {boolean}
 */
export { isBackRoomLevel as isSpecialLevel };

// ── Level advancement ─────────────────────────────────────────────────────────

/**
 * Increments the dungeon level counter and persists it.
 * When advancing into a special level, also updates lastBackRoomLevel so that
 * quit-and-resume always lands back at the correct checkpoint.
 *
 * @returns {{ nextLevel: number, isSpecial: boolean }}
 */
export function advanceDungeonLevel() {
  const state    = getRunState();
  const nextLevel = (state.dungeonLevel || 0) + 1;
  const isSpecial = isBackRoomLevel(nextLevel);

  const patch = { dungeonLevel: nextLevel };
  if (isSpecial) patch.lastBackRoomLevel = nextLevel;

  saveRunState({ ...state, ...patch });
  return { nextLevel, isSpecial };
}

// ── Quit / resume ─────────────────────────────────────────────────────────────

/**
 * Persists the current progress so the player can resume from the last Back Room.
 * Call on voluntary dungeon exit. No-op if lastBackRoomLevel is already current.
 */
export function saveQuitProgress() {
  const state = getRunState();
  const every = TUNING.backRoom.appearsEveryNLevels;
  const lastBR = Math.floor((state.dungeonLevel || 0) / every) * every;
  if (lastBR !== state.lastBackRoomLevel) {
    saveRunState({ ...state, lastBackRoomLevel: lastBR });
  }
}

/**
 * Returns the dungeon level to resume from on re-entry.
 *   - lastBackRoomLevel === 0 → start from level 1 (never reached a Back Room)
 *   - otherwise → resume at lastBackRoomLevel (Back Room greyed, then Boss fight)
 * @returns {number}
 */
export function getResumeLevel() {
  return getRunState().lastBackRoomLevel || 1;
}

// ── Boss scaling ──────────────────────────────────────────────────────────────

/**
 * Returns the AI fight pool multiplier for a given level.
 * Boss levels (special levels) use ×2; regular fights use ×1.
 * @param {number} level
 * @returns {1|2}
 */
export function getAiFightPoolMultiplier(level) {
  return isBackRoomLevel(level) ? 2 : 1;
}
