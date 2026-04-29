import { describe, it, expect, beforeEach } from 'vitest';
import { TUNING } from '../src/config/tuning.js';
import {
  getAllCheats,
  getCheatById,
  getInventory,
  addCheat,
  hasCheat,
  createBoardState,
  isOccupied,
  hasCheatOnBoard,
  placeCheat,
  removeCheat,
} from '../src/modules/cheats.js';

// ─── localStorage mock ────────────────────────────────────────────────────────
const store = {};
const localStorageMock = {
  getItem:    (k) => (k in store ? store[k] : null),
  setItem:    (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear:      () => { Object.keys(store).forEach(k => delete store[k]); },
};
globalThis.localStorage = localStorageMock;

beforeEach(() => localStorageMock.clear());

// ─── Roster structure ─────────────────────────────────────────────────────────

describe('getAllCheats — roster shape', () => {
  const roster = getAllCheats();
  const EXPECTED_IDS = [
    'KAKE', 'TOME', 'SHIKOMI', 'KASUMASHI', 'MACHI', 'KEPPAN',
    'ASHIDOME', 'KECHIRASHI', 'MEZURI', 'MISEGANE', 'TORITATE', 'ASHIKASE',
  ];

  it('has exactly 12 cheats', () => {
    expect(roster).toHaveLength(12);
  });

  it('contains all expected cheat ids in order', () => {
    expect(roster.map(c => c.id)).toEqual(EXPECTED_IDS);
  });

  it('every cheat has required string fields: id, name, japName, category, costTier', () => {
    for (const cheat of roster) {
      expect(typeof cheat.id).toBe('string');
      expect(typeof cheat.name).toBe('string');
      expect(typeof cheat.japName).toBe('string');
      expect(cheat.category === 'good' || cheat.category === 'bad').toBe(true);
      expect(['low', 'medium', 'high'].includes(cheat.costTier)).toBe(true);
    }
  });

  it('every cheat has numeric activationCostFraction and purchaseCostMultiplier', () => {
    for (const cheat of roster) {
      expect(typeof cheat.activationCostFraction).toBe('number');
      expect(typeof cheat.purchaseCostMultiplier).toBe('number');
    }
  });

  it('durationRounds is null or a positive integer for every cheat', () => {
    for (const cheat of roster) {
      const d = cheat.durationRounds;
      expect(d === null || (Number.isInteger(d) && d > 0)).toBe(true);
    }
  });

  it('ids are unique', () => {
    const ids = roster.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getAllCheats — category split', () => {
  it('6 cheats are "good" (own-path)', () => {
    expect(getAllCheats().filter(c => c.category === 'good')).toHaveLength(6);
  });

  it('6 cheats are "bad" (opponent-path)', () => {
    expect(getAllCheats().filter(c => c.category === 'bad')).toHaveLength(6);
  });
});

describe('getAllCheats — cost tier values match TUNING', () => {
  const { activationCost, backRoom: { purchaseCostMultiplier: MULT } } = TUNING;

  it('KAKE: low tier fractions', () => {
    const c = getAllCheats().find(c => c.id === 'KAKE');
    expect(c.activationCostFraction).toBe(activationCost.low);
    expect(c.purchaseCostMultiplier).toBe(MULT.low);
  });

  it('KASUMASHI: medium tier fractions', () => {
    const c = getAllCheats().find(c => c.id === 'KASUMASHI');
    expect(c.activationCostFraction).toBe(activationCost.medium);
    expect(c.purchaseCostMultiplier).toBe(MULT.medium);
  });

  it('KEPPAN: high tier fractions', () => {
    const c = getAllCheats().find(c => c.id === 'KEPPAN');
    expect(c.activationCostFraction).toBe(activationCost.high);
    expect(c.purchaseCostMultiplier).toBe(MULT.high);
  });

  it('MISEGANE: high tier fractions', () => {
    const c = getAllCheats().find(c => c.id === 'MISEGANE');
    expect(c.activationCostFraction).toBe(activationCost.high);
    expect(c.purchaseCostMultiplier).toBe(MULT.high);
  });
});

describe('getAllCheats — durationRounds', () => {
  const durationMap = {
    KAKE: null, TOME: null, SHIKOMI: null, KEPPAN: null,
    ASHIDOME: null, KECHIRASHI: null, MISEGANE: null, TORITATE: null,
    KASUMASHI: 2, ASHIKASE: 2,
    MACHI: 3, MEZURI: 3,
  };

  for (const [id, expected] of Object.entries(durationMap)) {
    it(`${id}: durationRounds = ${expected}`, () => {
      expect(getCheatById(id).durationRounds).toBe(expected);
    });
  }
});

// ─── getCheatById ─────────────────────────────────────────────────────────────

describe('getCheatById', () => {
  it('returns the correct cheat for a valid id', () => {
    const cheat = getCheatById('ASHIDOME');
    expect(cheat.id).toBe('ASHIDOME');
    expect(cheat.name).toBe('CURSED GROUND');
    expect(cheat.category).toBe('bad');
  });

  it('throws RangeError for an unknown id', () => {
    expect(() => getCheatById('GHOST')).toThrow(RangeError);
  });

  it('RangeError message includes the bad id', () => {
    expect(() => getCheatById('GHOST')).toThrow(/"GHOST"/);
  });

  it('returns the same object reference (roster is not cloned per call)', () => {
    expect(getCheatById('KAKE')).toBe(getCheatById('KAKE'));
  });
});

// ─── Inventory ────────────────────────────────────────────────────────────────

describe('getInventory — empty run state', () => {
  it('returns an empty array when no cheats have been added', () => {
    expect(getInventory()).toEqual([]);
  });
});

describe('addCheat', () => {
  it('adds a cheat to the inventory', () => {
    addCheat('KAKE');
    expect(getInventory()).toContain('KAKE');
  });

  it('calling addCheat twice with the same id is idempotent', () => {
    addCheat('KAKE');
    addCheat('KAKE');
    expect(getInventory().filter(id => id === 'KAKE')).toHaveLength(1);
  });

  it('multiple different cheats can be added', () => {
    addCheat('KAKE');
    addCheat('ASHIDOME');
    addCheat('MISEGANE');
    expect(getInventory()).toEqual(['KAKE', 'ASHIDOME', 'MISEGANE']);
  });

  it('throws RangeError for an unknown cheat id', () => {
    expect(() => addCheat('BOGUS')).toThrow(RangeError);
  });

  it('does not modify inventory on unknown id throw', () => {
    try { addCheat('BOGUS'); } catch { /* expected */ }
    expect(getInventory()).toEqual([]);
  });
});

describe('hasCheat', () => {
  it('returns false before the cheat is added', () => {
    expect(hasCheat('KAKE')).toBe(false);
  });

  it('returns true after addCheat', () => {
    addCheat('KAKE');
    expect(hasCheat('KAKE')).toBe(true);
  });

  it('returns false for a different cheat not in inventory', () => {
    addCheat('KAKE');
    expect(hasCheat('ASHIDOME')).toBe(false);
  });
});

// ─── createBoardState ─────────────────────────────────────────────────────────

describe('createBoardState', () => {
  it('playerPath has length pathLength+2', () => {
    const bs = createBoardState(8);
    expect(bs.playerPath).toHaveLength(10);
  });

  it('aiPath has length pathLength+2', () => {
    const bs = createBoardState(11);
    expect(bs.aiPath).toHaveLength(13);
  });

  it('all slots are null', () => {
    const bs = createBoardState(8);
    expect(bs.playerPath.every(s => s === null)).toBe(true);
    expect(bs.aiPath.every(s => s === null)).toBe(true);
  });
});

// ─── isOccupied ───────────────────────────────────────────────────────────────

describe('isOccupied', () => {
  it('returns false for an empty tile', () => {
    const bs = createBoardState(8);
    expect(isOccupied(bs, 'player', 3)).toBe(false);
  });

  it('returns true after a cheat is placed there', () => {
    let bs = createBoardState(8);
    ({ boardState: bs } = placeCheat(bs, 'player', 3, 'KAKE', 'player'));
    expect(isOccupied(bs, 'player', 3)).toBe(true);
  });

  it('placing on player path does not affect ai path occupation check', () => {
    let bs = createBoardState(8);
    ({ boardState: bs } = placeCheat(bs, 'player', 3, 'KAKE', 'player'));
    expect(isOccupied(bs, 'ai', 3)).toBe(false);
  });
});

// ─── hasCheatOnBoard ──────────────────────────────────────────────────────────

describe('hasCheatOnBoard', () => {
  it('returns false on a fresh board', () => {
    const bs = createBoardState(8);
    expect(hasCheatOnBoard(bs, 'KAKE')).toBe(false);
  });

  it('returns true after placement (no owner filter)', () => {
    let bs = createBoardState(8);
    ({ boardState: bs } = placeCheat(bs, 'player', 2, 'KAKE', 'player'));
    expect(hasCheatOnBoard(bs, 'KAKE')).toBe(true);
  });

  it('owner filter: returns true for matching owner', () => {
    let bs = createBoardState(8);
    ({ boardState: bs } = placeCheat(bs, 'player', 2, 'KAKE', 'player'));
    expect(hasCheatOnBoard(bs, 'KAKE', 'player')).toBe(true);
  });

  it('owner filter: returns false for non-matching owner', () => {
    let bs = createBoardState(8);
    ({ boardState: bs } = placeCheat(bs, 'player', 2, 'KAKE', 'player'));
    expect(hasCheatOnBoard(bs, 'KAKE', 'ai')).toBe(false);
  });

  it('detects cheat placed on ai path', () => {
    let bs = createBoardState(8);
    ({ boardState: bs } = placeCheat(bs, 'ai', 5, 'ASHIDOME', 'player'));
    expect(hasCheatOnBoard(bs, 'ASHIDOME', 'player')).toBe(true);
  });

  it('cross-path detection: cheat on ai path is found even when queried without path', () => {
    let bs = createBoardState(8);
    ({ boardState: bs } = placeCheat(bs, 'ai', 4, 'KECHIRASHI', 'player'));
    expect(hasCheatOnBoard(bs, 'KECHIRASHI')).toBe(true);
  });
});

// ─── placeCheat ───────────────────────────────────────────────────────────────

describe('placeCheat — success', () => {
  it('places a cheat and returns error: null', () => {
    const bs = createBoardState(8);
    const result = placeCheat(bs, 'player', 4, 'KAKE', 'player');
    expect(result.error).toBeNull();
  });

  it('the returned boardState has the cheat at the correct slot', () => {
    const bs = createBoardState(8);
    const { boardState } = placeCheat(bs, 'player', 4, 'KAKE', 'player');
    expect(boardState.playerPath[4]).toEqual({ cheatId: 'KAKE', owner: 'player' });
  });

  it('does not mutate the original boardState', () => {
    const bs = createBoardState(8);
    placeCheat(bs, 'player', 4, 'KAKE', 'player');
    expect(bs.playerPath[4]).toBeNull();
  });

  it('placing on ai path populates aiPath, not playerPath', () => {
    const bs = createBoardState(8);
    const { boardState } = placeCheat(bs, 'ai', 6, 'ASHIDOME', 'player');
    expect(boardState.aiPath[6]).toEqual({ cheatId: 'ASHIDOME', owner: 'player' });
    expect(boardState.playerPath[6]).toBeNull();
  });

  it('tile 1 (first traversal tile) is a valid zone', () => {
    const bs = createBoardState(8);
    const result = placeCheat(bs, 'player', 1, 'KAKE', 'player');
    expect(result.error).toBeNull();
  });

  it('tile pathLength (last traversal tile) is a valid zone', () => {
    const bs = createBoardState(8);
    const result = placeCheat(bs, 'player', 8, 'KAKE', 'player');
    expect(result.error).toBeNull();
  });
});

describe('placeCheat — bounds violations', () => {
  it('tile 0 (START) is rejected', () => {
    const bs = createBoardState(8);
    const { error } = placeCheat(bs, 'player', 0, 'KAKE', 'player');
    expect(error).toMatch(/not a valid placement zone/);
  });

  it('tile pathLength+1 (END) is rejected', () => {
    const bs = createBoardState(8);
    const { error } = placeCheat(bs, 'player', 9, 'KAKE', 'player');
    expect(error).toMatch(/not a valid placement zone/);
  });

  it('negative tile index is rejected', () => {
    const bs = createBoardState(8);
    const { error } = placeCheat(bs, 'player', -1, 'KAKE', 'player');
    expect(error).toMatch(/not a valid placement zone/);
  });

  it('non-integer tile index is rejected', () => {
    const bs = createBoardState(8);
    const { error } = placeCheat(bs, 'player', 2.5, 'KAKE', 'player');
    expect(error).toMatch(/not a valid placement zone/);
  });

  it('boardState is returned unchanged on bounds violation', () => {
    const bs = createBoardState(8);
    const { boardState } = placeCheat(bs, 'player', 0, 'KAKE', 'player');
    expect(boardState).toBe(bs);
  });
});

describe('placeCheat — occupied tile', () => {
  it('returns error when tile is already occupied', () => {
    let bs = createBoardState(8);
    ({ boardState: bs } = placeCheat(bs, 'player', 3, 'KAKE', 'player'));
    const { error } = placeCheat(bs, 'player', 3, 'TOME', 'player');
    expect(error).toMatch(/already occupied/);
  });

  it('boardState is returned unchanged on occupied violation', () => {
    let bs = createBoardState(8);
    const { boardState: bs2 } = placeCheat(bs, 'player', 3, 'KAKE', 'player');
    const { boardState: bs3 } = placeCheat(bs2, 'player', 3, 'TOME', 'player');
    expect(bs3).toBe(bs2);
  });

  it('different tiles on the same path can both be occupied', () => {
    let bs = createBoardState(8);
    ({ boardState: bs } = placeCheat(bs, 'player', 2, 'KAKE', 'player'));
    const result = placeCheat(bs, 'player', 5, 'TOME', 'player');
    expect(result.error).toBeNull();
  });
});

describe('placeCheat — single-instance-per-owner rule (cross-path)', () => {
  it('cannot place the same cheat id twice on the player path', () => {
    let bs = createBoardState(8);
    ({ boardState: bs } = placeCheat(bs, 'player', 2, 'ASHIDOME', 'player'));
    const { error } = placeCheat(bs, 'player', 5, 'ASHIDOME', 'player');
    expect(error).toMatch(/already on the board/);
  });

  it('cannot place the same cheat id on ai path when already on player path (same owner)', () => {
    let bs = createBoardState(8);
    ({ boardState: bs } = placeCheat(bs, 'player', 2, 'ASHIDOME', 'player'));
    const { error } = placeCheat(bs, 'ai', 3, 'ASHIDOME', 'player');
    expect(error).toMatch(/already on the board/);
  });

  it('different owners can place the same cheat id', () => {
    let bs = createBoardState(8);
    ({ boardState: bs } = placeCheat(bs, 'player', 2, 'ASHIDOME', 'player'));
    const result = placeCheat(bs, 'ai', 3, 'ASHIDOME', 'ai');
    expect(result.error).toBeNull();
  });
});

describe('placeCheat — unknown cheat id', () => {
  it('throws RangeError for an unknown cheat id', () => {
    const bs = createBoardState(8);
    expect(() => placeCheat(bs, 'player', 3, 'GHOST', 'player')).toThrow(RangeError);
  });
});

// ─── removeCheat ──────────────────────────────────────────────────────────────

describe('removeCheat', () => {
  it('removes a placed cheat and returns a new boardState', () => {
    let bs = createBoardState(8);
    ({ boardState: bs } = placeCheat(bs, 'player', 4, 'KAKE', 'player'));
    const bs2 = removeCheat(bs, 'player', 4);
    expect(bs2.playerPath[4]).toBeNull();
  });

  it('is a no-op (returns same reference) when tile is already empty', () => {
    const bs = createBoardState(8);
    const bs2 = removeCheat(bs, 'player', 4);
    expect(bs2).toBe(bs);
  });

  it('does not mutate the original boardState', () => {
    let bs = createBoardState(8);
    ({ boardState: bs } = placeCheat(bs, 'player', 4, 'KAKE', 'player'));
    removeCheat(bs, 'player', 4);
    expect(bs.playerPath[4]).toEqual({ cheatId: 'KAKE', owner: 'player' });
  });

  it('removing from player path does not affect ai path', () => {
    let bs = createBoardState(8);
    ({ boardState: bs } = placeCheat(bs, 'player', 4, 'KAKE', 'player'));
    ({ boardState: bs } = placeCheat(bs, 'ai', 4, 'ASHIDOME', 'player'));
    const bs2 = removeCheat(bs, 'player', 4);
    expect(bs2.aiPath[4]).toEqual({ cheatId: 'ASHIDOME', owner: 'player' });
  });

  it('allows re-placement of the same cheat id after removal', () => {
    let bs = createBoardState(8);
    ({ boardState: bs } = placeCheat(bs, 'player', 4, 'KAKE', 'player'));
    bs = removeCheat(bs, 'player', 4);
    const result = placeCheat(bs, 'player', 6, 'KAKE', 'player');
    expect(result.error).toBeNull();
    expect(result.boardState.playerPath[6]).toEqual({ cheatId: 'KAKE', owner: 'player' });
  });
});
