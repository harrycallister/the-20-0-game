import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import {
  FORMATIONS,
  TOTAL_REROLLS,
  buildSlots,
  cleanPlayers,
  buildTeamIndex,
  drawTeam,
  drawCaptainCandidates,
  eligiblePositions,
  averageRating,
  simulateSeason,
  teamMVP,
  mvpBlurb,
  setSeed,
  clearSeed,
  dailySeed,
} from './game.js'
import {
  loadStats,
  recordResult,
  getDaily,
  saveDaily,
  todayKey,
  dailyStreak,
  lastNDays,
} from './stats.js'
import { computeScore } from './score.js'
import SPORT from './sport.js'
import {
  SITE_URL,
  puzzleNumber,
  buildShareText,
  summaryFromResult,
  summaryFromDaily,
  shareResultText,
  shareNodeAsImage,
} from './share.js'
import {
  leaderboardEnabled,
  submitDailyRun,
  fetchDailyTop,
  getPlayerName,
  getSubmitted,
} from './leaderboard.js'

// Masthead pieces: "The 20–0 Game" / "The 16–0 Game" with the styled dash,
// derived from the sport's perfect record ("20-0" → ["20", "0"]).
const [REC_WINS, REC_LOSSES] = SPORT.meta.perfectName.split('-')

// Sport class on <body> so CSS can scope sport-specific tweaks (e.g. the
// CFB field is taller on phones — its wishbone needs the vertical room).
document.body.classList.add(`sport-${SPORT.key}`)

export default function App() {
  const [players, setPlayers] = useState(null)
  const [error, setError] = useState(null)

  const [formation, setFormation] = useState(null)
  const [roster, setRoster] = useState({})
  const [currentTeam, setCurrentTeam] = useState(null)
  const [usedKeys, setUsedKeys] = useState(() => new Set())
  const [rerollsLeft, setRerollsLeft] = useState(TOTAL_REROLLS)
  const [result, setResult] = useState(null)
  const [captains, setCaptains] = useState(null) // final-stage candidates
  const [expert, setExpert] = useState(false)
  const [mode, setMode] = useState('daily') // 'daily' | 'free'
  const [stats, setStats] = useState(() => loadStats())
  const [dailyDone, setDailyDone] = useState(() => getDaily(todayKey()))

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}${SPORT.meta.playersUrl}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      // players.json can contain bare `NaN` (from pandas) which is invalid
      // JSON — replace those tokens with null before parsing.
      .then((text) => JSON.parse(text.replace(/:\s*NaN/g, ': null')))
      .then((raw) => setPlayers(cleanPlayers(raw)))
      .catch((err) => setError(err.message))
  }, [])

  const teamIndex = useMemo(
    () => (players ? buildTeamIndex(players) : null),
    [players],
  )
  const slots = useMemo(
    () => (formation ? buildSlots(formation) : null),
    [formation],
  )
  // The Defensive Captain is a dedicated final stage, not part of the
  // team-on-the-clock draft — regular picks only cover the other slots.
  const draftSlots = useMemo(
    () => (slots ? slots.filter((s) => s.pos !== 'DC') : null),
    [slots],
  )

  const filled = Object.keys(roster).length
  const done = slots ? filled >= slots.length : false

  function openPositions(rosterState) {
    return new Set(
      draftSlots.filter((s) => !rosterState[s.key]).map((s) => s.pos),
    )
  }

  function chooseFormation(f) {
    if (mode === 'daily') setSeed(dailySeed(new Date().toISOString().slice(0, 10)))
    else clearSeed()
    const newSlots = buildSlots(f).filter((s) => s.pos !== 'DC')
    setFormation(f)
    setRoster({})
    setUsedKeys(new Set())
    setRerollsLeft(TOTAL_REROLLS)
    setResult(null)
    setCaptains(null)
    setCurrentTeam(
      drawTeam(teamIndex, new Set(newSlots.map((s) => s.pos)), new Set()),
    )
  }

  function pickPlayer(player, slotKey) {
    const nextRoster = { ...roster, [slotKey]: player }
    const nextUsed = new Set(usedKeys).add(currentTeam.key)
    setRoster(nextRoster)
    setUsedKeys(nextUsed)
    if (Object.keys(nextRoster).length >= draftSlots.length) {
      // Lineup set — move to the final stage: choosing the Defensive Captain.
      setCurrentTeam(null)
      setCaptains(drawCaptainCandidates(teamIndex, nextUsed))
    } else {
      setCurrentTeam(drawTeam(teamIndex, openPositions(nextRoster), nextUsed))
    }
  }

  function pickCaptain(candidate) {
    setRoster({ ...roster, DC: candidate.player })
    setUsedKeys(new Set(usedKeys).add(candidate.team.key))
    setCaptains(null)
  }

  function reroll() {
    if (rerollsLeft <= 0 || !currentTeam) return
    setRerollsLeft((n) => n - 1)
    const exclude = new Set(usedKeys).add(currentTeam.key)
    setCurrentTeam(drawTeam(teamIndex, openPositions(roster), exclude))
  }

  function runSim() {
    const avg = averageRating(roster)
    // The Defensive Captain's role (DB/LB/DL) tilts each game's matchup.
    const res = { avg, ...simulateSeason(avg, roster.DC?.role) }
    res.score = computeScore(res, roster)
    setResult(res)
    setStats(recordResult(res))
    if (mode === 'daily') {
      // Compact roster snapshot so the recap (and share image) survive reload.
      const snap = slots.map((s) => {
        const p = roster[s.key]
        return {
          key: s.key,
          label: s.label,
          pos: s.pos,
          ...(p && {
            name: p.name,
            rating: p.rating,
            team: p.team,
            year: p.year,
            playerPos: p.pos,
            dpos: p.dpos,
            tier: p.tier,
          }),
        }
      })
      setDailyDone(saveDaily(todayKey(), res, formation.name, snap))
    }
  }

  function reset() {
    setFormation(null)
    setRoster({})
    setCurrentTeam(null)
    setUsedKeys(new Set())
    setRerollsLeft(TOTAL_REROLLS)
    setResult(null)
    setCaptains(null)
  }

  if (error)
    return (
      <div className="shell">
        <div className="notice error">
          <span className="notice-kicker">Load error</span>
          {error}
        </div>
      </div>
    )
  if (!players)
    return (
      <div className="shell">
        <div className="notice">
          <span className="notice-kicker">Loading</span>
          Pulling the player database…
        </div>
      </div>
    )

  return (
    <div className="shell">
      <Masthead count={players.length} onHome={reset} />

      {!formation && (
        <FormationSelect
          onChoose={chooseFormation}
          mode={mode}
          setMode={setMode}
          expert={expert}
          setExpert={setExpert}
          stats={stats}
          dailyDone={dailyDone}
        />
      )}

      {formation && (
        <>
      <div className="formation-bar">
        <span className="fb-name">{formation.name}</span>
        <span className="fb-personnel">{formation.personnel}</span>
        <span className={`expert-toggle ${expert ? 'on' : ''}`}>
          {expert ? 'Expert' : 'Classic'}
        </span>
      </div>

      <FieldView
        slots={slots}
        roster={roster}
        currentTeam={done ? null : currentTeam}
      />

      {!done && currentTeam && (
        <DraftRound
          team={currentTeam}
          reel={teamIndex}
          slots={draftSlots}
          roster={roster}
          pickNo={filled + 1}
          total={slots.length}
          rerollsLeft={rerollsLeft}
          expert={expert}
          onPick={pickPlayer}
          onReroll={reroll}
        />
      )}

      {!done && !currentTeam && captains && (
        <CaptainSelect
          candidates={captains}
          expert={expert}
          onPick={pickCaptain}
        />
      )}

      {done && (
        <section className="roster">
          <h2 className="section-head">
            <span className="kicker">Final</span>
            Your Roster
          </h2>

          <div className="boxscore">
            <div className="boxscore-head">
              <span>Pos</span>
              <span>Player</span>
              <span className="col-team">Team · Yr</span>
              <span className="col-ovr">Ovr</span>
            </div>
            {slots.map((s, i) => {
              const p = roster[s.key]
              return (
                <div className="boxscore-row" key={s.key} style={{ '--i': i }}>
                  <span className="bs-slot">{s.label}</span>
                  <span className="bs-name">
                    {p ? p.name : '—'}
                    {p?.tier === 'legend' && (
                      <span className="legend-badge">Legend</span>
                    )}
                    {p?.heisman && (
                      <span className="legend-badge heisman-badge">Heisman</span>
                    )}
                  </span>
                  <span className="bs-team col-team">
                    {p ? `${p.dpos ? `${p.dpos} · ` : ''}${p.team} ${p.year}` : ''}
                  </span>
                  <span className={`bs-ovr col-ovr ${p ? ratingClass(p.rating) : ''}`}>
                    {p ? p.rating : ''}
                  </span>
                </div>
              )
            })}
            <div className="boxscore-foot">
              <span>Roster average</span>
              <span className="foot-avg">{averageRating(roster).toFixed(1)}</span>
            </div>
          </div>

          {roster.DC && <CaptainNote captain={roster.DC} />}

          {!result ? (
            <button className="btn solid sim" onClick={runSim}>
              <PlayIcon />
              Simulate Season
            </button>
          ) : (
            <SimResult
              result={result}
              slots={slots}
              roster={roster}
              formation={formation}
              daily={mode === 'daily' ? todayKey() : null}
            />
          )}

          <button className="btn text reset" onClick={reset}>
            <ResetIcon />
            New Game
          </button>
        </section>
      )}
        </>
      )}
    </div>
  )
}

// Assign each slot an (x, y) % position on the field, laid out like a formation.
function fieldLayout(slots) {
  const group = {}
  for (const s of slots) (group[s.pos] ||= []).push(s)
  const out = {}
  const place = (arr, xs, y) =>
    arr.forEach((s, i) => {
      out[s.key] = { x: xs[i] ?? 50, y }
    })
  place(group.DEF || [], [50], 18) // your defense, deep
  place(group.DC || [], [50], 42) // defensive captain, right above the O-line
  place(group.WR || [], [90, 10, 73, 27], 46) // split wide
  place(group.TE || [], group.TE && group.TE.length === 2 ? [36, 64] : group.TE && group.TE.length === 3 ? [30, 64, 70] : [64], 53)
  place(group.OL || [], [50], 53) // line of scrimmage
  place(group.QB || [], [50], 64)
  const rb = group.RB || []
  if (rb.length === 3) {
    // wishbone: fullback tucked behind the QB, halfbacks split deeper
    place([rb[0]], [50], 77)
    place(rb.slice(1), [30, 70], 85)
  } else {
    place(rb, rb.length === 1 ? [38] : [33, 67], 68)
  }
  return out
}

function spotLabel(p) {
  if (p.pos === 'OL' || p.pos === 'DEF') return p.team
  const parts = p.name.split(' ')
  return parts[parts.length - 1]
}

function FieldView({ slots, roster, currentTeam }) {
  const layout = fieldLayout(slots)
  const firstOpenByPos = {}
  for (const s of slots) {
    if (!roster[s.key] && firstOpenByPos[s.pos] === undefined)
      firstOpenByPos[s.pos] = s.key
  }
  const avail = new Set()
  if (currentTeam) {
    for (const pl of Object.values(currentTeam.byPos)) {
      for (const pos of eligiblePositions(pl)) {
        const k = firstOpenByPos[pos]
        if (k) avail.add(k)
      }
    }
  }
  return (
    <div className="field">
      {slots.map((s) => {
        const p = roster[s.key]
        const xy = layout[s.key] || { x: 50, y: 50 }
        const cls = p ? 'filled' : avail.has(s.key) ? 'open' : 'empty'
        return (
          <div
            key={s.key}
            className={`spot ${cls}`}
            style={{ left: `${xy.x}%`, top: `${xy.y}%` }}
          >
            {p ? (
              <>
                <span className={`spot-ovr ${ratingClass(p.rating)}`}>
                  {p.rating}
                </span>
                <span className="spot-name">{spotLabel(p)}</span>
              </>
            ) : (
              <span className="spot-pos">{s.label}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

const SPIN_MS = 900
const SPIN_TICK = 65

function DraftRound({ team, reel, slots, roster, pickNo, total, rerollsLeft, expert, onPick, onReroll }) {
  const [display, setDisplay] = useState(team)
  // 'await' (press Spin) -> 'spin' (reel running) -> 'ready' (team revealed)
  const [phase, setPhase] = useState('await')
  const [choosing, setChoosing] = useState(null) // { player, positions:[pos] }
  const autoSpin = useRef(false) // reroll click spins without a second press
  const tickRef = useRef(null)
  const stopRef = useRef(null)
  const spinning = phase === 'spin'

  function clearTimers() {
    clearInterval(tickRef.current)
    clearTimeout(stopRef.current)
  }

  function startSpin() {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !reel || reel.length === 0) {
      setDisplay(team)
      setPhase('ready')
      return
    }
    setPhase('spin')
    tickRef.current = setInterval(() => {
      setDisplay(reel[Math.floor(Math.random() * reel.length)])
    }, SPIN_TICK)
    stopRef.current = setTimeout(() => {
      clearInterval(tickRef.current)
      setDisplay(team)
      setPhase('ready')
    }, SPIN_MS)
  }

  // Each new team on the clock waits behind the Spin button — except after a
  // reroll, where the click itself is the "spin" gesture.
  useEffect(() => {
    setChoosing(null)
    clearTimers()
    if (autoSpin.current) {
      autoSpin.current = false
      startSpin()
    } else {
      setPhase('await')
    }
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, reel])

  const formationPos = new Set(slots.map((s) => s.pos))
  const openSlots = slots.filter((s) => !roster[s.key])
  const firstOpenOf = (pos) => openSlots.find((s) => s.pos === pos)

  // One card per team player the formation can use (including position flex).
  // openPos = the positions they can still be slotted into.
  const options = Object.values(team.byPos)
    .map((player) => {
      const elig = eligiblePositions(player).filter((p) => formationPos.has(p))
      const openPos = elig.filter((p) => firstOpenOf(p))
      return { player, elig, openPos, disabled: openPos.length === 0 }
    })
    .filter((o) => o.elig.length > 0)
    .sort((a, b) => a.disabled - b.disabled || b.player.rating - a.player.rating)

  function clickPlayer(o) {
    if (o.disabled) return
    if (o.openPos.length === 1) onPick(o.player, firstOpenOf(o.openPos[0]).key)
    else setChoosing({ player: o.player, positions: o.openPos })
  }

  return (
    <section className="draft">
      <div className="onclock">
        <span className="onclock-round">
          Pick {pickNo}
          <i>/{total}</i>
        </span>
        <button
          className="btn ghost reroll"
          onClick={() => {
            autoSpin.current = true
            onReroll()
          }}
          disabled={rerollsLeft <= 0 || phase !== 'ready' || !!choosing}
        >
          <DiceIcon />
          New Team
          <span className="pips">
            {Array.from({ length: TOTAL_REROLLS }, (_, i) => (
              <i key={i} className={i < rerollsLeft ? 'on' : ''} />
            ))}
          </span>
        </button>
      </div>

      <div className={`team-banner ${spinning ? 'spinning' : ''} ${phase === 'await' ? 'mystery' : ''}`}>
        {phase === 'await' ? (
          <>
            <span className="team-name">? ? ?</span>
            <span className="team-sub">A team is waiting on the clock</span>
          </>
        ) : (
          <>
            <span className="team-name">{display.team}</span>
            <span className="team-year">{display.year}</span>
            <span className="team-sub">
              {spinning ? 'Spinning…' : 'On the clock — draft a player'}
            </span>
          </>
        )}
      </div>

      {phase === 'await' ? (
        <div className="spin-stage">
          <button className="btn solid spin-cta" onClick={startSpin}>
            <DiceIcon />
            Spin for a Team
          </button>
        </div>
      ) : spinning ? (
        <div className="board-spinning">Finding a team…</div>
      ) : choosing ? (
        <div className="slot-chooser">
          <div className="sc-head">
            Where should <strong>{choosing.player.name}</strong> line up?
          </div>
          <div className="sc-opts">
            {choosing.positions
              .map((pos) => firstOpenOf(pos))
              .filter(Boolean)
              .map((s) => (
                <button
                  key={s.key}
                  className="sc-btn"
                  onClick={() => {
                    setChoosing(null)
                    onPick(choosing.player, s.key)
                  }}
                >
                  {s.label}
                </button>
              ))}
          </div>
          <button className="sc-cancel" onClick={() => setChoosing(null)}>
            Cancel
          </button>
        </div>
      ) : (
        <ul className="board" key={team.key + pickNo}>
          {options.map((o, i) => (
            <li key={`${o.player.name}-${o.player.pos}`} style={{ '--i': i }}>
              <button
                className={`pick ${o.disabled ? 'disabled' : ''}`}
                onClick={() => clickPlayer(o)}
                disabled={o.disabled}
              >
                {/* Expert drafts blind — no overall, scout the stat line */}
                <span className={expert ? 'ovr' : `ovr ${ratingClass(o.player.rating)}`}>
                  {expert ? '?' : o.player.rating}
                </span>
                <span className="pick-main">
                  <span className="pick-name">
                    {o.player.name}
                    {o.player.tier === 'legend' && (
                      <span className="legend-badge">Legend</span>
                    )}
                    {o.player.heisman && (
                      <span className="legend-badge heisman-badge">Heisman</span>
                    )}
                    {o.disabled && <span className="taken-badge">Filled</span>}
                  </span>
                  <span className="pos-tags">
                    {o.elig.map((p) => (
                      <span
                        key={p}
                        className={`pos-tag ${o.openPos.includes(p) ? 'open' : ''}`}
                      >
                        {/* Captains show their real position — that's the pick's strategy */}
                        {p === 'DC' ? `CAPT · ${o.player.dpos || 'DEF'}` : p}
                      </span>
                    ))}
                  </span>
                  <PlayerMeta player={o.player} expert={expert} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// The dedicated final stage: lineup is set, now pick the Defensive Captain.
// Candidates come from unused team-seasons with one of each role guaranteed
// when possible, so the strategy choice is always on the table.
function CaptainSelect({ candidates, expert, onPick }) {
  return (
    <section className="draft captain-select">
      <h2 className="section-head">
        <span className="kicker">Final Pick</span>
        Choose Your Defensive Captain
      </h2>
      <p className="draft-hint">
        Your lineup is set — this last pick works differently. Your Captain's
        position changes how your whole defense plays, and that changes your
        record and your score. Every opponent leans pass-heavy or run-heavy;
        your Captain decides which of those you shut down.
      </p>
      <div className="role-legend">
        <span className="role-line">
          <b className="role-badge role-db">DB</b> erases pass-heavy teams —
          boom or bust
        </span>
        <span className="role-line">
          <b className="role-badge role-lb">LB</b> steady against both run and
          pass
        </span>
        <span className="role-line">
          <b className="role-badge role-dl">DL</b> stuffs the run, and the
          pass rush travels too
        </span>
      </div>
      <ul className="board">
        {candidates.map((c, i) => (
          <li key={c.team.key} style={{ '--i': i }}>
            <button className="pick" onClick={() => onPick(c)}>
              <span className={expert ? 'ovr' : `ovr ${ratingClass(c.player.rating)}`}>
                {expert ? '?' : c.player.rating}
              </span>
              <span className="pick-main">
                <span className="pick-name">
                  {c.player.name}
                  {c.player.tier === 'legend' && (
                    <span className="legend-badge">Legend</span>
                  )}
                  {c.player.heisman && (
                    <span className="legend-badge heisman-badge">Heisman</span>
                  )}
                </span>
                <span className="pos-tags">
                  <span className={`role-badge role-${(c.player.role || '').toLowerCase()}`}>
                    {c.player.role}
                  </span>
                  <span className="pos-tag open">{c.player.dpos || 'DEF'}</span>
                  <span className="pos-tag">
                    {c.team.team} {c.team.year}
                  </span>
                </span>
                <PlayerMeta player={c.player} expert={expert} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

// How the chosen captain's position shapes the season sim — shown on the
// final-roster screen so the player connects the pick to the result.
const CAPTAIN_NOTES = {
  DB: 'shuts down pass-heavy opponents — dominant through the air, but run-first teams go right at the rest of your defense',
  LB: 'anchors the defense against everything — a steady edge vs both pass- and run-heavy opponents',
  DL: 'stuffs the run and lives in the backfield — strongest vs ground games, and the pass rush travels too',
}

function CaptainNote({ captain }) {
  const note = CAPTAIN_NOTES[captain.role]
  if (!note) return null
  return (
    <p className="captain-note">
      <b>
        Captain: {captain.name} ({captain.dpos || captain.role})
      </b>{' '}
      — {note}. Each week's matchup shifts your odds, so your captain's
      position changes your record and your score.
    </p>
  )
}

function PlayerMeta({ player, expert }) {
  // Expert never shows ratings — if there's no stat line, you draft on faith.
  if (expert) {
    if (player.stats) return <StatLine stats={player.stats} />
    return (
      <span className="statline">
        <span className="stat">
          <em>no stat line — trust your gut</em>
        </span>
      </span>
    )
  }
  return <RatingLine player={player} />
}

function StatLine({ stats }) {
  return (
    <span className="statline">
      {Object.entries(stats).map(([k, v], i) => (
        <span className="stat" key={k}>
          {i > 0 && <span className="stat-dot" />}
          <b>{typeof v === 'number' ? v.toLocaleString() : v}</b>
          <em>{k}</em>
        </span>
      ))}
    </span>
  )
}

function FormationSelect({ onChoose, mode, setMode, expert, setExpert, stats, dailyDone }) {
  const streak = dailyStreak()
  const week = lastNDays(7)
  // Picking a playbook only selects it — the draft starts on the button
  // below, so style + playbook can be changed freely first.
  const [selected, setSelected] = useState(null)
  return (
    <section className="formation-select">
      {stats.played > 0 && (
        <div className="career">
          <span className="cstat"><b>{stats.played}</b><em>Played</em></span>
          <span className="cstat"><b>{stats.titles}</b><em>Titles</em></span>
          <span className="cstat"><b>{stats.perfects}</b><em>{SPORT.meta.perfectName}</em></span>
          <span className="cstat"><b>{stats.bestWins || '—'}</b><em>Best W</em></span>
          <span className="cstat"><b>{streak}🔥</b><em>Streak</em></span>
        </div>
      )}

      <div className="mode-tabs">
        <button
          className={`mode-tab ${mode === 'daily' ? 'on' : ''}`}
          onClick={() => setMode('daily')}
        >
          Daily Challenge
        </button>
        <button
          className={`mode-tab ${mode === 'free' ? 'on' : ''}`}
          onClick={() => setMode('free')}
        >
          Free Play
        </button>
      </div>

      {mode === 'daily' && dailyDone ? (
        <DailyRecap
          summary={dailyDone}
          streak={streak}
          week={week}
          onFreePlay={() => setMode('free')}
        />
      ) : (
        <>
          <div className="style-picker">
            <button
              className={`style-card ${!expert ? 'on' : ''}`}
              onClick={() => setExpert(false)}
            >
              <b>Classic</b>
              <span>Player ratings shown</span>
            </button>
            <button
              className={`style-card ${expert ? 'on' : ''}`}
              onClick={() => setExpert(true)}
            >
              <b>Expert</b>
              <span>Real stats only — scout it yourself</span>
            </button>
          </div>
          <h2 className="section-head">
            <span className="kicker">
              {mode === 'daily' ? "Today's Challenge" : 'Step 1'}
            </span>
            Choose Your Playbook
          </h2>
          <p className="draft-hint" style={{ borderTop: 'none', paddingTop: 0 }}>
            {mode === 'daily'
              ? `One run per day — same teams for everyone. Build the best ${SPORT.meta.perfectName} and share it.`
              : "Your playbook sets the offensive personnel you'll draft"}
          </p>
          <ul className="formation-list">
            {FORMATIONS.map((f, i) => (
              <li key={f.key} style={{ '--i': i }}>
                <button
                  className={`formation-card ${selected?.key === f.key ? 'on' : ''}`}
                  onClick={() => setSelected(f)}
                >
                  <span className="fc-top">
                    <span className="fc-name">{f.name}</span>
                    <span className="fc-personnel">{f.personnel}</span>
                  </span>
                  <span className="fc-blurb">{f.blurb}</span>
                  <span className="fc-split">
                    <span className="fc-pos">
                      <b>{f.skill.RB}</b>
                      <em>RB</em>
                    </span>
                    <span className="fc-pos">
                      <b>{f.skill.WR}</b>
                      <em>WR</em>
                    </span>
                    <span className="fc-pos">
                      <b>{f.skill.TE}</b>
                      <em>TE</em>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            className="btn solid start-game"
            disabled={!selected}
            onClick={() => selected && onChoose(selected)}
          >
            <PlayIcon />
            {selected
              ? `Start Drafting — ${selected.name} · ${expert ? 'Expert' : 'Classic'}`
              : 'Pick a playbook to start'}
          </button>
        </>
      )}
    </section>
  )
}

function DailyRecap({ summary, streak, week, onFreePlay }) {
  // Rebuild slots + roster map from the saved snapshot (older saves predate
  // the snapshot and just won't offer the image share).
  const snap = Array.isArray(summary.roster) ? summary.roster : null
  const recapSlots = snap?.map((e) => ({ key: e.key, label: e.label, pos: e.pos }))
  const recapRoster = snap
    ? Object.fromEntries(
        snap
          .filter((e) => e.name)
          .map((e) => [
            e.key,
            {
              name: e.name,
              rating: e.rating,
              team: e.team,
              year: e.year,
              pos: e.playerPos || e.pos,
              tier: e.tier,
            },
          ]),
      )
    : null
  const crown = summary.perfect ? ' 🐐' : summary.champion ? ' 🏆' : ''
  const rounds = ['Div', 'Conf', 'SB']
  return (
    <div className="daily-recap">
      <span className="kicker">Today's Challenge — done</span>
      <div className="dr-record">
        {summary.wins}–{summary.losses}
        <span className="dr-tier">
          {summary.tierName}
          {crown}
        </span>
      </div>
      {Number.isFinite(summary.score) && (
        <div className="score-badge dr-score">
          <b>{summary.score}</b>
          <em>Score</em>
        </div>
      )}
      <div className="ticker">
        {summary.reg.map((w, i) => (
          <span key={i} className={`cell ${w ? 'w' : 'l'}`} style={{ '--i': i }}>
            {w ? 'W' : 'L'}
          </span>
        ))}
      </div>
      {summary.made && (
        <div className="bracket dr-bracket">
          {summary.playoffs.map((w, i) => (
            <span key={i} className={`round ${w ? 'w' : 'l'}`} style={{ '--i': i }}>
              <em>{rounds[i]}</em>
              <b>{w ? 'W' : 'L'}</b>
            </span>
          ))}
        </div>
      )}
      <div className="streak-cal">
        {week.map((d) => (
          <span
            key={d.date}
            className={`day ${d.played ? (d.champion ? 'champ' : 'on') : ''}`}
            title={d.date}
          />
        ))}
      </div>
      <div className="dr-streak">🔥 {streak}-day streak</div>
      <ShareActions
        summary={summaryFromDaily(summary)}
        tierName={summary.tierName}
        slots={recapSlots}
        roster={recapRoster}
      />
      <DailyLeaderboard
        day={summary.date}
        score={summary.score}
        wins={summary.wins}
        losses={summary.losses}
        rosterAvg={
          snap && snap.some((e) => e.name)
            ? snap.filter((e) => e.name).reduce((s, e) => s + e.rating, 0) /
              snap.filter((e) => e.name).length
            : null
        }
        picks={snap
          ?.filter((e) => e.name)
          .map((e) => ({ slot: e.label, name: e.name, team: e.team, year: e.year, rating: e.rating }))}
      />
      <button className="btn text" onClick={onFreePlay}>
        Play Free Play instead
      </button>
      <p className="dr-note">A new challenge unlocks tomorrow.</p>
    </div>
  )
}

function Masthead({ count, onHome }) {
  return (
    <header className="masthead">
      <div className="masthead-rule top" />
      <h1>
        <button className="masthead-home" onClick={onHome} title="Back to home">
          The {REC_WINS}<span className="dash">–</span>{REC_LOSSES} Game
        </button>
      </h1>
      <div className="dateline">
        <span>Seasons {SPORT.meta.seasonsLabel}</span>
        <span className="dot" />
        <span>{count.toLocaleString()} players</span>
        <span className="dot" />
        <span>Chase the perfect {REC_WINS}–{REC_LOSSES} season</span>
      </div>
      <div className="masthead-rule bottom" />
    </header>
  )
}

// Share actions used by both the fresh-sim result and the daily recap.
// Text share goes through the native share sheet (clipboard fallback);
// image share renders `cardRef` to a PNG and attaches it when supported.
function ShareActions({ summary, tierName, slots, roster }) {
  const [note, setNote] = useState(null)
  const cardRef = useRef(null)
  const hasRoster = slots && roster && Object.values(roster).some(Boolean)

  function flash(msg) {
    setNote(msg)
    setTimeout(() => setNote(null), 1800)
  }

  async function onShareText() {
    const outcome = await shareResultText(buildShareText(summary))
    if (outcome === 'copied') flash('Copied to clipboard ✓')
    else if (outcome === 'failed') flash('Could not share')
  }

  async function onShareImage() {
    if (!cardRef.current) return
    const name = `${SPORT.meta.shareFilePrefix}-${summary.daily || 'free-play'}.png`
    const outcome = await shareNodeAsImage(cardRef.current, name)
    if (outcome === 'downloaded') flash('Image saved ✓')
    else if (outcome === 'failed') flash('Could not create image')
  }

  return (
    <>
      <div className="share-row">
        <button className="btn share" onClick={onShareText}>
          {note || 'Share result'}
        </button>
        {hasRoster && (
          <button className="btn ghost share-img" onClick={onShareImage}>
            Share image
          </button>
        )}
      </div>
      {hasRoster && (
        <div className="sharecard-stage" aria-hidden="true">
          <ShareCard
            ref={cardRef}
            summary={summary}
            tierName={tierName}
            slots={slots}
            roster={roster}
          />
        </div>
      )}
    </>
  )
}

// The PNG share artifact: record, score, tier, depth chart, URL. Rendered
// off-screen (not display:none — html-to-image needs real layout).
const ShareCard = forwardRef(function ShareCard(
  { summary, tierName, slots, roster },
  ref,
) {
  const crown = summary.perfect ? ' 🐐' : summary.champion ? ' 🏆' : ''
  return (
    <div className="sharecard" ref={ref}>
      <div className="sc-masthead">
        <span className="sc-title">{`The ${REC_WINS}–${REC_LOSSES} Game`}</span>
        <span className="sc-no">
          {summary.daily ? `Daily #${puzzleNumber(summary.daily)}` : 'Free Play'}
        </span>
      </div>
      <div className="sc-result">
        <span className="sc-record">
          {summary.wins}–{summary.losses}
        </span>
        <span className="sc-tier">
          {tierName}
          {crown}
        </span>
        {Number.isFinite(summary.score) && (
          <span className="sc-score">
            <b>{summary.score}</b>
            <em>Score</em>
          </span>
        )}
      </div>
      <FieldView slots={slots} roster={roster} currentTeam={null} />
      <div className="sc-url">{SITE_URL.replace(/^https?:\/\//, '')}</div>
    </div>
  )
})

// Daily leaderboard: name + submit once per device per day, then today's
// top runs. Free Play never touches it (results aren't comparable there).
function DailyLeaderboard({ day, score, wins, losses, rosterAvg, picks }) {
  const [name, setName] = useState(() => getPlayerName())
  const [submitted, setSubmitted] = useState(() => !!getSubmitted(day))
  const [rows, setRows] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!submitted) return
    let alive = true
    fetchDailyTop(day)
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [day, submitted])

  if (!leaderboardEnabled || !Number.isFinite(score)) return null

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await submitDailyRun({ day, name, score, wins, losses, rosterAvg, picks })
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="lb">
      <h3 className="lb-head">
        <span className="kicker">Daily #{puzzleNumber(day)}</span>
        Leaderboard
      </h3>
      {!submitted ? (
        <form className="lb-join" onSubmit={submit}>
          <input
            className="lb-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={20}
            required
          />
          <button className="btn solid lb-btn" disabled={busy}>
            {busy ? 'Posting…' : `Post my ${score}`}
          </button>
        </form>
      ) : rows === null && !error ? (
        <div className="lb-note">Loading today's board…</div>
      ) : rows && rows.length > 0 ? (
        <ol className="lb-list">
          {rows.map((r) => (
            <li key={r.rank} className={`lb-row ${r.mine ? 'mine' : ''}`}>
              <span className="lb-rank">{r.rank}</span>
              <span className="lb-name">
                {r.name}
                {r.mine && <em> (you)</em>}
              </span>
              <span className="lb-rec">{r.record}</span>
              <span className="lb-score">{r.score}</span>
            </li>
          ))}
        </ol>
      ) : (
        !error && <div className="lb-note">No runs posted yet — you're first!</div>
      )}
      {error && <div className="lb-note lb-error">{error}</div>}
    </div>
  )
}

function SimResult({ result, slots, roster, formation, daily }) {
  const summary = summaryFromResult(result, daily)
  const mvp = SPORT.features?.mvp ? teamMVP(roster, formation, slots) : null
  return (
    <div className={`result ${result.tier.perfect ? 'perfect' : ''}`}>
      <div className="result-top">
        <div className="record">
          <span className="rec-w">{result.wins}</span>
          <span className="rec-sep">–</span>
          <span className="rec-l">{result.losses}</span>
        </div>
        <div className="result-tier">
          <span className="kicker">{result.tier.perfect ? 'Champions' : 'Verdict'}</span>
          <span className="tier-name">{result.tier.name}</span>
          <span className="tier-blurb">{result.tier.blurb}</span>
        </div>
        {Number.isFinite(result.score) && (
          <div className="score-badge">
            <b>{result.score}</b>
            <em>Score</em>
          </div>
        )}
      </div>

      {(() => {
        const heismen = Object.values(roster)
          .filter((p) => p && p.heisman)
          .map((p) => p.name)
        // confChampion is null for sports without a CCG (NFL) — only then
        // does a loss row get skipped entirely
        if (result.confChampion == null && heismen.length === 0) return null
        return (
          <div className="honors">
            {result.confChampion && (
              <span className="honor">🏆 Conference Champion</span>
            )}
            {result.confChampion === false && (
              <span className="honor lost">Lost the Conference Championship</span>
            )}
            {heismen.length > 0 && (
              <span className="honor">🏅 Heisman on roster: {heismen.join(', ')}</span>
            )}
          </div>
        )
      })()}

      {mvp && (
        <div className="mvp-card">
          <div className="mvp-kicker">⭐ Team MVP</div>
          <div className="mvp-main">
            <span className={`mvp-ovr ${ratingClass(mvp.player.rating)}`}>
              {mvp.player.rating}
            </span>
            <span className="mvp-who">
              <b>
                {mvp.player.name}
                {mvp.player.tier === 'legend' && (
                  <span className="legend-badge">Legend</span>
                )}
                {mvp.player.heisman && (
                  <span className="legend-badge heisman-badge">Heisman</span>
                )}
              </b>
              <em>
                {mvp.slot.label} · {mvp.player.dpos ? `${mvp.player.dpos} · ` : ''}
                {mvp.player.team} {mvp.player.year}
              </em>
            </span>
          </div>
          <div className="mvp-stats">
            {mvp.player.stats
              ? Object.entries(mvp.player.stats)
                  .map(([k, v]) => `${k} ${typeof v === 'number' ? v.toLocaleString() : v}`)
                  .join('  ·  ')
              : Object.entries(mvp.player.ratings || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([k, v]) => `${k} ${v}`)
                  .join('  ·  ')}
          </div>
          <div className="mvp-blurb">{mvpBlurb(mvp.player, formation)}</div>
        </div>
      )}

      <div className="phase-label">
        Regular Season<i>{result.regWins}–{result.regLosses}</i>
      </div>
      <div className="ticker">
        {result.reg.map((g, i) => (
          <span
            key={i}
            className={`cell ${g.win ? 'w' : 'l'}`}
            style={{ '--i': i }}
            title={`Week ${g.label} · opp ${g.opponent}`}
          >
            {g.win ? 'W' : 'L'}
          </span>
        ))}
      </div>

      {result.made ? (
        <>
          <div className="phase-label">
            Postseason<i>Road to {REC_WINS}–{REC_LOSSES}</i>
          </div>
          <div className="bracket">
            {result.playoffs.map((g, i) => (
              <span
                key={i}
                className={`round ${g.win ? 'w' : 'l'}`}
                style={{ '--i': i }}
              >
                <em>{g.round}</em>
                <b>{g.win ? 'W' : 'L'}</b>
                <i>vs {g.opponent}</i>
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="missed">Missed the playoffs — no shot at {REC_WINS}–{REC_LOSSES} this year.</div>
      )}

      <ShareActions
        summary={summary}
        tierName={result.tier.name}
        slots={slots}
        roster={roster}
      />
      {daily && (
        <DailyLeaderboard
          day={daily}
          score={result.score}
          wins={result.wins}
          losses={result.losses}
          rosterAvg={result.avg}
          picks={slots
            .map((s) => {
              const p = roster[s.key]
              return p && { slot: s.label, name: p.name, team: p.team, year: p.year, rating: p.rating }
            })
            .filter(Boolean)}
        />
      )}
    </div>
  )
}

function ratingClass(r) {
  if (r >= 95) return 'elite'
  if (r >= 90) return 'star'
  if (r >= 80) return 'good'
  return 'base'
}

function RatingLine({ player }) {
  const ratings = player.ratings
  if (!ratings) return null
  return (
    <span className="ratingline">
      {Object.entries(ratings).map(([label, value]) => (
        <span className={`attr ${ratingClass(value)}`} key={label}>
          <em>{label}</em>
          <b>{value}</b>
        </span>
      ))}
    </span>
  )
}

/* Icons — clean line SVGs, no emoji (1.5 stroke) */
function DiceIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="1.3" fill="currentColor" />
    </svg>
  )
}
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path d="M7 5l12 7-12 7V5z" fill="currentColor" />
    </svg>
  )
}
function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path
        d="M4 12a8 8 0 1 1 2.34 5.66M4 12V7m0 5h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
