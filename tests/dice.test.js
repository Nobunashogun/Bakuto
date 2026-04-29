import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  validateConfig,
  validateAiConfig,
  applyModifier,
  getEffectiveFaces,
  rollDice,
} from '../src/modules/dice.js';
import { TUNING } from '../src/config/tuning.js';

afterEach(() => vi.restoreAllMocks());

// ─── validateConfig ───────────────────────────────────────────────────────────

describe('validateConfig — valid cases', () => {
  it('accepts a standard configuration at the sum cap', () => {
    const result = validateConfig([4, 4, 4, 3, 3, 3]);
    expect(result).toEqual({ valid: true, error: null });
  });

  it('accepts a sum below the cap', () => {
    expect(validateConfig([1, 1, 1, 1, 1, 1]).valid).toBe(true);
  });

  it('accepts exactly the maximum allowed zero faces', () => {
    expect(validateConfig([0, 0, 0, 7, 7, 7]).valid).toBe(true);
  });

  it('accepts a sum of 0 (all zeros would fail max-zero rule, but 3 zeros + low values)', () => {
    expect(validateConfig([0, 0, 0, 1, 1, 1]).valid).toBe(true);
  });

  it('accepts a single high face (sum = 21)', () => {
    expect(validateConfig([21, 0, 0, 0, 0, 0]).valid).toBe(false); // 4 zeros
    expect(validateConfig([21, 0, 0, 0, 1, 0]).valid).toBe(false); // 4 zeros
    expect(validateConfig([18, 1, 1, 1, 0, 0]).valid).toBe(true);  // 2 zeros, sum=21
  });
});

describe('validateConfig — sum cap', () => {
  it('rejects sum > 21', () => {
    const result = validateConfig([4, 4, 4, 4, 3, 3]); // sum = 22
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/22/);
    expect(result.error).toMatch(/21/);
  });

  it('accepts sum exactly 21', () => {
    expect(validateConfig([4, 4, 4, 3, 3, 3]).valid).toBe(true);
  });

  it('rejects sum 22 regardless of other rules', () => {
    expect(validateConfig([4, 4, 4, 4, 3, 3]).valid).toBe(false);
  });
});

describe('validateConfig — zero faces', () => {
  it('rejects more than 3 zero faces', () => {
    const result = validateConfig([0, 0, 0, 0, 1, 1]); // 4 zeros
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/3/);
  });

  it('accepts exactly 3 zero faces', () => {
    expect(validateConfig([0, 0, 0, 7, 7, 7]).valid).toBe(true);
  });

  it('rejects 6 zero faces', () => {
    expect(validateConfig([0, 0, 0, 0, 0, 0]).valid).toBe(false);
  });
});

describe('validateConfig — structural errors', () => {
  it('rejects wrong array length', () => {
    expect(validateConfig([1, 2, 3]).valid).toBe(false);
    expect(validateConfig([1, 2, 3, 4, 5, 6, 7]).valid).toBe(false);
  });

  it('rejects null faces', () => {
    const result = validateConfig([null, null, null, null, null, null]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/assigned/i);
  });

  it('rejects mixed null faces', () => {
    expect(validateConfig([3, 3, 3, null, null, null]).valid).toBe(false);
  });

  it('rejects negative values', () => {
    expect(validateConfig([4, 4, 4, 3, 3, -1]).valid).toBe(false);
  });

  it('rejects non-integer values', () => {
    expect(validateConfig([4, 4, 4, 3, 3, 1.5]).valid).toBe(false);
  });

  it('rejects non-array input', () => {
    expect(validateConfig(null).valid).toBe(false);
    expect(validateConfig('string').valid).toBe(false);
  });
});

// ─── validateAiConfig ─────────────────────────────────────────────────────────

describe('validateAiConfig — valid cases', () => {
  it('accepts sum equal to the given AI cap', () => {
    expect(validateAiConfig([4, 4, 4, 4, 3, 3], 22).valid).toBe(true); // sum=22
  });

  it('accepts any number of zero faces (no zero restriction for AI)', () => {
    expect(validateAiConfig([0, 0, 0, 0, 0, 22], 22).valid).toBe(true);
  });

  it('accepts 6 zero faces', () => {
    expect(validateAiConfig([0, 0, 0, 0, 0, 0], 22).valid).toBe(true);
  });
});

describe('validateAiConfig — sum cap', () => {
  it('rejects sum exceeding the AI cap', () => {
    const result = validateAiConfig([4, 4, 4, 4, 4, 4], 22); // sum=24
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/22/);
  });

  TUNING.tiers.forEach(tier => {
    it(`tier cap ${tier.aiDiceCap}: accepts sum at cap`, () => {
      const cap = tier.aiDiceCap;
      // Build a valid face array summing exactly to cap
      const faces = [0, 0, 0, 0, 0, cap];
      expect(validateAiConfig(faces, cap).valid).toBe(true);
    });
  });
});

describe('validateAiConfig — structural errors', () => {
  it('rejects null faces', () => {
    expect(validateAiConfig([null, null, null, null, null, null], 22).valid).toBe(false);
  });

  it('rejects negative values', () => {
    expect(validateAiConfig([4, 4, 4, 3, 3, -1], 22).valid).toBe(false);
  });
});

// ─── applyModifier ────────────────────────────────────────────────────────────

describe('applyModifier — add_to_highest', () => {
  it('adds value to the highest face', () => {
    const result = applyModifier([3, 4, 3, 3, 3, 3], 'add_to_highest', 3);
    expect(result[1]).toBe(7); // face at index 1 was the max (4)
    expect(result).toEqual([3, 7, 3, 3, 3, 3]);
  });

  it('targets the LAST face when multiple faces share the maximum', () => {
    const result = applyModifier([4, 4, 4, 3, 3, 3], 'add_to_highest', 3);
    // lastIndexOf(4) = 2
    expect(result).toEqual([4, 4, 7, 3, 3, 3]);
  });

  it('can push the active sum above 21 (mid-fight, GDD §5)', () => {
    const result = applyModifier([4, 4, 4, 3, 3, 3], 'add_to_highest', 3);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(sum).toBe(24); // intentionally above 21
  });

  it('does not mutate the input array', () => {
    const input = [3, 4, 3, 3, 3, 3];
    const frozen = [...input];
    applyModifier(input, 'add_to_highest', 3);
    expect(input).toEqual(frozen);
  });
});

describe('applyModifier — subtract_from_highest', () => {
  it('subtracts value from the highest face', () => {
    const result = applyModifier([3, 5, 3, 3, 3, 3], 'subtract_from_highest', 2);
    expect(result).toEqual([3, 3, 3, 3, 3, 3]);
  });

  it('floors the result at 0 — never goes negative', () => {
    const result = applyModifier([2, 2, 2, 2, 2, 2], 'subtract_from_highest', 5);
    expect(result).toEqual([2, 2, 2, 2, 2, 0]); // lastIndexOf(2) = 5, clamped to 0
  });

  it('targets the last highest face when multiple share the max', () => {
    const result = applyModifier([4, 4, 4, 3, 3, 3], 'subtract_from_highest', 2);
    expect(result).toEqual([4, 4, 2, 3, 3, 3]); // lastIndexOf(4) = 2
  });

  it('does not mutate the input array', () => {
    const input = [3, 5, 3, 3, 3, 3];
    const frozen = [...input];
    applyModifier(input, 'subtract_from_highest', 2);
    expect(input).toEqual(frozen);
  });
});

describe('applyModifier — stacking', () => {
  it('KASUMASHI then MEZURI: +3 then -2 on same face = net +1', () => {
    let faces = [4, 4, 4, 3, 3, 3];
    faces = applyModifier(faces, 'add_to_highest', 3);      // [4,4,7,3,3,3]
    faces = applyModifier(faces, 'subtract_from_highest', 2); // [4,4,5,3,3,3]
    expect(faces).toEqual([4, 4, 5, 3, 3, 3]);
  });

  it('two subtract modifiers both floor at 0 correctly', () => {
    let faces = [1, 1, 1, 1, 1, 1];
    faces = applyModifier(faces, 'subtract_from_highest', 2); // 1→0 at idx 5
    faces = applyModifier(faces, 'subtract_from_highest', 2); // 1→0 at idx 4
    expect(faces[4]).toBe(0);
    expect(faces[5]).toBe(0);
  });
});

// ─── getEffectiveFaces ────────────────────────────────────────────────────────

describe('getEffectiveFaces', () => {
  it('returns a copy of faces when no modifiers are given', () => {
    const faces = [4, 4, 4, 3, 3, 3];
    const result = getEffectiveFaces(faces, []);
    expect(result).toEqual(faces);
    expect(result).not.toBe(faces); // different reference when modifiers change it
  });

  it('returns the base faces unchanged when modifiers array is empty', () => {
    const faces = [4, 4, 4, 3, 3, 3];
    expect(getEffectiveFaces(faces)).toEqual(faces);
  });

  it('applies a single modifier correctly', () => {
    const result = getEffectiveFaces([4, 4, 4, 3, 3, 3], [
      { type: 'add_to_highest', value: 3 },
    ]);
    expect(result).toEqual([4, 4, 7, 3, 3, 3]);
  });

  it('applies multiple modifiers sequentially', () => {
    const result = getEffectiveFaces([4, 4, 4, 3, 3, 3], [
      { type: 'add_to_highest', value: 3 },      // [4,4,7,3,3,3]
      { type: 'subtract_from_highest', value: 2 }, // [4,4,5,3,3,3]
    ]);
    expect(result).toEqual([4, 4, 5, 3, 3, 3]);
  });

  it('does not mutate the input faces array', () => {
    const faces = [4, 4, 4, 3, 3, 3];
    const frozen = [...faces];
    getEffectiveFaces(faces, [{ type: 'add_to_highest', value: 3 }]);
    expect(faces).toEqual(frozen);
  });
});

// ─── rollDice ─────────────────────────────────────────────────────────────────

describe('rollDice — return value', () => {
  it('returns a value present in the base faces (no modifiers)', () => {
    const faces = [3, 4, 5, 2, 1, 0];
    const result = rollDice(faces);
    expect(faces).toContain(result);
  });

  it('returns a value present in the effective faces (with modifiers)', () => {
    const faces = [3, 4, 5, 2, 1, 0];
    const mods  = [{ type: 'add_to_highest', value: 3 }]; // 5→8
    const effective = getEffectiveFaces(faces, mods);
    const result = rollDice(faces, mods);
    expect(effective).toContain(result);
  });

  it('can return 0 — wasted turn is a valid roll result', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // floor(0.99*6)=5 → faces[5]=0
    expect(rollDice([3, 4, 5, 2, 1, 0])).toBe(0);
  });
});

describe('rollDice — face selection', () => {
  it('picks the face at the randomly selected index', () => {
    const faces = [10, 2, 3, 4, 5, 6];
    vi.spyOn(Math, 'random').mockReturnValue(0); // floor(0*6)=0
    expect(rollDice(faces)).toBe(10);
  });

  it('picks from effective faces when modifiers are active', () => {
    const faces = [4, 4, 4, 3, 3, 3]; // after add_to_highest +3: [4,4,7,3,3,3]
    vi.spyOn(Math, 'random').mockReturnValue(0.4); // floor(0.4*6)=2 → effective[2]=7
    expect(rollDice(faces, [{ type: 'add_to_highest', value: 3 }])).toBe(7);
  });

  it('picks last face when random returns just under 1', () => {
    const faces = [1, 2, 3, 4, 5, 6];
    vi.spyOn(Math, 'random').mockReturnValue(0.9999); // floor(0.9999*6)=5
    expect(rollDice(faces)).toBe(6);
  });
});
