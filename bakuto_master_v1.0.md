================================================================================
BAKUTO — MASTER DOCUMENT
GDD v1.0 + Narrative & Style v0.2
================================================================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART I — GAME DESIGN DOCUMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bakuto is a browser-based roguelite dice-racing game with a real-time
gambling economy built around time. The player descends through an infinitely
deep procedurally generated dungeon set in Hell, fighting AI opponents one
level at a time. Each fight is a turn-based race across a gameboard with two
converging paths. The player bets time, places traps and buffs on the board
using reusable cheats, and rolls a customized dice to outrace the opponent.
The deeper the dungeon, the harder the conditions.

The player's core resource is time — a 24-hour clock that runs in real time,
continuously, even when the game is closed. Every transaction in the game
costs or earns time. When the clock hits zero, everything is lost.

The AI enters each fight with a finite fight pool. The player wins a fight
by draining that pool to zero through winning mini-rounds. The AI's fight
pool is visible to the player at all times during a fight. The player's clock
is the only resource that runs in real time — the AI's pool only moves when
pots are resolved.

Platform:
  - Browser (desktop + mobile)
  - PWA-ready for iOS/Android homescreen installation (model: Pokerogue)
  - Tap/click only input — no keyboard required
  - Adaptive layout for both portrait and landscape orientations
  - Dark theme only
  - Medium base UI size — balanced density
  - Sharp and angular shape language throughout

Theme:
  - Setting: a dungeon inside Hell (Jigoku)
  - Tone: balanced between dark/gritty and chaotic/absurd
  - Art direction to be decided in a later development phase
  - Illustrated icons for cheats, dice faces, and stats
  - 3D dice rendering; all other UI elements are 2D
  - Animations: moderate — nothing GPU-heavy on mobile

Economy:
  - One single time pool shared across all game states
  - The timer runs in real time at all times — it never pauses
  - True roguelite: time hitting zero resets everything


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. GAME STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The game has two modes:

  MODE A — OFISU
  ──────────────
  The main hub screen. The player returns here between dungeon runs.
  Contains:
    - Main menu and settings/options
    - Player's current time display (live countdown)
    - Player's full cheat inventory (all owned cheats, illustrated)
    - "Descend" button to begin or resume a run
    - Access to all owned cheats for review

  Note: the timer does not pause in the Ofisu. Being idle costs time.

  MODE B — DUNGEON (Jigoku)
  ──────────────────────────
  The active gameplay mode. The player descends level by level through a
  procedurally generated dungeon. Each level is exactly one fight against
  an AI opponent. The dungeon has no end — it is infinitely deep.

  The level counter tracks regular fight levels only. Back Room and Boss
  levels do not increment the counter.

  Special levels (appearing every 7 regular fight levels — levels 7, 14,
  21, 28 ...):
    - THE BACK ROOM: A shop screen. Offers 4 randomly selected cheats for
      purchase with time. The player may buy up to 4 cheats per visit as
      long as they have sufficient time remaining. Inventory is randomized
      fresh every visit. The clock continues running during the visit.
      Back Room and Boss occur on the same special level — the Back Room
      comes first, then the Boss fight immediately after.
    - BOSS FIGHT: A fight against a stronger AI opponent on the same level
      as the Back Room. The player shops first, then fights. Boss-specific
      mechanics are deferred to a later design phase — for the prototype,
      bosses use the same fight rules as regular opponents with a larger
      fight pool.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. THE TIME RESOURCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Time is the player's sole resource. It functions as currency, health, and
the run's lifespan simultaneously.

Starting time:
  - Every fresh run begins with exactly 24 hours on the clock
  - After a roguelite reset, the clock resets to 24 hours

Real-time decay:
  - The clock counts down in real time, always
  - It does not pause in the Ofisu, in menus, in the Back Room, or
    when the game is closed entirely
  - A player who closes the game and returns hours later will find their
    clock reduced accordingly
  - A player can genuinely lose their run while not playing

Run end conditions:
  There are two independent loss triggers. Either one ends the run
  immediately with no grace period:

  1. The clock reaches zero at any point — mid-fight, in the Ofisu,
     in the Back Room, or while the game is closed.
  2. The player's remaining time falls below the blind fee amount
     required to start the next mini-round. The minimum threshold is
     the blind fee that was paid at the start of the current fight's
     first mini-round — a fixed floor established at fight entry.
     This prevents percentage-based fees from creating an infinite loop
     of infinitesimally small payments.

  A full roguelite reset triggers instantly on either condition (see
  Section 10).

Time transactions:
  All in-game actions that involve the economy use time as currency:

  COSTS TIME:
    - Blind fee (paid at the start of each mini-round by both the player
      and the AI)
    - Cheat purchases at the Back Room
    - Cheat activation costs (when a cheat tile is landed on by the
      player, or when the AI lands on a player-placed cheat)

  EARNS TIME:
    - Winning a mini-round (claiming the pot)
    - When the AI lands on a player-placed BAD FOR THEM cheat: the
      activation cost is paid directly to the player's clock

The AI and time:
  The AI contributes the same blind fee amount as the player into every
  pot, drawn from infinite reserves. The AI also enters each fight with
  a finite fight pool — a separate resource that depletes only when the
  player wins mini-rounds (see Section 3.1). The AI's clock never runs
  in real time. The existential pressure falls entirely on the player.

3.1 THE AI FIGHT POOL

  The AI's fight pool is a finite time reserve, separate from its
  infinite blind fee reserves. It exists only for the duration of a
  single fight and resets fully between fights.

  Pool size:
    AI fight pool = X × current blind fee at fight start
    where X is determined by dungeon depth tier:

    | Levels | X (mini-round wins to end fight) |
    |--------|----------------------------------|
    | 1–5    | 3                                |
    | 6–15   | 4                                |
    | 16–30  | 5                                |
    | 31+    | 6                                |

  Depletion:
    Each time the player wins a mini-round, the AI's mirrored blind fee
    contribution for that round is deducted from the fight pool. The
    blind fee scales with depth, but X remains fixed per tier — a fight
    at any depth within a tier always takes the same number of wins to
    complete. Fight length and economic pressure scale independently.

  Fight end:
    When the AI fight pool reaches zero the fight ends immediately.
    The player advances to the next dungeon level.

  Visibility:
    The AI's remaining fight pool is displayed to the player at all times
    during a fight as a time value. The player always knows exactly how
    many more mini-round wins are needed to end the fight.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. THE DUNGEON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Structure:
  - Levels are procedurally generated
  - One fight per regular level
  - The level counter tracks regular fight levels only
  - Depth drives four scaling systems: path length, blind fee percentage,
    AI dice cap, and AI fight pool size (via X)

Depth tiers:
  All four scaling systems use the same four depth tiers, creating clear
  phase boundaries that the player can feel across the whole run:

    Tier 1:  Levels  1–5
    Tier 2:  Levels  6–15
    Tier 3:  Levels 16–30
    Tier 4:  Levels 31+

Depth scaling systems:

  PATH LENGTH
    Stepped by depth tier. Both paths within a single fight are always
    equal in length. The player does not know the path length before a
    fight begins — it is revealed only when the battle phase starts.

    | Tier | Levels | Path length |
    |------|--------|-------------|
    | 1    | 1–5    | 8 tiles     |
    | 2    | 6–15   | 11 tiles    |
    | 3    | 16–30  | 15 tiles    |
    | 4    | 31+    | 19 tiles    |

  BLIND FEE
    Expressed as a fixed percentage of the player's current remaining
    time. Deducted at the start of each mini-round. Both the player and
    the AI pay the same percentage — the AI's contribution mirrors the
    player's fee exactly, drawn from infinite reserves.

    | Tier | Levels | Blind fee per mini-round |
    |------|--------|--------------------------|
    | 1    | 1–5    | 2%                       |
    | 2    | 6–15   | 3%                       |
    | 3    | 16–30  | 5%                       |
    | 4    | 31+    | 7%                       |

  AI DICE CAP
    The AI's maximum allowed dice sum. Increases slowly with depth.
    The gap over the player's cap of 21 never exceeds +4.

    | Tier | Levels | AI dice sum cap |
    |------|--------|----------------|
    | 1    | 1–5    | 22             |
    | 2    | 6–15   | 23             |
    | 3    | 16–30  | 24             |
    | 4    | 31+    | 25             |

  AI FIGHT POOL (X)
    See Section 3.1.

Exiting the dungeon:
  - The player can voluntarily exit at the quit prompt between
    mini-rounds
  - On voluntary exit: all remaining time and all cheats are kept
  - The timer continues running after exit — there is no safe state
  - On voluntary exit: dungeon progress saves to the last Back Room
    level the player passed through. On re-entry the player resumes
    at that level with no shopping available — the Back Room appears
    as a location only. If the player quits before reaching their
    first Back Room (level 7), they restart from level 1 on re-entry.
  - On either loss condition: full roguelite reset (see Section 10)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. THE DICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Both the player and the AI use a custom 6-sided dice.

Player dice:
  - The player manually assigns a value to each of the 6 faces
  - The sum of all 6 face values cannot exceed 21 at configuration time
  - Valid face values: 0 (zero) and any positive integer
  - A face value of 0 means: when rolled, the player does not move that
    turn. This is always a wasted turn — a punishment whether caused by
    rolling a 0 or by a cheat effect reducing movement to 0
  - Maximum of 3 faces may be set to 0. This is a hard rule enforced
    at configuration time to prevent degenerate zero-heavy strategies
  - There is no minimum sum requirement — the player may descend with
    any valid configuration including very weak ones
  - On a fresh run after a reset, the dice is blank — all 6 faces are
    unassigned. The player must configure the dice before descending
    for the first time. The configuration screen is mandatory on the
    first run and always available (but skippable) before subsequent
    fights within a run
  - The dice configuration persists across fights within a run
  - The player may reconfigure their dice during Phase 1 (Preparation)
    before every fight

  Important: the 21 sum cap is enforced only at configuration time.
  Mid-fight effects (e.g. KASUMASHI, MEZURI) can push the active dice
  sum above or below 21. This is intentional and by design. Mid-fight
  modifiers never alter the saved dice configuration.

AI dice:
  - The AI also uses a 6-faced dice with assigned values per face
  - The AI's dice sum cap is depth-scaled (see Section 4)
  - The AI has no restriction on the number of zero faces it may use
  - Both the player and the AI configure their dice simultaneously
    during Phase 1. Both configurations are revealed to both sides
    at the same time after configuration is complete. This allows
    fully informed cheat placement decisions on both sides.
  - The AI's configuration logic is tunable (to be developed during
    the AI implementation phase)

Dice effect stacking:
  - Multiple effects can apply to the same dice face simultaneously
  - Example: KASUMASHI adds +3 to a face while MEZURI reduces the
    highest face by 2. Both apply independently and stack on the
    same face if applicable
  - Face values cannot go below 0 due to any effect. Reduction effects
    floor at 0 — movement can never reverse

Duration definition:
  All cheat effects that last a number of "rounds" use the following
  definition: one round = one full cycle consisting of one player turn
  followed by one AI turn. A 2-round effect lasts 2 full cycles.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. CHEATS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cheats are the primary strategic layer of the game. They are reusable tools
that the player owns permanently and deploys onto the gameboard before and
during fights. In the narrative, cheats are Corrupt Oni — hell's enforcers
for hire, placed on the board as tile-occupying demons. Their activation
cost is taken at the moment they earn it, not at hiring time.

6.1 CHEAT OWNERSHIP & LIFECYCLE

  - Once acquired, a cheat is owned permanently for the duration of the run
  - Cheats are never permanently consumed by normal gameplay:
      · Placing a cheat on the board does NOT remove it from inventory
      · Activating a cheat (someone landing on its tile) removes only the
        tile copy from the board. The original in inventory is untouched
      · Cheats brought into a fight but never activated are simply
        available again for the next fight — nothing needs to be returned
  - The only way to lose cheats is a full roguelite reset (Section 10)
  - Placing a cheat is a copy operation, not a transfer:
      The board instance and the inventory instance are separate.
      Destroying the board instance leaves the inventory instance intact.

6.2 CATEGORIES

  GOOD FOR U
    Buffs that benefit whoever placed them.
    Must be placed on the placer's own path.
    Activates when the placer lands on that tile.

  BAD FOR THEM
    Debuffs that harm the opponent.
    Must be placed on the opponent's path.
    Activates when the opponent lands on that tile.

  Both categories are fully symmetric — both the player and the AI have
  access to both types and follow the same placement rules. The AI has
  unlimited access to all cheat types and is not subject to a per-fight
  cheat selection cap. This is an intentional asymmetry that scales AI
  difficulty without requiring separate difficulty tiers.

6.3 PLACEMENT RULES

  - Each cheat occupies exactly one tile on the board
  - Only one cheat may occupy a tile at a time — no stacking
  - A player cannot have the same cheat placed more than once on the
    board simultaneously. If Cheat X is already on a tile, placing
    another instance of Cheat X is not allowed until the first is
    activated
  - "Good for u" cheats → own path only
  - "Bad for them" cheats → opponent's path only
  - All placed cheat positions are fully visible to both sides at all
    times. The identity and location of every placed cheat on the board
    is always known. What is hidden is the AI's cheat pool — the player
    cannot see which cheats the AI has available to place next.
  - MISEGANE / FALSE END only activates on forward movement. If a token
    lands on this tile as a result of a bounce-back from any source
    (overshoot reversal, KECHIRASHI, another MISEGANE), the tile does
    not trigger and the token simply occupies that position. No placement
    zone restrictions apply.

  Board presence builds over the course of a fight:
    · During Phase 1 (preparation), each side places exactly one cheat.
    · After each mini-round, the mini-round winner places one additional
      cheat.
    · The fight cheat cap (Section 6.4) defines the player's available
      pool — how many cheats they may select to bring — not a cap on
      simultaneous board presence. A player with a cap of 4 may
      eventually have more than 4 cheats on the board at once if they
      win enough rounds; the cap only limits which cheats are accessible
      for that fight.

6.4 FIGHT CHEAT CAP

  Before each fight the player is shown their cheat cap for that fight.
  The cap is a randomized percentage of the path length, between 10%
  and 50%, floored to the nearest whole number.

  Formula: max_cheats = floor(path_length × random_percentage)
           where random_percentage is between 0.10 and 0.50

  The player is told the resulting cheat cap number (e.g. "4 hires
  allowed") but is NOT told the path length it was derived from. This
  preserves the path length blind while still allowing the player to
  plan their selection.

  Cheats not selected for a fight are unavailable for that fight's
  duration but remain safely in inventory.

6.5 CHEAT ACTIVATION COST

  Activation costs are expressed as a percentage of the player's
  current remaining time. The cost is deducted at the moment of
  activation — when the tile is landed on — not at placement.

  | Tier   | Activation cost                        |
  |--------|----------------------------------------|
  | Low    | 3% of player's current remaining time  |
  | Medium | 7% of player's current remaining time  |
  | High   | 15% of player's current remaining time |

  If activation causes the player's clock to hit zero, the run ends
  immediately, even mid-fight.

  When the AI lands on a player-placed BAD FOR THEM cheat:
    The activation cost is paid directly to the player's clock as a
    time gain. The AI pays nothing from its own resources. The player
    earns time equal to the cheat's activation cost percentage of their
    current remaining time at the moment of activation.

6.6 FULL CHEAT ROSTER — Prototype v1.0

  12 cheats. All are fully implemented. Each is listed with its English
  design name and Japanese Oni name. The Japanese name is the in-game
  UI name (see Section 17).

  ── GOOD FOR U (placed on own path) ──────────────────────────────────────

  HELLSTEP  |  駆け  KAKE
    Effect:     Move forward 2 extra tiles after rolling this turn.
                If the extra movement overshoots the END tile, normal
                overshoot rules apply — excess reverses from END.
    Cost tier:  Low (3%)
    Etymology:  Kake: dash / bet — movement and wagering share a word.

  SOUL ANCHOR  |  止め  TOME
    Effect:     The next time the activating player would overshoot the
                END tile, they land on it exactly instead of bouncing
                back. One-time protection — once the overshoot is
                prevented, the tile copy is consumed as normal. The
                cheat can be placed again in a subsequent mini-round
                to regain protection.
    Cost tier:  Medium (7%)
    Etymology:  Tome: stop — a gambling call to halt.

  LOADED  |  仕込み  SHIKOMI
    Effect:     Reroll your dice once this turn and keep the higher
                result.
    Cost tier:  Low (3%)
    Etymology:  Shikomi: rigging, loading — the prepared cheat.

  DEAD WEIGHT  |  嵩増し  KASUMASHI
    Effect:     Add a temporary +3 to your highest dice face for the
                next 2 rounds (2 full cycles). This can push the active
                dice sum above 21. The +3 is a mid-fight modifier and
                does not alter the saved dice configuration.
    Cost tier:  Medium (7%)
    Etymology:  Kasumashi: padding, illegal inflation.

  PURGATORY LOOP  |  待ち  MACHI
    Effect:     For the next 3 rounds (3 full cycles), rolling a 0
                allows you to reroll once. If the reroll also produces
                a 0, the turn is still wasted — one additional chance
                only, not guaranteed movement.
    Cost tier:  Low (3%)
    Etymology:  Machi: waiting on your winning tile — mahjong term.

  BLOOD PACT  |  血判  KEPPAN
    Effect:     Doubles the total time currently in the pot at the
                exact moment of activation. Any time added to the pot
                after activation is not doubled retroactively. Most
                powerful when the pot is already large.
    Cost tier:  High (15%)
    Etymology:  Keppan: blood seal — the most serious oath possible.

  ── BAD FOR THEM (placed on opponent's path) ──────────────────────────────

  CURSED GROUND  |  足止め  ASHIDOME
    Effect:     Opponent loses their next turn upon landing here.
    Cost tier:  Low (3%)
    Etymology:  Ashidome: foot-stop, detainment.

  HELLFIRE TRAP  |  蹴散らし  KECHIRASHI
    Effect:     Opponent is sent back 3 tiles upon landing here.
    Cost tier:  Medium (7%)
    Etymology:  Kechirashi: scatter by kicking — violent, contemptuous.

  DICE ROT  |  目削り  MEZURI
    Effect:     Opponent's highest dice face value is reduced by 2 for
                the next 3 rounds (3 full cycles). Face values floor
                at 0 and cannot go negative. Multiple effects can stack
                on the same face.
    Cost tier:  Medium (7%)
    Etymology:  Mezuri: shaving the face — the oldest dice-cheating
                method. Me means both "eye" and "dice face" in Japanese.

  FALSE END  |  見せ金  MISEGANE
    Effect:     Opponent bounces back 5 tiles instead of finishing the
                mini-round upon landing here. Only activates on forward
                movement — does not trigger if the opponent lands here
                as a result of a bounce-back from any source.
    Cost tier:  High (15%)
    Etymology:  Misegane: show money — fake currency in a scam.

  DEBT COLLECTOR  |  取り立て  TORITATE
    Effect:     Drains an amount equal to one full blind fee directly
                from the AI's current fight pool upon landing. This
                directly accelerates the fight win condition — it is
                the only cheat that bypasses the pot and attacks the
                AI's fight pool directly.
    Cost tier:  High (15%)
    Etymology:  Toritate: aggressive debt collection.

  LEAD BOOTS  |  足枷  ASHIKASE
    Effect:     Opponent's movement is halved (rounded down) for the
                next 2 rounds (2 full cycles). If halving results in 0,
                the turn is fully wasted — identical in outcome to
                rolling a 0.
    Cost tier:  Medium (7%)
    Etymology:  Ashikase: leg shackles, fetters.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. THE GAMEBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Structure:
  - Two separate paths that converge into one shared END tile
  - Each path has its own START tile
  - Path length is equal for both sides within any single fight
  - Path length is depth-scaled and stepped (see Section 4)
  - Tiles are discrete positions — movement is always tile-by-tile
  - The player does not see the board layout before the fight begins.
    The path is revealed only when the battle phase starts.

The game within the game is Sugoroku — a traditional Japanese dice-racing
board game. Jigoku did not invent a new torment. It runs the game gamblers
already loved, forever, with real stakes.

Layout (abstract):

  [PLAYER START] → [tile] → [tile] → [tile] → ... ──→ [END]
                                                          ↑
  [AI START]     → [tile] → [tile] → [tile] → ... ──────┘

Tile states:
  - Empty:  a plain movement position with no effect
  - Cheat:  occupied by a placed cheat. The cheat activates and its
            tile copy is destroyed when landed on (subject to MISEGANE's
            forward-movement-only rule).

The board surface is physical — stone, worn wood, or ritual paper depending
on depth. Tiles are distinct, hand-marked. The END tile bears Emma-Ō's court
seal — the only official marking still visible on the board.

Movement and the END tile:
  - A player must land exactly on the END tile to finish a mini-round
  - If a roll would carry a player past the END tile, they overshoot.
    Excess movement is counted backward from the END tile.

  Overshoot example:
    Player is 3 tiles from END and rolls 5.
    → Moves 3 forward (reaches END position), then 2 backward.
    → Player ends up 2 tiles before END.
    → Player must still land exactly on END on a future turn.

  Simultaneous END arrival:
    Both sides cannot land on the END tile on the same roll since turns
    strictly alternate. The side that reaches END first within the turn
    order wins that mini-round. Initiative is therefore a fixed tactical
    condition with real consequences.

  Design implication:
    High dice face values are powerful mid-path but become a liability
    near the END tile. This creates meaningful tension around dice
    configuration choices.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. FIGHT FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A fight consists of a one-time preparation phase followed by a repeating
loop of mini-rounds. The loop continues until one of three conditions is
met: the player wins by draining the AI fight pool to zero; the player's
clock hits zero; or the player's remaining time falls below the fight's
minimum blind fee threshold.

━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 — PREPARATION
(Runs once per fight, before the first mini-round)
━━━━━━━━━━━━━━━━━━━━━━

  Step 1 — Cheat cap reveal  [UI: "[N] hires allowed"]
    The player is shown their cheat cap for this fight: a whole number
    derived from a random percentage (10%–50%) of the path length.
    The player sees only the cap number, not the path length itself.

  Step 2 — Simultaneous dice configuration  [UI: "Set your faces"]
    Both the player and the AI configure their dice simultaneously.
    The player reviews their saved configuration and may reassign any
    or all faces. Rules enforced at configuration time:
      · Sum of all 6 faces must not exceed 21
      · Maximum 3 faces may be set to 0
    Once the player confirms, both configurations are locked and both
    are revealed to both sides at the same time.  [UI: "Lock in"]
    The player can now see the AI's full dice configuration and vice
    versa before any cheats are placed.

  Step 3 — Cheat selection  [UI: "Pick your crew"]
    The player selects which cheats from their inventory to bring.
    Maximum: the cheat cap revealed in Step 1.
    Only selected cheats may be placed during this fight.
    Unselected cheats remain in inventory and are safe.

  Step 4 — Blind fee payment  [UI: "Ante up"]
    Both the player and the AI pay the blind fee simultaneously.
    Player amount: the depth-scaled percentage of the player's
    remaining time. This payment also establishes the minimum blind fee
    threshold for this fight — the loss condition floor.
    AI amount: exactly mirrors the player's fee, drawn from infinite
    reserves. Both payments go directly into the pot.
    AI fight pool is initialized: X × this blind fee amount.

  Step 5 — Cheat placement  [UI: "Post your crew"]
    Both sides place one cheat onto the board simultaneously. Both
    sides have full knowledge of each other's dice configurations.
    Rules:
      · "Good for u" → own path only
      · "Bad for them" → opponent's path only
      · Activation cost is deducted from player's clock on landing
        (or paid to player if AI lands on player's cheat)
      · No cheat may be placed twice on the board simultaneously
      · All placements are visible to both sides once placed

  Step 6 — Initiative roll  [UI: "First roll"]
    Both dice are rolled simultaneously. Higher result goes first.
    Initiative is fixed for the entire fight — it does not re-roll
    between mini-rounds. Going first is a meaningful and persistent
    tactical advantage.
    On a tie: both dice are re-rolled until the tie is broken.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2 — BATTLE
(Repeating mini-round loop)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  TURN STRUCTURE
    The active side rolls their dice.
    They move forward along their path by the rolled number of tiles.
    Rolling 0 or being reduced to 0 by an effect: turn is fully wasted.
    No movement occurs. This applies equally to player and AI.
    If the landed tile contains a cheat:
      · The cheat activates immediately (subject to MISEGANE's
        forward-movement-only rule)
      · Its effect resolves in full before the turn ends
      · If the player lands on their own GOOD FOR U cheat:
        activation cost is deducted from the player's clock
      · If the AI lands on a player-placed BAD FOR THEM cheat:
        activation cost is paid to the player's clock as a time gain
      · If activation causes the player's clock to hit zero, the run
        ends instantly — even mid-turn
      · The tile copy of the cheat is destroyed and removed from the
        board. The original in inventory is completely unaffected.
    Then the other side takes their turn. Turns strictly alternate.
    One player turn + one AI turn = one full round for duration purposes.

  ENDING A MINI-ROUND
    A mini-round ends the instant one side lands exactly on the END tile.
    That side is the mini-round winner.

  END-OF-MINI-ROUND SEQUENCE

    1. The winner claims the entire pot immediately.

       If the player wins:
         · The full pot time is added to the player's clock.
           [UI: "Pot's yours"]
         · One blind fee's worth is deducted from the AI's fight pool.
         · If the AI fight pool reaches zero: fight ends, player
           advances to the next dungeon level.

       If the AI wins:
         · The pot time is lost — the player's blind fee is gone and
           the AI's mirrored contribution evaporates.
           [UI: "Pot's gone"]
         · The AI fight pool is unaffected.

    2. If the fight has not ended, the player is shown a decision prompt:

         [ QUIT ]  [UI: "Walk away"]
           Exit the dungeon.
           Player keeps all remaining time on the clock.
           Player keeps all cheats.
           The blind fee already paid into this round's pot is spent —
           it was already in the pot before the quit prompt appeared.
           The timer continues running after exit. There is no safe
           state. Progress saves to the last Back Room level.
           Game returns to the Ofisu (Mode A).

           Player line (rotates):
             "While I still can."
             "Not yet dead."
             "Quit while I'm behind."

           House line (always present, does not rotate):
             A true gambler never quits.

         [ CONTINUE ]  [UI: "Next hand"]
           Proceed to the next mini-round.

    3. If CONTINUE is chosen:
         Check loss conditions before proceeding:
           · If player's remaining time < fight's minimum blind fee
             threshold: run ends immediately, roguelite reset.
           · If player's clock is at zero: run ends immediately,
             roguelite reset.
         If neither condition is met:
           Both the player and the AI pay the blind fee again into a
           new pot. The AI mirrors the player's fee exactly.

    4. The mini-round winner places one new cheat onto the board.
         Same placement rules as Phase 1 Step 5 apply.
         The one-instance-per-cheat-on-board rule still applies.
         All cheat positions remain visible to both sides.

    5. Both sides return to their respective START tiles.

    6. A new mini-round begins with the same initiative order.

  FIGHT END CONDITIONS SUMMARY
    The fight ends immediately under any of these conditions:

    Player wins:
      · AI fight pool reaches zero.
      → Player advances to the next dungeon level.
      → Cheats placed on the board that were never activated are
        simply available for the next fight — they never left inventory.

    Player loses:
      · Player's clock hits zero at any point.
      · Player's remaining time falls below the fight's minimum blind
        fee threshold when CONTINUE is chosen.
      → Full roguelite reset (see Section 10).


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. ECONOMY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Time pool:
  - One single time pool at all times — shared across all game states
  - The pool is a live countdown clock, always running in real time
  - The timer does not pause for any reason — not in menus, not in
    the Ofisu, not when the game is closed
  - Starting time for a fresh run after a reset: 24 hours

The pot:
  - Created fresh at the start of each mini-round
  - Funded by both the player's blind fee and the AI's mirrored
    contribution
  - The AI's contribution exactly equals the player's blind fee each
    round, drawn from infinite reserves
  - KEPPAN / BLOOD PACT doubles the time in the pot at the exact moment
    of activation. Time added after activation is not doubled
    retroactively.
  - If the player wins the mini-round, the full pot time is added to
    their clock and one blind fee's worth is removed from the AI's
    fight pool
  - If the AI wins the mini-round, the pot time is lost — the player's
    blind fee is gone and the AI's contribution evaporates
  - Blind fee already paid is not refunded if the player quits

Cheat activation cost:
  - Low: 3% / Medium: 7% / High: 15% of current remaining time
  - Deducted from player's clock when player lands on own GOOD FOR U
    cheat
  - Paid to player's clock when AI lands on player's BAD FOR THEM cheat
  - If deduction drains the clock to zero, the run ends immediately

The Back Room:
  - Appears every 7 regular fight levels, before the Boss fight
  - 4 random cheats available per visit, inventory rerolled each visit
  - Player may buy up to 4 cheats per visit (limited by remaining time)
  - The clock continues running during the visit — browsing costs
    passive time in addition to explicit purchase costs
  - Purchase costs are multiples of the current depth's blind fee:

    | Cheat tier | Purchase cost            |
    |------------|--------------------------|
    | Low        | 1× current blind fee     |
    | Medium     | 1.5× current blind fee   |
    | High       | 2× current blind fee     |

  - Purchased cheats are added permanently to inventory for this run


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. ROGUELITE RESET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Triggers:
  A roguelite reset fires immediately under either condition:
  1. The player's clock reaches zero — mid-fight, in the Ofisu, in
     the Back Room, or while the game is closed.
  2. The player's remaining time falls below the fight's minimum blind
     fee threshold when choosing to continue.

On reset, everything is lost:
  - Time (clock resets to 24 hours)
  - Entire cheat inventory (resets to empty)
  - Dungeon progress (level counter resets to 0)
  - Dice configuration (resets to blank — all 6 faces unassigned)

The death screen is shown before the Ofisu loads on a fresh run.
See Section 19 for the death screen specification.

Nothing carries over between runs. No meta-progression exists in the
current design scope. Meta-progression may be considered in a future
design phase.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. INFORMATION VISIBILITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  | Information                        | Player sees | AI sees |
  |------------------------------------|-------------|---------|
  | Player's dice configuration        | Yes         | Yes     |
  | AI's dice configuration            | Yes*        | Yes     |
  | Player's cheat placements on board | Yes         | Yes     |
  | AI's cheat placements on board     | Yes         | Yes     |
  | Player's cheat inventory / pool    | Yes         | Yes     |
  | AI's cheat pool (available cheats) | No          | Yes     |
  | AI's fight pool (time remaining)   | Yes         | Yes     |

  * Both configurations are revealed simultaneously after both sides
    have locked in. Neither side sees the other's config during
    configuration itself.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. OPEN DESIGN QUESTIONS (DEFERRED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following items are explicitly deferred to a later design phase.
All other systems in this document are fully specified.

  AI
    - AI cheat activation cost mechanic: when the AI lands on a player's
      BAD FOR THEM cheat, the player receives the time value. The
      question of whether the AI "pays" anything from its own resources
      is deferred. For the prototype the cost is simply credited to the
      player and the AI resource is unaffected beyond that.
    - Boss fight mechanics: how the Boss differs from a regular fight
      beyond a larger fight pool. Stubbed as a regular fight for the
      prototype.
    - AI dice configuration logic: the strategy the AI uses to assign
      face values. To be designed during the AI implementation phase.
    - AI cheat selection and placement strategy: to be designed during
      the AI implementation phase.

  PROGRESSION
    - Meta-progression between full resets: explicitly out of scope
      for the prototype.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. TECHNICAL NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  - Browser-based, no backend required for the prototype
  - Real-time clock stored client-side via localStorage for the
    prototype using a saved timestamp and Date.now() delta so the
    clock continues draining when the game is closed. Acknowledged
    as exploitable. A tamper-proof backend time solution will be
    implemented before any public release.
  - PWA manifest required for iOS/Android homescreen installation
  - 3D dice animation must be CSS/WebGL and lightweight enough for
    mid-range mobile — no heavy physics engines
  - All other UI elements are flat 2D
  - Progressive disclosure pattern for battle UI — information
    revealed on tap rather than shown all at once
  - Illustrated icons required for: all 12 cheats, all dice face
    values, all stat/time displays
  - Portrait and landscape layouts both required — fully adaptive
  - English only — no i18n infrastructure needed at this stage
  - All tunable economy values (blind fee percentages, activation
    costs, Back Room prices, X values, AI dice caps, path lengths)
    must be defined in a single config object to allow tuning without
    touching game logic


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART II — NARRATIVE & STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. PREMISE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A bakuto — a professional gambler from Japan's historical gambling underworld
— died broke, in debt, having lost everything to the dice. Condemned to Jigoku
not for violence or malice, but for a life surrendered to tobaku.

Emma-Ō did not chain them to a rock. He put them at a table.

In Jigoku, existence is measured in time — literally. The player arrived with
24 hours of soul-substance remaining. Every blind fee, every bad beat, every
minute spent in the Back Room is their existence draining away. Win pots and
buy more time — more self. Hit zero and there is nothing left to condemn. No
afterlife beyond the afterlife. Just gone.

Somewhere near the bottom of Jigoku sits a Debt Office — a bureaucratic corner
of damnation where souls can formally petition for release if they can pay off
what they owe. The price is astronomical. The depth unknown. The player
descends on faith. And habit.

The sin that condemned them is the only tool they have to escape. They have
thought about this. They do not have a good answer.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. THE WORLD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

JIGOKU
  The Buddhist hell realm. Vast, bureaucratic, corrupt. Run by Emma-Ō and
  administered by Oni officials who process souls like paperwork. It has
  rules, ranks, and a functioning economy — all of it exploitable for the
  right price.

THE GAME
  The race the player runs is Sugoroku — a traditional Japanese dice-racing
  board game. Jigoku did not invent a new torment. It runs the game gamblers
  already loved, forever, with real stakes.

OFISU  [Mode A]
  Emma-Ō's waiting room. Where souls are processed between judgments. The
  player sits here between dungeon runs — not safe, just paused. The timer
  on the wall is still running. Oni clerks work at desks in the background
  and do not acknowledge the player. The soul registry — the Myōseki — is
  visible on the wall, the player's entry ticking down.

THE CORRUPT ONI
  Hell's enforcers and officials. The ones willing to take a cut of the
  player's remaining existence to intervene on their behalf — plant a tile,
  boost a roll, shackle an opponent. They are not loyal. They are not
  friendly. They will take exactly what was agreed to and nothing less.
  Hiring them is the cheat. They are the cheat.

THE BACK ROOM
  A corner of Jigoku's gambling infrastructure where off-the-record
  arrangements are made. Oni not currently posted anywhere can be hired
  here. Stock changes every visit. The clock keeps running while you browse.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. JAPANESE CULTURAL REFERENCES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The game draws from Japanese Buddhist and Shinto hell mythology and Japan's
gambling culture — historical and contemporary.

  JIGOKU          Buddhist hell realm — the setting
  EMMA-Ō          King and judge of the dead — the unseen authority
  BAKUTO          Professional gambler — the player character archetype
  SUGOROKU        Traditional dice-racing board game — the game within the game
  TOBAKU          Illegal gambling — the condemned sin
  CHŌ-HAN         Street dice game — inspiration for the core dice mechanic
  TERASEN         House cut taken by gambling den operators — the blind fee
  HONBA           Escalating stakes in mahjong — the pot doubling mechanic
  GACHA           Randomized reward pulls — the cheat cap and Back Room stock
  PACHINKO        Mechanical gambling — the procedural dungeon's relentless pace
  KEIBA           Horse racing odds — the risk/reward scaling at depth


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. VISUAL STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MEDIUM
  Pixel art. Dark, high contrast, limited palette. Deliberately ugly where
  it needs to be. Sharp and angular throughout.

PALETTE
  Near-black backgrounds. Desaturated midtones. One or two accent colors
  per context. The Ofisu runs cold — grey, pale blue, bureaucratic red
  stamps. The dungeon shifts from institutional cold tones toward deep red
  and ember as the player descends.

ANIMATION
  Restrained. Flickering, not flowing. Hell does not move smoothly.

JAPANESE VISUAL MOTIFS
  Torii shapes, mon crests, Edo patterns — present in the pixel art as
  structural elements, not decoration.

DUNGEON DEPTH — VISUAL PROGRESSION
  Tier 1 (1–5):    Institutional. Stone corridors, official markings.
                   Oni that look like they have a job title.
  Tier 2 (6–15):   Markings degrade. Oni grow more feral.
                   Geometry becomes less regular.
  Tier 3 (16–30):  Ancient Hell. The original punishment infrastructure,
                   predating Emma-Ō's court. The rules feel older.
  Tier 4 (31+):    No markings. No titles. Just the game.

THE GAMEBOARD
  A physical surface — stone, worn wood, or ritual paper depending on
  depth. Tiles are distinct, hand-marked. The END tile bears Emma-Ō's
  court seal — the only official marking still visible on the board.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18. UI VOCABULARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LANGUAGE RULE
  Three Japanese terms only: Jigoku (the dungeon), Ofisu (the hub), and
  the 12 demon names. All other UI copy is English. Tone throughout:
  den back-room — hushed, transactional, no warmth. No exclamation marks.
  No encouragement.

OFISU
  Timer display        Time remaining
  AI fight pool        Their reserves
  Cheat inventory      On retainer
  Enter dungeon        Descend
  Settings             House rules

PREPARATION PHASE
  Phase header         Before the hand
  Cheat cap reveal     [N] hires allowed
  Dice configuration   Set your faces
  Confirm dice         Lock in
  Dice reveal          Their hand
  Cheat selection      Pick your crew
  Confirm selection    Done
  Blind fee payment    Ante up
  Cheat placement      Post your crew
  Initiative roll      First roll

BATTLE
  Roll button          Roll
  Pot display          In the pot
  AI fight pool        Their reserves
  Continue             Next hand
  Quit prompt          Walk away
  Win mini-round       Pot's yours
  Lose mini-round      Pot's gone
  Fight won            They're done

THE BACK ROOM
  Screen title         The Back Room
  Available cheats     For hire
  Buy                  Take them on
  Leave                Back out

DEATH SCREEN
  Single line from Emma-Ō: "Time's up."
  Tap anywhere to continue.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19. THE 12 ONI — CORRUPT DEMONS FOR HIRE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each Oni occupies one tile on the Sugoroku board. Their cut — the activation
cost — is taken in existence at the moment they earn it, not at hiring time.
The board instance is a copy. The inventory instance is untouched.

See Section 6.6 for full mechanical details.

── GOOD FOR U (posted on own path) ──────────────────────────────────────────

  駆け  KAKE          [HELLSTEP]
                      Move forward 2 extra tiles this turn. Normal
                      overshoot rules apply to the extra movement.
                      (Kake: dash / bet — movement and wagering share
                      a word.)

  止め  TOME          [SOUL ANCHOR]
                      Next overshoot lands exactly on END instead of
                      bouncing back. One-time protection.
                      (Tome: stop — a gambling call to halt.)

  仕込み SHIKOMI      [LOADED]
                      Reroll once this turn, keep the higher result.
                      (Shikomi: rigging, loading — the prepared cheat.)

  嵩増し KASUMASHI    [DEAD WEIGHT]
                      +3 to highest dice face for 2 rounds.
                      Can push active sum above 21. Does not alter
                      saved config.
                      (Kasumashi: padding, illegal inflation.)

  待ち  MACHI         [PURGATORY LOOP]
                      Rolling 0 allows one reroll for 3 rounds.
                      A second 0 still wastes the turn.
                      (Machi: waiting on your winning tile — mahjong.)

  血判  KEPPAN        [BLOOD PACT]
                      Doubles current pot at moment of activation.
                      Time added after activation is not doubled.
                      (Keppan: blood seal — the most serious oath.)

── BAD FOR THEM (posted on opponent's path) ──────────────────────────────────

  足止め ASHIDOME     [CURSED GROUND]
                      Opponent loses their next turn.
                      (Ashidome: foot-stop, detainment.)

  蹴散らし KECHIRASHI [HELLFIRE TRAP]
                      Opponent sent back 3 tiles.
                      (Kechirashi: scatter by kicking.)

  目削り MEZURI       [DICE ROT]
                      Opponent's highest face -2 for 3 rounds.
                      Floor at 0.
                      (Mezuri: shaving the face — the oldest dice
                      cheat. Me = eye and dice face in Japanese.)

  見せ金 MISEGANE     [FALSE END]
                      Opponent bounces back 5 tiles instead of
                      finishing. Only activates on forward movement.
                      (Misegane: show money — fake currency in a scam.)

  取り立て TORITATE   [DEBT COLLECTOR]
                      Drains one blind fee's worth directly from the
                      AI's fight pool.
                      (Toritate: aggressive debt collection.)

  足枷  ASHIKASE      [LEAD BOOTS]
                      Opponent's movement halved (rounded down) for
                      2 rounds. Halving to 0 wastes the turn.
                      (Ashikase: leg shackles, fetters.)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
20. FLAVOR TEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RULES
  One line maximum per moment. Never explains mechanics. Never
  melodramatic. The horror lives in the understatement. Player lines
  rotate — 2 to 3 alternates per moment. The house line does not rotate.

VOICE
  The player: dry, self-aware, sardonic. A bakuto who knows exactly what
  they are doing and exactly why it is a bad idea.
  The house: flat, absolute, indifferent.
  Emma-Ō: speaks once. On death only.

OFISU — on arrival
  "Still here."
  "Back again."
  "The wait never gets shorter."

DESCENDING INTO JIGOKU
  "Down then."
  "One more hand."
  "Let's see how deep it goes."

PREPARATION — configuring the dice
  "Same as always."
  "Maybe different this time."
  "I know what I'm doing."

PREPARATION — posting the crew
  "Crooked as the rest of them."
  "They'll take their cut."
  "Best hires in Jigoku. Unfortunately."

BATTLE — winning a mini-round
  "Mine."
  "More time."
  "Still breathing."

BATTLE — losing a mini-round
  "Gone."
  "There it goes."
  "Paid the house."

BATTLE — fight won (AI pool depleted)
  "Done."
  "Cleaned out."
  "Next."

WALK AWAY PROMPT
  Player line (rotates):
    "While I still can."
    "Not yet dead."
    "Quit while I'm behind."

  House line (always present, does not rotate):
    A true gambler never quits.

THE BACK ROOM — on entry
  "Who's available."
  "Let's see the talent."
  "Everyone's for hire down here."

NEAR ZERO — clock critically low
  "Almost nothing left."
  "Getting thin."
  "One more hand. Has to be."

DEATH SCREEN
  Emma-Ō (single line, does not rotate):
    "Time's up."
  Tap anywhere to continue.
  Full roguelite reset fires on tap.


================================================================================
END OF DOCUMENT — Bakuto Master Document (GDD v1.0 + Narrative v0.2)
================================================================================
