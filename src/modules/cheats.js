// Cheat data layer (GDD §6.6).
// Pure data and state management — no effects, no DOM.
//
// Inventory lives in run state (localStorage via runState.js).
// Board placement state is ephemeral: created fresh each fight via createBoardState().

import { TUNING } from '../config/tuning.js';
import { getRunState, saveRunState } from './runState.js';

const { activationCost, backRoom: { purchaseCostMultiplier: MULT } } = TUNING;

// ─── Roster ───────────────────────────────────────────────────────────────────
// 12 cheats hard-coded from GDD §6.6.
// durationRounds: null = instant (consumed on landing); positive = lasts N full rounds.

const ROSTER = [
  // ── GOOD FOR U (placed on own path) ────────────────────────────────────────
  {
    id: 'KAKE',
    name: 'HELLSTEP',
    japName: '駆け',
    category: 'good',
    costTier: 'low',
    activationCostFraction: activationCost.low,
    purchaseCostMultiplier: MULT.low,
    durationRounds: null,
  },
  {
    id: 'TOME',
    name: 'SOUL ANCHOR',
    japName: '止め',
    category: 'good',
    costTier: 'medium',
    activationCostFraction: activationCost.medium,
    purchaseCostMultiplier: MULT.medium,
    durationRounds: null,
  },
  {
    id: 'SHIKOMI',
    name: 'LOADED',
    japName: '仕込み',
    category: 'good',
    costTier: 'low',
    activationCostFraction: activationCost.low,
    purchaseCostMultiplier: MULT.low,
    durationRounds: null,
  },
  {
    id: 'KASUMASHI',
    name: 'DEAD WEIGHT',
    japName: '嵩増し',
    category: 'good',
    costTier: 'medium',
    activationCostFraction: activationCost.medium,
    purchaseCostMultiplier: MULT.medium,
    durationRounds: 2,
  },
  {
    id: 'MACHI',
    name: 'PURGATORY LOOP',
    japName: '待ち',
    category: 'good',
    costTier: 'low',
    activationCostFraction: activationCost.low,
    purchaseCostMultiplier: MULT.low,
    durationRounds: 3,
  },
  {
    id: 'KEPPAN',
    name: 'BLOOD PACT',
    japName: '血判',
    category: 'good',
    costTier: 'high',
    activationCostFraction: activationCost.high,
    purchaseCostMultiplier: MULT.high,
    durationRounds: null,
  },
  // ── BAD FOR THEM (placed on opponent's path) ────────────────────────────────
  {
    id: 'ASHIDOME',
    name: 'CURSED GROUND',
    japName: '足止め',
    category: 'bad',
    costTier: 'low',
    activationCostFraction: activationCost.low,
    purchaseCostMultiplier: MULT.low,
    durationRounds: null,
  },
  {
    id: 'KECHIRASHI',
    name: 'HELLFIRE TRAP',
    japName: '蹴散らし',
    category: 'bad',
    costTier: 'medium',
    activationCostFraction: activationCost.medium,
    purchaseCostMultiplier: MULT.medium,
    durationRounds: null,
  },
  {
    id: 'MEZURI',
    name: 'DICE ROT',
    japName: '目削り',
    category: 'bad',
    costTier: 'medium',
    activationCostFraction: activationCost.medium,
    purchaseCostMultiplier: MULT.medium,
    durationRounds: 3,
  },
  {
    id: 'MISEGANE',
    name: 'FALSE END',
    japName: '見せ金',
    category: 'bad',
    costTier: 'high',
    activationCostFraction: activationCost.high,
    purchaseCostMultiplier: MULT.high,
    durationRounds: null,
  },
  {
    id: 'TORITATE',
    name: 'DEBT COLLECTOR',
    japName: '取り立て',
    category: 'bad',
    costTier: 'high',
    activationCostFraction: activationCost.high,
    purchaseCostMultiplier: MULT.high,
    durationRounds: null,
  },
  {
    id: 'ASHIKASE',
    name: 'LEAD BOOTS',
    japName: '足枷',
    category: 'bad',
    costTier: 'medium',
    activationCostFraction: activationCost.medium,
    purchaseCostMultiplier: MULT.medium,
    durationRounds: 2,
  },
];

// ─── Roster API ───────────────────────────────────────────────────────────────

export function getAllCheats() {
  return ROSTER;
}

/**
 * @param {string} id
 * @returns {typeof ROSTER[0]}
 * @throws {RangeError} if id is not in the roster
 */
export function getCheatById(id) {
  const cheat = ROSTER.find(c => c.id === id);
  if (!cheat) throw new RangeError(`Unknown cheat id: "${id}"`);
  return cheat;
}

// ─── Inventory (persisted in run state) ──────────────────────────────────────

export function getInventory() {
  return getRunState().cheatInventory;
}

/**
 * Adds cheat to inventory idempotently — no-op if already present.
 * @throws {RangeError} for unknown cheat ids
 */
export function addCheat(id) {
  getCheatById(id);
  const state = getRunState();
  if (!state.cheatInventory.includes(id)) {
    saveRunState({ ...state, cheatInventory: [...state.cheatInventory, id] });
  }
}

export function hasCheat(id) {
  return getRunState().cheatInventory.includes(id);
}

// ─── Board placement state ────────────────────────────────────────────────────
// Slot: { cheatId: string, owner: 'player' | 'ai' } | null
// Valid placement zone: indices 1..pathLength (traversal tiles only).
// START (0) and END (pathLength+1) are never valid placement targets.

/**
 * Creates a fresh board state for a fight of the given path length.
 * @param {number} pathLength
 */
export function createBoardState(pathLength) {
  const size = pathLength + 2;
  return {
    playerPath: Array(size).fill(null),
    aiPath:     Array(size).fill(null),
  };
}

/**
 * Returns true if the given tile on the given path has a cheat placed on it.
 */
export function isOccupied(boardState, path, tileIndex) {
  const key = path === 'player' ? 'playerPath' : 'aiPath';
  return boardState[key][tileIndex] !== null;
}

/**
 * Returns true if cheatId is on the board anywhere.
 * If owner is provided, restricts the search to slots owned by that owner.
 * Checks both paths — the single-instance-per-owner rule is cross-path.
 *
 * @param {object} boardState
 * @param {string} cheatId
 * @param {'player'|'ai'|null} [owner]
 */
export function hasCheatOnBoard(boardState, cheatId, owner = null) {
  const matches = slot =>
    slot !== null &&
    slot.cheatId === cheatId &&
    (owner === null || slot.owner === owner);
  return boardState.playerPath.some(matches) || boardState.aiPath.some(matches);
}

/**
 * Places a cheat on the board. Returns a new boardState on success.
 * Returns { boardState (unchanged), error: string } on any placement violation.
 * Throws RangeError for unknown cheat ids (programmer error).
 *
 * Violations checked (in order):
 *   1. tileIndex out of traversal range (1..pathLength)
 *   2. tile already occupied
 *   3. same owner already has this cheat on the board (either path)
 *
 * @param {object} boardState
 * @param {'player'|'ai'} path
 * @param {number} tileIndex
 * @param {string} cheatId
 * @param {'player'|'ai'} owner
 * @returns {{ boardState: object, error: string|null }}
 */
export function placeCheat(boardState, path, tileIndex, cheatId, owner) {
  getCheatById(cheatId);
  const key = path === 'player' ? 'playerPath' : 'aiPath';
  const pathArr = boardState[key];
  const pathLength = pathArr.length - 2;

  if (!Number.isInteger(tileIndex) || tileIndex < 1 || tileIndex > pathLength) {
    return { boardState, error: `Tile ${tileIndex} is not a valid placement zone (1–${pathLength}).` };
  }
  if (pathArr[tileIndex] !== null) {
    return { boardState, error: `Tile ${tileIndex} on the ${path} path is already occupied.` };
  }
  if (hasCheatOnBoard(boardState, cheatId, owner)) {
    return { boardState, error: `${cheatId} is already on the board.` };
  }

  const newArr = pathArr.slice();
  newArr[tileIndex] = { cheatId, owner };
  return { boardState: { ...boardState, [key]: newArr }, error: null };
}

/**
 * Removes the cheat at the given tile. No-op if the tile is already empty.
 * Returns a new boardState (immutable).
 */
export function removeCheat(boardState, path, tileIndex) {
  const key = path === 'player' ? 'playerPath' : 'aiPath';
  if (boardState[key][tileIndex] === null) return boardState;
  const newArr = boardState[key].slice();
  newArr[tileIndex] = null;
  return { ...boardState, [key]: newArr };
}
