// Movement resolution for both paths (GDD §7).
// Pure function — no DOM, no state.
//
// Handles: normal advance, exact END landing, overshoot bounce-back from END,
// and per-turn extra-tile modifiers (KAKE / HELLSTEP).
//
// Dice face modifiers (KASUMASHI, MEZURI, ASHIKASE) affect the rolled value
// before it reaches this function — those live in dice.js / fightFlow.js.

/**
 * Resolves where a token lands after a roll, accounting for overshoot
 * bounce-back and any per-turn extra-tile modifiers (GDD §7, §6.6 KAKE).
 *
 * Board indices:  0 = START,  1..pathLength = traversal,  pathLength+1 = END
 *
 * @param {number} currentPosition  Current tile index
 * @param {number} roll             Raw dice face value (≥ 0)
 * @param {number} pathLength       Traversal tile count for this fight
 * @param {{ type: string, value: number }[]} modifiers
 *   Per-turn movement modifiers. Supported type: 'extra_tiles' (KAKE +2)
 * @returns {{ newPosition: number, landedOnEnd: boolean, overshoot: number }}
 *   newPosition  — tile index where the token lands
 *   landedOnEnd  — true when landing exactly on END
 *   overshoot    — tiles past END that were reversed (0 when no overshoot)
 */
export function resolveMove(currentPosition, roll, pathLength, modifiers = []) {
  const endIndex = pathLength + 1;

  let effectiveRoll = roll;
  for (const mod of modifiers) {
    if (mod.type === 'extra_tiles') effectiveRoll += mod.value;
  }

  if (effectiveRoll <= 0) {
    return { newPosition: currentPosition, landedOnEnd: false, overshoot: 0 };
  }

  const raw = currentPosition + effectiveRoll;

  if (raw === endIndex) {
    return { newPosition: endIndex, landedOnEnd: true, overshoot: 0 };
  }

  if (raw > endIndex) {
    const overshoot   = raw - endIndex;
    const newPosition = Math.max(0, endIndex - overshoot);
    return { newPosition, landedOnEnd: false, overshoot };
  }

  return { newPosition: raw, landedOnEnd: false, overshoot: 0 };
}
