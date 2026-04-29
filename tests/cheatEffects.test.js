import { describe, it, expect } from 'vitest';
import { createBoardState, moveTokenTo } from '../src/modules/board.js';
import {
  applyKake, applyTome, applyShikomi, applyKasumashi, applyMachi, applyKeppan,
  applyAshidome, applyKechirashi, applyMezuri, applyMisegane, applyToritate, applyAshikase,
  applyCheatEffect,
  getDiceModifiers, hasActiveEffect, applyPostRollModifiers, tickActiveEffects,
} from '../src/modules/cheatEffects.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeState(pathLength = 8, overrides = {}) {
  const boardState = createBoardState(pathLength);
  return {
    boardState,
    activeEffects: [],
    pot:           10_000,
    aiFightPool:   30_000,
    minBlindFeeMs: 5_000,
    flags: {
      player: { skipNextTurn: false, tomeActive: false },
      ai:     { skipNextTurn: false, tomeActive: false },
    },
    ...overrides,
  };
}

function atPos(fightState, side, pos) {
  return {
    ...fightState,
    boardState: moveTokenTo(fightState.boardState, side, pos),
  };
}

// ─── KAKE / HELLSTEP ─────────────────────────────────────────────────────────

describe('applyKake', () => {
  it('returns extraTiles: 2', () => {
    const { extraTiles } = applyKake(makeState(), 'player');
    expect(extraTiles).toBe(2);
  });

  it('does not mutate fightState', () => {
    const s = makeState();
    applyKake(s, 'player');
    expect(s.pot).toBe(10_000);
  });

  it('reroll and fightEnded remain false', () => {
    const { reroll, fightEnded } = applyKake(makeState(), 'player');
    expect(reroll).toBe(false);
    expect(fightEnded).toBe(false);
  });

  it('works for ai side too', () => {
    expect(applyKake(makeState(), 'ai').extraTiles).toBe(2);
  });
});

// ─── TOME / SOUL ANCHOR ───────────────────────────────────────────────────────

describe('applyTome', () => {
  it('sets tomeActive flag on activatingSide', () => {
    const { fightState } = applyTome(makeState(), 'player');
    expect(fightState.flags.player.tomeActive).toBe(true);
  });

  it('does not affect the other side\'s flags', () => {
    const { fightState } = applyTome(makeState(), 'player');
    expect(fightState.flags.ai.tomeActive).toBe(false);
  });

  it('works for ai side', () => {
    const { fightState } = applyTome(makeState(), 'ai');
    expect(fightState.flags.ai.tomeActive).toBe(true);
    expect(fightState.flags.player.tomeActive).toBe(false);
  });

  it('extraTiles=0, reroll=false, fightEnded=false', () => {
    const { extraTiles, reroll, fightEnded } = applyTome(makeState(), 'player');
    expect(extraTiles).toBe(0);
    expect(reroll).toBe(false);
    expect(fightEnded).toBe(false);
  });

  it('does not affect pot, activeEffects, or positions', () => {
    const s = makeState();
    const { fightState } = applyTome(s, 'player');
    expect(fightState.pot).toBe(s.pot);
    expect(fightState.activeEffects).toHaveLength(0);
    expect(fightState.boardState.positions.player).toBe(0);
  });
});

// ─── SHIKOMI / LOADED ─────────────────────────────────────────────────────────

describe('applyShikomi', () => {
  it('returns reroll: true', () => {
    expect(applyShikomi(makeState(), 'player').reroll).toBe(true);
  });

  it('does not mutate fightState', () => {
    const s = makeState();
    const { fightState } = applyShikomi(s, 'player');
    expect(fightState).toBe(s);
  });

  it('extraTiles=0, fightEnded=false', () => {
    const { extraTiles, fightEnded } = applyShikomi(makeState(), 'ai');
    expect(extraTiles).toBe(0);
    expect(fightEnded).toBe(false);
  });
});

// ─── KASUMASHI / DEAD WEIGHT ──────────────────────────────────────────────────

describe('applyKasumashi', () => {
  it('adds KASUMASHI entry to activeEffects targeting activatingSide', () => {
    const { fightState } = applyKasumashi(makeState(), 'player');
    expect(fightState.activeEffects).toHaveLength(1);
    expect(fightState.activeEffects[0]).toMatchObject({
      cheatId: 'KASUMASHI', targetSide: 'player', roundsRemaining: 2,
    });
  });

  it('targets ai when ai activates', () => {
    const { fightState } = applyKasumashi(makeState(), 'ai');
    expect(fightState.activeEffects[0].targetSide).toBe('ai');
  });

  it('does not alter pot, flags, or positions', () => {
    const s = makeState();
    const { fightState } = applyKasumashi(s, 'player');
    expect(fightState.pot).toBe(s.pot);
    expect(fightState.flags.player.tomeActive).toBe(false);
    expect(fightState.boardState.positions.player).toBe(0);
  });

  it('two consecutive activations stack (e.g. from different sources)', () => {
    let s = makeState();
    s = applyKasumashi(s, 'player').fightState;
    s = applyKasumashi(s, 'player').fightState;
    expect(s.activeEffects).toHaveLength(2);
  });
});

// ─── MACHI / PURGATORY LOOP ───────────────────────────────────────────────────

describe('applyMachi', () => {
  it('adds MACHI entry with roundsRemaining: 3', () => {
    const { fightState } = applyMachi(makeState(), 'player');
    expect(fightState.activeEffects[0]).toMatchObject({
      cheatId: 'MACHI', targetSide: 'player', roundsRemaining: 3,
    });
  });

  it('targets the activating side', () => {
    expect(applyMachi(makeState(), 'ai').fightState.activeEffects[0].targetSide).toBe('ai');
  });
});

// ─── KEPPAN / BLOOD PACT ─────────────────────────────────────────────────────

describe('applyKeppan', () => {
  it('doubles the pot', () => {
    const s = makeState({ pot: 12_000 });
    expect(applyKeppan(s, 'player').fightState.pot).toBe(24_000);
  });

  it('does not double pot retroactively — only current value', () => {
    const s = makeState({ pot: 0 });
    expect(applyKeppan(s, 'player').fightState.pot).toBe(0);
  });

  it('does not affect aiFightPool, activeEffects, or flags', () => {
    const s = makeState({ aiFightPool: 99_000 });
    const { fightState } = applyKeppan(s, 'player');
    expect(fightState.aiFightPool).toBe(99_000);
    expect(fightState.activeEffects).toHaveLength(0);
  });

  it('extraTiles=0, reroll=false, fightEnded=false', () => {
    const r = applyKeppan(makeState(), 'player');
    expect(r.extraTiles).toBe(0);
    expect(r.reroll).toBe(false);
    expect(r.fightEnded).toBe(false);
  });
});

// ─── ASHIDOME / CURSED GROUND ─────────────────────────────────────────────────

describe('applyAshidome', () => {
  it('sets skipNextTurn on activatingSide', () => {
    const { fightState } = applyAshidome(makeState(), 'ai');
    expect(fightState.flags.ai.skipNextTurn).toBe(true);
  });

  it('does not affect the other side', () => {
    const { fightState } = applyAshidome(makeState(), 'ai');
    expect(fightState.flags.player.skipNextTurn).toBe(false);
  });

  it('works for player side', () => {
    const { fightState } = applyAshidome(makeState(), 'player');
    expect(fightState.flags.player.skipNextTurn).toBe(true);
  });

  it('does not alter pot or activeEffects', () => {
    const s = makeState();
    const { fightState } = applyAshidome(s, 'player');
    expect(fightState.pot).toBe(s.pot);
    expect(fightState.activeEffects).toHaveLength(0);
  });
});

// ─── KECHIRASHI / HELLFIRE TRAP ───────────────────────────────────────────────

describe('applyKechirashi', () => {
  it('moves activatingSide back 3 tiles', () => {
    const s = atPos(makeState(), 'ai', 6);
    const { fightState } = applyKechirashi(s, 'ai');
    expect(fightState.boardState.positions.ai).toBe(3);
  });

  it('floors at START (0) — cannot go negative', () => {
    const s = atPos(makeState(), 'player', 2);
    const { fightState } = applyKechirashi(s, 'player');
    expect(fightState.boardState.positions.player).toBe(0);
  });

  it('floors at 0 when already at 0', () => {
    const s = atPos(makeState(), 'player', 0);
    const { fightState } = applyKechirashi(s, 'player');
    expect(fightState.boardState.positions.player).toBe(0);
  });

  it('exactly 3 from START → lands on START', () => {
    const s = atPos(makeState(), 'ai', 3);
    const { fightState } = applyKechirashi(s, 'ai');
    expect(fightState.boardState.positions.ai).toBe(0);
  });

  it('does not affect the other side\'s position', () => {
    const s = atPos(atPos(makeState(), 'ai', 6), 'player', 4);
    const { fightState } = applyKechirashi(s, 'ai');
    expect(fightState.boardState.positions.player).toBe(4);
  });

  it('extraTiles=0, reroll=false, fightEnded=false', () => {
    const r = applyKechirashi(atPos(makeState(), 'ai', 5), 'ai');
    expect(r.extraTiles).toBe(0);
    expect(r.reroll).toBe(false);
    expect(r.fightEnded).toBe(false);
  });
});

// ─── MEZURI / DICE ROT ────────────────────────────────────────────────────────

describe('applyMezuri', () => {
  it('adds MEZURI entry targeting activatingSide with roundsRemaining: 3', () => {
    const { fightState } = applyMezuri(makeState(), 'ai');
    expect(fightState.activeEffects[0]).toMatchObject({
      cheatId: 'MEZURI', targetSide: 'ai', roundsRemaining: 3,
    });
  });

  it('targets player when player activates', () => {
    expect(applyMezuri(makeState(), 'player').fightState.activeEffects[0].targetSide).toBe('player');
  });
});

// ─── MISEGANE / FALSE END ─────────────────────────────────────────────────────

describe('applyMisegane — forward movement', () => {
  it('sends activatingSide back 5 tiles on forward landing', () => {
    const s = atPos(makeState(), 'player', 7);
    const { fightState } = applyMisegane(s, 'player', false);
    expect(fightState.boardState.positions.player).toBe(2);
  });

  it('floors at START (0)', () => {
    const s = atPos(makeState(), 'ai', 3);
    const { fightState } = applyMisegane(s, 'ai', false);
    expect(fightState.boardState.positions.ai).toBe(0);
  });

  it('already at 0: stays at 0', () => {
    const s = atPos(makeState(), 'ai', 0);
    const { fightState } = applyMisegane(s, 'ai', false);
    expect(fightState.boardState.positions.ai).toBe(0);
  });

  it('exactly 5 from START → lands on START', () => {
    const s = atPos(makeState(), 'player', 5);
    const { fightState } = applyMisegane(s, 'player', false);
    expect(fightState.boardState.positions.player).toBe(0);
  });
});

describe('applyMisegane — bounce-back (does not fire)', () => {
  it('returns original fightState unchanged when isBouncedBack=true', () => {
    const s = atPos(makeState(), 'player', 4);
    const { fightState } = applyMisegane(s, 'player', true);
    expect(fightState.boardState.positions.player).toBe(4);
  });

  it('fightState reference is the original when no-op', () => {
    const s = atPos(makeState(), 'player', 4);
    const { fightState } = applyMisegane(s, 'player', true);
    expect(fightState).toBe(s);
  });

  it('extraTiles=0, reroll=false, fightEnded=false even on no-op', () => {
    const r = applyMisegane(makeState(), 'player', true);
    expect(r.extraTiles).toBe(0);
    expect(r.reroll).toBe(false);
    expect(r.fightEnded).toBe(false);
  });
});

// ─── TORITATE / DEBT COLLECTOR ────────────────────────────────────────────────

describe('applyToritate', () => {
  it('drains one minBlindFeeMs from aiFightPool', () => {
    const s = makeState({ aiFightPool: 30_000, minBlindFeeMs: 5_000 });
    const { fightState } = applyToritate(s, 'ai');
    expect(fightState.aiFightPool).toBe(25_000);
  });

  it('fightEnded=false when pool is still positive', () => {
    const s = makeState({ aiFightPool: 30_000, minBlindFeeMs: 5_000 });
    expect(applyToritate(s, 'ai').fightEnded).toBe(false);
  });

  it('fightEnded=true when pool reaches exactly 0', () => {
    const s = makeState({ aiFightPool: 5_000, minBlindFeeMs: 5_000 });
    expect(applyToritate(s, 'ai').fightEnded).toBe(true);
  });

  it('fightEnded=true when drain would go below 0', () => {
    const s = makeState({ aiFightPool: 3_000, minBlindFeeMs: 5_000 });
    const r = applyToritate(s, 'ai');
    expect(r.fightState.aiFightPool).toBe(0);
    expect(r.fightEnded).toBe(true);
  });

  it('pool floors at 0 — never goes negative', () => {
    const s = makeState({ aiFightPool: 1_000, minBlindFeeMs: 10_000 });
    expect(applyToritate(s, 'ai').fightState.aiFightPool).toBe(0);
  });

  it('does not affect pot, flags, or positions', () => {
    const s = makeState({ pot: 8_000, aiFightPool: 30_000, minBlindFeeMs: 5_000 });
    const { fightState } = applyToritate(s, 'player');
    expect(fightState.pot).toBe(8_000);
    expect(fightState.flags.player.skipNextTurn).toBe(false);
  });

  it('reads minBlindFeeMs from fightState (no extra context arg needed)', () => {
    // Verifies TORITATE does not require context.minBlindFeeMs
    const s = makeState({ aiFightPool: 20_000, minBlindFeeMs: 7_000 });
    expect(applyToritate(s, 'ai').fightState.aiFightPool).toBe(13_000);
  });
});

// ─── ASHIKASE / LEAD BOOTS ───────────────────────────────────────────────────

describe('applyAshikase', () => {
  it('adds ASHIKASE entry targeting activatingSide with roundsRemaining: 2', () => {
    const { fightState } = applyAshikase(makeState(), 'player');
    expect(fightState.activeEffects[0]).toMatchObject({
      cheatId: 'ASHIKASE', targetSide: 'player', roundsRemaining: 2,
    });
  });

  it('targets ai when ai activates', () => {
    expect(applyAshikase(makeState(), 'ai').fightState.activeEffects[0].targetSide).toBe('ai');
  });
});

// ─── applyCheatEffect dispatcher ─────────────────────────────────────────────

describe('applyCheatEffect — dispatcher', () => {
  it('routes KAKE correctly', () => {
    expect(applyCheatEffect('KAKE', 'player', makeState()).extraTiles).toBe(2);
  });

  it('routes TOME correctly', () => {
    expect(applyCheatEffect('TOME', 'player', makeState()).fightState.flags.player.tomeActive).toBe(true);
  });

  it('routes SHIKOMI correctly', () => {
    expect(applyCheatEffect('SHIKOMI', 'player', makeState()).reroll).toBe(true);
  });

  it('routes KASUMASHI correctly', () => {
    const { fightState } = applyCheatEffect('KASUMASHI', 'player', makeState());
    expect(fightState.activeEffects[0].cheatId).toBe('KASUMASHI');
  });

  it('routes MACHI correctly', () => {
    const { fightState } = applyCheatEffect('MACHI', 'ai', makeState());
    expect(fightState.activeEffects[0].cheatId).toBe('MACHI');
  });

  it('routes KEPPAN correctly — doubles pot', () => {
    const s = makeState({ pot: 6_000 });
    expect(applyCheatEffect('KEPPAN', 'player', s).fightState.pot).toBe(12_000);
  });

  it('routes ASHIDOME correctly', () => {
    const { fightState } = applyCheatEffect('ASHIDOME', 'ai', makeState());
    expect(fightState.flags.ai.skipNextTurn).toBe(true);
  });

  it('routes KECHIRASHI correctly', () => {
    const s = atPos(makeState(), 'ai', 6);
    const { fightState } = applyCheatEffect('KECHIRASHI', 'ai', s);
    expect(fightState.boardState.positions.ai).toBe(3);
  });

  it('routes MEZURI correctly', () => {
    const { fightState } = applyCheatEffect('MEZURI', 'ai', makeState());
    expect(fightState.activeEffects[0].cheatId).toBe('MEZURI');
  });

  it('routes MISEGANE — fires on forward', () => {
    const s = atPos(makeState(), 'player', 7);
    const { fightState } = applyCheatEffect('MISEGANE', 'player', s, { isBouncedBack: false });
    expect(fightState.boardState.positions.player).toBe(2);
  });

  it('routes MISEGANE — no-op on bounce-back', () => {
    const s = atPos(makeState(), 'player', 7);
    const { fightState } = applyCheatEffect('MISEGANE', 'player', s, { isBouncedBack: true });
    expect(fightState.boardState.positions.player).toBe(7);
  });

  it('routes TORITATE correctly', () => {
    const s = makeState({ aiFightPool: 20_000, minBlindFeeMs: 5_000 });
    const { fightState } = applyCheatEffect('TORITATE', 'ai', s);
    expect(fightState.aiFightPool).toBe(15_000);
  });

  it('routes ASHIKASE correctly', () => {
    const { fightState } = applyCheatEffect('ASHIKASE', 'ai', makeState());
    expect(fightState.activeEffects[0].cheatId).toBe('ASHIKASE');
  });

  it('unknown cheat id returns fightState unchanged, defaults', () => {
    const s = makeState();
    const r = applyCheatEffect('BOGUS', 'player', s);
    expect(r.fightState).toBe(s);
    expect(r.extraTiles).toBe(0);
    expect(r.reroll).toBe(false);
    expect(r.fightEnded).toBe(false);
  });
});

// ─── getDiceModifiers ─────────────────────────────────────────────────────────

describe('getDiceModifiers', () => {
  it('returns empty array when no active effects', () => {
    expect(getDiceModifiers([], 'player')).toEqual([]);
  });

  it('includes add_to_highest+3 for KASUMASHI targeting side', () => {
    const effects = [{ cheatId: 'KASUMASHI', targetSide: 'player', roundsRemaining: 2 }];
    expect(getDiceModifiers(effects, 'player')).toContainEqual({ type: 'add_to_highest', value: 3 });
  });

  it('includes subtract_from_highest+2 for MEZURI targeting side', () => {
    const effects = [{ cheatId: 'MEZURI', targetSide: 'ai', roundsRemaining: 3 }];
    expect(getDiceModifiers(effects, 'ai')).toContainEqual({ type: 'subtract_from_highest', value: 2 });
  });

  it('excludes effects that target the other side', () => {
    const effects = [{ cheatId: 'KASUMASHI', targetSide: 'ai', roundsRemaining: 2 }];
    expect(getDiceModifiers(effects, 'player')).toHaveLength(0);
  });

  it('stacks two KASUMASHI entries', () => {
    const effects = [
      { cheatId: 'KASUMASHI', targetSide: 'player', roundsRemaining: 2 },
      { cheatId: 'KASUMASHI', targetSide: 'player', roundsRemaining: 1 },
    ];
    const mods = getDiceModifiers(effects, 'player');
    expect(mods).toHaveLength(2);
    expect(mods.every(m => m.type === 'add_to_highest' && m.value === 3)).toBe(true);
  });

  it('does NOT include ASHIKASE (that is a post-roll modifier)', () => {
    const effects = [{ cheatId: 'ASHIKASE', targetSide: 'player', roundsRemaining: 2 }];
    expect(getDiceModifiers(effects, 'player')).toHaveLength(0);
  });

  it('KASUMASHI and MEZURI together produce two entries', () => {
    const effects = [
      { cheatId: 'KASUMASHI', targetSide: 'player', roundsRemaining: 2 },
      { cheatId: 'MEZURI',    targetSide: 'player', roundsRemaining: 3 },
    ];
    const mods = getDiceModifiers(effects, 'player');
    expect(mods).toHaveLength(2);
  });
});

// ─── hasActiveEffect ──────────────────────────────────────────────────────────

describe('hasActiveEffect', () => {
  it('returns false on empty activeEffects', () => {
    expect(hasActiveEffect('MACHI', 'player', [])).toBe(false);
  });

  it('returns true when matching effect is present', () => {
    const effects = [{ cheatId: 'MACHI', targetSide: 'player', roundsRemaining: 3 }];
    expect(hasActiveEffect('MACHI', 'player', effects)).toBe(true);
  });

  it('returns false when effect is for the other side', () => {
    const effects = [{ cheatId: 'MACHI', targetSide: 'ai', roundsRemaining: 3 }];
    expect(hasActiveEffect('MACHI', 'player', effects)).toBe(false);
  });

  it('returns false when cheatId does not match', () => {
    const effects = [{ cheatId: 'KASUMASHI', targetSide: 'player', roundsRemaining: 2 }];
    expect(hasActiveEffect('MACHI', 'player', effects)).toBe(false);
  });
});

// ─── applyPostRollModifiers ───────────────────────────────────────────────────

describe('applyPostRollModifiers', () => {
  it('returns roll unchanged when no ASHIKASE', () => {
    expect(applyPostRollModifiers(6, 'player', [])).toBe(6);
  });

  it('halves roll (floor) when ASHIKASE is active', () => {
    const effects = [{ cheatId: 'ASHIKASE', targetSide: 'player', roundsRemaining: 2 }];
    expect(applyPostRollModifiers(7, 'player', effects)).toBe(3);
    expect(applyPostRollModifiers(6, 'player', effects)).toBe(3);
  });

  it('reduces to 0 on roll=1 (wasted turn)', () => {
    const effects = [{ cheatId: 'ASHIKASE', targetSide: 'ai', roundsRemaining: 2 }];
    expect(applyPostRollModifiers(1, 'ai', effects)).toBe(0);
  });

  it('does not halve for the unaffected side', () => {
    const effects = [{ cheatId: 'ASHIKASE', targetSide: 'ai', roundsRemaining: 2 }];
    expect(applyPostRollModifiers(6, 'player', effects)).toBe(6);
  });

  it('roll=0 stays 0 regardless', () => {
    const effects = [{ cheatId: 'ASHIKASE', targetSide: 'player', roundsRemaining: 1 }];
    expect(applyPostRollModifiers(0, 'player', effects)).toBe(0);
  });
});

// ─── tickActiveEffects ────────────────────────────────────────────────────────

describe('tickActiveEffects', () => {
  it('decrements roundsRemaining by 1', () => {
    const effects = [{ cheatId: 'MACHI', targetSide: 'player', roundsRemaining: 3 }];
    expect(tickActiveEffects(effects)[0].roundsRemaining).toBe(2);
  });

  it('removes entries that reach 0 after decrement', () => {
    const effects = [{ cheatId: 'KASUMASHI', targetSide: 'player', roundsRemaining: 1 }];
    expect(tickActiveEffects(effects)).toHaveLength(0);
  });

  it('returns an empty array unchanged', () => {
    expect(tickActiveEffects([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const effects = [{ cheatId: 'MEZURI', targetSide: 'ai', roundsRemaining: 2 }];
    tickActiveEffects(effects);
    expect(effects[0].roundsRemaining).toBe(2);
  });

  it('handles mixed effects — keeps those with > 0 after decrement', () => {
    const effects = [
      { cheatId: 'KASUMASHI', targetSide: 'player', roundsRemaining: 1 },
      { cheatId: 'MACHI',     targetSide: 'player', roundsRemaining: 2 },
      { cheatId: 'MEZURI',    targetSide: 'ai',     roundsRemaining: 3 },
    ];
    const ticked = tickActiveEffects(effects);
    expect(ticked).toHaveLength(2);
    expect(ticked.find(e => e.cheatId === 'KASUMASHI')).toBeUndefined();
    expect(ticked.find(e => e.cheatId === 'MACHI').roundsRemaining).toBe(1);
    expect(ticked.find(e => e.cheatId === 'MEZURI').roundsRemaining).toBe(2);
  });

  it('full 2-round KASUMASHI lifecycle: present for 2 ticks then gone', () => {
    let effects = [{ cheatId: 'KASUMASHI', targetSide: 'player', roundsRemaining: 2 }];
    effects = tickActiveEffects(effects);
    expect(effects).toHaveLength(1);
    effects = tickActiveEffects(effects);
    expect(effects).toHaveLength(0);
  });

  it('full 3-round MACHI lifecycle', () => {
    let effects = [{ cheatId: 'MACHI', targetSide: 'player', roundsRemaining: 3 }];
    effects = tickActiveEffects(effects);
    expect(effects[0].roundsRemaining).toBe(2);
    effects = tickActiveEffects(effects);
    expect(effects[0].roundsRemaining).toBe(1);
    effects = tickActiveEffects(effects);
    expect(effects).toHaveLength(0);
  });
});

// ─── Effect interaction notes ─────────────────────────────────────────────────
//
// Clarifications needed (flagged for design review):
//
// 1. TOME + KAKE: If KAKE's extra 2 tiles cause an overshoot that TOME would
//    normally intercept, does TOME fire on the secondary KAKE move? This
//    implementation: TOME fires only on the primary roll's overshoot check
//    (before the first move). The secondary KAKE move does not re-trigger TOME.
//
// 2. MACHI + ASHIKASE: MACHI protects against a rolled 0 face value. If
//    ASHIKASE reduces a non-zero roll to 0 via floor(roll/2), MACHI does NOT
//    trigger — only the raw face value is checked against 0. This is consistent
//    with GDD §6.6 ("rolling a 0").
//
// 3. KASUMASHI + MEZURI stacking: Both apply via getDiceModifiers. Order
//    follows activeEffects array order. Each calls dice.applyModifier on
//    the result of the previous, so the "highest face" target may shift.
//    Example: faces=[5,3,2,1,1,1], KASUMASHI first → [8,3,2,1,1,1],
//    MEZURI next → [6,3,2,1,1,1]. Reversing order: MEZURI → [3,3,2,1,1,1],
//    KASUMASHI → [6,3,2,1,1,1]. Same result here, but order matters in
//    edge cases where KASUMASHI changes which face is the highest.
//
// 4. Cheat-on-cheat landings: After KAKE's secondary move or SHIKOMI's
//    re-resolve, landing on another cheat tile is NOT re-checked. GDD does
//    not define this behaviour. Recommend clarifying before implementing.
//
// 5. MISEGANE tile persistence: When isBouncedBack=true, MISEGANE does NOT
//    fire and the tile is NOT removed from the board (tile stays). This is
//    handled in fightFlow.js by checking shouldFire before removeCheat.
