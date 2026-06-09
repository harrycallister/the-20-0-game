import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import {
  FORMATIONS,
  TOTAL_REROLLS,
  buildSlots,
  cleanPlayers,
  buildTeamIndex,
  drawTeam,
  eligiblePositions,
  averageRating,
  simulateSeason,
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
import {
  SITE_URL,
  puzzleNumber,
  buildShareText,
  summaryFromResult,
  summaryFromDaily,
  shareResultText,
  shareNodeAsImage,
} from './share.js'

export default function App() {
  const [players, setPlayers] = useState(null)
  const [error, setError] = useState(null)

  const [formation, setFormation] = useState(null)
  const [roster, setRoster] = useState({})
  const [currentTeam, setCurrentTeam] = useState(null)
  const [usedKeys, setUsedKeys] = useState(() => new Set())
  const [rerollsLeft, setRerollsLeft] = useState(TOTAL_REROLLS)
  const [result, setResult] = useState(null)
  const [expert, setExpert] = useState(false)
  const [mode, setMode] = useState('daily') // 'daily' | 'free'
  const [stats, setStats] = useState(() => loadStats())
  const [dailyDone, setDailyDone] = useState(() => getDaily(todayKey()))

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}players.json`)
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

  const filled = Object.keys(roster).length
  const done = slots ? filled >= slots.length : false

  function openPositions(rosterState) {
    return new Set(slots.filter((s) => !rosterState[s.key]).map((s) => s.pos))
  }

  function chooseFormation(f) {
    if (mode === 'daily') setSeed(dailySeed(new Date().toISOString().slice(0, 10)))
    else clearSeed()
    const newSlots = buildSlots(f)
    setFormation(f)
    setRoster({})
    setUsedKeys(new Set())
    setRerollsLeft(TOTAL_REROLLS)
    setResult(null)
    setCurrentTeam(
      drawTeam(teamIndex, new Set(newSlots.map((s) => s.pos)), new Set()),
    )
  }

  function pickPlayer(player, slotKey) {
    const nextRoster = { ...roster, [slotKey]: player }
    const nextUsed = new Set(usedKeys).add(currentTeam.key)
    setRoster(nextRoster)
    setUsedKeys(nextUsed)
    if (Object.keys(nextRoster).length >= slots.length) {
      setCurrentTeam(null)
    } else {
      setCurrentTeam(drawTeam(teamIndex, openPositions(nextRoster), nextUsed))
    }
  }

  function reroll() {
    if (rerollsLeft <= 0 || !currentTeam) return
    setRerollsLeft((n) => n - 1)
    const exclude = new Set(usedKeys).add(currentTeam.key)
    setCurrentTeam(drawTeam(teamIndex, openPositions(roster), exclude))
  }

  function runSim() {
    const avg = averageRating(roster)
    const res = { avg, ...simulateSeason(avg) }
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
      <Masthead count={players.length} />

      {!formation && (
        <FormationSelect
          onChoose={chooseFormation}
          mode={mode}
          setMode={setMode}
          stats={stats}
          dailyDone={dailyDone}
        />
      )}

      {formation && (
        <>
      <div className="formation-bar">
        <span className="fb-name">{formation.name}</span>
        <span className="fb-personnel">{formation.personnel}</span>
        <button
          className={`expert-toggle ${expert ? 'on' : ''}`}
          onClick={() => setExpert((e) => !e)}
          title="Toggle real stats vs ratings"
        >
          Expert
        </button>
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
          slots={slots}
          roster={roster}
          pickNo={filled + 1}
          total={slots.length}
          rerollsLeft={rerollsLeft}
          expert={expert}
          onPick={pickPlayer}
          onReroll={reroll}
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
                  </span>
                  <span className="bs-team col-team">
                    {p ? `${p.team} ${p.year}` : ''}
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
  place(group.EDGE || [], [50], 42) // edge rusher, right above the O-line
  place(group.WR || [], [90, 10, 73, 27], 46) // split wide
  place(group.TE || [], group.TE && group.TE.length === 2 ? [36, 64] : group.TE && group.TE.length === 3 ? [30, 64, 70] : [64], 53)
  place(group.OL || [], [50], 53) // line of scrimmage
  place(group.QB || [], [50], 64)
  const rb = group.RB || []
  place(rb, rb.length === 1 ? [38] : [33, 67], 68)
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

const SPIN_MS = 700
const SPIN_TICK = 65

function DraftRound({ team, reel, slots, roster, pickNo, total, rerollsLeft, expert, onPick, onReroll }) {
  const [display, setDisplay] = useState(team)
  const [spinning, setSpinning] = useState(false)
  const [choosing, setChoosing] = useState(null) // { player, positions:[pos] }

  // Spin the reel each time a new team comes on the clock.
  useEffect(() => {
    setChoosing(null)
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !reel || reel.length === 0) {
      setDisplay(team)
      setSpinning(false)
      return
    }
    setSpinning(true)
    const tick = setInterval(() => {
      setDisplay(reel[Math.floor(Math.random() * reel.length)])
    }, SPIN_TICK)
    const stop = setTimeout(() => {
      clearInterval(tick)
      setDisplay(team)
      setSpinning(false)
    }, SPIN_MS)
    return () => {
      clearInterval(tick)
      clearTimeout(stop)
    }
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
          onClick={onReroll}
          disabled={rerollsLeft <= 0 || spinning || !!choosing}
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

      <div className={`team-banner ${spinning ? 'spinning' : ''}`}>
        <span className="team-name">{display.team}</span>
        <span className="team-year">{display.year}</span>
        <span className="team-sub">
          {spinning ? 'Spinning…' : 'On the clock — draft a player'}
        </span>
      </div>

      {spinning ? (
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
                <span className={`ovr ${ratingClass(o.player.rating)}`}>
                  {o.player.rating}
                </span>
                <span className="pick-main">
                  <span className="pick-name">
                    {o.player.name}
                    {o.player.tier === 'legend' && (
                      <span className="legend-badge">Legend</span>
                    )}
                    {o.disabled && <span className="taken-badge">Filled</span>}
                  </span>
                  <span className="pos-tags">
                    {o.elig.map((p) => (
                      <span
                        key={p}
                        className={`pos-tag ${o.openPos.includes(p) ? 'open' : ''}`}
                      >
                        {p}
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

function PlayerMeta({ player, expert }) {
  if (expert && player.stats) return <StatLine stats={player.stats} />
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

function FormationSelect({ onChoose, mode, setMode, stats, dailyDone }) {
  const streak = dailyStreak()
  const week = lastNDays(7)
  return (
    <section className="formation-select">
      {stats.played > 0 && (
        <div className="career">
          <span className="cstat"><b>{stats.played}</b><em>Played</em></span>
          <span className="cstat"><b>{stats.titles}</b><em>Titles</em></span>
          <span className="cstat"><b>{stats.perfects}</b><em>20-0</em></span>
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
          <h2 className="section-head">
            <span className="kicker">
              {mode === 'daily' ? "Today's Challenge" : 'Step 1'}
            </span>
            Choose Your Playbook
          </h2>
          <p className="draft-hint" style={{ borderTop: 'none', paddingTop: 0 }}>
            {mode === 'daily'
              ? 'One run per day — same teams for everyone. Build the best 20-0 and share it.'
              : "Your playbook sets the offensive personnel you'll draft"}
          </p>
          <ul className="formation-list">
            {FORMATIONS.map((f, i) => (
              <li key={f.key} style={{ '--i': i }}>
                <button className="formation-card" onClick={() => onChoose(f)}>
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
      <button className="btn text" onClick={onFreePlay}>
        Play Free Play instead
      </button>
      <p className="dr-note">A new challenge unlocks tomorrow.</p>
    </div>
  )
}

function Masthead({ count }) {
  return (
    <header className="masthead">
      <div className="masthead-rule top" />
      <h1>
        The 20<span className="dash">–</span>0 Game
      </h1>
      <div className="dateline">
        <span>Seasons 1999–2024</span>
        <span className="dot" />
        <span>{count.toLocaleString()} players</span>
        <span className="dot" />
        <span>Chase the perfect 20–0 season</span>
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
    const name = `the-20-0-game-${summary.daily || 'free-play'}.png`
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
        <span className="sc-title">The 20–0 Game</span>
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

function SimResult({ result, slots, roster, daily }) {
  const summary = summaryFromResult(result, daily)
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
            Postseason<i>Road to 20–0</i>
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
        <div className="missed">Missed the playoffs — no shot at 20–0 this year.</div>
      )}

      <ShareActions
        summary={summary}
        tierName={result.tier.name}
        slots={slots}
        roster={roster}
      />
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
