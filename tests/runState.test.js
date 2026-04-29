import { describe, it, expect, beforeEach } from 'vitest';
import { TUNING } from '../src/config/tuning.js';
import {
  getRunState,
  saveRunState,
  resetRun,
  STORAGE_KEY_RUN,
  STORAGE_KEY_CLOCK,
} from '../src/modules/runState.js';

// ─── localStorage mock (Node environment has no localStorage) ─────────────────
const store = {};
const localStorageMock = {
  getItem:    (k) => (k in store ? store[k] : null),
  setItem:    (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear:      () => { Object.keys(store).forEach(k => delete store[k]); },
};
globalThis.localStorage = localStorageMock;

beforeEach(() => localStorageMock.clear());

// ─── Fresh state shape ────────────────────────────────────────────────────────

describe('getRunState — no saved state', () => {
  it('returns timeMs equal to 24 hours', () => {
    expect(getRunState().timeMs).toBe(TUNING.run.startingTimeMs);
  });

  it('returns dungeonLevel 0', () => {
    expect(getRunState().dungeonLevel).toBe(0);
  });

  it('returns lastBackRoomLevel 0', () => {
    expect(getRunState().lastBackRoomLevel).toBe(0);
  });

  it('returns empty cheatInventory', () => {
    expect(getRunState().cheatInventory).toEqual([]);
  });

  it('returns blank diceConfig (6 nulls)', () => {
    expect(getRunState().diceConfig).toEqual([null, null, null, null, null, null]);
  });
});

// ─── saveRunState / getRunState roundtrip ────────────────────────────────────

describe('saveRunState + getRunState', () => {
  it('persists and retrieves a modified state', () => {
    const state = getRunState();
    state.dungeonLevel    = 12;
    state.cheatInventory  = ['ashidome', 'kake'];
    state.diceConfig      = [3, 4, 4, 4, 3, 3];
    state.timeMs          = 50_000_000;
    state.lastBackRoomLevel = 7;
    saveRunState(state);

    const loaded = getRunState();
    expect(loaded.dungeonLevel).toBe(12);
    expect(loaded.cheatInventory).toEqual(['ashidome', 'kake']);
    expect(loaded.diceConfig).toEqual([3, 4, 4, 4, 3, 3]);
    expect(loaded.timeMs).toBe(50_000_000);
    expect(loaded.lastBackRoomLevel).toBe(7);
  });

  it('stores under STORAGE_KEY_RUN', () => {
    saveRunState(getRunState());
    expect(localStorage.getItem(STORAGE_KEY_RUN)).not.toBeNull();
  });
});

// ─── resetRun ─────────────────────────────────────────────────────────────────

describe('resetRun', () => {
  it('wipes run state back to fresh defaults', () => {
    const state = getRunState();
    state.dungeonLevel   = 25;
    state.cheatInventory = ['keppan'];
    state.diceConfig     = [5, 5, 4, 4, 2, 1];
    state.timeMs         = 1_000;
    saveRunState(state);

    resetRun();

    const fresh = getRunState();
    expect(fresh.timeMs).toBe(TUNING.run.startingTimeMs);
    expect(fresh.dungeonLevel).toBe(0);
    expect(fresh.lastBackRoomLevel).toBe(0);
    expect(fresh.cheatInventory).toEqual([]);
    expect(fresh.diceConfig).toEqual([null, null, null, null, null, null]);
  });

  it('clears the clock storage key', () => {
    // Simulate a clock entry existing before reset
    localStorage.setItem(STORAGE_KEY_CLOCK, JSON.stringify({ savedMs: 3600000, epochMs: Date.now() }));
    expect(localStorage.getItem(STORAGE_KEY_CLOCK)).not.toBeNull();

    resetRun();

    expect(localStorage.getItem(STORAGE_KEY_CLOCK)).toBeNull();
  });
});

// ─── Corrupt storage resilience ───────────────────────────────────────────────

describe('getRunState — corrupt storage', () => {
  it('returns fresh defaults if localStorage contains invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY_RUN, 'not json {{');
    const state = getRunState();
    expect(state.dungeonLevel).toBe(0);
    expect(state.cheatInventory).toEqual([]);
  });
});
