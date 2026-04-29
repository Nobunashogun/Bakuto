// BAKUTO — Screens v2 (Intense Redesign)

const { useState, useEffect, useRef, useCallback } = React;
const { Cauldron, BoardSVG, CheatTile, DiceFaceCell, DiceCube3D, PxLabel, ArtPlaceholder } = window;

const CHEATS_DATA = {
  hellstep:      { id: 'hellstep',      name: 'HELLSTEP',       type: 'good', tier: 'low',    desc: 'Move forward 2 extra tiles this turn.' },
  soulanchor:    { id: 'soulanchor',    name: 'SOUL ANCHOR',    type: 'good', tier: 'medium', desc: "Land exactly on END if you'd overshoot." },
  loaded:        { id: 'loaded',        name: 'LOADED',         type: 'good', tier: 'low',    desc: 'Reroll once, keep the higher result.' },
  deadweight:    { id: 'deadweight',    name: 'DEAD WEIGHT',    type: 'good', tier: 'medium', desc: '+3 temporary face for the next 2 rounds.' },
  purgatoryloop: { id: 'purgatoryloop', name: 'PURGATORY LOOP', type: 'good', tier: 'low',    desc: 'Rolling 0 lets you reroll for 3 rounds.' },
  bloodpact:     { id: 'bloodpact',     name: 'BLOOD PACT',     type: 'good', tier: 'high',   desc: 'Doubles the entire pot.' },
  cursedground:  { id: 'cursedground',  name: 'CURSED GROUND',  type: 'bad',  tier: 'low',    desc: 'Opponent loses their next turn.' },
  hellfiretrap:  { id: 'hellfiretrap',  name: 'HELLFIRE TRAP',  type: 'bad',  tier: 'medium', desc: 'Send opponent back 3 tiles.' },
  dicerot:       { id: 'dicerot',       name: 'DICE ROT',       type: 'bad',  tier: 'medium', desc: "Reduce opponent's highest face by 2 for 3 rounds." },
  falseend:      { id: 'falseend',      name: 'FALSE END',      type: 'bad',  tier: 'high',   desc: 'Opponent bounces back 5 tiles instead of finishing.' },
  debtcollector: { id: 'debtcollector', name: 'DEBT COLLECTOR', type: 'bad',  tier: 'high',   desc: 'Opponent pays extra blind into pot immediately.' },
  leadboots:     { id: 'leadboots',     name: 'LEAD BOOTS',     type: 'bad',  tier: 'medium', desc: "Halve opponent's movement for 2 rounds." },
};
window.CHEATS_DATA = CHEATS_DATA;

function rollDice(faces) { return faces[Math.floor(Math.random() * faces.length)]; }

function moveToken(pos, roll, pathLen) {
  const end = pathLen - 1;
  const np = pos + roll;
  if (np === end) return { pos: end, landed: 'end' };
  if (np > end) return { pos: end - (np - end), landed: 'overshoot' };
  return { pos: np, landed: 'tile' };
}

function calcBlind(money, level) {
  const pct = level <= 5 ? 0.02 : level <= 15 ? 0.03 : level <= 30 ? 0.05 : 0.07;
  return Math.max(1, Math.floor(money * pct));
}

// ══════════════════════════════════════════════════════════════════════════════
// TITLE SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const TitleScreen = ({ money, level, inventory, onEnterDungeon, onDice }) => {
  const [pulse, setPulse] = useState(false);
  useEffect(() => { const t = setInterval(() => setPulse(p => !p), 800); return () => clearInterval(t); }, []);

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: '#080604', overflow: 'hidden', position: 'relative',
    }}>
      {/* Hell glow backdrop */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 110%, rgba(140,20,10,0.25) 0%, transparent 65%)',
      }}/>

      {/* Art zone — top 55% */}
      <div style={{ flex: '0 0 55%', position: 'relative' }}>
        <ArtPlaceholder label="INFERNAL ART · YOKAI · DEMON" style={{ width: '100%', height: '100%' }}/>
        {/* Logo overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 0%, rgba(8,6,4,0.3) 50%, rgba(8,6,4,1) 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 20px 20px',
        }}>
          {/* Corner marks */}
          <div style={{ position: 'absolute', top: 16, left: 16, width: 20, height: 20, borderTop: '2px solid #c42b24', borderLeft: '2px solid #c42b24' }}/>
          <div style={{ position: 'absolute', top: 16, right: 16, width: 20, height: 20, borderTop: '2px solid #c42b24', borderRight: '2px solid #c42b24' }}/>

          {/* Title block */}
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ flex: 1, height: 3, background: 'linear-gradient(to right, transparent, #c42b24)' }}/>
              <PxLabel color="#c42b24" size={8}>HELL DESCENDS</PxLabel>
              <div style={{ flex: 1, height: 3, background: 'linear-gradient(to left, transparent, #c42b24)' }}/>
            </div>
            <h1 style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(72px, 20vw, 120px)',
              letterSpacing: '0.08em',
              color: '#e8d8b0',
              lineHeight: 0.88,
              margin: 0,
              textShadow: `4px 4px 0 #7a1208, -1px -1px 0 rgba(0,0,0,0.9), 0 0 40px rgba(196,43,36,${pulse ? 0.5 : 0.2})`,
              transition: 'text-shadow 0.8s',
            }}>BAKUTO</h1>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 }}>
              <div style={{ flex: 1, height: 2, background: 'linear-gradient(to right, transparent, #504540)' }}/>
              <PxLabel color="#504540" size={6}>ROGUELITE · DICE RACING · HELL</PxLabel>
              <div style={{ flex: 1, height: 2, background: 'linear-gradient(to left, transparent, #504540)' }}/>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '12px 16px 24px', gap: 10,
        borderTop: '1px solid #1e1610',
        position: 'relative',
      }}>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 4 }}>
          {[
            { label: 'FLOOR', val: String(level) },
            { label: 'FUNDS', val: `¥${money.toLocaleString()}` },
            { label: 'CHEATS', val: String(inventory.length) },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: '8px 10px',
              background: '#0e0b08',
              border: '1px solid #2a1e16',
              borderRight: i < 2 ? 'none' : '1px solid #2a1e16',
              display: 'flex', flexDirection: 'column', gap: 3,
            }}>
              <PxLabel size={6} color="#3a3028">{s.label}</PxLabel>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: i === 1 ? '#c08820' : '#ddd0b5', lineHeight: 1 }}>{s.val}</span>
            </div>
          ))}
        </div>

        {/* Inventory preview */}
        {inventory.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {inventory.slice(0, 8).map(id => {
              const c = CHEATS_DATA[id];
              if (!c) return null;
              const isGood = c.type === 'good';
              return (
                <div key={id} style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 6,
                  color: isGood ? '#6a5010' : '#6a1a14',
                  border: `1px solid ${isGood ? '#2e1e08' : '#2e1008'}`,
                  padding: '3px 5px', letterSpacing: 0,
                }}>{c.name}</div>
              );
            })}
            {inventory.length > 8 && <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: '#2a2018', padding: '3px 5px' }}>+{inventory.length - 8}</div>}
          </div>
        )}

        {/* Main CTA */}
        <button onClick={onEnterDungeon} style={{
          width: '100%',
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 5,
          background: '#c42b24', color: '#e8d8b0', border: 'none',
          padding: '16px', cursor: 'pointer',
          textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
          boxShadow: '0 0 24px rgba(196,43,36,0.4), inset 0 1px 0 rgba(255,200,180,0.15)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>ENTER DUNGEON</span>
          <span style={{ opacity: 0.7, fontSize: 18 }}>▶</span>
        </button>

        <button onClick={onDice} style={{
          width: '100%',
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, letterSpacing: 4,
          background: 'transparent', color: '#907868',
          border: '1px solid #2a2018',
          padding: '10px', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>CONFIGURE DICE</span>
          <span style={{ opacity: 0.5, fontSize: 12 }}>⚙</span>
        </button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// DICE SCREEN — Inverted Cross Layout
// ══════════════════════════════════════════════════════════════════════════════
const DiceScreen = ({ diceConfig, onSave, onBack }) => {
  const [faces, setFaces] = useState([...diceConfig]);
  const [rolling, setRolling] = useState(false);
  const [resultFace, setResultFace] = useState(0);
  const [lastRolled, setLastRolled] = useState(null);

  const sum = faces.reduce((a, b) => a + b, 0);
  const MAX = 21;
  const remaining = MAX - sum;
  const pct = (sum / MAX) * 100;
  const barColor = sum >= MAX ? '#c42b24' : sum >= 16 ? '#c08820' : '#4e8a4e';

  function updateFace(i, v) {
    const clamped = Math.max(0, parseInt(v) || 0);
    const diff = clamped - faces[i];
    if (diff > 0 && remaining - diff < 0) return;
    const f = [...faces]; f[i] = clamped; setFaces(f);
  }

  function testRoll() {
    setRolling(true);
    setTimeout(() => {
      const idx = Math.floor(Math.random() * 6);
      setResultFace(idx);
      setLastRolled(faces[idx]);
      setRolling(false);
    }, 780);
  }

  // Cross layout positions: inverted cross (short top arm, long bottom arm)
  // Row 0: [·][4][·]
  // Row 1: [3][0][2]
  // Row 2: [·][1][·]
  // Row 3: [·][5][·]
  // Face indices in cells: center=0, right=2, left=3, topShort=4, bottom1=1, bottom2=5
  const crossMap = [
    // [col, row, faceIdx, isCenter]
    // Flipped: long arm at TOP = true inverted/satanic cross
    [1, 0, 5, false],  // top long arm — tip
    [1, 1, 1, false],  // top long arm — upper
    [0, 2, 3, false],  // left arm
    [1, 2, 0, true],   // CENTER (intersection)
    [2, 2, 2, false],  // right arm
    [1, 3, 4, false],  // bottom short arm
  ];

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: '#080604', overflow: 'hidden',
    }}>
      {/* Hell glow */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 100%, rgba(100,10,5,0.2) 0%, transparent 60%)' }}/>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        padding: '12px 16px', borderBottom: '1px solid #1e1610',
      }}>
        <button onClick={onBack} style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 7, letterSpacing: 1,
          background: 'transparent', color: '#504540', border: '1px solid #2a1e16',
          padding: '6px 10px', cursor: 'pointer',
        }}>← BACK</button>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 4, color: '#ddd0b5', lineHeight: 1 }}>CONFIGURE DICE</div>
          <PxLabel size={6} color="#3a2e20">SUM MUST NOT EXCEED 21</PxLabel>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Cross die layout + 3D preview side by side */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'center' }}>

          {/* Inverted cross grid */}
          <div style={{ position: 'relative' }}>
            {/* Cross shadow/glow background */}
            <div style={{
              position: 'absolute',
              left: 72 + 6, top: 0,
              width: 72, height: 72 * 4 + 6 * 3,
              background: 'rgba(196,43,36,0.04)',
              pointerEvents: 'none',
            }}/>
            <div style={{
              position: 'absolute',
              left: 0, top: 72 + 6,
              width: 72 * 3 + 6 * 2, height: 72,
              background: 'rgba(196,43,36,0.04)',
              pointerEvents: 'none',
            }}/>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 72px)',
              gridTemplateRows: 'repeat(4, 72px)',
              gap: 6,
            }}>
              {/* We need 12 cells (3x4). Fill empty cells with placeholders */}
              {Array.from({ length: 12 }).map((_, cellIdx) => {
                const col = cellIdx % 3;
                const row = Math.floor(cellIdx / 3);
                const match = crossMap.find(([c, r]) => c === col && r === row);
                if (!match) {
                  return <div key={cellIdx} style={{ width: 72, height: 72 }}/>;
                }
                const [, , faceIdx, isCenter] = match;
                return (
                  <DiceFaceCell
                    key={cellIdx}
                    value={faces[faceIdx]}
                    faceIdx={faceIdx}
                    isCenter={isCenter}
                    remaining={remaining}
                    onChange={v => updateFace(faceIdx, v)}
                  />
                );
              })}
            </div>
          </div>

          {/* Right panel: 3D die + sum */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 8 }}>
            <DiceCube3D faces={faces} rolling={rolling} resultFace={resultFace} size={80}/>

            {lastRolled !== null && !rolling && (
              <div style={{ textAlign: 'center' }}>
                <PxLabel size={6} color="#504540">ROLLED</PxLabel>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, color: '#c08820', lineHeight: 1, textShadow: '0 0 16px rgba(192,136,32,0.6)' }}>
                  {lastRolled}
                </div>
              </div>
            )}

            <button onClick={testRoll} disabled={rolling} style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 7, letterSpacing: 1,
              background: '#1e1810', color: rolling ? '#2a2018' : '#907868',
              border: '1px solid #3a2a1e', padding: '8px 10px', cursor: rolling ? 'default' : 'pointer',
            }}>TEST ROLL</button>
          </div>
        </div>

        {/* Sum display */}
        <div style={{ background: '#0e0b08', border: '1px solid #1e1610', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <PxLabel size={7} color="#504540">FACE SUM</PxLabel>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: barColor, lineHeight: 1, textShadow: `0 0 12px ${barColor}66` }}>{sum}</span>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: '#3a3028' }}>/ {MAX}</span>
            </div>
          </div>
          <div style={{ height: 6, background: '#1a1610', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: barColor, transition: 'width 0.2s, background 0.2s', boxShadow: `0 0 6px ${barColor}88` }}/>
          </div>
          <div style={{ marginTop: 5 }}>
            <PxLabel size={6} color={remaining === 0 ? '#c42b24' : '#3a3028'}>
              {remaining > 0 ? `${remaining} PTS REMAINING` : '▲ CAP REACHED'}
            </PxLabel>
          </div>
        </div>

        {/* Note */}
        <div style={{ padding: '8px 10px', border: '1px solid #1e1610' }}>
          <PxLabel size={6} color="#3a2e20" style={{ lineHeight: 2 }}>
            FACE VALUE 0 = SKIP TURN{'\n'}HIGH VALUES RISKY NEAR END TILE
          </PxLabel>
        </div>

        <button onClick={() => onSave(faces)} style={{
          width: '100%',
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 4,
          background: '#c08820', color: '#0a0806', border: 'none',
          padding: '14px', cursor: 'pointer',
          boxShadow: '0 0 20px rgba(192,136,32,0.3)',
        }}>SAVE CONFIGURATION</button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// BATTLE SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const BattleScreen = ({ money, setMoney, level, diceConfig, inventory, onExit, onDeath }) => {
  const pathLen = Math.min(8 + Math.floor(level * 0.5), 14);
  const blindAmt = calcBlind(money, level);
  const maxCheats = Math.floor(pathLen / 2);

  const aiDice = useRef([2, 4, 4, 4, 5, 5].sort(() => Math.random() - 0.5)).current;

  const [phase, setPhase] = useState('prep');
  const [playerPos, setPlayerPos] = useState(0);
  const [aiPos, setAiPos] = useState(0);
  const [pot, setPot] = useState(0);
  const [miniRound, setMiniRound] = useState(1);
  const [selectedCheats, setSelectedCheats] = useState([]);
  const [boardCheats, setBoardCheats] = useState([]);
  const [activePlacing, setActivePlacing] = useState(null); // cheatId being placed
  const [lastRoll, setLastRoll] = useState(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [resultFaceIdx, setResultFaceIdx] = useState(0);
  const [miniRoundWinner, setMiniRoundWinner] = useState(null);
  const [log, setLog] = useState(['PREPARE YOUR DICE AND CHEATS.']);
  const [skipPlayer, setSkipPlayer] = useState(0);
  const [halfPlayer, setHalfPlayer] = useState(0);
  const [skipAi, setSkipAi] = useState(0);
  const [currentMoney, setCurrentMoney] = useState(money);
  const [aiMoney, setAiMoney] = useState(Math.floor(money * 1.1));
  const [showQuit, setShowQuit] = useState(false);
  const [showPrepOverlay, setShowPrepOverlay] = useState(true); // open by default
  const [localDice, setLocalDice] = useState([...diceConfig]);
  const [prepTab, setPrepTab] = useState('dice'); // 'dice' | 'cheats'
  const [aiRolling, setAiRolling] = useState(false);
  const [aiResultFace, setAiResultFace] = useState(0);
  const [showDiceInspect, setShowDiceInspect] = useState(false);
  const [inspectRotX, setInspectRotX] = useState(-18);
  const [inspectRotY, setInspectRotY] = useState(20);

  const addLog = useCallback((msg) => setLog(prev => [msg, ...prev].slice(0, 6)), []);

  function startFight() {
    if (currentMoney < blindAmt) { setPhase('bankrupt'); return; }
    const newPot = blindAmt * 2;
    setCurrentMoney(m => m - blindAmt);
    setAiMoney(m => m - blindAmt);
    setPot(newPot);
    setPlayerPos(0);
    setAiPos(0);
    setShowPrepOverlay(false);
    addLog(`BLIND ¥${blindAmt} PAID. POT: ¥${newPot}`);
    setPhase('player_turn');
  }

  function handleRoll() {
    if (phase !== 'player_turn' || diceRolling) return;
    if (skipPlayer > 0) {
      setSkipPlayer(s => s - 1);
      addLog('YOUR TURN SKIPPED — CURSED GROUND');
      setPhase('ai_turn');
      setTimeout(doAiTurn, 900);
      return;
    }
    setDiceRolling(true);
    const faceIdx = Math.floor(Math.random() * 6);
    setResultFaceIdx(faceIdx);
    setTimeout(() => {
      setDiceRolling(false);
      let roll = localDice[faceIdx];
      if (halfPlayer > 0) { roll = Math.floor(roll / 2); setHalfPlayer(h => h - 1); }
      setLastRoll(roll);
      if (roll === 0) { addLog('ROLLED 0 — TURN LOST'); setPhase('ai_turn'); setTimeout(doAiTurn, 900); return; }
      const result = moveToken(playerPos, roll, pathLen);
      addLog(`YOU ·· ${roll} ·· TILE ${result.pos}${result.landed === 'overshoot' ? ' (BOUNCE)' : result.landed === 'end' ? ' ·· END!' : ''}`);
      const bc = boardCheats.find(c => c.path === 'player' && c.pos === result.pos);
      setPlayerPos(result.pos);
      if (bc) {
        setBoardCheats(prev => prev.filter(c => !(c.path === 'player' && c.pos === result.pos)));
        triggerCheat(bc.cheatId, 'player');
      }
      if (result.landed === 'end') { setTimeout(() => resolveEnd('player'), 400); }
      else { setPhase('ai_turn'); setTimeout(doAiTurn, 900); }
    }, 780);
  }

  function doAiTurn() {
    if (skipAi > 0) { setSkipAi(s => s - 1); addLog('ENEMY TURN SKIPPED'); setPhase('player_turn'); return; }
    const faceIdx = Math.floor(Math.random() * 6);
    const roll = aiDice[faceIdx];
    setAiRolling(true);
    setTimeout(() => {
      setAiRolling(false);
      setAiResultFace(faceIdx);
      if (roll === 0) { addLog('ENEMY ROLLED 0'); setPhase('player_turn'); return; }
      doAiMove(roll);
    }, 780);
  }

  function doAiMove(roll) {
    setAiPos(prev => {
      const result = moveToken(prev, roll, pathLen);
      addLog(`ENEMY ·· ${roll} ·· TILE ${result.pos}${result.landed === 'overshoot' ? ' (BOUNCE)' : result.landed === 'end' ? ' ·· END!' : ''}`);
      const bc = boardCheats.find(c => c.path === 'ai' && c.pos === result.pos);
      if (bc) {
        setBoardCheats(p => p.filter(c => !(c.path === 'ai' && c.pos === result.pos)));
        triggerCheat(bc.cheatId, 'ai');
      }
      if (result.landed === 'end') setTimeout(() => resolveEnd('ai'), 400);
      else setTimeout(() => setPhase('player_turn'), 500);
      return result.pos;
    });
  }

  function triggerCheat(id, landedBy) {
    const c = CHEATS_DATA[id]; if (!c) return;
    addLog(`⚡ ${c.name}`);
    if (id === 'hellstep' && landedBy === 'player') setPlayerPos(p => { const r = moveToken(p, 2, pathLen); return r.pos; });
    if (id === 'cursedground') { if (landedBy === 'ai') setSkipPlayer(s => s + 1); else setSkipAi(s => s + 1); }
    if (id === 'hellfiretrap') { if (landedBy === 'ai') setPlayerPos(p => Math.max(0, p - 3)); else setAiPos(p => Math.max(0, p - 3)); }
    if (id === 'leadboots' && landedBy === 'ai') setHalfPlayer(h => h + 2);
    if (id === 'bloodpact') { setPot(p => { addLog(`POT DOUBLED: ¥${p * 2}`); return p * 2; }); }
  }

  function resolveEnd(winner) {
    setMiniRoundWinner(winner);
    setPot(prev => {
      if (winner === 'player') { setCurrentMoney(m => m + prev); addLog(`YOU WIN ¥${prev}!`); }
      else { setAiMoney(m => m + prev); addLog(`ENEMY WINS ¥${prev}`); }
      return prev;
    });
    setPhase('end_round');
  }

  function continueRound() {
    if (currentMoney < blindAmt) { setPhase('bankrupt'); return; }
    if (aiMoney < blindAmt) { setMoney(currentMoney); onExit('win'); return; }
    const np = blindAmt * 2;
    setCurrentMoney(m => m - blindAmt);
    setAiMoney(m => m - blindAmt);
    setPot(np);
    setPlayerPos(0); setAiPos(0);
    setMiniRound(n => n + 1);
    setMiniRoundWinner(null);
    addLog(`ROUND ${miniRound + 1} · POT ¥${np}`);
    setPhase('player_turn');
  }

  function quitDungeon() { setMoney(currentMoney); onExit('quit'); }

  function toggleCheat(id) {
    setSelectedCheats(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= maxCheats) return prev;
      return [...prev, id];
    });
  }

  function handleCheatTileTap(id) {
    if (phase !== 'player_turn' && phase !== 'prep') return;
    const c = CHEATS_DATA[id];
    if (!c || boardCheats.find(bc => bc.cheatId === id)) return;
    if (activePlacing === id) { setActivePlacing(null); return; }
    setActivePlacing(id);
    addLog(`SELECTED: ${c.name} — TAP BOARD TILE TO PLACE`);
  }

  function handleBoardTileClick(pos, path) {
    if (!activePlacing) return;
    const c = CHEATS_DATA[activePlacing];
    if (!c) return;
    if (c.type === 'good' && path !== 'player') { addLog('BUFF → YOUR PATH ONLY'); return; }
    if (c.type === 'bad' && path !== 'ai') { addLog('TRAP → ENEMY PATH ONLY'); return; }
    if (boardCheats.find(bc => bc.pos === pos && bc.path === path)) { addLog('TILE OCCUPIED'); return; }
    setBoardCheats(prev => [...prev, { pos, cheatId: activePlacing, path }]);
    addLog(`PLACED ${c.name}`);
    setActivePlacing(null);
  }

  const placingType = activePlacing ? (CHEATS_DATA[activePlacing]?.type === 'good' ? 'good' : 'bad') : null;
  const isInBattle = ['player_turn', 'ai_turn'].includes(phase);
  const isPrep = phase === 'prep';

  // ─────────────────────────────────────────────────────────────────
  // BANKRUPT
  // ─────────────────────────────────────────────────────────────────
  if (phase === 'bankrupt') return (
    <div style={{
      width: '100%', height: '100%', background: '#080604',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 80%, rgba(150,10,5,0.3) 0%, transparent 60%)', pointerEvents: 'none' }}/>
      <div style={{ width: 80, height: 3, background: '#c42b24' }}/>
      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 64, color: '#c42b24', letterSpacing: 8, margin: 0, textShadow: '0 0 40px rgba(196,43,36,0.6)' }}>BANKRUPT</h2>
      <PxLabel size={8} color="#504540">YOUR DESCENT ENDS HERE</PxLabel>
      <div style={{ width: 80, height: 3, background: '#c42b24' }}/>
      <PxLabel size={7} color="#2a1e14" style={{ textAlign: 'center', maxWidth: 260, lineHeight: 2.4 }}>
        ALL MONEY · ALL CHEATS{'\n'}ALL PROGRESS IS LOST
      </PxLabel>
      <button onClick={onDeath} style={{
        marginTop: 12,
        fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 4,
        background: '#c42b24', color: '#e8d8b0', border: 'none', padding: '14px 32px', cursor: 'pointer',
        boxShadow: '0 0 24px rgba(196,43,36,0.5)',
      }}>BEGIN NEW RUN</button>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────
  // MAIN BATTLE LAYOUT
  // ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: '#080604', overflow: 'hidden', position: 'relative',
    }}>
      {/* Hell glow */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 100%, rgba(100,15,5,0.2) 0%, transparent 55%)' }}/>

      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 14px', borderBottom: '1px solid #1e1610', flexShrink: 0,
        background: '#0a0806',
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div>
            <PxLabel size={6} color="#2a2018">FLOOR</PxLabel>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: '#ddd0b5', lineHeight: 1 }}>{level}</div>
          </div>
          <div style={{ width: 1, height: 28, background: '#1e1610' }}/>
          <div>
            <PxLabel size={6} color="#2a2018">FUNDS</PxLabel>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: '#c08820', lineHeight: 1 }}>¥{currentMoney.toLocaleString()}</div>
          </div>
          <div style={{ width: 1, height: 28, background: '#1e1610' }}/>
          <div>
            <PxLabel size={6} color="#2a2018">BLIND</PxLabel>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: '#504540', lineHeight: 1 }}>¥{blindAmt}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {isPrep && <button onClick={() => setShowPrepOverlay(true)} style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 6, letterSpacing: 1,
            background: '#1a1610', color: '#907868', border: '1px solid #2a1e16',
            padding: '5px 8px', cursor: 'pointer',
          }}>PREP</button>}
          <button onClick={() => setShowQuit(true)} style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 6, letterSpacing: 1,
            background: 'transparent', color: '#3a3028', border: '1px solid #1e1610',
            padding: '5px 8px', cursor: 'pointer',
          }}>QUIT</button>
        </div>
      </div>

      {/* ── BOARD — 50% of remaining height ── */}
      <div style={{
        flex: '0 0 50%', display: 'flex', flexDirection: 'column',
        borderBottom: '2px solid #2a1e16', position: 'relative', minHeight: 0,
        background: '#0a0706',
      }}>
        {/* Round badge */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '6px 14px', flexShrink: 0, borderBottom: '1px solid #1a1410',
        }}>
          <PxLabel size={6} color="#3a2e20">ROUND {miniRound}</PxLabel>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {phase === 'player_turn' && <PxLabel size={6} color="#c08820">YOUR TURN</PxLabel>}
            {phase === 'ai_turn' && <PxLabel size={6} color="#c42b24">ENEMY TURN</PxLabel>}
            {isPrep && <PxLabel size={6} color="#504540">PREPARING</PxLabel>}
          </div>
          {/* Placement hint */}
          {activePlacing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PxLabel size={6} color="#c08820">PLACING: {CHEATS_DATA[activePlacing]?.name}</PxLabel>
              <button onClick={() => setActivePlacing(null)} style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 5,
                background: 'transparent', color: '#504540', border: '1px solid #2a1e16',
                padding: '2px 5px', cursor: 'pointer',
              }}>✕</button>
            </div>
          )}
        </div>

        {/* Board SVG + Cauldron row */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', padding: '6px 10px', minHeight: 0 }}>
          {/* Board paths */}
          <div style={{ overflowX: 'auto' }}>
            <BoardSVG
              pathLen={pathLen}
              playerPos={playerPos}
              aiPos={aiPos}
              boardCheats={boardCheats}
              onTileClick={handleBoardTileClick}
              placingCheat={activePlacing}
              placingType={placingType}
            />
          </div>

          {/* Cauldron + stats row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            <Cauldron amount={pot}/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <PxLabel size={6} color="#2a2018">ENEMY FUNDS</PxLabel>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: '#c42b24', lineHeight: 1 }}>¥{aiMoney.toLocaleString()}</div>
              </div>
              <div>
                <PxLabel size={6} color="#2a2018">PATH LENGTH</PxLabel>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: '#504540', lineHeight: 1 }}>{pathLen} TILES</div>
              </div>
              {skipPlayer > 0 && <div style={{ background: '#1a0808', border: '1px solid #c42b24', padding: '3px 6px' }}><PxLabel size={6} color="#c42b24">SKIP ×{skipPlayer}</PxLabel></div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM HALF ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

        {/* Cheat tiles strip */}
        <div style={{
          flexShrink: 0, padding: '8px 10px',
          borderBottom: '1px solid #1a1410',
          background: '#080604',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            <PxLabel size={6} color="#2a2018">CHEATS</PxLabel>
            <PxLabel size={6} color="#1a1610">({selectedCheats.length}/{maxCheats} SELECTED)</PxLabel>
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {inventory.map(id => {
              const c = CHEATS_DATA[id];
              if (!c) return null;
              const isSelected = selectedCheats.includes(id);
              const isOnBoard = !!boardCheats.find(bc => bc.cheatId === id);
              const isActive = activePlacing === id;
              return (
                <div key={id}>
                  <CheatTile
                    cheat={c}
                    selected={isSelected}
                    onBoard={isOnBoard}
                    active={isActive}
                    onClick={() => {
                      if (isPrep) {
                        toggleCheat(id);
                      } else if (isInBattle && isSelected && !isOnBoard) {
                        handleCheatTileTap(id);
                      }
                    }}
                  />
                  {isPrep && !isOnBoard && (
                    <div
                      onClick={() => toggleCheat(id)}
                      style={{
                        marginTop: 2, width: 72, textAlign: 'center',
                        background: isSelected ? '#1e1000' : 'transparent',
                        border: `1px solid ${isSelected ? '#c08820' : '#1a1610'}`,
                        padding: '2px 0', cursor: 'pointer',
                      }}
                    >
                      <PxLabel size={6} color={isSelected ? '#c08820' : '#2a2018'}>{isSelected ? '✓ IN' : '+ ADD'}</PxLabel>
                    </div>
                  )}
                </div>
              );
            })}
            {inventory.length === 0 && (
              <PxLabel size={6} color="#2a1e14">NO CHEATS OWNED</PxLabel>
            )}
          </div>
        </div>

        {/* Log + action area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 14px', gap: 8, minHeight: 0, overflow: 'hidden' }}>

          {/* Log */}
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {log.slice(0, 3).map((l, i) => (
              <div key={i} style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 7, lineHeight: 2,
                color: i === 0 ? '#907868' : '#3a2e20',
                letterSpacing: 0,
              }}>{l}</div>
            ))}
          </div>

          {/* PREP: start button */}
          {isPrep && (
            <button onClick={startFight} style={{
              flexShrink: 0, width: '100%',
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 5,
              background: '#c42b24', color: '#e8d8b0', border: 'none',
              padding: '14px', cursor: 'pointer',
              boxShadow: '0 0 24px rgba(196,43,36,0.4)',
            }}>BEGIN FIGHT</button>
          )}

          {/* PLAYER TURN: dice + roll */}
          {phase === 'player_turn' && (
            <div style={{ flexShrink: 0, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div
                  onClick={() => setShowDiceInspect(true)}
                  style={{ cursor: 'pointer', position: 'relative' }}
                  title="Inspect die"
                >
                  <DiceCube3D faces={localDice} rolling={diceRolling} resultFace={resultFaceIdx} size={60}/>
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2,
                    background: '#c08820', width: 16, height: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <PxLabel size={5} color="#0a0806">↻</PxLabel>
                  </div>
                </div>
                {lastRoll !== null && !diceRolling && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
                    <PxLabel size={6} color="#504540">ROLLED</PxLabel>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#c08820', lineHeight: 1 }}>{lastRoll}</span>
                  </div>
                )}
              </div>
              <button onClick={handleRoll} disabled={diceRolling} style={{
                flex: 1, fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 5,
                background: diceRolling ? '#1e1610' : '#c08820', color: diceRolling ? '#2a2018' : '#0a0806',
                border: 'none', padding: '16px 10px', cursor: diceRolling ? 'default' : 'pointer',
                boxShadow: diceRolling ? 'none' : '0 0 20px rgba(192,136,32,0.35)',
                transition: 'all 0.15s',
              }}>{diceRolling ? '...' : 'ROLL'}</button>
            </div>
          )}

          {/* AI TURN indicator */}
          {phase === 'ai_turn' && (
            <div style={{ flexShrink: 0, padding: '10px 14px', border: '1px solid #2a1a14', background: '#0e0806', display: 'flex', gap: 16, alignItems: 'center' }}>
              <DiceCube3D
                faces={[' ',' ',' ',' ',' ',' ']}
                rolling={aiRolling}
                resultFace={aiResultFace}
                size={60}
                borderColor="#c42b24"
                hidden={true}
              />
              <div>
                <PxLabel size={8} color="#c42b24">{aiRolling ? 'ENEMY ROLLING...' : 'ENEMY MOVED'}</PxLabel>
                {!aiRolling && <div style={{ marginTop: 4 }}><PxLabel size={6} color="#3a2018">DICE HIDDEN · INFO ASYMMETRY</PxLabel></div>}
              </div>
            </div>
          )}

          {/* END ROUND */}
          {phase === 'end_round' && (
            <div style={{ flexShrink: 0 }}>
              <div style={{
                padding: '10px 14px', marginBottom: 8,
                background: '#0e0806', border: `2px solid ${miniRoundWinner === 'player' ? '#c08820' : '#c42b24'}`,
                textAlign: 'center',
                boxShadow: miniRoundWinner === 'player' ? '0 0 20px rgba(192,136,32,0.2)' : '0 0 20px rgba(196,43,36,0.2)',
              }}>
                <div style={{
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, letterSpacing: 5,
                  color: miniRoundWinner === 'player' ? '#c08820' : '#c42b24',
                  textShadow: miniRoundWinner === 'player' ? '0 0 20px rgba(192,136,32,0.5)' : '0 0 20px rgba(196,43,36,0.5)',
                }}>
                  {miniRoundWinner === 'player' ? 'YOU WIN THE ROUND' : 'ENEMY WINS'}
                </div>
                <PxLabel size={7} color="#504540">
                  {miniRoundWinner === 'player' ? `+¥${pot.toLocaleString()} CLAIMED` : `¥${pot.toLocaleString()} LOST`}
                </PxLabel>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={quitDungeon} style={{
                  flex: 1, fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: 2,
                  background: 'transparent', color: '#504540', border: '1px solid #2a1e16',
                  padding: '10px', cursor: 'pointer',
                }}>QUIT · KEEP ¥{currentMoney.toLocaleString()}</button>
                <button onClick={continueRound} style={{
                  flex: 2, fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 4,
                  background: '#c42b24', color: '#e8d8b0', border: 'none',
                  padding: '10px', cursor: 'pointer',
                  boxShadow: '0 0 16px rgba(196,43,36,0.35)',
                }}>CONTINUE →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DICE INSPECT OVERLAY */}
      {showDiceInspect && (() => {
        function handleDrag(e) {
          e.preventDefault();
          const isTouch = e.touches !== undefined;
          const startX = isTouch ? e.touches[0].clientX : e.clientX;
          const startY = isTouch ? e.touches[0].clientY : e.clientY;
          const startRX = inspectRotX;
          const startRY = inspectRotY;
          function onMove(ev) {
            const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
            const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
            setInspectRotY(startRY + (cx - startX) * 0.9);
            setInspectRotX(startRX - (cy - startY) * 0.9);
          }
          function onUp() {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
          }
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
          window.addEventListener('touchmove', onMove, { passive: false });
          window.addEventListener('touchend', onUp);
        }
        return (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(8,6,4,0.95)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, gap: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 40, height: 2, background: '#c08820' }}/>
              <PxLabel size={8} color="#c08820">YOUR DICE</PxLabel>
              <div style={{ width: 40, height: 2, background: '#c08820' }}/>
            </div>
            <PxLabel size={6} color="#3a2e20">DRAG TO ROTATE</PxLabel>

            {/* Large rotatable die */}
            <div
              onMouseDown={handleDrag}
              onTouchStart={handleDrag}
              style={{ cursor: 'grab', userSelect: 'none', touchAction: 'none' }}
            >
              <DiceCube3D
                faces={diceConfig}
                rolling={false}
                resultFace={0}
                size={140}
                customTransform={`rotateX(${inspectRotX}deg) rotateY(${inspectRotY}deg)`}
              />
            </div>

            {/* Face reference list */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {localDice.map((v, i) => (
                <div key={i} style={{
                  background: '#110e08', border: '1px solid #2a1e16',
                  padding: '6px 10px', textAlign: 'center',
                }}>
                  <PxLabel size={5} color="#3a2e20">F{i + 1}</PxLabel>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#ddd0b5', lineHeight: 1 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 4 }}>
              <PxLabel size={6} color="#2a2018">SUM: {diceConfig.reduce((a,b)=>a+b,0)} / 21</PxLabel>
            </div>

            <button onClick={() => setShowDiceInspect(false)} style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 4,
              background: '#c08820', color: '#0a0806', border: 'none',
              padding: '12px 32px', cursor: 'pointer',
              boxShadow: '0 0 16px rgba(192,136,32,0.3)',
            }}>CLOSE</button>
          </div>
        );
      })()}

      {/* QUIT CONFIRM OVERLAY */}
      {showQuit && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(8,6,4,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{ background: '#0e0b08', border: '2px solid #2a1e16', padding: 24, maxWidth: 300, width: '90%' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 3, color: '#ddd0b5', marginBottom: 8 }}>EXIT DUNGEON?</div>
            <PxLabel size={7} color="#3a2e20" style={{ lineHeight: 2.4, display: 'block', marginBottom: 16 }}>
              KEEP ¥{currentMoney.toLocaleString()}{'\n'}AND ALL CHEATS
            </PxLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowQuit(false)} style={{
                flex: 1, fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: 2,
                background: 'transparent', color: '#504540', border: '1px solid #2a1e16', padding: '10px', cursor: 'pointer',
              }}>CANCEL</button>
              <button onClick={quitDungeon} style={{
                flex: 1, fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: 2,
                background: '#c42b24', color: '#e8d8b0', border: 'none', padding: '10px', cursor: 'pointer',
              }}>QUIT</button>
            </div>
          </div>
        </div>
      )}

      {/* PREP OVERLAY */}
      {showPrepOverlay && (() => {
        const diceSum = localDice.reduce((a,b)=>a+b,0);
        const remaining = 21 - diceSum;
        function updateFace(i, v) {
          const clamped = Math.max(0, parseInt(v)||0);
          const diff = clamped - localDice[i];
          if (diff > 0 && remaining - diff < 0) return;
          const nd = [...localDice]; nd[i] = clamped; setLocalDice(nd);
        }
        function adjustFace(i, delta) {
          if (delta > 0 && remaining <= 0) return;
          const nv = Math.max(0, localDice[i] + delta);
          if (delta > 0 && diceSum + delta > 21) return;
          const nd = [...localDice]; nd[i] = nv; setLocalDice(nd);
        }
        const barColor = diceSum >= 21 ? '#c42b24' : diceSum >= 16 ? '#c08820' : '#4e8a4e';
        return (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(8,6,4,0.96)',
            display: 'flex', flexDirection: 'column', zIndex: 100,
          }}>
            {/* Prep header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e1610', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 4, color: '#ddd0b5' }}>FIGHT PREP</div>
              <button onClick={() => setShowPrepOverlay(false)} style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                background: 'transparent', color: '#504540', border: '1px solid #2a1e16',
                padding: '5px 8px', cursor: 'pointer',
              }}>✕ CLOSE</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', flexShrink: 0, borderBottom: '1px solid #1e1610' }}>
              {['dice','cheats'].map(tab => (
                <button key={tab} onClick={() => setPrepTab(tab)} style={{
                  flex: 1, fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, letterSpacing: 3,
                  background: prepTab === tab ? '#130f08' : 'transparent',
                  color: prepTab === tab ? '#ddd0b5' : '#504540',
                  border: 'none',
                  borderBottom: prepTab === tab ? '3px solid #c08820' : '3px solid transparent',
                  padding: '10px', cursor: 'pointer',
                }}>
                  {tab === 'dice' ? `DICE  ${diceSum}/21` : `CHEATS  ${selectedCheats.length}/${maxCheats}`}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>

              {/* ─── DICE TAB ─── */}
              {prepTab === 'dice' && (
                <div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                    <DiceCube3D faces={localDice} resultFace={0} size={72}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: barColor, lineHeight: 1, textShadow: `0 0 10px ${barColor}66` }}>{diceSum}</span>
                        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: '#3a3028' }}>/ 21</span>
                      </div>
                      <div style={{ height: 5, background: '#1a1610' }}>
                        <div style={{ height: '100%', width: `${(diceSum/21)*100}%`, background: barColor, transition: 'all 0.2s', boxShadow: `0 0 5px ${barColor}88` }}/>
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <PxLabel size={6} color={remaining === 0 ? '#c42b24' : '#3a3028'}>
                          {remaining > 0 ? `${remaining} PTS LEFT` : 'CAP REACHED'}
                        </PxLabel>
                      </div>
                    </div>
                  </div>

                  {/* 2×3 face grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {localDice.map((v, i) => (
                      <div key={i} style={{
                        background: '#110e08', border: '1px solid #2a1e16', padding: '10px 12px',
                      }}>
                        <PxLabel size={6} color="#3a2e20" style={{ display: 'block', marginBottom: 6 }}>FACE {i+1}</PxLabel>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => adjustFace(i, -1)} style={{
                            width: 28, height: 28, background: '#1a1610', border: '1px solid #3a2a1e',
                            color: '#907868', fontFamily: "'Bebas Neue', sans-serif", fontSize: 18,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>−</button>
                          <span style={{ flex: 1, textAlign: 'center', fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: '#ddd0b5', lineHeight: 1 }}>{v}</span>
                          <button onClick={() => adjustFace(i, 1)} style={{
                            width: 28, height: 28, background: '#1a1610', border: `1px solid ${remaining > 0 ? '#3a2a1e' : '#1e1810'}`,
                            color: remaining > 0 ? '#907868' : '#2a2018', fontFamily: "'Bebas Neue', sans-serif", fontSize: 18,
                            cursor: remaining > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, padding: '8px 10px', border: '1px solid #1e1610' }}>
                    <PxLabel size={6} color="#2a2018" style={{ lineHeight: 2 }}>FACE 0 = SKIP TURN · HIGH VALUES RISKY NEAR END</PxLabel>
                  </div>
                </div>
              )}

              {/* ─── CHEATS TAB ─── */}
              {prepTab === 'cheats' && (
                <div>
                  <PxLabel size={6} color="#3a2e20" style={{ display: 'block', marginBottom: 10, lineHeight: 2 }}>
                    SELECT UP TO {maxCheats} CHEATS · ▲ BUFF = OWN PATH · ▼ TRAP = ENEMY PATH
                  </PxLabel>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {inventory.map(id => {
                      const c = CHEATS_DATA[id]; if (!c) return null;
                      const sel = selectedCheats.includes(id);
                      const isGood = c.type === 'good';
                      const accent = isGood ? '#c08820' : '#c42b24';
                      const dimFrame = isGood ? '#4a3010' : '#4a1010';
                      return (
                        <div key={id} onClick={() => toggleCheat(id)} style={{
                          width: 'calc(50% - 4px)',
                          padding: '10px 12px', cursor: 'pointer',
                          background: sel ? (isGood ? '#1a1000' : '#160400') : '#110d08',
                          border: `2px solid ${sel ? accent : dimFrame}`,
                          borderLeft: `5px solid ${sel ? accent : dimFrame}`,
                          transition: 'all 0.1s',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                            <PxLabel size={7} color={sel ? accent : dimFrame}>{isGood ? '▲' : '▼'}</PxLabel>
                            <div style={{
                              width: 6, height: 6,
                              background: c.tier === 'high' ? '#c42b24' : c.tier === 'medium' ? '#c08820' : '#4e8a4e',
                            }}/>
                          </div>
                          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: sel ? accent : '#907868', lineHeight: 1, marginBottom: 3 }}>{c.name}</div>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#3a3028', lineHeight: 1.4 }}>{c.desc}</div>
                        </div>
                      );
                    })}
                    {inventory.length === 0 && (
                      <PxLabel size={7} color="#2a1e14">NO CHEATS OWNED YET</PxLabel>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Begin fight */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #1e1610', flexShrink: 0 }}>
              <button onClick={startFight} style={{
                width: '100%', fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 5,
                background: '#c42b24', color: '#e8d8b0', border: 'none',
                padding: '14px', cursor: 'pointer',
                boxShadow: '0 0 24px rgba(196,43,36,0.4)',
              }}>BEGIN FIGHT</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

Object.assign(window, { TitleScreen, DiceScreen, BattleScreen, CHEATS_DATA });
