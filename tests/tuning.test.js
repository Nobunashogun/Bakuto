import { describe, it, expect } from 'vitest';
import { TUNING, getTierForLevel, isBackRoomLevel } from '../src/config/tuning.js';

describe('TUNING — structure', () => {
  it('has exactly 4 tiers', () => {
    expect(TUNING.tiers).toHaveLength(4);
  });

  it('tiers cover every level without gaps or overlaps', () => {
    // Tier boundaries must be contiguous: each tier's minLevel = prev maxLevel + 1
    for (let i = 1; i < TUNING.tiers.length; i++) {
      expect(TUNING.tiers[i].minLevel).toBe(TUNING.tiers[i - 1].maxLevel + 1);
    }
    // First tier starts at level 1
    expect(TUNING.tiers[0].minLevel).toBe(1);
    // Last tier extends to Infinity
    expect(TUNING.tiers[3].maxLevel).toBe(Infinity);
  });
});

describe('TUNING — tier values (GDD §4)', () => {
  const [t1, t2, t3, t4] = TUNING.tiers;

  it('Tier 1 (1–5): pathLength 8, blindFee 2%, aiDiceCap 22, fightPoolX 3', () => {
    expect(t1.pathLength).toBe(8);
    expect(t1.blindFeePct).toBe(0.02);
    expect(t1.aiDiceCap).toBe(22);
    expect(t1.fightPoolX).toBe(3);
  });

  it('Tier 2 (6–15): pathLength 11, blindFee 3%, aiDiceCap 23, fightPoolX 4', () => {
    expect(t2.pathLength).toBe(11);
    expect(t2.blindFeePct).toBe(0.03);
    expect(t2.aiDiceCap).toBe(23);
    expect(t2.fightPoolX).toBe(4);
  });

  it('Tier 3 (16–30): pathLength 15, blindFee 5%, aiDiceCap 24, fightPoolX 5', () => {
    expect(t3.pathLength).toBe(15);
    expect(t3.blindFeePct).toBe(0.05);
    expect(t3.aiDiceCap).toBe(24);
    expect(t3.fightPoolX).toBe(5);
  });

  it('Tier 4 (31+): pathLength 19, blindFee 7%, aiDiceCap 25, fightPoolX 6', () => {
    expect(t4.pathLength).toBe(19);
    expect(t4.blindFeePct).toBe(0.07);
    expect(t4.aiDiceCap).toBe(25);
    expect(t4.fightPoolX).toBe(6);
  });
});

describe('TUNING — activation costs (GDD §6.5)', () => {
  it('low is 3%', ()   => expect(TUNING.activationCost.low).toBe(0.03));
  it('medium is 7%', () => expect(TUNING.activationCost.medium).toBe(0.07));
  it('high is 15%', () => expect(TUNING.activationCost.high).toBe(0.15));
});

describe('TUNING — Back Room (GDD §2, §9)', () => {
  it('appears every 7 levels', () => expect(TUNING.backRoom.appearsEveryNLevels).toBe(7));
  it('offers 4 slots per visit',  () => expect(TUNING.backRoom.slotsPerVisit).toBe(4));
  it('purchase multipliers: low 1×, medium 1.5×, high 2×', () => {
    expect(TUNING.backRoom.purchaseCostMultiplier.low).toBe(1.0);
    expect(TUNING.backRoom.purchaseCostMultiplier.medium).toBe(1.5);
    expect(TUNING.backRoom.purchaseCostMultiplier.high).toBe(2.0);
  });
});

describe('TUNING — run defaults', () => {
  it('starting time is 24 hours in ms', () => {
    expect(TUNING.run.startingTimeMs).toBe(86_400_000);
  });
});

describe('getTierForLevel', () => {
  it('returns Tier 1 for level 1', ()  => expect(getTierForLevel(1).fightPoolX).toBe(3));
  it('returns Tier 1 for level 5', ()  => expect(getTierForLevel(5).fightPoolX).toBe(3));
  it('returns Tier 2 for level 6', ()  => expect(getTierForLevel(6).fightPoolX).toBe(4));
  it('returns Tier 2 for level 15', () => expect(getTierForLevel(15).fightPoolX).toBe(4));
  it('returns Tier 3 for level 16', () => expect(getTierForLevel(16).fightPoolX).toBe(5));
  it('returns Tier 3 for level 30', () => expect(getTierForLevel(30).fightPoolX).toBe(5));
  it('returns Tier 4 for level 31', () => expect(getTierForLevel(31).fightPoolX).toBe(6));
  it('returns Tier 4 for level 999', () => expect(getTierForLevel(999).fightPoolX).toBe(6));
  it('throws for level 0',  () => expect(() => getTierForLevel(0)).toThrow(RangeError));
  it('throws for level -1', () => expect(() => getTierForLevel(-1)).toThrow(RangeError));
});

describe('isBackRoomLevel', () => {
  it('is true for multiples of 7', () => {
    expect(isBackRoomLevel(7)).toBe(true);
    expect(isBackRoomLevel(14)).toBe(true);
    expect(isBackRoomLevel(21)).toBe(true);
    expect(isBackRoomLevel(28)).toBe(true);
  });
  it('is false for non-multiples', () => {
    expect(isBackRoomLevel(1)).toBe(false);
    expect(isBackRoomLevel(6)).toBe(false);
    expect(isBackRoomLevel(8)).toBe(false);
  });
  it('is false for level 0', () => expect(isBackRoomLevel(0)).toBe(false));
});
