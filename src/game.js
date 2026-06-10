// Game logic + simulation for the 20-0 Game.

export const TOTAL_REROLLS = 2

// ---- Seeded RNG ----------------------------------------------------------
// Daily Challenge seeds every player's draft + sim from the date, so the same
// teams come up in the same order for everyone and results are comparable.
// Free Play uses Math.random. ALL game randomness flows through rng().
let _rng = Math.random
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function setSeed(seed) {
  _rng = mulberry32(seed)
}
export function clearSeed() {
  _rng = Math.random
}
export function dailySeed(dateStr) {
  let h = 2166136261
  for (let i = 0; i < dateStr.length; i += 1) {
    h ^= dateStr.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function rng() {
  return _rng()
}

// Popular playbooks. Every offense fields the same 5 skill players (QB + 5 OL
// aside) — the playbook just decides how those 5 split across RB/WR/TE, i.e.
// real NFL personnel groupings. Defense, OL and QB are constant, so a roster is
// always 9 picks; only the offensive shape changes.
export const FORMATIONS = [
  {
    key: 'air-raid',
    name: 'Air Raid',
    personnel: '10 personnel',
    blurb: 'Empty the backfield and let it fly.',
    skill: { RB: 1, WR: 4, TE: 0 },
  },
  {
    key: 'spread',
    name: 'Spread',
    personnel: '11 personnel',
    blurb: 'The modern league standard — balanced and versatile.',
    skill: { RB: 1, WR: 3, TE: 1 },
  },
  {
    key: 'pro-style',
    name: 'Pro Style',
    personnel: '12 personnel',
    blurb: 'Two tight ends, heavy play-action.',
    skill: { RB: 1, WR: 2, TE: 2 },
  },
  {
    key: 'power-run',
    name: 'Power Run',
    personnel: '21 personnel',
    blurb: 'I-formation, lead blocker, downhill runs.',
    skill: { RB: 2, WR: 2, TE: 1 },
  },
  {
    key: 'smashmouth',
    name: 'Smashmouth',
    personnel: '22 personnel',
    blurb: 'Jumbo sets. Ground and pound, impose your will.',
    skill: { RB: 2, WR: 1, TE: 2 },
  },
]

// Build the ordered list of draft slots for a chosen formation. Each slot has a
// unique `key`, a display `label`, and the exact player `pos` it draws from.
export function buildSlots(formation) {
  const slots = [{ key: 'QB', label: 'QB', pos: 'QB' }]
  const addMany = (pos, n) => {
    for (let i = 1; i <= n; i += 1) {
      slots.push({ key: `${pos}${i}`, label: n > 1 ? `${pos}${i}` : pos, pos })
    }
  }
  addMany('RB', formation.skill.RB)
  addMany('WR', formation.skill.WR)
  addMany('TE', formation.skill.TE)
  slots.push({ key: 'OL', label: 'OL', pos: 'OL' })
  slots.push({ key: 'DC', label: 'CAPT', pos: 'DC' })
  slots.push({ key: 'DEF', label: 'DEF', pos: 'DEF' })
  return slots
}

// Keep only clean records (some DEF rows carry NaN team values).
export function cleanPlayers(raw) {
  return raw.filter(
    (p) =>
      p &&
      typeof p.team === 'string' &&
      p.team.length > 0 &&
      Number.isFinite(p.year) &&
      Number.isFinite(p.rating) &&
      typeof p.pos === 'string',
  )
}

// Build the team-season index: one entry per (team, year), holding the best
// player at each position for that season. The draft puts a whole team "on the
// clock" and the player picks which position to take from them.
export function buildTeamIndex(players) {
  const map = new Map() // "team|year" -> { team, year, key, byPos }
  for (const p of players) {
    const key = `${p.team}|${p.year}`
    let ts = map.get(key)
    if (!ts) {
      ts = { team: p.team, year: p.year, key, byPos: {} }
      map.set(key, ts)
    }
    const cur = ts.byPos[p.pos]
    if (!cur || p.rating > cur.rating) ts.byPos[p.pos] = p
  }
  return [...map.values()]
}

// Positions a player can line up at. Skill players earn a secondary position
// from their attribute ratings (a fast/route-running TE or a pass-catching RB
// can flex to WR; a big red-zone WR can flex to TE). QB/OL/DC/DEF are fixed.
export function eligiblePositions(p) {
  const out = [p.pos]
  const r = p.ratings || {}
  if (p.pos === 'RB' && (r.CTH || 0) >= 80) out.push('WR')
  else if (p.pos === 'TE' && ((r.SPD || 0) >= 74 || (r.RTE || 0) >= 82)) out.push('WR')
  else if (p.pos === 'WR' && (r.RZN || 0) >= 85) out.push('TE')
  return out
}

// Draw a random team-season that (a) hasn't been used yet and (b) has a player
// eligible (incl. position flex) for one of the still-open positions. Falls back
// to ignoring `usedKeys` only if nothing else is left, so a pick is always possible.
export function drawTeam(teamIndex, openPositions, usedKeys = new Set()) {
  const covers = (ts) =>
    Object.values(ts.byPos).some((pl) =>
      eligiblePositions(pl).some((pos) => openPositions.has(pos)),
    )
  let pool = teamIndex.filter((ts) => !usedKeys.has(ts.key) && covers(ts))
  if (pool.length === 0) pool = teamIndex.filter(covers)
  if (pool.length === 0) return null
  return pool[Math.floor(rng() * pool.length)]
}

// Draw the candidates for the final Defensive Captain pick: the best defender
// from n unused team-seasons, guaranteeing one of each role (DB / LB / DL)
// when possible so the pick is always a real strategy decision.
export function drawCaptainCandidates(teamIndex, usedKeys = new Set(), n = 4) {
  let pool = teamIndex.filter((ts) => !usedKeys.has(ts.key) && ts.byPos.DC)
  if (pool.length === 0) pool = teamIndex.filter((ts) => ts.byPos.DC)
  const byRole = {}
  for (const ts of pool) (byRole[ts.byPos.DC.role] ||= []).push(ts)
  const picks = []
  for (const role of ['DB', 'LB', 'DL']) {
    const arr = byRole[role]
    if (arr && arr.length > 0) picks.push(arr.splice(Math.floor(rng() * arr.length), 1)[0])
  }
  const rest = pool.filter((ts) => !picks.includes(ts))
  while (picks.length < n && rest.length > 0) {
    picks.push(rest.splice(Math.floor(rng() * rest.length), 1)[0])
  }
  return picks.map((ts) => ({ team: ts, player: ts.byPos.DC }))
}

// ---- Simulation -------------------------------------------------------------

const REG_GAMES = 17
const PLAYOFF_CUTOFF = 10 // regular-season wins needed to make the playoffs

// Earn a #1-seed bye, then three rounds. Win all 17 + all 3 -> 20-0.
// Opponent bases sit ~2 pts above the pre-captain values to absorb the
// average captain bonus, keeping overall difficulty (and daily scores)
// comparable to before the Defensive Captain existed.
const PLAYOFF_ROUNDS = [
  { name: 'Divisional', short: 'DIV', oppBase: 90 },
  { name: 'Conference', short: 'CONF', oppBase: 94 },
  { name: 'Super Bowl', short: 'SB', oppBase: 97 },
]

// Missed-playoff ladder (by regular-season wins), best first.
const MISS_TIERS = [
  { min: 9, name: 'In the Hunt', blurb: 'Just missed the cut.' },
  { min: 7, name: 'Also-Ran', blurb: 'Stuck in the middle.' },
  { min: 5, name: 'Rebuilding', blurb: 'Flashes, not enough.' },
  { min: 3, name: 'Bottom Feeder', blurb: 'Eyeing the draft.' },
  { min: 0, name: 'Relegation', blurb: 'Send them down.' },
]

// Decide the season's headline result.
function resultTier({ made, regWins, champion, roundReached }) {
  if (champion && regWins === REG_GAMES)
    return { name: '20-0', blurb: 'Perfect. Immortal.', perfect: true }
  if (champion)
    return { name: 'Super Bowl Champion', blurb: 'Hoisted the Lombardi.' }
  if (made && roundReached === 'Super Bowl')
    return { name: 'Super Bowl Runner-Up', blurb: 'One win from glory.' }
  if (made && roundReached === 'Conference')
    return { name: 'Conference Finalist', blurb: 'Fell in the title game.' }
  if (made)
    return { name: 'Divisional Exit', blurb: 'One and done in January.' }
  return MISS_TIERS.find((t) => regWins >= t.min)
}

// Defensive Captain matchup bonus. Each opponent leans pass-heavy or
// run-heavy; the captain's position decides which attacks he erases.
// Expected values are tuned to be nearly equal (~2.0-2.2 pts), so the choice
// is a playstyle bet, not a power pick: DB is boom-or-bust (huge vs pass,
// nothing vs run), LB is steady everywhere, DL leans run-stuffing but the
// pass rush still travels.
const PASS_HEAVY_RATE = 0.55 // share of opponents that lean pass
export const CAPTAIN_BONUS = {
  DB: { pass: 4.0, run: 0.0 },
  LB: { pass: 2.0, run: 2.0 },
  DL: { pass: 2.0, run: 2.5 },
}

// One game: higher rating wins more often. NOISE is the per-side randomness —
// lower means results track roster strength more tightly (fewer flukes).
const NOISE = 11
function playGame(avg, oppBase, spread, captainRole) {
  const style = rng() < PASS_HEAVY_RATE ? 'pass' : 'run'
  const bonus = CAPTAIN_BONUS[captainRole]?.[style] ?? 0
  const opponent = oppBase + (rng() - 0.5) * spread
  const myRoll = avg + bonus + (rng() - 0.5) * NOISE
  const oppRoll = opponent + (rng() - 0.5) * NOISE
  return { opponent: Math.round(opponent), win: myRoll >= oppRoll, style }
}

// Average the roster ratings. Higher average -> wins more games.
export function averageRating(roster) {
  const picks = Object.values(roster).filter(Boolean)
  if (picks.length === 0) return 0
  return picks.reduce((sum, p) => sum + p.rating, 0) / picks.length
}

// Run a full season: 17 regular-season games, then (if qualified) a
// single-elimination postseason of progressively tougher rounds. Win every
// game — 17 regular + 3 playoff — to finish 20-0.
export function simulateSeason(avg, captainRole = null) {
  const reg = []
  let regWins = 0
  for (let week = 1; week <= REG_GAMES; week += 1) {
    const g = playGame(avg, 85, 22, captainRole) // league strength ~74-96
    if (g.win) regWins += 1
    reg.push({ label: `${week}`, ...g })
  }
  const regLosses = REG_GAMES - regWins
  const made = regWins >= PLAYOFF_CUTOFF

  const playoffs = []
  let playoffWins = 0
  let eliminated = false
  let roundReached = null
  if (made) {
    for (const round of PLAYOFF_ROUNDS) {
      const g = playGame(avg, round.oppBase, 10, captainRole)
      playoffs.push({ label: round.short, round: round.name, ...g })
      roundReached = round.name
      if (g.win) playoffWins += 1
      else {
        eliminated = true
        break
      }
    }
  }

  const champion = made && !eliminated // swept all three rounds
  const wins = regWins + playoffWins
  const losses = regLosses + (eliminated ? 1 : 0)
  const tier = resultTier({ made, regWins, champion, roundReached })

  return {
    wins,
    losses,
    regWins,
    regLosses,
    playoffWins,
    made,
    champion,
    roundReached,
    reg,
    playoffs,
    tier,
  }
}
