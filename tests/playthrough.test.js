/**
 * Full playthrough simulation: levels 1–8 (past the first special level).
 *
 * Mirrors the fixed handleDescend / handleBackFromBackRoom / handleBossWin logic
 * from index.html's App component, running against plain in-memory state.
 *
 * GDD §2: "The level counter tracks regular fight levels only.
 *          Back Room and Boss levels do not increment the counter."
 *
 * Expected sequence
 *   Fights 1–7  : regular fights at dungeonLevels 1–7
 *   Special lv 7: Back Room shown (isResuming: false), then Boss fight
 *   Fight 8     : regular fight at dungeonLevel 8
 */

import { describe, it, expect } from 'vitest';

// ─── Pure state machine (mirrors index.html App logic) ────────────────────────

function freshRun() {
  return {
    dungeonLevel:      0,
    lastBackRoomLevel: 0,
    lastBossLevel:     0,   // set after Boss fight
    diceConfig:        [1, 2, 3, 4, 5, 6], // pre-configured
    cheatInventory:    [],
  };
}

/**
 * Simulates one DESCEND button press.
 * Returns { screen, backRoomCtx, run } after the action.
 *
 * screen values:
 *   'dice_config'  — dice not yet configured
 *   'back_room'    — Back Room shown (check backRoomCtx.isResuming)
 *   'fight'        — regular fight starts; run.dungeonLevel is the fight level
 */
function descend(run) {
  const diceBlank = !run.diceConfig || run.diceConfig.every(f => f == null);
  if (diceBlank) {
    return { screen: 'dice_config', backRoomCtx: null, run };
  }

  const lv = run.dungeonLevel || 0;

  // Resume guard: quit mid-special (Back Room done, Boss not yet fought)
  if (lv > 0 && lv === run.lastBackRoomLevel && run.lastBossLevel < lv) {
    return {
      screen: 'back_room',
      backRoomCtx: { isResuming: true, level: lv },
      run,
    };
  }

  // Special level trigger: fires AFTER the 7th (14th, 21st…) regular fight,
  // not instead of it — regular fight 7 exists (GDD §2).
  if (lv > 0 && lv % 7 === 0 && run.lastBossLevel < lv) {
    return {
      screen: 'back_room',
      backRoomCtx: { isResuming: false, level: lv },
      run: { ...run, lastBackRoomLevel: lv },
    };
  }

  // Regular fight
  const nextLevel = lv + 1;
  return {
    screen: 'fight',
    backRoomCtx: null,
    run: { ...run, dungeonLevel: nextLevel },
  };
}

/** Simulates the Back Room "BACK OUT" button → routes to Boss fight (TODO in real code). */
function backFromBackRoom(run) {
  return { screen: 'boss_fight', run };
}

/** Simulates the Boss fight being won → records lastBossLevel, returns to Ofisu. */
function bossWin(run) {
  return {
    screen: 'ofisu',
    run: { ...run, lastBossLevel: run.dungeonLevel },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Playthrough simulation — level 1 to 8', () => {
  it('fights 1–7 are regular fights; dungeonLevel advances 1→2→…→7', () => {
    let run = freshRun();
    for (let fight = 1; fight <= 7; fight++) {
      const result = descend(run);
      expect(result.screen, `fight ${fight} should be a regular fight`).toBe('fight');
      expect(result.run.dungeonLevel, `dungeonLevel after fight ${fight}`).toBe(fight);
      run = result.run;
    }
  });

  it('descend after fight 7 shows Back Room (level 7, isResuming: false)', () => {
    const run = { ...freshRun(), dungeonLevel: 7 };
    const result = descend(run);
    expect(result.screen).toBe('back_room');
    expect(result.backRoomCtx.isResuming).toBe(false);
    expect(result.backRoomCtx.level).toBe(7);
    // dungeonLevel must NOT advance — special levels do not increment the counter (GDD §2)
    expect(result.run.dungeonLevel).toBe(7);
    expect(result.run.lastBackRoomLevel).toBe(7);
  });

  it('after Back Room, Back Out routes to Boss fight', () => {
    const run = { ...freshRun(), dungeonLevel: 7, lastBackRoomLevel: 7 };
    const result = backFromBackRoom(run);
    expect(result.screen).toBe('boss_fight');
  });

  it('winning the Boss fight records lastBossLevel and returns to Ofisu', () => {
    const run = { ...freshRun(), dungeonLevel: 7, lastBackRoomLevel: 7 };
    const result = bossWin(run);
    expect(result.screen).toBe('ofisu');
    expect(result.run.lastBossLevel).toBe(7);
    expect(result.run.dungeonLevel).toBe(7); // counter unchanged — special doesn't count
  });

  it('resume guard fires if player quit between Back Room and Boss fight', () => {
    // State: Back Room visited (lastBackRoomLevel=7), Boss not yet fought (lastBossLevel=0)
    const run = { ...freshRun(), dungeonLevel: 7, lastBackRoomLevel: 7, lastBossLevel: 0 };
    const result = descend(run);
    expect(result.screen).toBe('back_room');
    expect(result.backRoomCtx.isResuming).toBe(true);
  });

  it('resume guard does NOT fire after Boss is defeated', () => {
    // State: Boss defeated (lastBossLevel=7) — player should go straight to fight 8
    const run = { ...freshRun(), dungeonLevel: 7, lastBackRoomLevel: 7, lastBossLevel: 7 };
    const result = descend(run);
    expect(result.screen).toBe('fight');
    expect(result.run.dungeonLevel).toBe(8);
  });

  it('FULL SEQUENCE: fights 1–7, Back Room + Boss on special level, fight 8 starts correctly', () => {
    let run = freshRun();
    const log = [];

    // Fights 1–7: all regular
    for (let i = 0; i < 7; i++) {
      const r = descend(run);
      log.push({ step: `fight ${i + 1}`, screen: r.screen, level: r.run.dungeonLevel });
      expect(r.screen, `fight ${i + 1} must be a regular fight`).toBe('fight');
      run = r.run;
    }
    expect(run.dungeonLevel).toBe(7);

    // Special level: Back Room (isResuming: false)
    const brResult = descend(run);
    log.push({ step: 'Back Room', screen: brResult.screen, isResuming: brResult.backRoomCtx?.isResuming });
    expect(brResult.screen).toBe('back_room');
    expect(brResult.backRoomCtx.isResuming).toBe(false);
    expect(brResult.run.dungeonLevel).toBe(7); // counter stays at 7
    run = brResult.run;

    // Special level: Boss fight
    const afterBR = backFromBackRoom(run);
    expect(afterBR.screen).toBe('boss_fight');
    log.push({ step: 'Boss fight', screen: afterBR.screen });

    // Boss defeated
    const afterBoss = bossWin(afterBR.run);
    expect(afterBoss.screen).toBe('ofisu');
    run = afterBoss.run;
    log.push({ step: 'Boss win', screen: afterBoss.screen, lastBossLevel: run.lastBossLevel });

    // Fight 8: must be a regular fight at level 8
    const fight8 = descend(run);
    log.push({ step: 'fight 8', screen: fight8.screen, level: fight8.run.dungeonLevel });

    expect(fight8.screen, 'fight 8 must start as a regular fight').toBe('fight');
    expect(fight8.run.dungeonLevel, 'fight 8 must be at dungeonLevel 8').toBe(8);
  });
});
