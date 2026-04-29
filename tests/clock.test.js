import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initClock,
  getRemainingMs,
  getCurrentTimeMs,
  addTimeMs,
  deductTimeMs,
  startClock,
} from '../src/modules/clock.js';
import { STORAGE_KEY_CLOCK } from '../src/modules/runState.js';

// ─── localStorage mock ────────────────────────────────────────────────────────
const store = {};
const localStorageMock = {
  getItem:    (k) => (k in store ? store[k] : null),
  setItem:    (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear:      () => { Object.keys(store).forEach(k => delete store[k]); },
};
globalThis.localStorage = localStorageMock;

// ─── Setup / teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  localStorageMock.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── getRemainingMs ───────────────────────────────────────────────────────────

describe('getRemainingMs', () => {
  it('returns 0 when no clock data exists', () => {
    expect(getRemainingMs()).toBe(0);
  });

  it('returns the full init value immediately after initClock', () => {
    initClock(3_600_000);
    expect(getRemainingMs()).toBe(3_600_000);
  });

  it('accounts for elapsed real time', () => {
    initClock(10_000);
    vi.advanceTimersByTime(4_000); // 4 seconds pass
    expect(getRemainingMs()).toBe(6_000);
  });

  it('floors at 0 — never returns negative', () => {
    initClock(1_000);
    vi.advanceTimersByTime(5_000); // more than remaining
    expect(getRemainingMs()).toBe(0);
  });
});

describe('getCurrentTimeMs', () => {
  it('is an alias for getRemainingMs', () => {
    initClock(5_000);
    expect(getCurrentTimeMs()).toBe(getRemainingMs());
  });
});

// ─── addTimeMs ────────────────────────────────────────────────────────────────

describe('addTimeMs', () => {
  it('increases remaining by the given amount', () => {
    initClock(10_000);
    addTimeMs(5_000);
    expect(getRemainingMs()).toBe(15_000);
  });

  it('re-anchors so subsequent elapsed time is computed correctly', () => {
    initClock(10_000);
    vi.advanceTimersByTime(3_000); // 7 000 remain
    addTimeMs(2_000);              // should be 9 000 now, re-anchored
    vi.advanceTimersByTime(1_000); // 8 000 remain
    expect(getRemainingMs()).toBe(8_000);
  });
});

// ─── deductTimeMs ────────────────────────────────────────────────────────────

describe('deductTimeMs', () => {
  it('decreases remaining by the given amount', () => {
    initClock(10_000);
    deductTimeMs(3_000);
    expect(getRemainingMs()).toBe(7_000);
  });

  it('returns the new remaining value', () => {
    initClock(10_000);
    const result = deductTimeMs(4_000);
    expect(result).toBe(6_000);
  });

  it('floors at 0', () => {
    initClock(1_000);
    const result = deductTimeMs(5_000);
    expect(result).toBe(0);
    expect(getRemainingMs()).toBe(0);
  });

  it('fires onZeroCallback immediately when flooring to 0', () => {
    initClock(1_000);
    const cb = vi.fn();
    startClock(cb);     // registers the callback

    deductTimeMs(5_000); // floors to 0 — should fire cb synchronously

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('does not fire onZeroCallback when remaining stays above 0', () => {
    initClock(10_000);
    const cb = vi.fn();
    startClock(cb);

    deductTimeMs(3_000);

    expect(cb).not.toHaveBeenCalled();
  });
});

// ─── startClock ───────────────────────────────────────────────────────────────

describe('startClock — dead-on-arrival', () => {
  it('fires callback synchronously if remaining is already 0', () => {
    initClock(0);
    const cb = vi.fn();
    startClock(cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fires callback synchronously if no clock data exists', () => {
    // No initClock call — getRemainingMs() returns 0
    const cb = vi.fn();
    startClock(cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe('startClock — interval polling', () => {
  it('does not fire callback before time runs out', () => {
    initClock(10_000);
    const cb = vi.fn();
    startClock(cb);
    vi.advanceTimersByTime(5_000); // half gone
    expect(cb).not.toHaveBeenCalled();
  });

  it('fires callback when interval detects zero', () => {
    initClock(1_000);
    const cb = vi.fn();
    startClock(cb);
    vi.advanceTimersByTime(1_500); // time has elapsed past zero
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fires callback exactly once, not on every subsequent tick', () => {
    initClock(1_000);
    const cb = vi.fn();
    startClock(cb);
    vi.advanceTimersByTime(5_000); // well past zero, multiple ticks
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe('startClock — stop function', () => {
  it('returned stop function cancels the interval', () => {
    initClock(1_000);
    const cb = vi.fn();
    const stop = startClock(cb);
    stop();
    vi.advanceTimersByTime(5_000);
    expect(cb).not.toHaveBeenCalled();
  });
});

// ─── Storage key ─────────────────────────────────────────────────────────────

describe('storage', () => {
  it('writes under STORAGE_KEY_CLOCK', () => {
    initClock(3_600_000);
    expect(localStorage.getItem(STORAGE_KEY_CLOCK)).not.toBeNull();
  });

  it('returns 0 gracefully when storage contains invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY_CLOCK, 'bad json {{');
    expect(getRemainingMs()).toBe(0);
  });
});
