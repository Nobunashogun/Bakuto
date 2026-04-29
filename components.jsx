// BAKUTO — Components v2 (Intense Redesign)

const { useState, useRef } = React;

// ── Cauldron SVG ─────────────────────────────────────────────────────────────
const Cauldron = ({ amount, label = 'THE POT' }) => (
  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
    <svg viewBox="0 0 120 95" width="110" height="88" style={{ overflow: 'visible' }}>
      {/* Hellfire glow underneath */}
      <ellipse cx="60" cy="94" rx="32" ry="6" fill="#c42b24" opacity="0.15">
        <animate attributeName="rx" values="28;38;28" dur="1.2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.1;0.25;0.1" dur="1.2s" repeatCount="indefinite"/>
      </ellipse>
      {/* Steam */}
      <g fill="none" strokeLinecap="round" strokeWidth="2">
        <path stroke="#3a3030" opacity="0.5">
          <animate attributeName="d" values="M33,33 C30,25 36,18 32,10;M33,33 C36,25 30,18 34,10;M33,33 C30,25 36,18 32,10" dur="2.1s" repeatCount="indefinite"/>
        </path>
        <path stroke="#3a3030" opacity="0.4">
          <animate attributeName="d" values="M60,28 C57,20 63,13 59,5;M60,28 C63,20 57,13 61,5;M60,28 C57,20 63,13 59,5" dur="2.6s" repeatCount="indefinite"/>
        </path>
        <path stroke="#3a3030" opacity="0.5">
          <animate attributeName="d" values="M87,33 C84,25 90,18 86,10;M87,33 C90,25 84,18 88,10;M87,33 C84,25 90,18 86,10" dur="1.9s" repeatCount="indefinite"/>
        </path>
      </g>
      {/* Rim outer */}
      <ellipse cx="60" cy="38" rx="47" ry="14" fill="#120808" stroke="#5a2010" strokeWidth="2"/>
      {/* Liquid surface */}
      <ellipse cx="60" cy="35" rx="42" ry="11" fill="#2e0a04">
        <animate attributeName="ry" values="11;13;11" dur="0.9s" repeatCount="indefinite"/>
      </ellipse>
      {/* Bubbles */}
      <circle cx="42" cy="33" r="0" fill="#c42b24"><animate attributeName="r" values="0;4;0" dur="0.8s" repeatCount="indefinite" begin="0s"/><animate attributeName="cy" values="36;30;36" dur="0.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.8;0" dur="0.8s" repeatCount="indefinite"/></circle>
      <circle cx="66" cy="31" r="0" fill="#c08820"><animate attributeName="r" values="0;5;0" dur="1.1s" repeatCount="indefinite" begin="0.35s"/><animate attributeName="cy" values="35;28;35" dur="1.1s" repeatCount="indefinite" begin="0.35s"/><animate attributeName="opacity" values="0;0.6;0" dur="1.1s" repeatCount="indefinite" begin="0.35s"/></circle>
      <circle cx="80" cy="34" r="0" fill="#c45a10"><animate attributeName="r" values="0;3;0" dur="0.7s" repeatCount="indefinite" begin="0.6s"/><animate attributeName="cy" values="36;31;36" dur="0.7s" repeatCount="indefinite" begin="0.6s"/><animate attributeName="opacity" values="0;0.7;0" dur="0.7s" repeatCount="indefinite" begin="0.6s"/></circle>
      {/* Body */}
      <path d="M13,38 Q9,80 60,82 Q111,80 107,38" fill="#0e0a06" stroke="#5a2010" strokeWidth="2.5"/>
      {/* Rim highlight line */}
      <path d="M13,38 Q60,50 107,38" fill="none" stroke="#3a1a0c" strokeWidth="1" opacity="0.6"/>
      {/* Rivet marks */}
      <circle cx="20" cy="56" r="2.5" fill="#2a1a0c"/>
      <circle cx="100" cy="56" r="2.5" fill="#2a1a0c"/>
      {/* Handles */}
      <path d="M16,40 Q6,40 5,50 Q4,60 16,58" fill="none" stroke="#4a2810" strokeWidth="3" strokeLinecap="round"/>
      <path d="M104,40 Q114,40 115,50 Q116,60 104,58" fill="none" stroke="#4a2810" strokeWidth="3" strokeLinecap="round"/>
      {/* Legs */}
      <line x1="28" y1="80" x2="19" y2="94" stroke="#4a2810" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="60" y1="82" x2="60" y2="94" stroke="#4a2810" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="92" y1="80" x2="101" y2="94" stroke="#4a2810" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Feet */}
      <line x1="15" y1="94" x2="23" y2="94" stroke="#4a2810" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="55" y1="94" x2="65" y2="94" stroke="#4a2810" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="97" y1="94" x2="105" y2="94" stroke="#4a2810" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
    {/* Amount overlaid in cauldron */}
    <div style={{
      position: 'absolute', top: 38, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none',
    }}>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: '#c08820', textShadow: '0 0 12px rgba(192,136,32,0.9)', letterSpacing: 1 }}>
        ¥{amount.toLocaleString()}
      </span>
    </div>
    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#3a2e20', letterSpacing: 1 }}>{label}</div>
  </div>
);

// ── Board SVG — two converging paths ─────────────────────────────────────────
const CHEATS_REF = {}; // populated from screens.jsx via window
const BoardSVG = ({ pathLen, playerPos, aiPos, boardCheats, onTileClick, placingCheat, placingType }) => {
  const TW = 28, TH = 28, GAP = 3;
  const n = pathLen - 1; // non-end tiles per path
  const PAD = 10;
  const rowW = n * (TW + GAP) - GAP;
  const AI_Y = 8;
  const PLR_Y = 72;
  const END_X = PAD + rowW + 32;
  const END_Y = 28; // center between rows
  const END_SIZE = 40;
  const SVG_W = END_X + END_SIZE + 8;
  const SVG_H = PLR_Y + TH + 10;

  function tx(i) { return PAD + i * (TW + GAP); }

  const lastAiX = tx(n - 1) + TW;
  const lastPlrX = tx(n - 1) + TW;
  const lastAiY = AI_Y + TH / 2;
  const lastPlrY = PLR_Y + TH / 2;
  const endCX = END_X + END_SIZE / 2;
  const endCY = END_Y + END_SIZE / 2;

  // Cross point for intertwining effect: lines intentionally cross
  const crossX = lastAiX + (END_X - lastAiX) * 0.45;
  const aiMidY = endCY + 16;  // AI line dips below center
  const plrMidY = endCY - 16; // Player line rises above center

  const goodCheatColor = '#c08820';
  const badCheatColor = '#c42b24';

  function renderTile(i, y, pathKey, isToken, hasCheat, cheatGood, clickable) {
    const x = tx(i);
    const isStart = i === 0;
    let fill = '#110d08', stroke = '#2a1e16', sw = 1;
    if (isToken) { fill = pathKey === 'player' ? '#201800' : '#180800'; stroke = pathKey === 'player' ? '#c08820' : '#c42b24'; sw = 2; }
    if (hasCheat) { fill = cheatGood ? '#190f00' : '#160400'; stroke = cheatGood ? '#c08820' : '#c42b24'; sw = 1.5; }
    if (isStart) { fill = '#0c100a'; stroke = '#2a3020'; }
    if (clickable) { stroke = '#c08820'; sw = 2; }

    return (
      <g key={`${pathKey}-${i}`} onClick={() => clickable && onTileClick(i, pathKey)} style={{ cursor: clickable ? 'pointer' : 'default' }}>
        <rect x={x} y={y} width={TW} height={TH} fill={fill} stroke={stroke} strokeWidth={sw}/>
        {clickable && <rect x={x - 3} y={y - 3} width={TW + 6} height={TH + 6} fill="none" stroke="#c08820" strokeWidth="1" strokeDasharray="3 2" opacity="0.7"/>}
        {isStart && <text x={x + TW / 2} y={y + TH / 2 + 4} textAnchor="middle" fontFamily="Bebas Neue,sans-serif" fontSize="9" fill="#2a3020">S</text>}
        {hasCheat && !isStart && (
          <text x={x + TW / 2} y={y + TH / 2 + 4} textAnchor="middle" fontFamily="Bebas Neue,sans-serif" fontSize="8" fill={cheatGood ? goodCheatColor : badCheatColor}>
            {(window.CHEATS_DATA && window.CHEATS_DATA[hasCheat]) ? window.CHEATS_DATA[hasCheat].name.slice(0, 2) : '??'}
          </text>
        )}
        {isToken && (
          <circle cx={x + TW / 2} cy={y + TH / 2} r={9} fill={pathKey === 'player' ? '#c08820' : '#c42b24'} opacity="0.85">
            <animate attributeName="opacity" values="0.85;0.5;0.85" dur="1.4s" repeatCount="indefinite"/>
            <animate attributeName="r" values="9;10;9" dur="1.4s" repeatCount="indefinite"/>
          </circle>
        )}
        {isToken && (
          <text x={x + TW / 2} y={y + TH / 2 + 4} textAnchor="middle" fontFamily="Bebas Neue,sans-serif" fontSize="10" fill={pathKey === 'player' ? '#0d0908' : '#0d0908'}>
            {pathKey === 'player' ? 'U' : 'E'}
          </text>
        )}
      </g>
    );
  }

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ display: 'block', minWidth: SVG_W, height: SVG_H }}>
        {/* Row labels */}
        <text x="2" y={AI_Y - 2} fontFamily="Press Start 2P,monospace" fontSize="5" fill="#504540" letterSpacing="1">AI</text>
        <text x="2" y={PLR_Y - 2} fontFamily="Press Start 2P,monospace" fontSize="5" fill="#504540" letterSpacing="1">YOU</text>

        {/* Connecting lines — they cross (intertwine) before END */}
        {/* AI path line: goes from end of AI row, dips to aiMidY, reaches END center */}
        <path
          d={`M${lastAiX},${lastAiY} Q${crossX},${aiMidY} ${endCX},${endCY}`}
          fill="none" stroke="#c42b24" strokeWidth="1.5" opacity="0.5" strokeDasharray="5 3"
        />
        {/* Player path line: rises to plrMidY, reaches END center */}
        <path
          d={`M${lastPlrX},${lastPlrY} Q${crossX},${plrMidY} ${endCX},${endCY}`}
          fill="none" stroke="#c08820" strokeWidth="1.5" opacity="0.5" strokeDasharray="5 3"
        />
        {/* X mark at cross point */}
        <circle cx={crossX} cy={(aiMidY + plrMidY) / 2} r="3" fill="none" stroke="#c42b24" strokeWidth="1" opacity="0.4"/>

        {/* AI tiles */}
        {Array.from({ length: n }).map((_, i) => {
          const bc = boardCheats.find(c => c.path === 'ai' && c.pos === i);
          const clickable = placingCheat && i !== 0 && placingType === 'bad';
          return renderTile(i, AI_Y, 'ai', aiPos === i, bc ? bc.cheatId : null, false, clickable);
        })}

        {/* Player tiles */}
        {Array.from({ length: n }).map((_, i) => {
          const bc = boardCheats.find(c => c.path === 'player' && c.pos === i);
          const clickable = placingCheat && i !== 0 && placingType === 'good';
          return renderTile(i, PLR_Y, 'player', playerPos === i, bc ? bc.cheatId : null, true, clickable);
        })}

        {/* END tile */}
        <rect x={END_X} y={END_Y} width={END_SIZE} height={END_SIZE} fill="#1a0808" stroke="#c42b24" strokeWidth="2.5"/>
        <rect x={END_X - 3} y={END_Y - 3} width={END_SIZE + 6} height={END_SIZE + 6} fill="none" stroke="#c42b24" strokeWidth="1" opacity="0.3">
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.5s" repeatCount="indefinite"/>
        </rect>
        {/* END tile cross decoration */}
        <line x1={endCX} y1={END_Y + 4} x2={endCX} y2={END_Y + END_SIZE - 4} stroke="#c42b24" strokeWidth="1" opacity="0.4"/>
        <line x1={END_X + 4} y1={endCY} x2={END_X + END_SIZE - 4} y2={endCY} stroke="#c42b24" strokeWidth="1" opacity="0.4"/>
        <text x={endCX} y={endCY + 5} textAnchor="middle" fontFamily="Bebas Neue,sans-serif" fontSize="11" fill="#c42b24" letterSpacing="1">END</text>

        {/* IF either token is at end */}
        {playerPos === pathLen - 1 && (
          <circle cx={endCX + 8} cy={endCY} r="8" fill="#c08820" opacity="0.9">
            <animate attributeName="r" values="8;11;8" dur="0.6s" repeatCount="indefinite"/>
          </circle>
        )}
        {aiPos === pathLen - 1 && (
          <circle cx={endCX - 8} cy={endCY} r="8" fill="#c42b24" opacity="0.9">
            <animate attributeName="r" values="8;11;8" dur="0.6s" repeatCount="indefinite"/>
          </circle>
        )}
      </svg>
    </div>
  );
};

// ── Cheat Tile (for bottom strip) ─────────────────────────────────────────────
const CheatTile = ({ cheat, selected, onBoard, onClick, active }) => {
  const isGood = cheat.type === 'good';
  const accent = isGood ? '#c08820' : '#c42b24';
  const dimFrame = isGood ? '#4a3010' : '#4a1010'; // always-visible type colour
  const frameBright = active || selected ? accent : dimFrame;
  return (
    <div onClick={onClick} style={{
      width: 72, minWidth: 72, height: 72,
      background: active ? (isGood ? '#1e1500' : '#180400') : selected ? (isGood ? '#161200' : '#140200') : '#110d08',
      border: `2px solid ${frameBright}`,
      borderLeft: `5px solid ${frameBright}`,
      boxShadow: active ? `0 0 12px ${accent}55` : `inset 3px 0 0 ${dimFrame}22`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 3, cursor: onClick ? 'pointer' : 'default',
      opacity: onBoard ? 0.4 : 1,
      position: 'relative',
      transition: 'all 0.1s',
      userSelect: 'none',
    }}>
      {/* Tier pip */}
      <div style={{
        position: 'absolute', top: 3, right: 3,
        width: 6, height: 6,
        background: cheat.tier === 'high' ? '#c42b24' : cheat.tier === 'medium' ? '#c08820' : '#4e8a4e',
      }}/>
      {/* Type flag — always visible */}
      <div style={{
        position: 'absolute', top: 3, left: 6,
        fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: frameBright, lineHeight: 1,
      }}>
        {isGood ? '▲' : '▼'}
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 11, letterSpacing: 0.5, color: active || selected ? accent : '#907868', textAlign: 'center', lineHeight: 1.1, maxWidth: 64, marginTop: 8 }}>
        {cheat.name}
      </div>
      {onBoard && (
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: '#3a3028', letterSpacing: 0.5 }}>PLACED</div>
      )}
      {active && (
        <div style={{ position: 'absolute', bottom: 3, fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: accent, letterSpacing: 0 }}>SELECT</div>
      )}
    </div>
  );
};

// ── Dice Face Cell (for cross layout) ─────────────────────────────────────────
const DiceFaceCell = ({ value, faceIdx, isCenter, onChange, remaining }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef(null);

  function startEdit() { setEditing(true); setDraft(String(value)); }
  function commitEdit() {
    setEditing(false);
    const v = Math.max(0, parseInt(draft) || 0);
    onChange(v);
  }

  return (
    <div style={{
      width: 72, height: 72,
      background: isCenter ? '#1e1000' : '#130e08',
      border: `2px solid ${isCenter ? '#c08820' : '#3a2a1e'}`,
      boxShadow: isCenter ? '0 0 20px rgba(192,136,32,0.25), inset 0 0 10px rgba(192,136,32,0.05)' : 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative', userSelect: 'none',
    }}>
      {/* Face number */}
      <div style={{ position: 'absolute', top: 3, left: 4, fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: '#3a2e1e', lineHeight: 1 }}>
        F{faceIdx + 1}
      </div>

      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditing(false); }}}
          style={{
            width: 40, background: 'transparent', border: 'none', borderBottom: '2px solid #c08820',
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#c08820',
            textAlign: 'center', outline: 'none',
          }}
        />
      ) : (
        <div
          onClick={startEdit}
          style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, lineHeight: 1,
            color: isCenter ? '#c08820' : '#ddd0b5',
            cursor: 'pointer',
            textShadow: isCenter ? '0 0 12px rgba(192,136,32,0.5)' : 'none',
          }}
        >{value}</div>
      )}

      {/* +/- */}
      <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
        <button onClick={() => onChange(Math.max(0, value - 1))} style={{
          width: 20, height: 18, background: '#1e1810', border: '1px solid #3a2a1e',
          color: '#504540', fontFamily: "'Bebas Neue', sans-serif", fontSize: 14,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        }}>−</button>
        <button onClick={() => { if (remaining > 0) onChange(value + 1); }} style={{
          width: 20, height: 18, background: '#1e1810', border: `1px solid ${remaining > 0 ? '#3a2a1e' : '#1e1810'}`,
          color: remaining > 0 ? '#907868' : '#2a2018', fontFamily: "'Bebas Neue', sans-serif", fontSize: 14,
          cursor: remaining > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        }}>+</button>
      </div>
    </div>
  );
};

// ── 3D Dice Cube ─────────────────────────────────────────────────────────────
const DiceCube3D = ({ faces = [0,0,0,0,0,0], rolling = false, resultFace = 0, size = 72, customTransform = null, borderColor = '#c08820', hidden = false }) => {
  const h = size / 2;
  const faceTransforms = [
    `translateZ(${h}px)`,
    `rotateY(180deg) translateZ(${h}px)`,
    `rotateY(90deg) translateZ(${h}px)`,
    `rotateY(-90deg) translateZ(${h}px)`,
    `rotateX(90deg) translateZ(${h}px)`,
    `rotateX(-90deg) translateZ(${h}px)`,
  ];
  const showFace = [
    `rotateX(-18deg) rotateY(0deg)`,
    `rotateX(-18deg) rotateY(180deg)`,
    `rotateX(-18deg) rotateY(-90deg)`,
    `rotateX(-18deg) rotateY(90deg)`,
    `rotateX(-108deg) rotateY(0deg)`,
    `rotateX(72deg) rotateY(0deg)`,
  ];
  const finalTransform = rolling ? undefined : (customTransform !== null ? customTransform : showFace[resultFace % 6]);
  return (
    <div style={{ perspective: 400, width: size, height: size }}>
      <div style={{
        width: size, height: size,
        position: 'relative', transformStyle: 'preserve-3d',
        transform: finalTransform,
        animation: rolling ? 'diceRoll 0.75s ease-out forwards' : 'none',
        transition: customTransform ? 'none' : undefined,
      }}>
        {faceTransforms.map((tf, i) => (
          <div key={i} style={{
            position: 'absolute', width: size, height: size,
            background: `linear-gradient(135deg, #1e1508 0%, #0f0b06 100%)`,
            border: `2px solid ${borderColor}`,
            boxShadow: 'inset 0 0 8px rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backfaceVisibility: 'hidden',
            transform: tf,
          }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: size * 0.44, color: hidden ? '#2a1e10' : '#ddd0b5', lineHeight: 1, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              {hidden ? '?' : (faces[i] !== undefined ? faces[i] : '?')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Pixel Label ───────────────────────────────────────────────────────────────
const PxLabel = ({ children, color = '#504540', size = 7, style = {} }) => (
  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: size, color, lineHeight: 1.6, letterSpacing: 0.5, ...style }}>
    {children}
  </span>
);

// ── Art Placeholder ──────────────────────────────────────────────────────────
const ArtPlaceholder = ({ label = 'ILLUSTRATION', style = {} }) => (
  <div style={{ position: 'relative', overflow: 'hidden', background: '#080604', ...style }}>
    <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', position: 'absolute', inset: 0 }}>
      <defs>
        <pattern id="hatch45" patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="rotate(45)">
          <rect width="10" height="20" fill="#130c08"/>
          <rect x="10" width="10" height="20" fill="#0e0906"/>
        </pattern>
        <radialGradient id="artGlow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#2a0a04" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#080604" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#hatch45)"/>
      <rect width="100%" height="100%" fill="url(#artGlow)"/>
    </svg>
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <div style={{ width: 60, height: 1, background: '#2a1e14' }}/>
      <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, letterSpacing: 2, color: '#2e2014' }}>
        {label}
      </span>
      <div style={{ width: 60, height: 1, background: '#2a1e14' }}/>
    </div>
  </div>
);

Object.assign(window, { Cauldron, BoardSVG, CheatTile, DiceFaceCell, DiceCube3D, PxLabel, ArtPlaceholder });
