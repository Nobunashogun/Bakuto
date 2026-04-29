// Cheat effect resolution (GDD §6.6).
// Pure functions — no DOM, no clock, no randomness.
//
// Fight state shape (defined here, owned by fightFlow.js):
//   {
//     boardState:    object,  // from board.js (positions + cheats)
//     activeEffects: [],      // [{ cheatId, targetSide, roundsRemaining }]
//     pot:           number,  // ms in current pot
//     aiFightPool:   number,  // ms in AI fight pool
//     minBlindFeeMs: number,  // fight's blind fee (for TORITATE)
//     flags: {
//       player: { skipNextTurn: bool, tomeActive: bool },
//       ai:     { skipNextTurn: bool, tomeActive: bool },
//     },
//   }
//
// Effect result shape (returned by every apply* function and applyCheatEffect):
//   {
//     fightState,   // updated fight state (immutable — never mutates input)
//     extraTiles,   // number — KAKE: 2, all others: 0
//     reroll,       // bool  — SHIKOMI: true, others: false
//     fightEnded,   // bool  — TORITATE: true if aiFightPool reaches 0
//   }

import { moveTokenTo } from './board.js';

const DEFAULTS = { extraTiles: 0, reroll: false, fightEnded: false };

function ok(fightState, overrides = {}) {
  return { fightState, ...DEFAULTS, ...overrides };
}

function setFlag(flags, side, key, value) {
  return { ...flags, [side]: { ...flags[side], [key]: value } };
}

function addEffect(fightState, cheatId, targetSide, roundsRemaining) {
  return {
    ...fightState,
    activeEffects: [...fightState.activeEffects, { cheatId, targetSide, roundsRemaining }],
  };
}

// ─── Individual effect functions ──────────────────────────────────────────────

// KAKE / HELLSTEP: 2 extra tiles on this turn's movement.
// fightFlow re-moves from the landing position after receiving extraTiles=2.
export function applyKake(fightState, _activatingSide) {
  return ok(fightState, { extraTiles: 2 });
}

// TOME / SOUL ANCHOR: arm overshoot-intercept for activatingSide.
// fightFlow checks tomeActive before calling calculateMove and redirects to END.
export function applyTome(fightState, activatingSide) {
  return ok({
    ...fightState,
    flags: setFlag(fightState.flags, activatingSide, 'tomeActive', true),
  });
}

// SHIKOMI / LOADED: signal fightFlow to reroll and keep the higher result.
// fightFlow rolls a second time, takes max(roll1, roll2), re-resolves from startPos.
export function applyShikomi(fightState, _activatingSide) {
  return ok(fightState, { reroll: true });
}

// KASUMASHI / DEAD WEIGHT: +3 to activatingSide's highest face for 2 full rounds.
// Handled via getDiceModifiers in fightFlow — does NOT alter saved config.
export function applyKasumashi(fightState, activatingSide) {
  return ok(addEffect(fightState, 'KASUMASHI', activatingSide, 2));
}

// MACHI / PURGATORY LOOP: on-0 reroll for 3 full rounds.
// fightFlow checks for MACHI after rolling a 0 face value.
export function applyMachi(fightState, activatingSide) {
  return ok(addEffect(fightState, 'MACHI', activatingSide, 3));
}

// KEPPAN / BLOOD PACT: double the pot at this exact moment.
// Time added to the pot after activation is unaffected (GDD §6.6).
export function applyKeppan(fightState, _activatingSide) {
  return ok({ ...fightState, pot: fightState.pot * 2 });
}

// ASHIDOME / CURSED GROUND: activatingSide loses their next turn.
// skipNextTurn flag is consumed at the start of their next turn.
export function applyAshidome(fightState, activatingSide) {
  return ok({
    ...fightState,
    flags: setFlag(fightState.flags, activatingSide, 'skipNextTurn', true),
  });
}

// KECHIRASHI / HELLFIRE TRAP: send activatingSide back 3 tiles, floor at START.
export function applyKechirashi(fightState, activatingSide) {
  const current = fightState.boardState.positions[activatingSide];
  const newPos   = Math.max(0, current - 3);
  return ok({
    ...fightState,
    boardState: moveTokenTo(fightState.boardState, activatingSide, newPos),
  });
}

// MEZURI / DICE ROT: subtract 2 from activatingSide's highest face for 3 full rounds.
// Handled via getDiceModifiers — face values floor at 0.
export function applyMezuri(fightState, activatingSide) {
  return ok(addEffect(fightState, 'MEZURI', activatingSide, 3));
}

// MISEGANE / FALSE END: send activatingSide back 5 tiles, floor at START.
// Only fires on forward movement — isBouncedBack=true → no-op (tile stays on board).
export function applyMisegane(fightState, activatingSide, isBouncedBack) {
  if (isBouncedBack) return ok(fightState);
  const current = fightState.boardState.positions[activatingSide];
  const newPos   = Math.max(0, current - 5);
  return ok({
    ...fightState,
    boardState: moveTokenTo(fightState.boardState, activatingSide, newPos),
  });
}

// TORITATE / DEBT COLLECTOR: drain one blind fee from AI fight pool.
// If pool reaches 0, fight ends immediately (player wins).
export function applyToritate(fightState, _activatingSide) {
  const newPool  = Math.max(0, fightState.aiFightPool - fightState.minBlindFeeMs);
  const newState = { ...fightState, aiFightPool: newPool };
  return ok(newState, { fightEnded: newPool <= 0 });
}

// ASHIKASE / LEAD BOOTS: halve activatingSide's movement (floor) for 2 full rounds.
// Applied post-roll in applyPostRollModifiers. A result of 0 wastes the turn.
export function applyAshikase(fightState, activatingSide) {
  return ok(addEffect(fightState, 'ASHIKASE', activatingSide, 2));
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

/**
 * Applies a cheat effect after a token lands on a cheat tile.
 *
 * @param {string}           cheatId
 * @param {'player'|'ai'}    activatingSide  The side that landed on the tile.
 * @param {object}           fightState
 * @param {{ isBouncedBack?: boolean }} [context]
 *   isBouncedBack — required for MISEGANE (prevents trigger on bounce-back landings).
 */
export function applyCheatEffect(cheatId, activatingSide, fightState, context = {}) {
  const bounced = context.isBouncedBack ?? false;
  switch (cheatId) {
    case 'KAKE':       return applyKake(fightState, activatingSide);
    case 'TOME':       return applyTome(fightState, activatingSide);
    case 'SHIKOMI':    return applyShikomi(fightState, activatingSide);
    case 'KASUMASHI':  return applyKasumashi(fightState, activatingSide);
    case 'MACHI':      return applyMachi(fightState, activatingSide);
    case 'KEPPAN':     return applyKeppan(fightState, activatingSide);
    case 'ASHIDOME':   return applyAshidome(fightState, activatingSide);
    case 'KECHIRASHI': return applyKechirashi(fightState, activatingSide);
    case 'MEZURI':     return applyMezuri(fightState, activatingSide);
    case 'MISEGANE':   return applyMisegane(fightState, activatingSide, bounced);
    case 'TORITATE':   return applyToritate(fightState, activatingSide);
    case 'ASHIKASE':   return applyAshikase(fightState, activatingSide);
    default:           return ok(fightState);
  }
}

// ─── Active-effect helpers ────────────────────────────────────────────────────

/**
 * Derives dice modifiers from activeEffects for a given side.
 * KASUMASHI → add_to_highest +3  (applied to face array before rolling)
 * MEZURI    → subtract_from_highest +2  (applied to face array before rolling)
 * ASHIKASE is NOT here — it is a post-roll modifier, see applyPostRollModifiers.
 *
 * @param {{ cheatId: string, targetSide: string }[]} activeEffects
 * @param {'player'|'ai'} side
 * @returns {{ type: string, value: number }[]}
 */
export function getDiceModifiers(activeEffects, side) {
  const mods = [];
  for (const ef of activeEffects) {
    if (ef.targetSide !== side) continue;
    if (ef.cheatId === 'KASUMASHI') mods.push({ type: 'add_to_highest',       value: 3 });
    if (ef.cheatId === 'MEZURI')    mods.push({ type: 'subtract_from_highest', value: 2 });
  }
  return mods;
}

/**
 * Returns true if a given cheat effect is currently active for the given side.
 *
 * @param {string} cheatId
 * @param {'player'|'ai'} side
 * @param {object[]} activeEffects
 */
export function hasActiveEffect(cheatId, side, activeEffects) {
  return activeEffects.some(ef => ef.cheatId === cheatId && ef.targetSide === side);
}

/**
 * Applies post-roll movement modifiers to a rolled value.
 * ASHIKASE: floor(roll / 2). A result of 0 wastes the turn (GDD §6.6).
 *
 * @param {number} roll
 * @param {'player'|'ai'} side
 * @param {object[]} activeEffects
 * @returns {number}
 */
export function applyPostRollModifiers(roll, side, activeEffects) {
  if (hasActiveEffect('ASHIKASE', side, activeEffects)) {
    return Math.floor(roll / 2);
  }
  return roll;
}

/**
 * Decrements roundsRemaining for every active effect after one full round
 * (one player turn + one AI turn = 1 round per GDD §5) and removes expired ones.
 *
 * Call this at the end of every full round, not after individual turns.
 *
 * @param {object[]} activeEffects
 * @returns {object[]}
 */
export function tickActiveEffects(activeEffects) {
  return activeEffects
    .map(ef => ({ ...ef, roundsRemaining: ef.roundsRemaining - 1 }))
    .filter(ef => ef.roundsRemaining > 0);
}
