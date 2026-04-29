import { describe, it, expect } from 'vitest';
import {
  createBoardState,
  getEndIndex,
  getPosition,
  calculateMove,
  moveToken,
  moveTokenTo,
  resetPositions,
  isCheatOnBoard,
  placeCheat,
  removeCheat,
  getCheatAt,
} from '../src/modules/board.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PATH = 8;  // Tier 1 path length — END at index 9
const END  = getEndIndex(PATH); // 9

function makeState(pathLength = PATH) {
  return createBoardState(pathLength);
}

function cheat(overrides = {}) {
  return {
    id:        'ASHIDOME',
    name:      'Cursed Ground',
    japName:   '足止め',
    category:  'bad',
    costTier:  'low',
    placedBy:  'player',
    ...overrides,
  };
}

// ─── createBoardState ─────────────────────────────────────────────────────────

describe('createBoardState', () => {
  it('sets pathLength', () => {
    expect(makeState().pathLength).toBe(PATH);
  });

  it('starts both tokens at position 0 (START)', () => {
    const s = makeState();
    expect(s.positions.player).toBe(0);
    expect(s.positions.ai).toBe(0);
  });

  it('starts with empty cheat maps', () => {
    const s = makeState();
    expect(Object.keys(s.cheats.player)).toHaveLength(0);
    expect(Object.keys(s.cheats.ai)).toHaveLength(0);
  });
});

// ─── getEndIndex ──────────────────────────────────────────────────────────────

describe('getEndIndex', () => {
  it('returns pathLength + 1', () => {
    expect(getEndIndex(8)).toBe(9);
    expect(getEndIndex(11)).toBe(12);
    expect(getEndIndex(19)).toBe(20);
  });
});

// ─── getPosition ──────────────────────────────────────────────────────────────

describe('getPosition', () => {
  it('returns the current tile index for each path', () => {
    const s = makeState();
    expect(getPosition(s, 'player')).toBe(0);
    expect(getPosition(s, 'ai')).toBe(0);
  });
});

// ─── calculateMove ────────────────────────────────────────────────────────────

describe('calculateMove — roll ≤ 0', () => {
  it('roll 0: stays in place, no end, no bounce', () => {
    expect(calculateMove(3, END, 0)).toEqual({ newPosition: 3, reachedEnd: false, isBouncedBack: false });
  });

  it('negative roll: treated as no movement', () => {
    expect(calculateMove(3, END, -2)).toEqual({ newPosition: 3, reachedEnd: false, isBouncedBack: false });
  });
});

describe('calculateMove — normal forward', () => {
  it('advances by the roll amount', () => {
    expect(calculateMove(0, END, 4)).toEqual({ newPosition: 4, reachedEnd: false, isBouncedBack: false });
  });

  it('lands one before END', () => {
    expect(calculateMove(0, END, END - 1)).toEqual({ newPosition: END - 1, reachedEnd: false, isBouncedBack: false });
  });
});

describe('calculateMove — exact END', () => {
  it('lands exactly on END tile: reachedEnd=true, no bounce', () => {
    expect(calculateMove(0, END, END)).toEqual({ newPosition: END, reachedEnd: true, isBouncedBack: false });
  });

  it('from mid-path: exact END landing', () => {
    // 3 tiles from END: currentPos = END-3, roll 3 → exact END
    expect(calculateMove(END - 3, END, 3)).toEqual({ newPosition: END, reachedEnd: true, isBouncedBack: false });
  });
});

describe('calculateMove — overshoot', () => {
  it('overshoot by 1: lands at END-1, isBouncedBack=true', () => {
    expect(calculateMove(0, END, END + 1)).toEqual({ newPosition: END - 1, reachedEnd: false, isBouncedBack: true });
  });

  it('overshoot by 3: lands at END-3', () => {
    // 3 tiles from END, roll 5: moves 3 to END then 2 back → END-2
    expect(calculateMove(END - 3, END, 5)).toEqual({ newPosition: END - 2, reachedEnd: false, isBouncedBack: true });
  });

  it('overshoot example from GDD §7: 3 from END, roll 5 → lands at END-2', () => {
    const endIndex = getEndIndex(8); // 9
    // currentPos = 9-3 = 6, roll 5 → raw 11 > 9, overshoot 2, land at 7 = END-2
    expect(calculateMove(6, endIndex, 5)).toEqual({ newPosition: 7, reachedEnd: false, isBouncedBack: true });
  });

  it('massive overshoot: clamps at 0 (START), never goes negative', () => {
    // pathLength=8, endIndex=9, currentPos=0, roll=25 (max AI face)
    // raw=25, overshoot=16, bounced=9-16=-7 → clamp to 0
    expect(calculateMove(0, 9, 25)).toEqual({ newPosition: 0, reachedEnd: false, isBouncedBack: true });
  });

  it('overshoot that would reach exactly START: lands at 0', () => {
    // endIndex=9, roll puts overshoot=9 → bounced=0
    expect(calculateMove(0, 9, 18)).toEqual({ newPosition: 0, reachedEnd: false, isBouncedBack: true });
  });
});

// ─── moveToken ────────────────────────────────────────────────────────────────

describe('moveToken — state update', () => {
  it('updates the correct path position', () => {
    const s = makeState();
    const { state } = moveToken(s, 'player', 4);
    expect(state.positions.player).toBe(4);
    expect(state.positions.ai).toBe(0);
  });

  it('does not mutate the input state', () => {
    const s = makeState();
    moveToken(s, 'player', 4);
    expect(s.positions.player).toBe(0);
  });

  it('returns correct landedOnIndex', () => {
    const s = makeState();
    const { landedOnIndex } = moveToken(s, 'player', 4);
    expect(landedOnIndex).toBe(4);
  });
});

describe('moveToken — end detection', () => {
  it('reachedEnd=true when rolling exactly to END', () => {
    const s = { ...makeState(), positions: { player: END - 3, ai: 0 } };
    const result = moveToken(s, 'player', 3);
    expect(result.reachedEnd).toBe(true);
    expect(result.isBouncedBack).toBe(false);
    expect(result.landedOnIndex).toBe(END);
  });

  it('reachedEnd=false and isBouncedBack=true on overshoot', () => {
    const s = { ...makeState(), positions: { player: END - 3, ai: 0 } };
    const result = moveToken(s, 'player', 5);
    expect(result.reachedEnd).toBe(false);
    expect(result.isBouncedBack).toBe(true);
    expect(result.landedOnIndex).toBe(END - 2);
  });
});

describe('moveToken — roll 0 (wasted turn)', () => {
  it('position unchanged, reachedEnd=false, isBouncedBack=false', () => {
    const s = { ...makeState(), positions: { player: 3, ai: 0 } };
    const result = moveToken(s, 'player', 0);
    expect(result.state.positions.player).toBe(3);
    expect(result.reachedEnd).toBe(false);
    expect(result.isBouncedBack).toBe(false);
    expect(result.landedOnIndex).toBe(3);
  });
});

// ─── moveTokenTo ─────────────────────────────────────────────────────────────

describe('moveTokenTo', () => {
  it('sets token to exact index', () => {
    const s = makeState();
    const newState = moveTokenTo(s, 'player', 5);
    expect(newState.positions.player).toBe(5);
  });

  it('clamps at 0 for negative index', () => {
    const s = makeState();
    const newState = moveTokenTo(s, 'player', -3);
    expect(newState.positions.player).toBe(0);
  });

  it('clamps at END for index beyond END', () => {
    const s = makeState();
    const newState = moveTokenTo(s, 'player', END + 5);
    expect(newState.positions.player).toBe(END);
  });

  it('only moves the specified path', () => {
    const s = makeState();
    const newState = moveTokenTo(s, 'ai', 4);
    expect(newState.positions.ai).toBe(4);
    expect(newState.positions.player).toBe(0);
  });

  it('does not mutate the input state', () => {
    const s = makeState();
    moveTokenTo(s, 'player', 5);
    expect(s.positions.player).toBe(0);
  });
});

// ─── resetPositions ───────────────────────────────────────────────────────────

describe('resetPositions', () => {
  it('returns both tokens to START (0)', () => {
    let s = makeState();
    s = { ...s, positions: { player: 5, ai: 7 } };
    const reset = resetPositions(s);
    expect(reset.positions.player).toBe(0);
    expect(reset.positions.ai).toBe(0);
  });

  it('preserves cheat placements', () => {
    let s = makeState();
    const c = cheat();
    const { state: withCheat } = placeCheat(s, 'ai', 3, c);
    const reset = resetPositions(withCheat);
    expect(getCheatAt(reset, 'ai', 3)).not.toBeNull();
  });

  it('preserves pathLength', () => {
    const s = makeState(11);
    const reset = resetPositions({ ...s, positions: { player: 6, ai: 9 } });
    expect(reset.pathLength).toBe(11);
  });
});

// ─── placeCheat ───────────────────────────────────────────────────────────────

describe('placeCheat — success', () => {
  it('places a cheat on a valid traversal tile', () => {
    const s = makeState();
    const { state, error } = placeCheat(s, 'ai', 3, cheat());
    expect(error).toBeNull();
    expect(getCheatAt(state, 'ai', 3)).toMatchObject({ id: 'ASHIDOME' });
  });

  it('allows cheats at tile 1 (first traversal)', () => {
    const { error } = placeCheat(makeState(), 'player', 1, cheat({ id: 'KAKE', placedBy: 'player' }));
    expect(error).toBeNull();
  });

  it('allows cheats at tile pathLength (last traversal)', () => {
    const { error } = placeCheat(makeState(), 'player', PATH, cheat({ id: 'KAKE', placedBy: 'player' }));
    expect(error).toBeNull();
  });

  it('does not mutate the input state', () => {
    const s = makeState();
    placeCheat(s, 'ai', 3, cheat());
    expect(getCheatAt(s, 'ai', 3)).toBeNull();
  });
});

describe('placeCheat — invalid tile index', () => {
  it('rejects tile 0 (START)', () => {
    const { error } = placeCheat(makeState(), 'player', 0, cheat());
    expect(error).toMatch(/not a valid/i);
  });

  it('rejects END tile (pathLength+1)', () => {
    const { error } = placeCheat(makeState(), 'player', END, cheat());
    expect(error).toMatch(/not a valid/i);
  });

  it('rejects negative tile index', () => {
    const { error } = placeCheat(makeState(), 'player', -1, cheat());
    expect(error).toMatch(/not a valid/i);
  });

  it('rejects non-integer tile index', () => {
    const { error } = placeCheat(makeState(), 'player', 2.5, cheat());
    expect(error).toMatch(/not a valid/i);
  });
});

describe('placeCheat — tile already occupied', () => {
  it('rejects placing a second cheat on an occupied tile', () => {
    let { state } = placeCheat(makeState(), 'ai', 3, cheat());
    const { error } = placeCheat(state, 'ai', 3, cheat({ id: 'KECHIRASHI', placedBy: 'ai' }));
    expect(error).toMatch(/already occupied/i);
  });
});

describe('placeCheat — same-owner single-instance rule', () => {
  it('rejects placing the same cheat twice by the same owner on own path', () => {
    let { state } = placeCheat(makeState(), 'player', 2, cheat({ id: 'KAKE', placedBy: 'player' }));
    const { error } = placeCheat(state, 'player', 5, cheat({ id: 'KAKE', placedBy: 'player' }));
    expect(error).toMatch(/already on the board/i);
  });

  it('rejects placing the same cheat on opponent path if already on own path', () => {
    // Player places ASHIDOME on AI path at tile 3
    let { state } = placeCheat(makeState(), 'ai', 3, cheat({ placedBy: 'player' }));
    // Player tries to place another ASHIDOME on their own path
    const { error } = placeCheat(state, 'player', 2, cheat({ placedBy: 'player' }));
    expect(error).toMatch(/already on the board/i);
  });

  it('allows same cheat id if placed by different owner', () => {
    // Player places ASHIDOME
    let { state } = placeCheat(makeState(), 'ai', 3, cheat({ placedBy: 'player' }));
    // AI places ASHIDOME on player's path (different owner)
    const { error } = placeCheat(state, 'player', 2, cheat({ placedBy: 'ai' }));
    expect(error).toBeNull();
  });

  it('allows placing the same cheat again after it has been removed (activated)', () => {
    let { state } = placeCheat(makeState(), 'ai', 3, cheat());
    state = removeCheat(state, 'ai', 3);
    const { error } = placeCheat(state, 'ai', 5, cheat());
    expect(error).toBeNull();
  });
});

// ─── removeCheat ─────────────────────────────────────────────────────────────

describe('removeCheat', () => {
  it('removes a cheat from a tile', () => {
    let { state } = placeCheat(makeState(), 'ai', 3, cheat());
    state = removeCheat(state, 'ai', 3);
    expect(getCheatAt(state, 'ai', 3)).toBeNull();
  });

  it('is a noop when tile is already empty', () => {
    const s = makeState();
    const returned = removeCheat(s, 'player', 4);
    expect(returned).toEqual(s);
  });

  it('does not mutate the input state', () => {
    let { state } = placeCheat(makeState(), 'ai', 3, cheat());
    const before = getCheatAt(state, 'ai', 3);
    removeCheat(state, 'ai', 3);
    expect(getCheatAt(state, 'ai', 3)).toBe(before);
  });
});

// ─── getCheatAt ──────────────────────────────────────────────────────────────

describe('getCheatAt', () => {
  it('returns the cheat object at a placed tile', () => {
    const c = cheat();
    const { state } = placeCheat(makeState(), 'ai', 5, c);
    expect(getCheatAt(state, 'ai', 5)).toMatchObject({ id: 'ASHIDOME' });
  });

  it('returns null for an empty tile', () => {
    expect(getCheatAt(makeState(), 'player', 3)).toBeNull();
  });

  it('returns null for START tile (index 0)', () => {
    expect(getCheatAt(makeState(), 'player', 0)).toBeNull();
  });
});

// ─── isCheatOnBoard ───────────────────────────────────────────────────────────

describe('isCheatOnBoard', () => {
  it('returns false when board is empty', () => {
    expect(isCheatOnBoard(makeState(), 'player', 'ASHIDOME')).toBe(false);
  });

  it('returns true when cheat is on own path', () => {
    const { state } = placeCheat(makeState(), 'player', 2, cheat({ id: 'KAKE', placedBy: 'player' }));
    expect(isCheatOnBoard(state, 'player', 'KAKE')).toBe(true);
  });

  it('returns true when cheat is on opponent path (placed by same owner)', () => {
    const { state } = placeCheat(makeState(), 'ai', 3, cheat({ id: 'ASHIDOME', placedBy: 'player' }));
    expect(isCheatOnBoard(state, 'player', 'ASHIDOME')).toBe(true);
  });

  it('returns false when same cheat id belongs to different owner', () => {
    const { state } = placeCheat(makeState(), 'ai', 3, cheat({ placedBy: 'ai' }));
    expect(isCheatOnBoard(state, 'player', 'ASHIDOME')).toBe(false);
  });

  it('returns false after the cheat has been removed', () => {
    let { state } = placeCheat(makeState(), 'ai', 3, cheat({ placedBy: 'player' }));
    state = removeCheat(state, 'ai', 3);
    expect(isCheatOnBoard(state, 'player', 'ASHIDOME')).toBe(false);
  });
});
