// Battle phase turn resolution (GDD §8 Phase 2).
// Pure functions — all clock side-effects are described in the return value
// as clockDelta (ms); the renderer/caller is responsible for applying them.
//
// Turn order: player → AI = one full round.
// activeEffects are decremented once per full round via endRound().

import { rollDice }                                        from './dice.js';
import {
  getEndIndex, getPosition,
  moveToken, moveTokenTo,
  getCheatAt, removeCheat,
}                                                          from './board.js';
import { getCheatById }                                    from './cheats.js';
import {
  applyCheatEffect,
  getDiceModifiers,
  hasActiveEffect,
  applyPostRollModifiers,
  tickActiveEffects,
}                                                          from './cheatEffects.js';

// ─── State factory ────────────────────────────────────────────────────────────

/**
 * Creates a fresh fight state from the preparation phase output.
 *
 * @param {object} boardState     From board.js createBoardState()
 * @param {number} pot            Initial pot in ms (2 × blindFeeMs)
 * @param {number} aiFightPool    AI fight pool in ms
 * @param {number} minBlindFeeMs  Blind fee for this fight (used by TORITATE and loss checks)
 * @returns {object}
 */
export function createFightState(boardState, pot, aiFightPool, minBlindFeeMs) {
  return {
    boardState,
    activeEffects: [],
    pot,
    aiFightPool,
    minBlindFeeMs,
    flags: {
      player: { skipNextTurn: false, tomeActive: false },
      ai:     { skipNextTurn: false, tomeActive: false },
    },
  };
}

// ─── Round bookkeeping ────────────────────────────────────────────────────────

/**
 * Call once after both sides have taken their turn (end of a full round).
 * Decrements and prunes the activeEffects stack.
 *
 * @param {object} fightState
 * @returns {object}
 */
export function endRound(fightState) {
  return { ...fightState, activeEffects: tickActiveEffects(fightState.activeEffects) };
}

// ─── Turn resolution ──────────────────────────────────────────────────────────

/**
 * Resolves a single turn for the given side.
 *
 * Clock side-effects are NOT applied here. The caller must apply turnResult.clockDelta
 * to the player's clock after this returns.
 *
 * @param {object}           fightState
 * @param {'player'|'ai'}    side
 * @param {number[]}         faces          Base dice faces for this side (saved config).
 * @param {number}           playerTimeMs   Current player clock balance (for activation cost).
 * @param {Function}         [rollFn]       Injectable for testing — defaults to dice.rollDice.
 *
 * @returns {{
 *   fightState:  object,
 *   turnResult: {
 *     side:            string,
 *     skipped:         boolean,    // ASHIDOME skip
 *     roll:            number,     // raw face value rolled
 *     effectiveRoll:   number,     // after ASHIKASE halving
 *     landedOnIndex:   number,     // final position
 *     reachedEnd:      boolean,
 *     cheatActivated:  string|null,
 *     clockDelta:      number,     // ms to add (positive) or deduct (negative) from player clock
 *     fightEnded:      boolean,    // TORITATE win condition
 *   }
 * }}
 */
export function resolveTurn(fightState, side, faces, playerTimeMs, rollFn = rollDice) {
  // 1. ASHIDOME: skip-turn check
  if (fightState.flags[side].skipNextTurn) {
    const newFlags = {
      ...fightState.flags,
      [side]: { ...fightState.flags[side], skipNextTurn: false },
    };
    return {
      fightState: { ...fightState, flags: newFlags },
      turnResult: {
        side, skipped: true, roll: 0, effectiveRoll: 0,
        landedOnIndex: getPosition(fightState.boardState, side),
        reachedEnd: false, cheatActivated: null, clockDelta: 0, fightEnded: false,
      },
    };
  }

  // 2. Build dice modifiers (KASUMASHI / MEZURI) and roll
  const diceMods = getDiceModifiers(fightState.activeEffects, side);
  let roll = rollFn(faces, diceMods);

  // 3. MACHI: reroll once on a 0 face value (not on ASHIKASE-reduced 0)
  if (roll === 0 && hasActiveEffect('MACHI', side, fightState.activeEffects)) {
    roll = rollFn(faces, diceMods);
  }

  // 4. ASHIKASE: halve the rolled value post-roll
  const effectiveRoll = applyPostRollModifiers(roll, side, fightState.activeEffects);

  // 5. Record start position for SHIKOMI reset
  const startPos = getPosition(fightState.boardState, side);
  const endIndex = getEndIndex(fightState.boardState.pathLength);

  // 6. TOME: intercept imminent overshoot — redirect to exact END landing
  let resolvedRoll = effectiveRoll;
  if (fightState.flags[side].tomeActive && effectiveRoll > 0) {
    const raw = startPos + effectiveRoll;
    if (raw > endIndex) {
      resolvedRoll = endIndex - startPos;
      fightState = {
        ...fightState,
        flags: {
          ...fightState.flags,
          [side]: { ...fightState.flags[side], tomeActive: false },
        },
      };
    }
  }

  // 7. Move token
  const { state: movedBs, reachedEnd, isBouncedBack, landedOnIndex } =
    moveToken(fightState.boardState, side, resolvedRoll);
  fightState = { ...fightState, boardState: movedBs };

  let finalReachedEnd  = reachedEnd;
  let finalLandedIndex = landedOnIndex;
  let clockDelta       = 0;
  let cheatActivated   = null;

  // 8. Check for cheat at landing tile
  const cheatSlot = getCheatAt(fightState.boardState, side, landedOnIndex);

  if (cheatSlot) {
    // MISEGANE only fires on forward movement (GDD §6.3)
    const shouldFire = !(cheatSlot.id === 'MISEGANE' && isBouncedBack);

    if (shouldFire) {
      cheatActivated = cheatSlot.id;

      // Remove tile copy (inventory copy is unaffected — GDD §6.1)
      fightState = {
        ...fightState,
        boardState: removeCheat(fightState.boardState, side, landedOnIndex),
      };

      // Activation cost → clock delta
      const meta = getCheatById(cheatSlot.id);
      clockDelta = calcClockDelta(cheatSlot, meta, side, playerTimeMs);

      // Apply the cheat's effect
      const eff = applyCheatEffect(cheatSlot.id, side, fightState, { isBouncedBack });
      fightState = eff.fightState;

      if (eff.fightEnded) {
        return {
          fightState,
          turnResult: {
            side, skipped: false, roll, effectiveRoll,
            landedOnIndex: finalLandedIndex,
            reachedEnd: false, cheatActivated, clockDelta, fightEnded: true,
          },
        };
      }

      // KAKE: move extraTiles from the current landing position
      if (eff.extraTiles > 0) {
        const kake = moveToken(fightState.boardState, side, eff.extraTiles);
        fightState       = { ...fightState, boardState: kake.state };
        finalReachedEnd  = kake.reachedEnd;
        finalLandedIndex = kake.landedOnIndex;
        // No secondary cheat check after KAKE (GDD does not define cheat-chain behaviour)

        // TOME intercepts KAKE overshoot if still armed (issue #4)
        if (kake.isBouncedBack && fightState.flags[side].tomeActive) {
          const endIdx = getEndIndex(fightState.boardState.pathLength);
          fightState = {
            ...fightState,
            boardState: moveTokenTo(fightState.boardState, side, endIdx),
            flags: {
              ...fightState.flags,
              [side]: { ...fightState.flags[side], tomeActive: false },
            },
          };
          finalReachedEnd  = true;
          finalLandedIndex = endIdx;
        }
      }

      // SHIKOMI: roll a second time, keep higher, re-resolve from startPos
      if (eff.reroll) {
        const roll2 = applyPostRollModifiers(rollFn(faces, diceMods), side, fightState.activeEffects);
        const finalRoll = Math.max(effectiveRoll, roll2);
        const resetBs   = moveTokenTo(fightState.boardState, side, startPos);
        const shikomi   = moveToken(resetBs, side, finalRoll);
        fightState       = { ...fightState, boardState: shikomi.state };
        finalReachedEnd  = shikomi.reachedEnd;
        finalLandedIndex = shikomi.landedOnIndex;
        // No secondary cheat check after SHIKOMI (GDD does not define cheat-chain behaviour)
      }
    }
  }

  return {
    fightState,
    turnResult: {
      side, skipped: false, roll, effectiveRoll,
      landedOnIndex: finalLandedIndex,
      reachedEnd: finalReachedEnd,
      cheatActivated, clockDelta, fightEnded: false,
    },
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Calculates the clock delta (ms) for a cheat activation.
 *
 * Clock effects (GDD §6.5, §8):
 *   - Player lands on own GOOD cheat  → deduct activation cost
 *   - AI lands on player-placed BAD cheat → add activation cost to player
 *   - All other cases (AI's own GOOD, player triggering AI's BAD) → 0
 *
 * @param {{ cheatId: string, placedBy: 'player'|'ai' }} slot
 * @param {{ activationCostFraction: number, category: string }} meta
 * @param {'player'|'ai'} landingSide
 * @param {number} playerTimeMs  Current player clock balance
 * @returns {number}  Positive = gain, negative = deduct
 */
function calcClockDelta(slot, meta, landingSide, playerTimeMs) {
  const cost = Math.floor(meta.activationCostFraction * playerTimeMs);
  if (landingSide === 'player' && slot.placedBy === 'player' && meta.category === 'good') {
    return -cost;
  }
  if (landingSide === 'ai' && slot.placedBy === 'player' && meta.category === 'bad') {
    return cost;
  }
  return 0;
}

// ─── Fight start check ────────────────────────────────────────────────────────

/**
 * Returns true if the fight is already decided before the first roll.
 * Happens when minBlindFeeMs rounds to 0 (very low player time), making
 * aiFightPool = 0 * fightPoolX = 0. The renderer must check this after
 * createFightState and advance the player without playing any mini-rounds.
 * Also covers TORITATE placed during prep — no-one moves in prep so TORITATE
 * cannot fire there, but a pre-zeroed pool is caught here (GDD §8).
 *
 * @param {object} fightState
 * @returns {boolean}
 */
export function isFightAlreadyOver(fightState) {
  return fightState.aiFightPool <= 0;
}
