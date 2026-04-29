// Preparation phase UI (GDD §8 Phase 1).
// Sequential step-by-step flow — each step completes before the next appears.
// Emits CustomEvent('fightReady', { detail }) on the container when all steps finish.
//
// Side effects performed here (not in prepPhase.js):
//   - deductTimeMs       (Step 4 — blind fee)
//   - saveRunState       (Step 2 — player locks in dice config)
//   - boardRenderer lifecycle (mount / unmount during Step 5)

import { getRemainingMs, deductTimeMs }    from '../modules/clock.js';
import { rollDice, validateConfig }         from '../modules/dice.js';
import { createBoardState, placeCheat }     from '../modules/board.js';
import { getAllCheats }                      from '../modules/cheats.js';
import { getRunState, saveRunState }        from '../modules/runState.js';
import * as boardRenderer                   from './boardRenderer.js';
import {
  rollCheatCap,
  generateAiDiceConfig,
  calcBlindFeeMs,
  calcAiFightPool,
  resolveInitiativeWinner,
  generateAiPlacement,
  generateAiCheatPool,
} from '../modules/prepPhase.js';

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  bg:        '#09070a',
  panel:     '#120e08',
  border:    '#1c1410',
  text:      '#a08060',
  textDim:   '#3a2812',
  accent:    '#c08820',
  player:    '#4a8aff',
  ai:        '#c42b24',
  good:      '#4a6c2a',
  bad:       '#8a2a1a',
  btnBg:     '#1c1410',
  btnBorder: '#3a2812',
  btnText:   '#a08060',
  btnHover:  '#2a1c10',
  error:     '#8a2a1a',
};

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function mk(tag, styles, text) {
  const el = document.createElement(tag);
  if (styles) Object.assign(el.style, styles);
  if (text !== undefined) el.textContent = text;
  return el;
}

function mkBtn(label, onClick) {
  const el = mk('button', {
    fontFamily:    "'Space Mono', monospace",
    background:    C.btnBg,
    border:        `1px solid ${C.btnBorder}`,
    color:         C.btnText,
    padding:       '10px 28px',
    fontSize:      '11px',
    letterSpacing: '2px',
    cursor:        'pointer',
    textTransform: 'uppercase',
    transition:    'border-color 0.1s, background 0.1s',
  }, label);
  el.addEventListener('mouseenter', () => {
    el.style.background   = C.btnHover;
    el.style.borderColor  = C.accent;
  });
  el.addEventListener('mouseleave', () => {
    el.style.background   = C.btnBg;
    el.style.borderColor  = C.btnBorder;
  });
  el.addEventListener('click', onClick);
  return el;
}

function mkHeader(text) {
  return mk('div', {
    fontFamily:    "'Space Mono', monospace",
    fontSize:      '9px',
    letterSpacing: '4px',
    color:         C.textDim,
    textTransform: 'uppercase',
    marginBottom:  '8px',
  }, text);
}

function mkTitle(text) {
  return mk('div', {
    fontFamily:    "'Bebas Neue', sans-serif",
    fontSize:      '28px',
    letterSpacing: '2px',
    color:         C.accent,
    marginBottom:  '12px',
    lineHeight:    '1',
  }, text);
}

function mkFlavor(text) {
  return mk('div', {
    fontFamily:  "'Space Mono', monospace",
    fontSize:    '10px',
    color:       C.textDim,
    fontStyle:   'italic',
    marginTop:   '8px',
  }, text);
}

function formatMs(ms) {
  const totalS = Math.floor(ms / 1000);
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function wrapStep(container) {
  container.innerHTML = '';
  const panel = mk('div', {
    fontFamily:    "'Space Mono', monospace",
    background:    C.bg,
    color:         C.text,
    width:         '100%',
    minHeight:     '100%',
    padding:       '32px 24px',
    boxSizing:     'border-box',
    display:       'flex',
    flexDirection: 'column',
    gap:           '10px',
  });
  container.appendChild(panel);
  return panel;
}

// ─── Step 1: Cheat cap reveal ─────────────────────────────────────────────────

function showCheatCapStep(container, cap) {
  return new Promise(resolve => {
    const panel = wrapStep(container);
    panel.appendChild(mkHeader('Before the hand'));
    panel.appendChild(mkTitle(`${cap} hires allowed`));
    panel.appendChild(mkFlavor(pick([
      '"Same as always."',
      '"Maybe different this time."',
      '"I know what I\'m doing."',
    ])));
    panel.appendChild(mk('div', { flex: '1' }));
    panel.appendChild(mkBtn('Continue', () => resolve()));
  });
}

// ─── Step 2: Dice configuration ───────────────────────────────────────────────

function showDiceReveal(container, { playerConfig, aiConfig }, onDone) {
  const panel = wrapStep(container);
  panel.appendChild(mkHeader('Their hand'));

  const grid = mk('div', {
    display:             'grid',
    gridTemplateColumns: '1fr 1fr',
    gap:                 '24px',
    margin:              '12px 0',
  });

  function diceCol(label, config, color) {
    const col = mk('div', { display: 'flex', flexDirection: 'column', gap: '6px' });
    col.appendChild(mk('div', {
      fontSize: '9px', letterSpacing: '2px', color, textTransform: 'uppercase',
    }, label));
    col.appendChild(mk('div', {
      fontSize: '18px', letterSpacing: '6px', color,
    }, config.join('  ')));
    col.appendChild(mk('div', {
      fontSize: '9px', color: C.textDim,
    }, `Sum: ${config.reduce((a, b) => a + b, 0)}`));
    return col;
  }

  grid.appendChild(diceCol('You', playerConfig, C.player));
  grid.appendChild(diceCol('AI',  aiConfig,     C.ai));
  panel.appendChild(grid);
  panel.appendChild(mk('div', { flex: '1' }));
  panel.appendChild(mkBtn('Continue', onDone));
}

function showDiceConfigStep(container, { runState, tier }) {
  return new Promise(resolve => {
    const panel = wrapStep(container);
    panel.appendChild(mkHeader('Set your faces'));
    panel.appendChild(mkFlavor(pick([
      '"Same as always."',
      '"Maybe different this time."',
      '"I know what I\'m doing."',
    ])));

    const faces = (runState.diceConfig || []).map(v => (v == null ? 0 : v));

    const facesWrap = mk('div', {
      display:       'flex',
      flexDirection: 'column',
      gap:           '6px',
      margin:        '12px 0',
    });

    faces.forEach((_, i) => {
      const row = mk('div', { display: 'flex', alignItems: 'center', gap: '8px' });

      row.appendChild(mk('span', {
        color: C.textDim, fontSize: '9px', width: '52px', letterSpacing: '1px',
      }, `Face ${i + 1}`));

      const decBtn = mk('button', {
        background: C.btnBg, border: `1px solid ${C.btnBorder}`,
        color: C.text, width: '28px', height: '28px', cursor: 'pointer',
        fontSize: '14px', lineHeight: '1',
      }, '−');

      const valEl = mk('span', {
        color: C.accent, fontSize: '14px', width: '24px', textAlign: 'center',
        display: 'inline-block',
      }, String(faces[i]));

      const incBtn = mk('button', {
        background: C.btnBg, border: `1px solid ${C.btnBorder}`,
        color: C.text, width: '28px', height: '28px', cursor: 'pointer',
        fontSize: '14px', lineHeight: '1',
      }, '+');

      decBtn.addEventListener('click', () => {
        if (faces[i] > 0) { faces[i]--; valEl.textContent = String(faces[i]); updateSummary(); }
      });
      incBtn.addEventListener('click', () => {
        faces[i]++; valEl.textContent = String(faces[i]); updateSummary();
      });

      row.appendChild(decBtn);
      row.appendChild(valEl);
      row.appendChild(incBtn);
      facesWrap.appendChild(row);
    });
    panel.appendChild(facesWrap);

    const summaryEl = mk('div', { color: C.text, fontSize: '10px', letterSpacing: '1px' });
    const errEl     = mk('div', { color: C.error, fontSize: '10px', minHeight: '14px' });
    panel.appendChild(summaryEl);
    panel.appendChild(errEl);

    function updateSummary() {
      const sum   = faces.reduce((a, b) => a + b, 0);
      const zeros = faces.filter(f => f === 0).length;
      summaryEl.textContent = `Sum: ${sum} / 21   Zeros: ${zeros} / 3`;
      errEl.textContent = '';
    }
    updateSummary();

    panel.appendChild(mk('div', { flex: '1' }));
    panel.appendChild(mkBtn('Lock in', () => {
      const { valid, error } = validateConfig(faces);
      if (!valid) { errEl.textContent = error; return; }

      const playerConfig = [...faces];
      const state = getRunState();
      saveRunState({ ...state, diceConfig: playerConfig });

      const aiConfig = generateAiDiceConfig(tier.aiDiceCap);
      showDiceReveal(container, { playerConfig, aiConfig }, () => resolve({ playerConfig, aiConfig }));
    }));
  });
}

// ─── Step 3: Cheat selection ──────────────────────────────────────────────────

function showCheatSelectionStep(container, { inventory, cap }) {
  return new Promise(resolve => {
    const panel = wrapStep(container);
    panel.appendChild(mkHeader('Pick your crew'));

    const roster = getAllCheats();
    const inventoryCheats = inventory.map(id => roster.find(c => c.id === id)).filter(Boolean);

    if (cap === 0 || !inventoryCheats.length) {
      const msg = cap === 0 ? '0 hires allowed this fight.' : 'No crew on retainer.';
      panel.appendChild(mk('div', { color: C.textDim, fontSize: '11px' }, msg));
      panel.appendChild(mk('div', { flex: '1' }));
      panel.appendChild(mkBtn('Done', () => resolve([])));
      return;
    }

    const countEl = mk('div', {
      color: C.text, fontSize: '10px', letterSpacing: '1px',
    }, `Selected: 0 / ${cap}`);
    panel.appendChild(countEl);

    const selected = new Set();
    const cardsWrap = mk('div', {
      display:       'flex',
      flexDirection: 'column',
      gap:           '5px',
      margin:        '10px 0',
    });

    inventoryCheats.forEach(cheat => {
      const isGood = cheat.category === 'good';
      const card = mk('div', {
        display:    'flex',
        alignItems: 'center',
        gap:        '10px',
        padding:    '8px 12px',
        border:     `1px solid ${C.border}`,
        cursor:     'pointer',
        background: C.panel,
        transition: 'border-color 0.1s, background 0.1s',
      });

      card.appendChild(mk('div', {
        width: '7px', height: '7px', flexShrink: '0',
        background: isGood ? C.good : C.bad,
      }));
      card.appendChild(mk('span', {
        color: C.text, fontSize: '11px', flexGrow: '1',
      }, `${cheat.name}  ${cheat.japName}`));
      card.appendChild(mk('span', {
        color: C.textDim, fontSize: '9px', textTransform: 'uppercase',
      }, cheat.costTier));

      card.addEventListener('click', () => {
        if (selected.has(cheat.id)) {
          selected.delete(cheat.id);
          card.style.borderColor = C.border;
          card.style.background  = C.panel;
        } else {
          if (selected.size >= cap) return;
          selected.add(cheat.id);
          card.style.borderColor = C.accent;
          card.style.background  = '#1a1200';
        }
        countEl.textContent = `Selected: ${selected.size} / ${cap}`;
      });

      cardsWrap.appendChild(card);
    });
    panel.appendChild(cardsWrap);
    panel.appendChild(mk('div', { flex: '1' }));
    panel.appendChild(mkBtn('Done', () => resolve([...selected])));
  });
}

// ─── Step 4: Blind fee payment ────────────────────────────────────────────────

function showBlindFeeStep(container, { blindFeeMs, pot, aiFightPool }) {
  return new Promise(resolve => {
    const panel = wrapStep(container);
    panel.appendChild(mkHeader('Ante up'));

    panel.appendChild(mk('div', {
      color: C.text, fontSize: '11px',
    }, `Your blind fee: ${formatMs(blindFeeMs)}`));
    panel.appendChild(mk('div', {
      color: C.textDim, fontSize: '10px',
    }, 'AI matches. Both payments into the pot.'));
    panel.appendChild(mk('div', {
      color: C.accent, fontSize: '14px', marginTop: '12px',
    }, `In the pot: ${formatMs(pot)}`));
    panel.appendChild(mk('div', {
      color: C.ai, fontSize: '11px', marginTop: '4px',
    }, `Their reserves: ${formatMs(aiFightPool)}`));

    panel.appendChild(mk('div', { flex: '1' }));
    panel.appendChild(mkBtn('Continue', () => resolve()));
  });
}

// ─── Step 5: Cheat placement ──────────────────────────────────────────────────

function showCheatPlacementStep(container, { selectedCheats, boardState, aiPool, tier }) {
  return new Promise(resolve => {
    const panel = wrapStep(container);
    panel.appendChild(mkHeader('Post your crew'));

    const roster = getAllCheats();
    const selectedObjs = selectedCheats.map(id => roster.find(c => c.id === id)).filter(Boolean);

    const aiPlacementData = generateAiPlacement(boardState, aiPool);

    function applyAiPlacement(state) {
      if (!aiPlacementData) return state;
      const aiMeta = roster.find(c => c.id === aiPlacementData.cheatId);
      if (!aiMeta) return state;
      const { state: next, error } = placeCheat(state, aiPlacementData.path, aiPlacementData.tileIndex, {
        ...aiMeta,
        placedBy: 'ai',
      });
      if (!error) {
        boardRenderer.setTileState(aiPlacementData.path, aiPlacementData.tileIndex, 'cheat', {
          name: aiMeta.name, japName: aiMeta.japName, category: aiMeta.category,
        });
      }
      return error ? state : next;
    }

    // Early exit: no cheats to place
    if (!selectedObjs.length) {
      const finalState = applyAiPlacement(boardState);
      panel.appendChild(mk('div', { color: C.textDim, fontSize: '11px' }, 'No crew to post.'));
      panel.appendChild(mk('div', { flex: '1' }));
      panel.appendChild(mkBtn('Continue', () => resolve(finalState)));
      return;
    }

    // Board display
    const boardWrap = mk('div', { width: '100%', margin: '8px 0' });
    panel.appendChild(boardWrap);
    boardRenderer.mount(boardWrap);
    boardRenderer.initBoard(tier.pathLength);

    const instrEl = mk('div', {
      color: C.textDim, fontSize: '10px', minHeight: '14px',
    }, 'Select a crew member below, then tap a tile.');
    panel.appendChild(instrEl);

    const cardsWrap = mk('div', { display: 'flex', flexDirection: 'column', gap: '4px', margin: '8px 0' });
    let selectedCheatId  = null;
    let activeCard       = null;
    let activeState      = boardState;

    selectedObjs.forEach(cheat => {
      const isGood = cheat.category === 'good';
      const card = mk('div', {
        display:    'flex',
        alignItems: 'center',
        gap:        '10px',
        padding:    '8px 12px',
        border:     `1px solid ${C.border}`,
        cursor:     'pointer',
        background: C.panel,
        transition: 'border-color 0.1s',
      });

      card.appendChild(mk('div', {
        width: '7px', height: '7px', flexShrink: '0',
        background: isGood ? C.good : C.bad,
      }));
      card.appendChild(mk('span', {
        color: C.text, fontSize: '11px', flexGrow: '1',
      }, cheat.name));
      card.appendChild(mk('span', {
        color: C.textDim, fontSize: '9px',
      }, isGood ? 'own path' : 'their path'));
      cardsWrap.appendChild(card);

      card.addEventListener('click', () => {
        if (activeCard) {
          activeCard.style.borderColor = C.border;
          activeCard.style.background  = C.panel;
        }
        activeCard      = card;
        selectedCheatId = cheat.id;
        card.style.borderColor = C.accent;
        card.style.background  = '#1a1200';

        boardRenderer.clearHighlights();
        const targetPath = isGood ? 'player' : 'ai';
        for (let i = 1; i <= tier.pathLength; i++) {
          if (!activeState.cheats[targetPath][i]) boardRenderer.highlightTile(targetPath, i);
        }
        instrEl.textContent = isGood
          ? 'Tap a tile on your path.'
          : 'Tap a tile on their path.';
      });
    });
    panel.appendChild(cardsWrap);

    // Tile click handling
    boardWrap.addEventListener('click', e => {
      if (!selectedCheatId) return;
      const tileEl = e.target.closest('[data-index]');
      if (!tileEl) return;

      const path      = tileEl.dataset.path;
      const tileIndex = parseInt(tileEl.dataset.index, 10);
      if (!path || isNaN(tileIndex) || tileIndex < 1 || tileIndex > tier.pathLength) return;

      const cheatMeta  = roster.find(c => c.id === selectedCheatId);
      const validPath  = cheatMeta.category === 'good' ? 'player' : 'ai';
      if (path !== validPath) {
        instrEl.textContent = cheatMeta.category === 'good'
          ? 'Good crew go on your path.'
          : 'Bad crew go on their path.';
        return;
      }

      const { state: newState, error } = placeCheat(activeState, path, tileIndex, {
        ...cheatMeta,
        placedBy: 'player',
      });
      if (error) { instrEl.textContent = error; return; }

      activeState = newState;
      boardRenderer.clearHighlights();
      boardRenderer.setTileState(path, tileIndex, 'cheat', {
        name: cheatMeta.name, japName: cheatMeta.japName, category: cheatMeta.category,
      });

      // Disable card interactions
      cardsWrap.style.pointerEvents = 'none';
      cardsWrap.style.opacity       = '0.5';

      const finalState = applyAiPlacement(activeState);
      instrEl.textContent = '"Best hires in Jigoku. Unfortunately."';

      setTimeout(() => {
        boardRenderer.unmount();
        resolve(finalState);
      }, 1600);
    });
  });
}

// ─── Step 6: Initiative roll ──────────────────────────────────────────────────

function showInitiativeRollStep(container, { playerConfig, aiConfig }) {
  return new Promise(resolve => {
    const panel = wrapStep(container);
    panel.appendChild(mkHeader('First roll'));

    const grid = mk('div', {
      display:             'grid',
      gridTemplateColumns: '1fr 1fr',
      gap:                 '24px',
      margin:              '20px 0',
    });

    const pRollEl = mk('div', {
      color: C.player, fontSize: '48px', textAlign: 'center',
      fontFamily: "'Bebas Neue', sans-serif",
    }, '?');
    const aRollEl = mk('div', {
      color: C.ai,     fontSize: '48px', textAlign: 'center',
      fontFamily: "'Bebas Neue', sans-serif",
    }, '?');

    function col(label, rollEl, color) {
      const wrap = mk('div', { textAlign: 'center' });
      wrap.appendChild(mk('div', {
        color, fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase',
        marginBottom: '6px',
      }, label));
      wrap.appendChild(rollEl);
      return wrap;
    }

    grid.appendChild(col('You', pRollEl, C.player));
    grid.appendChild(col('AI',  aRollEl, C.ai));
    panel.appendChild(grid);

    const resultEl = mk('div', {
      color: C.text, fontSize: '12px', textAlign: 'center',
      letterSpacing: '2px', minHeight: '20px',
    });
    panel.appendChild(resultEl);
    panel.appendChild(mk('div', { flex: '1' }));

    let rollComplete = false;

    function roll() {
      if (rollComplete) return;
      pRollEl.textContent = '?';
      aRollEl.textContent = '?';
      resultEl.textContent = '';

      setTimeout(() => {
        const pRoll   = rollDice(playerConfig, []);
        const aRoll   = rollDice(aiConfig,     []);
        pRollEl.textContent = String(pRoll);
        aRollEl.textContent = String(aRoll);

        const outcome = resolveInitiativeWinner(pRoll, aRoll);
        if (outcome === 'tie') {
          resultEl.textContent = 'Tie. Rolling again.';
          setTimeout(roll, 1400);
        } else {
          rollComplete = true;
          resultEl.textContent = outcome === 'player' ? 'You go first.' : 'They go first.';
          panel.appendChild(mkBtn('Continue', () => resolve(outcome)));
        }
      }, 700);
    }

    roll();
  });
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Runs the full preparation phase (GDD §8 Phase 1).
 *
 * Side effects:
 *   - Deducts blind fee from the player's clock (Step 4).
 *   - Saves player dice config to run state (Step 2).
 *   - Emits CustomEvent('fightReady', { detail }) on the container.
 *
 * @param {HTMLElement} container
 * @param {{ tier: object, runState: object }} options
 *   tier     — from getTierForLevel(dungeonLevel) (TUNING.tiers row)
 *   runState — from getRunState()
 * @returns {Promise<{
 *   pathLength:            number,
 *   initiativeOrder:       'player'|'ai',
 *   pot:                   number,
 *   boardState:            object,
 *   aiFightPool:           number,
 *   minBlindFeeThreshold:  number,
 * }>}
 */
export async function runPreparationPhase(container, { tier, runState }) {
  // Step 1
  const cap = rollCheatCap(tier.pathLength);
  await showCheatCapStep(container, cap);

  // Step 2
  const { playerConfig, aiConfig } = await showDiceConfigStep(container, { runState, tier });

  // Step 3
  const selectedCheats = await showCheatSelectionStep(container, {
    inventory: runState.cheatInventory,
    cap,
  });

  // Step 4 — deduct BEFORE showing (fee is based on pre-deduction balance)
  const currentTimeMs = getRemainingMs();
  const blindFeeMs    = calcBlindFeeMs(currentTimeMs, tier.blindFeePct);
  deductTimeMs(blindFeeMs);
  const pot        = blindFeeMs * 2;
  const aiFightPool = calcAiFightPool(blindFeeMs, tier.fightPoolX);
  await showBlindFeeStep(container, { blindFeeMs, pot, aiFightPool });

  // Step 5
  const aiPool     = generateAiCheatPool(3);
  let   boardState = createBoardState(tier.pathLength);
  boardState = await showCheatPlacementStep(container, { selectedCheats, boardState, aiPool, tier });

  // Step 6
  const initiativeOrder = await showInitiativeRollStep(container, { playerConfig, aiConfig });

  const detail = {
    pathLength:           tier.pathLength,
    initiativeOrder,
    pot,
    boardState,
    aiFightPool,
    minBlindFeeThreshold: blindFeeMs,
  };

  container.dispatchEvent(new CustomEvent('fightReady', { bubbles: true, detail }));
  return detail;
}
