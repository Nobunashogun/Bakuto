import { describe, it, expect, vi, afterEach } from 'vitest';
import { TUNING } from '../src/config/tuning.js';
import {
  rollCheatCap,
  generateAiDiceConfig,
  calcBlindFeeMs,
  calcAiFightPool,
  resolveInitiativeWinner,
  generateAiPlacement,
  generateAiCheatPool,
} from '../src/modules/prepPhase.js';
import { getAllCheats } from '../src/modules/cheats.js';

afterEach(() => vi.restoreAllMocks());

// ─── rollCheatCap ─────────────────────────────────────────────────────────────

describe('rollCheatCap', () => {
  it('returns a non-negative integer', () => {
    const cap = rollCheatCap(8);
    expect(Number.isInteger(cap)).toBe(true);
    expect(cap).toBeGreaterThanOrEqual(0);
  });

  it('result is within floor(pathLength × 0.10)..floor(pathLength × 0.50) for pathLength=8', () => {
    // Run 200 times — cap must always land in [0, 4]
    for (let i = 0; i < 200; i++) {
      const cap = rollCheatCap(8);
      expect(cap).toBeGreaterThanOrEqual(0);
      expect(cap).toBeLessThanOrEqual(4);
    }
  });

  it('result is within expected range for pathLength=20', () => {
    // floor(20 × 0.10)=2  ..  floor(20 × 0.50)=10
    for (let i = 0; i < 200; i++) {
      const cap = rollCheatCap(20);
      expect(cap).toBeGreaterThanOrEqual(2);
      expect(cap).toBeLessThanOrEqual(10);
    }
  });

  it('uses minPct from TUNING.cheatCap', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);  // pct = minPct
    expect(rollCheatCap(10)).toBe(Math.floor(10 * TUNING.cheatCap.minPct));
  });

  it('uses maxPct from TUNING.cheatCap (random approaching 1)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999);
    const cap = rollCheatCap(10);
    expect(cap).toBeGreaterThanOrEqual(Math.floor(10 * TUNING.cheatCap.minPct));
    expect(cap).toBeLessThanOrEqual(Math.floor(10 * TUNING.cheatCap.maxPct));
  });
});

// ─── generateAiDiceConfig ─────────────────────────────────────────────────────

describe('generateAiDiceConfig', () => {
  it('returns exactly 6 faces', () => {
    expect(generateAiDiceConfig(22)).toHaveLength(6);
  });

  it('all faces are non-negative integers', () => {
    const faces = generateAiDiceConfig(22);
    faces.forEach(f => {
      expect(Number.isInteger(f)).toBe(true);
      expect(f).toBeGreaterThanOrEqual(0);
    });
  });

  it('sum equals the aiDiceCap', () => {
    for (const cap of [22, 23, 24, 25]) {
      const faces = generateAiDiceConfig(cap);
      expect(faces.reduce((a, b) => a + b, 0)).toBe(cap);
    }
  });

  it('generates different configs across calls (non-constant)', () => {
    const configs = Array.from({ length: 50 }, () => generateAiDiceConfig(22));
    const unique = new Set(configs.map(c => c.join(',')));
    expect(unique.size).toBeGreaterThan(1);
  });

  it('works for edge cap of 0', () => {
    const faces = generateAiDiceConfig(0);
    expect(faces).toHaveLength(6);
    expect(faces.every(f => f === 0)).toBe(true);
  });
});

// ─── calcBlindFeeMs ───────────────────────────────────────────────────────────

describe('calcBlindFeeMs', () => {
  it('returns floor(timeMs × blindFeePct)', () => {
    expect(calcBlindFeeMs(100_000, 0.02)).toBe(2_000);
    expect(calcBlindFeeMs(86_400_000, 0.02)).toBe(1_728_000);
    expect(calcBlindFeeMs(1_000_000, 0.07)).toBe(70_000);
  });

  it('floors fractional result', () => {
    // 99_999 × 0.02 = 1999.98 → 1999
    expect(calcBlindFeeMs(99_999, 0.02)).toBe(1_999);
  });

  it('returns 0 when timeMs is 0', () => {
    expect(calcBlindFeeMs(0, 0.05)).toBe(0);
  });

  it('matches TUNING tier1 blind fee pct', () => {
    const tier1 = TUNING.tiers[0];
    const fee   = calcBlindFeeMs(1_000_000, tier1.blindFeePct);
    expect(fee).toBe(Math.floor(1_000_000 * tier1.blindFeePct));
  });
});

// ─── calcAiFightPool ──────────────────────────────────────────────────────────

describe('calcAiFightPool', () => {
  it('returns blindFeeMs × fightPoolX', () => {
    expect(calcAiFightPool(1_000, 3)).toBe(3_000);
    expect(calcAiFightPool(500,   4)).toBe(2_000);
    expect(calcAiFightPool(1_728_000, 3)).toBe(5_184_000);
  });

  it('returns 0 when blindFeeMs is 0', () => {
    expect(calcAiFightPool(0, 5)).toBe(0);
  });

  it('uses TUNING tier values correctly', () => {
    for (const tier of TUNING.tiers) {
      const fee  = calcBlindFeeMs(10_000_000, tier.blindFeePct);
      const pool = calcAiFightPool(fee, tier.fightPoolX);
      expect(pool).toBe(fee * tier.fightPoolX);
    }
  });
});

// ─── resolveInitiativeWinner ──────────────────────────────────────────────────

describe('resolveInitiativeWinner', () => {
  it('returns "player" when playerRoll > aiRoll', () => {
    expect(resolveInitiativeWinner(5, 3)).toBe('player');
    expect(resolveInitiativeWinner(1, 0)).toBe('player');
  });

  it('returns "ai" when aiRoll > playerRoll', () => {
    expect(resolveInitiativeWinner(2, 6)).toBe('ai');
    expect(resolveInitiativeWinner(0, 1)).toBe('ai');
  });

  it('returns "tie" when rolls are equal', () => {
    expect(resolveInitiativeWinner(4, 4)).toBe('tie');
    expect(resolveInitiativeWinner(0, 0)).toBe('tie');
  });

  it('handles zero rolls', () => {
    expect(resolveInitiativeWinner(0, 3)).toBe('ai');
    expect(resolveInitiativeWinner(3, 0)).toBe('player');
  });
});

// ─── generateAiPlacement ─────────────────────────────────────────────────────

const freshBoard = () => ({
  pathLength: 8,
  positions:  { player: 0, ai: 0 },
  cheats:     { player: {}, ai: {} },
});

describe('generateAiPlacement — no cheat IDs', () => {
  it('returns null for an empty cheatIds array', () => {
    expect(generateAiPlacement(freshBoard(), [])).toBeNull();
  });
});

describe('generateAiPlacement — good cheat (own path)', () => {
  it('places a "good" cheat on the AI path', () => {
    const result = generateAiPlacement(freshBoard(), ['KAKE']);
    expect(result).not.toBeNull();
    expect(result.path).toBe('ai');
    expect(result.cheatId).toBe('KAKE');
  });

  it('places on a valid traversal tile (1..pathLength)', () => {
    const result = generateAiPlacement(freshBoard(), ['KAKE']);
    expect(result.tileIndex).toBeGreaterThanOrEqual(1);
    expect(result.tileIndex).toBeLessThanOrEqual(8);
  });
});

describe('generateAiPlacement — bad cheat (opponent path)', () => {
  it('places a "bad" cheat on the player path', () => {
    const result = generateAiPlacement(freshBoard(), ['ASHIDOME']);
    expect(result).not.toBeNull();
    expect(result.path).toBe('player');
    expect(result.cheatId).toBe('ASHIDOME');
  });
});

describe('generateAiPlacement — no available tiles', () => {
  it('returns null when every tile on the target path is occupied', () => {
    const board = freshBoard();
    // Fill all player tiles (KECHIRASHI is bad → player path)
    for (let i = 1; i <= board.pathLength; i++) {
      board.cheats.player[i] = { id: 'DUMMY', placedBy: 'player' };
    }
    const result = generateAiPlacement(board, ['KECHIRASHI']);
    expect(result).toBeNull();
  });
});

describe('generateAiPlacement — single-instance-per-owner rule', () => {
  it('returns null if the cheat is already on the board for the AI', () => {
    const board = freshBoard();
    // AI already placed KAKE on tile 3 of the AI path
    board.cheats.ai[3] = { id: 'KAKE', placedBy: 'ai' };
    const result = generateAiPlacement(board, ['KAKE']);
    expect(result).toBeNull();
  });

  it('allows placement when the same cheat is on the board for the player (different owner)', () => {
    const board = freshBoard();
    board.cheats.player[3] = { id: 'KAKE', placedBy: 'player' };
    const result = generateAiPlacement(board, ['KAKE']);
    expect(result).not.toBeNull();
    expect(result.cheatId).toBe('KAKE');
  });

  it('skips an already-on-board id and tries the next cheat in the pool', () => {
    const board = freshBoard();
    board.cheats.ai[1] = { id: 'KAKE', placedBy: 'ai' };
    // MACHI is also good (AI path), not on board
    const result = generateAiPlacement(board, ['KAKE', 'MACHI']);
    expect(result).not.toBeNull();
    expect(result.cheatId).toBe('MACHI');
  });
});

describe('generateAiPlacement — unknown cheat ID', () => {
  it('skips unknown cheat IDs and returns null if none remain', () => {
    expect(generateAiPlacement(freshBoard(), ['NOT_REAL'])).toBeNull();
  });
});

// ─── generateAiCheatPool ──────────────────────────────────────────────────────

describe('generateAiCheatPool', () => {
  const allIds = getAllCheats().map(c => c.id);

  it('returns the requested count of cheat IDs', () => {
    expect(generateAiCheatPool(3)).toHaveLength(3);
    expect(generateAiCheatPool(1)).toHaveLength(1);
    expect(generateAiCheatPool(6)).toHaveLength(6);
  });

  it('all returned IDs exist in the roster', () => {
    const pool = generateAiCheatPool(3);
    pool.forEach(id => expect(allIds).toContain(id));
  });

  it('returns no duplicate IDs within a single pool', () => {
    const pool = generateAiCheatPool(6);
    expect(new Set(pool).size).toBe(6);
  });

  it('defaults to count=3 when called with no argument', () => {
    expect(generateAiCheatPool()).toHaveLength(3);
  });
});
