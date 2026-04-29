// Board state: positions and cheat placement for both paths.
// Pure logic — no DOM, no economy, no dice modifiers.
// Movement resolution: overshoot bounce-back per GDD §7.
// Cheat placement: single-tile, single-board-instance-per-owner rules (GDD §6.3).
//
// Index scheme: 0=START, 1..pathLength=traversal tiles, pathLength+1=END
// Path keys: 'player' | 'ai'

// ── State factory ─────────────────────────────────────────────────────────────

/**
 * @param {number} pathLength
 * @returns {{ pathLength, positions: {player, ai}, cheats: {player, ai} }}
 */
export function createBoardState(pathLength) {
  return {
    pathLength,
    positions: { player: 0, ai: 0 },
    cheats: { player: {}, ai: {} },
  };
}

export function getEndIndex(pathLength) {
  return pathLength + 1;
}

export function getPosition(state, path) {
  return state.positions[path];
}

// ── Movement ──────────────────────────────────────────────────────────────────

/**
 * Computes where a token lands after a roll.
 * Overshoot: excess past END reverses from END (floors at 0 — cannot pass START).
 *
 * @param {number} currentPos
 * @param {number} endIndex   pathLength + 1
 * @param {number} roll       Face value rolled; ≤ 0 means no movement
 * @returns {{ newPosition: number, reachedEnd: boolean, isBouncedBack: boolean }}
 *   isBouncedBack — true when the final position was reached via overshoot reversal.
 *   fightFlow uses this to determine whether MISEGANE triggers (GDD §6.3).
 */
export function calculateMove(currentPos, endIndex, roll) {
  if (roll <= 0) {
    return { newPosition: currentPos, reachedEnd: false, isBouncedBack: false };
  }

  const raw = currentPos + roll;

  if (raw === endIndex) {
    return { newPosition: endIndex, reachedEnd: true, isBouncedBack: false };
  }

  if (raw > endIndex) {
    const overshoot = raw - endIndex;
    const bounced   = Math.max(0, endIndex - overshoot);
    return { newPosition: bounced, reachedEnd: false, isBouncedBack: true };
  }

  return { newPosition: raw, reachedEnd: false, isBouncedBack: false };
}

/**
 * Applies a dice roll to a token and returns updated state plus move metadata.
 *
 * @param {object} state
 * @param {'player'|'ai'} path
 * @param {number} roll
 * @returns {{ state, reachedEnd: boolean, isBouncedBack: boolean, landedOnIndex: number }}
 */
export function moveToken(state, path, roll) {
  const endIndex = getEndIndex(state.pathLength);
  const current  = state.positions[path];
  const { newPosition, reachedEnd, isBouncedBack } = calculateMove(current, endIndex, roll);

  const newState = {
    ...state,
    positions: { ...state.positions, [path]: newPosition },
  };

  return { state: newState, reachedEnd, isBouncedBack, landedOnIndex: newPosition };
}

/**
 * Moves a token directly to a given index (used by cheat effects such as
 * KECHIRASHI −3 or MISEGANE −5). Clamps to [0, endIndex].
 * The caller is responsible for tracking whether this landing is from a
 * bounce-back (for MISEGANE non-trigger logic).
 *
 * @param {object} state
 * @param {'player'|'ai'} path
 * @param {number} index
 * @returns {object} new state
 */
export function moveTokenTo(state, path, index) {
  const endIndex = getEndIndex(state.pathLength);
  const clamped  = Math.max(0, Math.min(endIndex, index));
  return {
    ...state,
    positions: { ...state.positions, [path]: clamped },
  };
}

/**
 * Resets both tokens to START (0). Cheat placements are preserved.
 * Called at the end of each mini-round before the next one begins (GDD §8).
 */
export function resetPositions(state) {
  return {
    ...state,
    positions: { player: 0, ai: 0 },
  };
}

// ── Cheat placement ───────────────────────────────────────────────────────────

function isValidCheatIndex(state, tileIndex) {
  return Number.isInteger(tileIndex) && tileIndex >= 1 && tileIndex <= state.pathLength;
}

/**
 * Returns true if a given owner already has a cheat with this id on either path.
 * GDD §6.3: the same cheat may not appear on the board twice simultaneously.
 *
 * @param {object} state
 * @param {'player'|'ai'} placedBy
 * @param {string} cheatId
 * @returns {boolean}
 */
export function isCheatOnBoard(state, placedBy, cheatId) {
  for (const path of ['player', 'ai']) {
    for (const cheat of Object.values(state.cheats[path])) {
      if (cheat && cheat.id === cheatId && cheat.placedBy === placedBy) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Places a cheat on the board.
 * Validates: tile in 1..pathLength, tile not already occupied,
 * same-owner same-cheat not already on board.
 *
 * Cheat object shape (stored verbatim, accessed by fightFlow on activation):
 *   { id, name, japName, category, costTier, placedBy }
 *
 * @param {object} state
 * @param {'player'|'ai'} path   Which path row the tile is on (not who placed it)
 * @param {number} tileIndex
 * @param {{ id: string, placedBy: 'player'|'ai', [key: string]: any }} cheat
 * @returns {{ state: object, error: string | null }}
 */
export function placeCheat(state, path, tileIndex, cheat) {
  if (!isValidCheatIndex(state, tileIndex)) {
    return {
      state,
      error: `Tile ${tileIndex} is not a valid placement zone (1–${state.pathLength}).`,
    };
  }
  if (state.cheats[path][tileIndex]) {
    return { state, error: `Tile ${tileIndex} on the ${path} path is already occupied.` };
  }
  if (isCheatOnBoard(state, cheat.placedBy, cheat.id)) {
    return { state, error: `${cheat.id} is already on the board.` };
  }
  const newState = {
    ...state,
    cheats: {
      ...state.cheats,
      [path]: { ...state.cheats[path], [tileIndex]: cheat },
    },
  };
  return { state: newState, error: null };
}

/**
 * Removes a cheat from a tile (called when a cheat activates — tile copy destroyed,
 * inventory copy is unaffected). Noop if the tile is already empty.
 */
export function removeCheat(state, path, tileIndex) {
  if (!state.cheats[path][tileIndex]) return state;
  const pathCheats = { ...state.cheats[path] };
  delete pathCheats[tileIndex];
  return {
    ...state,
    cheats: { ...state.cheats, [path]: pathCheats },
  };
}

/** Returns the cheat at the given tile, or null if empty. */
export function getCheatAt(state, path, tileIndex) {
  return state.cheats[path][tileIndex] ?? null;
}
