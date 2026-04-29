// Gameboard renderer (GDD §7).
// Pure DOM — no game logic, no state machine, no imports from game modules.
// Caller is responsible for all state transitions.
//
// Tile index scheme (per path):
//   0            = START tile
//   1..pathLength = traversal tiles
//   pathLength+1  = END tile  (shared between both paths — one DOM element)
//
// Usage:
//   mount(el)                              → set container
//   initBoard(pathLength)                  → render both paths
//   setTileState(path, index, state, data) → update one tile
//   clearBoard()                           → reset all to empty/start/end defaults
//   highlightTile(path, index)             → mark a tile as a valid target
//   clearHighlights(path?)                 → remove highlights (one or both paths)
//   unmount()                              → teardown + remove resize listener

// ── Palette ──────────────────────────────────────────────────────────────────

const C = {
  pageBg:          '#09070a',
  tileBg:          '#120e08',
  tileBorder:      '#1c1410',
  startBg:         '#0e0b07',
  startBorder:     '#2a2010',
  startText:       '#2a1c0e',
  endBg:           '#1a1200',
  endBorder:       '#c08820',
  endGlow:         'rgba(192,136,32,0.28)',
  endText:         '#c08820',
  playerBg:        '#08102a',
  playerBorder:    '#4a8aff',
  playerGlow:      'rgba(74,138,255,0.35)',
  playerDot:       '#4a8aff',
  aiBg:            '#200808',
  aiBorder:        '#c42b24',
  aiGlow:          'rgba(196,43,36,0.35)',
  aiDot:           '#c42b24',
  goodBg:          '#080e06',
  goodBorder:      '#4a6c2a',
  goodText:        '#4a6c2a',
  badBg:           '#0e0706',
  badBorder:       '#8a2a1a',
  badText:         '#8a2a1a',
  hlBorder:        '#c08820',
  hlGlow:          'rgba(192,136,32,0.55)',
  hlPulse:         '#c08820',
  labelText:       '#3a2812',
  indexText:       '#1c1208',
  connectorColor:  '#2a1c10',
};

// ── Internal state ────────────────────────────────────────────────────────────

let _container     = null;
let _pathLength    = 0;
let _playerEls     = [];   // DOM tile elements, index 0..pathLength+1
let _aiEls         = [];
let _endEl         = null; // shared END element (also in _playerEls/_aiEls at last index)
let _tileData      = { player: [], ai: [] };
let _orientation   = null;
let _resizeHandler = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function _mk(tag, styles, text) {
  const e = document.createElement(tag);
  if (styles) Object.assign(e.style, styles);
  if (text !== undefined) e.textContent = text;
  return e;
}

function _orientation_now() {
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
}

function _endIndex() {
  return _pathLength + 1;
}

function _blankTile(index) {
  const isEnd = index === _pathLength + 1;
  return { state: isEnd ? 'end' : 'empty', data: null, highlighted: false };
}

// ── Public: setup ─────────────────────────────────────────────────────────────

/** Sets the container element the renderer will render into. */
export function mount(containerEl) {
  _container = containerEl;
}

/**
 * Builds the board DOM. Safe to call multiple times — re-renders in place.
 * pathLength: number of traversal tiles between START and END (from TUNING).
 */
export function initBoard(pathLength) {
  if (!_container) throw new Error('boardRenderer: call mount(el) before initBoard()');
  _pathLength = pathLength;

  const total = pathLength + 2; // START + N traversal + END
  _tileData.player = Array.from({ length: total }, (_, i) => _blankTile(i));
  _tileData.ai     = Array.from({ length: total }, (_, i) => _blankTile(i));

  _rebuild();

  if (_resizeHandler) window.removeEventListener('resize', _resizeHandler);
  _resizeHandler = () => {
    const o = _orientation_now();
    if (o !== _orientation) { _orientation = o; _rebuild(); }
  };
  window.addEventListener('resize', _resizeHandler);
}

// ── Public: state setters ────────────────────────────────────────────────────

/**
 * Updates a single tile's visual state.
 * @param {'player'|'ai'} path
 * @param {number} index           0=START, 1..pathLength, pathLength+1=END
 * @param {'empty'|'cheat'|'player_token'|'ai_token'|'end'} state
 * @param {object|null} [data]     For 'cheat': { name, japName, category:'good'|'bad' }
 */
export function setTileState(path, index, state, data = null) {
  const store = _tileData[path];
  if (!store || index < 0 || index >= store.length) return;
  store[index].state = state;
  store[index].data  = data;
  _paintTile(path, index);
}

/** Resets all tiles to their default empty / start / end visual. */
export function clearBoard() {
  if (!_pathLength) return;
  const total = _pathLength + 2;
  for (let i = 0; i < total; i++) {
    _tileData.player[i] = _blankTile(i);
    _tileData.ai[i]     = _blankTile(i);
    _paintTile('player', i);
    _paintTile('ai', i);
  }
}

/**
 * Adds a highlight indicator to one tile on a path.
 * Clears any existing highlight on that path first.
 */
export function highlightTile(path, index) {
  clearHighlights(path);
  const store = _tileData[path];
  if (!store || index < 0 || index >= store.length) return;
  store[index].highlighted = true;
  _paintTile(path, index);
}

/**
 * Removes highlight from all tiles on one or both paths.
 * @param {'player'|'ai'|undefined} path  Omit to clear both.
 */
export function clearHighlights(path) {
  const paths = path ? [path] : ['player', 'ai'];
  for (const p of paths) {
    _tileData[p].forEach((t, i) => {
      if (t.highlighted) { t.highlighted = false; _paintTile(p, i); }
    });
  }
}

/** Tears down the board and removes the resize listener. */
export function unmount() {
  if (_resizeHandler) {
    window.removeEventListener('resize', _resizeHandler);
    _resizeHandler = null;
  }
  if (_container) _container.innerHTML = '';
  _container = null;
  _playerEls = []; _aiEls = []; _endEl = null;
}

// ── Layout builder ────────────────────────────────────────────────────────────

function _rebuild() {
  if (!_container) return;
  _orientation = _orientation_now();
  _container.innerHTML = '';
  _playerEls = []; _aiEls = []; _endEl = null;

  const isLandscape = _orientation === 'landscape';
  const tileSize    = _calcTileSize(isLandscape);
  const gap         = 3;
  const endW        = Math.round(tileSize * 1.1);
  const endH        = tileSize * 2 + 8; // spans both rows

  // ── Root wrapper ──────────────────────────────────────────────────────────
  const root = _mk('div', {
    fontFamily:    "'Space Mono', monospace",
    userSelect:    'none',
    display:       'flex',
    flexDirection: 'column',
    gap:           '4px',
    width:         '100%',
  });

  // ── Board grid ────────────────────────────────────────────────────────────
  // grid: [48px label] [1fr tiles — scrollable] [auto connector] [endW end]
  const grid = _mk('div', {
    display:             'grid',
    gridTemplateColumns: `40px 1fr 14px ${endW}px`,
    gridTemplateRows:    `${tileSize}px ${tileSize}px`,
    gap:                 '6px 0',
    alignItems:          'center',
    width:               '100%',
  });

  // Player label
  grid.appendChild(_buildLabel('PLAYER', { gridColumn: '1', gridRow: '1' }));

  // Player tiles scroll container
  const playerScroll = _buildScrollRow(tileSize, gap, { gridColumn: '2', gridRow: '1' });
  const total = _pathLength + 2;
  for (let i = 0; i < total - 1; i++) {
    const tile = _buildTileEl('player', i, tileSize);
    _playerEls[i] = tile;
    playerScroll.appendChild(tile);
  }
  grid.appendChild(playerScroll);

  // Player connector (→ to END)
  grid.appendChild(_buildConnector('player', { gridColumn: '3', gridRow: '1' }));

  // AI label
  grid.appendChild(_buildLabel('AI', { gridColumn: '1', gridRow: '2' }));

  // AI tiles scroll container
  const aiScroll = _buildScrollRow(tileSize, gap, { gridColumn: '2', gridRow: '2' });
  for (let i = 0; i < total - 1; i++) {
    const tile = _buildTileEl('ai', i, tileSize);
    _aiEls[i] = tile;
    aiScroll.appendChild(tile);
  }
  grid.appendChild(aiScroll);

  // AI connector (→ to END)
  grid.appendChild(_buildConnector('ai', { gridColumn: '3', gridRow: '2' }));

  // Shared END tile (spans both rows)
  _endEl = _buildEndEl(endW, endH);
  _endEl.style.gridColumn = '4';
  _endEl.style.gridRow    = '1 / 3';
  _playerEls[total - 1] = _endEl;
  _aiEls[total - 1]     = _endEl;
  grid.appendChild(_endEl);

  root.appendChild(grid);
  _container.appendChild(root);

  // Paint all tiles from current logical state
  for (let i = 0; i < total; i++) {
    _paintTile('player', i);
    _paintTile('ai', i);
  }
}

// ── Element builders ──────────────────────────────────────────────────────────

function _calcTileSize(isLandscape) {
  if (!_container) return 36;
  const availW  = (_container.clientWidth || window.innerWidth) - 40 - 14 - 60;
  const count   = _pathLength + 1; // START + traversal (END is in its own column)
  const perTile = Math.floor((availW - count * 3) / count);
  const base    = isLandscape ? 46 : 36;
  return Math.max(26, Math.min(base, perTile));
}

function _buildLabel(text, gridStyles) {
  const el = _mk('div', {
    fontFamily:   "'Space Mono', monospace",
    fontSize:     '7px',
    letterSpacing:'2px',
    color:        C.labelText,
    display:      'flex',
    alignItems:   'center',
    paddingRight: '6px',
    whiteSpace:   'nowrap',
    ...gridStyles,
  }, text);
  return el;
}

function _buildScrollRow(tileSize, gap, gridStyles) {
  return _mk('div', {
    display:    'flex',
    gap:        gap + 'px',
    overflowX:  'auto',
    overflowY:  'hidden',
    height:     tileSize + 'px',
    alignItems: 'center',
    // hide scrollbar while keeping scrollability
    scrollbarWidth: 'thin',
    ...gridStyles,
  });
}

function _buildConnector(path, gridStyles) {
  const el = _mk('div', {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    height:         '100%',
    ...gridStyles,
  });
  const line = _mk('div', {
    width:      '100%',
    height:     '1px',
    background: C.connectorColor,
  });
  el.appendChild(line);
  return el;
}

function _buildEndEl(w, h) {
  return _mk('div', {
    width:          w + 'px',
    height:         h + 'px',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '4px',
    background:     C.endBg,
    border:         `2px solid ${C.endBorder}`,
    boxShadow:      `0 0 14px ${C.endGlow}, inset 0 0 10px ${C.endGlow}`,
    flexShrink:     '0',
    position:       'relative',
  });
}

function _buildTileEl(path, index, size) {
  const el = _mk('div', {
    width:          size + 'px',
    height:         size + 'px',
    flexShrink:     '0',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
    overflow:       'hidden',
  });
  el.dataset.path  = path;
  el.dataset.index = String(index);
  return el;
}

// ── Tile painter ──────────────────────────────────────────────────────────────

function _paintTile(path, index) {
  const endIdx = _endIndex();
  if (index === endIdx) { _paintEndTile(); return; }

  const els  = path === 'player' ? _playerEls : _aiEls;
  const el   = els[index];
  if (!el) return;

  const { state, data, highlighted } = _tileData[path][index];
  const isStart = index === 0;

  el.innerHTML = '';

  // ── Base container style ──────────────────────────────────────────────────
  let bg     = isStart ? C.startBg : C.tileBg;
  let border = isStart ? C.startBorder : C.tileBorder;
  let shadow = 'none';

  if (highlighted) {
    border = C.hlBorder;
    shadow = `0 0 10px ${C.hlGlow}`;
  }

  if (state === 'player_token') {
    bg     = C.playerBg;
    border = C.playerBorder;
    shadow = `0 0 10px ${C.playerGlow}`;
  } else if (state === 'ai_token') {
    bg     = C.aiBg;
    border = C.aiBorder;
    shadow = `0 0 10px ${C.aiGlow}`;
  } else if (state === 'cheat' && data) {
    const good = data.category === 'good';
    bg     = good ? C.goodBg  : C.badBg;
    border = good ? C.goodBorder : C.badBorder;
    shadow = highlighted ? `0 0 10px ${C.hlGlow}` : 'none';
  }

  Object.assign(el.style, {
    background: bg,
    border:     `1px solid ${border}`,
    boxShadow:  shadow,
    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
  });

  // ── Tile index / START label (top-left micro text) ────────────────────────
  el.appendChild(_mk('span', {
    position:     'absolute',
    top:          '2px',
    left:         '3px',
    fontFamily:   "'Space Mono', monospace",
    fontSize:     '6px',
    color:        isStart ? C.startText : C.indexText,
    lineHeight:   '1',
    pointerEvents:'none',
  }, isStart ? 'S' : String(index)));

  // ── State content ─────────────────────────────────────────────────────────
  if (state === 'player_token') {
    el.appendChild(_buildToken(C.playerDot, C.playerGlow));

  } else if (state === 'ai_token') {
    el.appendChild(_buildToken(C.aiDot, C.aiGlow));

  } else if (state === 'cheat' && data) {
    _paintCheatContent(el, data);

  } else if (isStart) {
    el.appendChild(_mk('span', {
      fontFamily:    "'Bebas Neue', sans-serif",
      fontSize:      '11px',
      color:         C.startText,
      letterSpacing: '1px',
      marginTop:     '10px',
    }, 'START'));

  } else if (highlighted) {
    // Highlight target: show a small amber square
    el.appendChild(_mk('div', {
      width:      '10px',
      height:     '10px',
      background: C.hlBorder,
      opacity:    '0.6',
    }));
  }
}

function _buildToken(color, glow) {
  return _mk('div', {
    width:        '16px',
    height:       '16px',
    borderRadius: '50%',
    background:   color,
    boxShadow:    `0 0 8px ${glow}`,
    marginTop:    '8px',
  });
}

function _paintCheatContent(el, data) {
  const good  = data.category === 'good';
  const color = good ? C.goodText : C.badText;

  // Category pip (top-right)
  el.appendChild(_mk('div', {
    position:   'absolute',
    top:        '3px',
    right:      '3px',
    width:      '5px',
    height:     '5px',
    background: color,
  }));

  // Cheat name (Japanese, small, centred)
  el.appendChild(_mk('span', {
    fontFamily:    "'Space Mono', monospace",
    fontSize:      '6px',
    color:         color,
    textAlign:     'center',
    lineHeight:    '1.4',
    padding:       '0 3px',
    marginTop:     '10px',
    wordBreak:     'break-all',
    pointerEvents: 'none',
  }, data.japName || data.name || '?'));
}

function _paintEndTile() {
  if (!_endEl) return;
  const ei = _endIndex();
  const pState = _tileData.player[ei]?.state;
  const aState = _tileData.ai[ei]?.state;

  _endEl.innerHTML = '';

  // Always show END label
  _endEl.appendChild(_mk('span', {
    fontFamily:    "'Bebas Neue', sans-serif",
    fontSize:      '13px',
    color:         C.endText,
    letterSpacing: '3px',
    lineHeight:    '1',
  }, 'END'));

  // Emma-Ō court seal mark
  _endEl.appendChild(_mk('span', {
    fontFamily: "'Space Mono', monospace",
    fontSize:   '7px',
    color:      '#4a3010',
    marginTop:  '2px',
  }, '判'));

  // Token overlays
  const hasPToken = pState === 'player_token';
  const hasAToken = aState === 'ai_token';
  if (hasPToken || hasAToken) {
    const row = _mk('div', {
      display:    'flex',
      gap:        '4px',
      marginTop:  '4px',
      alignItems: 'center',
    });
    if (hasPToken) row.appendChild(_mk('div', {
      width: '8px', height: '8px',
      borderRadius: '50%', background: C.playerDot,
      boxShadow: `0 0 5px ${C.playerGlow}`,
    }));
    if (hasAToken) row.appendChild(_mk('div', {
      width: '8px', height: '8px',
      borderRadius: '50%', background: C.aiDot,
      boxShadow: `0 0 5px ${C.aiGlow}`,
    }));
    _endEl.appendChild(row);
  }
}

// ── Animation ─────────────────────────────────────────────────────────────────

/**
 * Moves a token tile by tile from fromPosition to toPosition, stepping at
 * 90ms per tile. Calls onComplete when the token arrives.
 *
 * For overshoot (token must pass through END then bounce back) chain two calls:
 *   animateMove(path, from, endIndex, () =>
 *     animateMove(path, endIndex, finalPos, onComplete))
 *
 * Intermediate tiles are reset to their default state (empty / end) as the
 * token passes through. Cheat data on traversed tiles is not preserved during
 * animation — fightFlow is responsible for restoration after the move resolves.
 *
 * @param {'player'|'ai'} path
 * @param {number} fromPosition
 * @param {number} toPosition
 * @param {Function} [onComplete]
 */
export function animateMove(path, fromPosition, toPosition, onComplete) {
  if (fromPosition === toPosition) { onComplete?.(); return; }

  const endIdx  = _endIndex();
  const tokenSt = path === 'player' ? 'player_token' : 'ai_token';
  const step    = toPosition > fromPosition ? 1 : -1;
  let current   = fromPosition;

  function tick() {
    setTileState(path, current, current === endIdx ? 'end' : 'empty', null);
    current += step;
    setTileState(path, current, tokenSt, null);
    if (current === toPosition) {
      onComplete?.();
    } else {
      setTimeout(tick, 90);
    }
  }

  setTimeout(tick, 90);
}

// ── Exported helper ───────────────────────────────────────────────────────────

/** Returns the tile index for the END tile given a pathLength. */
export function getEndIndex(pathLength) {
  return pathLength + 1;
}
