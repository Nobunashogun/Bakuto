// AI opponent logic (GDD §5, §6, §8).
// Weighted dice distribution, cheat pool selection, and heuristic board placement.
// Pure functions — no DOM, no localStorage.

import { getAllCheats, getCheatById } from './cheats.js';

// ── Preferred cheats (3× sampling weight) ────────────────────────────────────
const PREFERRED = new Set(['ASHIDOME', 'ASHIKASE', 'KAKE', 'SHIKOMI', 'MEZURI']);

// ── Dice configuration ────────────────────────────────────────────────────────

/**
 * Generates an AI dice config weighted toward 1–2 high faces with a moderate remainder.
 * No zeros unless the cap is too small to avoid them.
 *
 * Strategy:
 *   1. Pick 1 or 2 faces to be "high" (30–45% of cap each).
 *   2. Spread the remainder across the other 4–5 faces with min-1 preference.
 *   3. Shuffle so high faces aren't always at fixed positions.
 *
 * @param {number} aiDiceCap  From tier config (22–25).
 * @returns {number[]}  6 non-negative integers summing to aiDiceCap.
 */
export function generateWeightedAiDiceConfig(aiDiceCap) {
  const faces  = [0, 0, 0, 0, 0, 0];
  const high   = Math.random() < 0.5 ? 1 : 2;
  const order  = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
  let remaining = aiDiceCap;

  // Assign high faces (30–45% of cap each, never stealing the last ms from others)
  for (let i = 0; i < high; i++) {
    const share  = 0.30 + Math.random() * 0.15;
    const ideal  = Math.floor(remaining * share);
    const safeMax = remaining - (6 - i - 1);          // leave at least 1 ms per remaining slot
    const val    = Math.max(1, Math.min(ideal, safeMax));
    faces[order[i]] = val;
    remaining -= val;
  }

  // Spread remainder with min-1-per-face preference
  const restCount = 6 - high;
  for (let i = high; i < 5; i++) {
    const slotsLeft = 5 - i;
    const minVal = remaining > slotsLeft ? 1 : 0;
    const maxVal = Math.max(minVal, remaining - slotsLeft * minVal);
    const val    = minVal + Math.floor(Math.random() * (maxVal - minVal + 1));
    faces[order[i]] = val;
    remaining -= val;
  }
  faces[order[5]] = Math.max(0, remaining);

  return faces;
}

// ── Cheat pool selection ──────────────────────────────────────────────────────

/**
 * Generates an AI cheat pool with a 3× weight toward preferred cheats.
 * Returns `count` unique cheat IDs (3–5 typical, defaults to 3).
 *
 * @param {number} [count]
 * @returns {string[]}
 */
export function generateWeightedAiCheatPool(count = 3) {
  const all      = getAllCheats().map(c => c.id);
  const weighted = all.flatMap(id => PREFERRED.has(id) ? [id, id, id] : [id]);
  const chosen   = new Set();

  while (chosen.size < count && chosen.size < all.length) {
    const id = weighted[Math.floor(Math.random() * weighted.length)];
    chosen.add(id);
  }
  return [...chosen];
}

// ── Cheat placement ───────────────────────────────────────────────────────────

/**
 * Returns the mode (most common value) of an array.
 * Ties broken by smallest value (conservative landing estimate).
 * @param {number[]} arr
 * @returns {number}
 */
function modeFace(arr) {
  const freq = new Map();
  for (const v of arr) freq.set(v, (freq.get(v) ?? 0) + 1);
  let best = arr[0], bestCount = 0;
  for (const [v, c] of freq) {
    if (c > bestCount || (c === bestCount && v < best)) {
      best = v; bestCount = c;
    }
  }
  return best;
}

/**
 * Heuristic AI cheat placement.
 *
 * Target tile = currentPos + mode(aiFaces), clamped to [1, pathLength].
 *   - BAD cheats → placed on player's path, aimed ahead of the player's token.
 *   - GOOD cheats → placed on AI's own path, aimed ahead of the AI's token.
 *
 * Falls back to a random available tile if the preferred tile is occupied.
 * Skips cheats already on the board for the AI (single-instance-per-owner rule).
 * Returns null if no valid placement exists.
 *
 * boardState format: board.js shape
 *   { pathLength, positions: { player, ai }, cheats: { player: {[idx]: cheat}, ai: {[idx]: cheat} } }
 * Stored cheat shape: { id, placedBy, ... }
 *
 * @param {object}   boardState
 * @param {string[]} cheatIds   Available cheat IDs for the AI.
 * @param {number[]} aiFaces    AI's current dice face values.
 * @returns {{ cheatId: string, path: 'player'|'ai', tileIndex: number } | null}
 */
export function generateAiCheatPlacement(boardState, cheatIds, aiFaces) {
  if (!cheatIds.length) return null;

  const { pathLength, positions, cheats } = boardState;
  const step = modeFace(aiFaces);

  // Build set of cheat IDs the AI already has on the board (either path)
  const aiOnBoard = new Set(
    [...Object.values(cheats.player), ...Object.values(cheats.ai)]
      .filter(c => c && c.placedBy === 'ai')
      .map(c => c.id),
  );

  const shuffled = [...cheatIds].sort(() => Math.random() - 0.5);

  for (const cheatId of shuffled) {
    if (aiOnBoard.has(cheatId)) continue;

    let meta;
    try { meta = getCheatById(cheatId); } catch { continue; }

    const targetPath = meta.category === 'bad' ? 'player' : 'ai';
    const fromPos    = positions[targetPath === 'player' ? 'player' : 'ai'] ?? 0;
    const occupied   = cheats[targetPath] ?? {};

    const preferred = Math.min(pathLength, Math.max(1, fromPos + step));

    const available = [];
    for (let i = 1; i <= pathLength; i++) {
      if (!occupied[i]) available.push(i);
    }
    if (!available.length) continue;

    const tileIndex = available.includes(preferred)
      ? preferred
      : available[Math.floor(Math.random() * available.length)];

    return { cheatId, path: targetPath, tileIndex };
  }

  return null;
}
