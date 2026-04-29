// Preparation phase logic (GDD §8 Phase 1).
// Pure functions — no DOM, no side effects.

import { TUNING } from '../config/tuning.js';
import { getAllCheats } from './cheats.js';
import { rollDice } from './dice.js';

const { cheatCap } = TUNING;

// ─── Step 1: Cheat cap ────────────────────────────────────────────────────────

/**
 * Returns the fight's cheat cap: floor(pathLength × random(minPct..maxPct)).
 * @param {number} pathLength
 * @returns {number}
 */
export function rollCheatCap(pathLength) {
  const pct = cheatCap.minPct + Math.random() * (cheatCap.maxPct - cheatCap.minPct);
  return Math.floor(pathLength * pct);
}

// ─── Step 2: AI dice config ───────────────────────────────────────────────────

/**
 * Generates a random AI dice config with sum = aiDiceCap (maximum strength).
 * AI has no zero-face restriction (GDD §5).
 * Result is shuffled so the remainder doesn't always fall on the last face.
 *
 * @param {number} aiDiceCap  From tier config (22–25).
 * @returns {number[]}  6 non-negative integers summing to aiDiceCap.
 */
export function generateAiDiceConfig(aiDiceCap) {
  const faces = [0, 0, 0, 0, 0, 0];
  let remaining = aiDiceCap;
  for (let i = 0; i < 5; i++) {
    const val = Math.floor(Math.random() * (remaining + 1));
    faces[i] = val;
    remaining -= val;
  }
  faces[5] = remaining;
  for (let i = 5; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [faces[i], faces[j]] = [faces[j], faces[i]];
  }
  return faces;
}

// ─── Step 4: Blind fee ────────────────────────────────────────────────────────

/**
 * Calculates the blind fee in milliseconds.
 * @param {number} timeMs       Current remaining time on the clock.
 * @param {number} blindFeePct  From tier config.
 * @returns {number}
 */
export function calcBlindFeeMs(timeMs, blindFeePct) {
  return Math.floor(timeMs * blindFeePct);
}

/**
 * Calculates the AI fight pool.
 * @param {number} blindFeeMs
 * @param {number} fightPoolX  From tier config.
 * @returns {number}
 */
export function calcAiFightPool(blindFeeMs, fightPoolX) {
  return blindFeeMs * fightPoolX;
}

// ─── Step 5: AI cheat placement ───────────────────────────────────────────────

/**
 * Generates a random AI cheat pool for the fight.
 * AI pool is hidden from the player (GDD §11).
 * @param {number} [count]
 * @returns {string[]}  Cheat IDs.
 */
export function generateAiCheatPool(count = 3) {
  return [...getAllCheats()]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map(c => c.id);
}

/**
 * Chooses a random valid placement for the AI.
 *   - bad cheats  → player's path
 *   - good cheats → AI's own path
 * Respects the single-instance-per-owner rule (GDD §6.3).
 * Returns null if no valid placement exists.
 *
 * @param {{ pathLength: number, cheats: { player: object, ai: object } }} boardState
 * @param {string[]} cheatIds  Cheat IDs available to the AI.
 * @returns {{ cheatId: string, path: 'player'|'ai', tileIndex: number } | null}
 */
export function generateAiPlacement(boardState, cheatIds) {
  if (!cheatIds.length) return null;

  const roster = getAllCheats();
  const { pathLength, cheats } = boardState;

  const aiOnBoard = new Set(
    [...Object.values(cheats.player), ...Object.values(cheats.ai)]
      .filter(c => c && c.placedBy === 'ai')
      .map(c => c.id),
  );

  const shuffled = [...cheatIds].sort(() => Math.random() - 0.5);

  for (const cheatId of shuffled) {
    if (aiOnBoard.has(cheatId)) continue;
    const meta = roster.find(c => c.id === cheatId);
    if (!meta) continue;

    const targetPath = meta.category === 'bad' ? 'player' : 'ai';
    const occupied   = cheats[targetPath];

    const available = [];
    for (let i = 1; i <= pathLength; i++) {
      if (!occupied[i]) available.push(i);
    }
    if (!available.length) continue;

    const tileIndex = available[Math.floor(Math.random() * available.length)];
    return { cheatId, path: targetPath, tileIndex };
  }

  return null;
}

// ─── Step 6: Initiative ───────────────────────────────────────────────────────

/**
 * Resolves initiative from two dice rolls.
 * @param {number} playerRoll
 * @param {number} aiRoll
 * @returns {'player'|'ai'|'tie'}
 */
export function resolveInitiativeWinner(playerRoll, aiRoll) {
  if (playerRoll > aiRoll) return 'player';
  if (aiRoll > playerRoll) return 'ai';
  return 'tie';
}

/**
 * Rolls initiative using a loop (not recursion) until the tie is broken.
 * Safe against degenerate dice that would cause infinite recursive ties (GDD §8).
 *
 * @param {number[]} playerFaces
 * @param {number[]} aiFaces
 * @param {Function} [rollFn]   Injectable for testing.
 * @returns {{ winner: 'player'|'ai', playerRoll: number, aiRoll: number }}
 */
export function rollInitiative(playerFaces, aiFaces, rollFn = rollDice) {
  let playerRoll, aiRoll, result;
  do {
    playerRoll = rollFn(playerFaces);
    aiRoll     = rollFn(aiFaces);
    result     = resolveInitiativeWinner(playerRoll, aiRoll);
  } while (result === 'tie');
  return { winner: result, playerRoll, aiRoll };
}
