// Single source of truth for every economy and balance value (GDD §13).
// All game logic must reference these constants — no magic numbers elsewhere.

export const TUNING = {

  // ── Run lifecycle ────────────────────────────────────────────────────────────
  run: {
    startingTimeMs: 86_400_000,   // 24 hours in milliseconds (GDD §3)
  },

  // ── Depth tiers (GDD §4) ─────────────────────────────────────────────────────
  // All four scaling systems (path length, blind fee, AI dice cap, fight pool X)
  // use the same four tiers. Listed top-to-bottom = shallow to deep.
  tiers: [
    //  levels      pathLength  blindFeePct  aiDiceCap  fightPoolX
    { minLevel:  1, maxLevel:  5,  pathLength:  8, blindFeePct: 0.02, aiDiceCap: 22, fightPoolX: 3 },
    { minLevel:  6, maxLevel: 15,  pathLength: 11, blindFeePct: 0.03, aiDiceCap: 23, fightPoolX: 4 },
    { minLevel: 16, maxLevel: 30,  pathLength: 15, blindFeePct: 0.05, aiDiceCap: 24, fightPoolX: 5 },
    { minLevel: 31, maxLevel: Infinity, pathLength: 19, blindFeePct: 0.07, aiDiceCap: 25, fightPoolX: 6 },
  ],

  // ── Dice (GDD §5) ────────────────────────────────────────────────────────────
  dice: {
    faceCount:          6,
    playerSumCap:       21,
    playerMaxZeroFaces: 3,
  },

  // ── Fight cheat cap (GDD §6.4) ───────────────────────────────────────────────
  cheatCap: {
    minPct: 0.10,   // 10% of path length, floored
    maxPct: 0.50,   // 50% of path length, floored
  },

  // ── Cheat activation costs — fraction of player's current remaining time (GDD §6.5) ──
  activationCost: {
    low:    0.03,   // 3%
    medium: 0.07,   // 7%
    high:   0.15,   // 15%
  },

  // ── Back Room shop (GDD §2, §9) ──────────────────────────────────────────────
  backRoom: {
    appearsEveryNLevels: 7,         // levels 7, 14, 21, 28 …
    slotsPerVisit:       4,
    // Purchase cost = multiplier × (blindFeePct × playerTimeMs at moment of purchase)
    purchaseCostMultiplier: {
      low:    1.0,
      medium: 1.5,
      high:   2.0,
    },
  },

};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the tier config row for a given dungeon level.
 * Throws if level is less than 1.
 * @param {number} level
 * @returns {typeof TUNING.tiers[0]}
 */
export function getTierForLevel(level) {
  const tier = TUNING.tiers.find(t => level >= t.minLevel && level <= t.maxLevel);
  if (!tier) throw new RangeError(`No tier defined for level ${level}`);
  return tier;
}

/**
 * Returns true if the given level is a Back Room level (GDD §2).
 * @param {number} level
 * @returns {boolean}
 */
export function isBackRoomLevel(level) {
  return level > 0 && level % TUNING.backRoom.appearsEveryNLevels === 0;
}
