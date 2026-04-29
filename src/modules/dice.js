// Dice system (GDD §5).
// Handles configuration validation, modifier application, and rolling.
// All functions are pure — no state, no DOM, no localStorage.
//
// Mid-fight modifier stacks (duration tracking) are owned by fightFlow.js.
// This module only applies whatever modifiers are currently active.

import { TUNING } from '../config/tuning.js';

const FACE_COUNT       = TUNING.dice.faceCount;           // 6
const PLAYER_SUM_CAP   = TUNING.dice.playerSumCap;        // 21
const PLAYER_MAX_ZEROS = TUNING.dice.playerMaxZeroFaces;  // 3

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates a player dice configuration.
 * Rules enforced at configuration time only (GDD §5):
 *   - Exactly 6 faces, all assigned (non-null) non-negative integers
 *   - Sum ≤ 21
 *   - Max 3 faces may be 0
 *
 * @param {(number|null)[]} faces
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateConfig(faces) {
  if (!Array.isArray(faces) || faces.length !== FACE_COUNT) {
    return { valid: false, error: `Dice must have exactly ${FACE_COUNT} faces.` };
  }
  if (faces.some(f => f === null || f === undefined)) {
    return { valid: false, error: 'All faces must be assigned before locking in.' };
  }
  if (faces.some(f => !Number.isInteger(f) || f < 0)) {
    return { valid: false, error: 'Face values must be non-negative integers.' };
  }
  const sum = faces.reduce((a, b) => a + b, 0);
  if (sum > PLAYER_SUM_CAP) {
    return { valid: false, error: `Sum ${sum} exceeds the player cap of ${PLAYER_SUM_CAP}.` };
  }
  const zeroCount = faces.filter(f => f === 0).length;
  if (zeroCount > PLAYER_MAX_ZEROS) {
    return { valid: false, error: `Max ${PLAYER_MAX_ZEROS} zero faces allowed (found ${zeroCount}).` };
  }
  return { valid: true, error: null };
}

/**
 * Validates an AI dice configuration against a depth-scaled sum cap.
 * AI has no restriction on zero faces (GDD §5).
 *
 * @param {(number|null)[]} faces
 * @param {number} sumCap  From TUNING.tiers[n].aiDiceCap (22–25).
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateAiConfig(faces, sumCap) {
  if (!Array.isArray(faces) || faces.length !== FACE_COUNT) {
    return { valid: false, error: `Dice must have exactly ${FACE_COUNT} faces.` };
  }
  if (faces.some(f => f === null || f === undefined)) {
    return { valid: false, error: 'All faces must be assigned.' };
  }
  if (faces.some(f => !Number.isInteger(f) || f < 0)) {
    return { valid: false, error: 'Face values must be non-negative integers.' };
  }
  const sum = faces.reduce((a, b) => a + b, 0);
  if (sum > sumCap) {
    return { valid: false, error: `Sum ${sum} exceeds the AI cap of ${sumCap}.` };
  }
  return { valid: true, error: null };
}

// ─── Modifiers ────────────────────────────────────────────────────────────────

/**
 * Applies one modifier to the face array and returns a new array.
 * Never mutates the input. Face values floor at 0 (GDD §5).
 *
 * Targeting: the last face with the maximum value is selected.
 * This is stable and deterministic regardless of face ordering.
 *
 * When multiple modifiers are active, apply them in sequence using this
 * function — each call sees the output of the previous one.
 *
 * @param {number[]} faces
 * @param {'add_to_highest' | 'subtract_from_highest'} type
 * @param {number} value  Positive integer.
 * @returns {number[]}
 */
export function applyModifier(faces, type, value) {
  const result = [...faces];
  const maxVal = Math.max(...result);
  const idx    = result.lastIndexOf(maxVal);

  if (type === 'add_to_highest') {
    result[idx] = result[idx] + value;
  } else if (type === 'subtract_from_highest') {
    result[idx] = Math.max(0, result[idx] - value);
  }

  return result;
}

/**
 * Returns the effective face array after applying all active modifiers in order.
 * Does not mutate the input faces array.
 *
 * @param {number[]} faces  Base face array (saved config or AI config).
 * @param {{ type: string, value: number }[]} modifiers  Active modifier stack.
 * @returns {number[]}
 */
export function getEffectiveFaces(faces, modifiers = []) {
  let result = faces;
  for (const mod of modifiers) {
    result = applyModifier(result, mod.type, mod.value);
  }
  return result;
}

// ─── Rolling ─────────────────────────────────────────────────────────────────

/**
 * Applies all modifiers then picks one face uniformly at random.
 * Returns the face value. A result of 0 means no movement (wasted turn, GDD §5).
 *
 * @param {number[]} faces     Base face array (saved config).
 * @param {{ type: string, value: number }[]} modifiers  Currently active modifiers.
 * @returns {number}
 */
export function rollDice(faces, modifiers = []) {
  const effective = getEffectiveFaces(faces, modifiers);
  return effective[Math.floor(Math.random() * effective.length)];
}
