import { describe, it, expect } from 'vitest';
import { resolveMove } from '../src/modules/movement.js';

// Tier-1 path length — END at index 9.  Used throughout unless noted.
const PL  = 8;
const END = PL + 1; // 9

// ─── roll ≤ 0 (wasted turn) ──────────────────────────────────────────────────

describe('resolveMove — roll 0 (wasted turn)', () => {
  it('returns currentPosition unchanged, no end, no overshoot', () => {
    expect(resolveMove(3, 0, PL)).toEqual({ newPosition: 3, landedOnEnd: false, overshoot: 0 });
  });

  it('negative roll treated as no movement', () => {
    expect(resolveMove(4, -2, PL)).toEqual({ newPosition: 4, landedOnEnd: false, overshoot: 0 });
  });

  it('position 0 (START), roll 0 — stays at START', () => {
    expect(resolveMove(0, 0, PL)).toEqual({ newPosition: 0, landedOnEnd: false, overshoot: 0 });
  });
});

// ─── Normal forward move ──────────────────────────────────────────────────────

describe('resolveMove — normal forward move', () => {
  it('advances by the roll from START', () => {
    expect(resolveMove(0, 4, PL)).toEqual({ newPosition: 4, landedOnEnd: false, overshoot: 0 });
  });

  it('advances by the roll from a mid-path tile', () => {
    expect(resolveMove(3, 3, PL)).toEqual({ newPosition: 6, landedOnEnd: false, overshoot: 0 });
  });

  it('lands one tile before END', () => {
    expect(resolveMove(0, END - 1, PL)).toEqual({ newPosition: END - 1, landedOnEnd: false, overshoot: 0 });
  });
});

// ─── Exact END landing ────────────────────────────────────────────────────────

describe('resolveMove — exact END landing', () => {
  it('lands exactly on END from START: landedOnEnd=true, overshoot=0', () => {
    expect(resolveMove(0, END, PL)).toEqual({ newPosition: END, landedOnEnd: true, overshoot: 0 });
  });

  it('lands exactly on END from mid-path', () => {
    expect(resolveMove(END - 3, 3, PL)).toEqual({ newPosition: END, landedOnEnd: true, overshoot: 0 });
  });

  it('1 tile away, rolls 1 → exact END', () => {
    expect(resolveMove(END - 1, 1, PL)).toEqual({ newPosition: END, landedOnEnd: true, overshoot: 0 });
  });
});

// ─── Overshoot ────────────────────────────────────────────────────────────────

describe('resolveMove — overshoot bounce-back', () => {
  it('overshoot by 1: newPosition = END-1, overshoot = 1', () => {
    expect(resolveMove(0, END + 1, PL)).toEqual({ newPosition: END - 1, landedOnEnd: false, overshoot: 1 });
  });

  it('GDD §7 example — 3 tiles from END, roll 5 → lands at END-2, overshoot=2', () => {
    // currentPos=6, roll=5, raw=11, overshoot=2, newPos=7
    expect(resolveMove(END - 3, 5, PL)).toEqual({ newPosition: END - 2, landedOnEnd: false, overshoot: 2 });
  });

  it('overshoot equal to endIndex — lands back at START (0)', () => {
    // raw = END + END = 18, overshoot = 9, bounced = 9-9 = 0
    expect(resolveMove(0, END * 2, PL)).toEqual({ newPosition: 0, landedOnEnd: false, overshoot: END });
  });

  it('massive overshoot: clamps at 0 — never past START', () => {
    // currentPos=0, roll=25, endIndex=9, raw=25, overshoot=16, bounced=9-16=-7 → 0
    expect(resolveMove(0, 25, PL)).toEqual({ newPosition: 0, landedOnEnd: false, overshoot: 16 });
  });

  it('overshoot from mid-path: accounts for starting position', () => {
    // currentPos=7, roll=4, raw=11, overshoot=2, newPos=7
    expect(resolveMove(7, 4, PL)).toEqual({ newPosition: 7, landedOnEnd: false, overshoot: 2 });
  });

  it('landedOnEnd is false on any overshoot', () => {
    const result = resolveMove(END - 3, 5, PL);
    expect(result.landedOnEnd).toBe(false);
    expect(result.overshoot).toBeGreaterThan(0);
  });
});

// ─── KAKE extra_tiles modifier ────────────────────────────────────────────────

describe('resolveMove — KAKE extra_tiles modifier', () => {
  const kake = [{ type: 'extra_tiles', value: 2 }];

  it('adds 2 extra tiles: resolveMove(0, 3, PL, kake) === resolveMove(0, 5, PL)', () => {
    expect(resolveMove(0, 3, PL, kake)).toEqual(resolveMove(0, 5, PL));
  });

  it('can turn an exact END landing into an overshoot', () => {
    // Without KAKE: 3 from END, roll 3 → exact END
    expect(resolveMove(END - 3, 3, PL)).toEqual({ newPosition: END, landedOnEnd: true, overshoot: 0 });
    // With KAKE: effective roll = 5 → overshoot by 2
    expect(resolveMove(END - 3, 3, PL, kake)).toEqual({ newPosition: END - 2, landedOnEnd: false, overshoot: 2 });
  });

  it('overshoot rules apply to the combined (roll + KAKE) movement, not just base roll', () => {
    // base roll=7, no KAKE: currentPos=END-3=6, raw=13, overshoot=4, newPos=5
    const base  = resolveMove(END - 3, 7, PL);
    // with KAKE: effective=9, raw=15, overshoot=6, newPos=3
    const kaked = resolveMove(END - 3, 7, PL, kake);
    expect(base.overshoot).toBe(4);
    expect(base.newPosition).toBe(5);
    expect(kaked.overshoot).toBe(6);
    expect(kaked.newPosition).toBe(3);
  });

  it('multiple extra_tiles modifiers stack additively', () => {
    const double = [{ type: 'extra_tiles', value: 2 }, { type: 'extra_tiles', value: 2 }];
    expect(resolveMove(0, 3, PL, double)).toEqual(resolveMove(0, 7, PL));
  });

  it('KAKE + roll 0: still no movement (effective roll still 2 > 0, advances)', () => {
    // KAKE adds +2 even on roll 0 — result is +2 tiles forward
    const result = resolveMove(2, 0, PL, kake);
    expect(result.newPosition).toBe(4);
    expect(result.landedOnEnd).toBe(false);
    expect(result.overshoot).toBe(0);
  });
});

// ─── Unknown modifier types ───────────────────────────────────────────────────

describe('resolveMove — unknown modifier types are ignored', () => {
  it('ignores unrecognised modifier type, treats as normal roll', () => {
    const mods = [{ type: 'future_modifier', value: 99 }];
    expect(resolveMove(3, 2, PL, mods)).toEqual({ newPosition: 5, landedOnEnd: false, overshoot: 0 });
  });
});

// ─── Different path lengths ───────────────────────────────────────────────────

describe('resolveMove — tier path lengths', () => {
  it('tier-2 pathLength=11 (END=12): overshoot by 1 from tile 10', () => {
    const pl = 11, end = 12;
    expect(resolveMove(end - 2, 3, pl)).toEqual({ newPosition: end - 1, landedOnEnd: false, overshoot: 1 });
  });

  it('tier-3 pathLength=15 (END=16): exact END from halfway', () => {
    const pl = 15, end = 16;
    expect(resolveMove(8, 8, pl)).toEqual({ newPosition: end, landedOnEnd: true, overshoot: 0 });
  });

  it('tier-4 pathLength=19 (END=20): exact END from START', () => {
    const pl = 19, end = 20;
    expect(resolveMove(0, end, pl)).toEqual({ newPosition: end, landedOnEnd: true, overshoot: 0 });
  });
});
