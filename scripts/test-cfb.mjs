// CFB-edition checks: score weights, share text, CCG, and sim balance.
// Run: VITE_SPORT=cfb node scripts/test-cfb.mjs
import assert from 'node:assert'
import { computeScore, WEIGHTS } from '../src/score.js'
import { buildShareText, puzzleNumber } from '../src/share.js'
import { FORMATIONS, simulateSeason, teamMVP, heismanRace, buildSlots, setSeed, clearSeed } from '../src/game.js'
import SPORT from '../src/sport.js'

assert.equal(SPORT.key, 'cfb', 'run with VITE_SPORT=cfb')

// Max score is exactly 100: perfect 16-0 + underdog cap + 0 legends.
// 13 "regular season" games = 12 + the conference championship.
const REG = SPORT.season.regGames
assert.equal(REG, 13)
const perfect = { regWins: REG, playoffWins: 3, champion: true, tier: { perfect: true } }
const roster80 = Object.fromEntries(
  Array.from({ length: 9 }, (_, i) => [i, { rating: 80 }]),
)
assert.equal(
  REG * WEIGHTS.REG_WIN + 3 * WEIGHTS.PLAYOFF_WIN + WEIGHTS.CHAMPION +
    WEIGHTS.PERFECT + WEIGHTS.UNDERDOG_MAX + WEIGHTS.LEGEND_BONUS_MAX,
  100,
)
assert.equal(computeScore(perfect, roster80), 100)

// 6 playbooks including Triple Option (3 RBs), all summing to 5 skill picks
assert.equal(FORMATIONS.length, 6)
const tri = FORMATIONS.find((f) => f.key === 'triple-option')
assert.deepEqual(tri.skill, { RB: 3, WR: 1, TE: 1 })
for (const f of FORMATIONS) {
  assert.equal(f.skill.RB + f.skill.WR + f.skill.TE, 5, `${f.key} skill split`)
}

// The 13th regular-season game is the Conference Championship: labeled CCG,
// and the result carries a confChampion flag matching its outcome.
setSeed(99)
const season = simulateSeason(90, 'LB')
assert.equal(season.reg.length, REG)
assert.equal(season.reg[REG - 1].label, SPORT.season.ccg.label)
assert.ok(season.reg[REG - 1].ccg)
assert.equal(season.confChampion, season.reg[REG - 1].win)
clearSeed()

// Share text: CFB title + 13-game grid + playoff trio
const summary = {
  wins: 14,
  losses: 1,
  made: true,
  champion: false,
  perfect: false,
  reg: Array.from({ length: REG }, () => true),
  playoffs: [true, true, false],
  score: 88,
  daily: SPORT.meta.dailyEpoch,
}
const text = buildShareText(summary)
console.log('--- cfb share ---\n' + text + '\n-----------------')
assert.ok(text.startsWith('The 16-0 Game #1\n'))
assert.ok(text.includes('Lost the National Championship 😤'))
assert.equal(puzzleNumber(SPORT.meta.dailyEpoch), 1)
assert.ok([...text].length < 280)

// Team MVP: deterministic, scheme-aware. Equal-rated QB and RB: the QB wins
// it in Air Raid, the RB wins it in the Triple Option.
{
  const air = FORMATIONS.find((f) => f.key === 'air-raid')
  const triSlots = buildSlots(tri)
  const airSlots = buildSlots(air)
  const mk = (pos, rating) => ({ pos, rating, name: pos, team: 'T', year: 2020 })
  const rosterFor = (slots) =>
    Object.fromEntries(slots.map((s) => [s.key, mk(s.pos, 90)]))
  const a = teamMVP(rosterFor(airSlots), air, airSlots)
  const t = teamMVP(rosterFor(triSlots), tri, triSlots)
  assert.equal(a.player.pos, 'QB', 'Air Raid MVP should be the QB')
  assert.equal(t.player.pos, 'RB', 'Triple Option MVP should be an RB')
  // deterministic: same inputs, same MVP
  assert.equal(teamMVP(rosterFor(airSlots), air, airSlots).player.pos, 'QB')
}

// Heisman race: an elite QB on a championship Air Raid team wins it; the
// same QB on a losing team does not; deterministic; units never eligible.
{
  const air = FORMATIONS.find((f) => f.key === 'air-raid')
  const slots = buildSlots(air)
  const mk = (pos, rating) => ({ pos, rating, name: pos, team: 'T', year: 2020 })
  const roster = Object.fromEntries(slots.map((s) => [s.key, mk(s.pos, 85)]))
  roster.QB = mk('QB', 96)
  const greatSeason = { regWins: 12, confChampion: true, champion: true }
  const badSeason = { regWins: 4, confChampion: false, champion: false }
  const winner = heismanRace(roster, air, slots, greatSeason)
  assert.equal(winner.player.pos, 'QB')
  assert.ok(winner.won, 'elite QB + championship season should win the Heisman')
  assert.ok(!heismanRace(roster, air, slots, badSeason).won, 'losing season should not')
  assert.equal(heismanRace(roster, air, slots, greatSeason).won, winner.won, 'deterministic')
  // real-life Heisman season nudges a tight race
  const r2 = { ...roster, QB: { ...mk('QB', 96), heisman: true } }
  assert.ok(heismanRace(r2, air, slots, greatSeason).score > winner.score)
}

// Sim balance: perfect-season and title rates by roster strength over 20k
// seasons each. 16-0 should be rare but reachable for elite rosters.
setSeed(12345)
for (const avg of [85, 88, 90, 93]) {
  let titles = 0
  let perfects = 0
  const N = 20000
  for (let i = 0; i < N; i += 1) {
    const r = simulateSeason(avg, 'LB')
    if (r.champion) titles += 1
    if (r.tier.perfect) perfects += 1
  }
  console.log(
    `avg ${avg}: natty ${(100 * titles / N).toFixed(1)}%  16-0 ${(100 * perfects / N).toFixed(2)}%`,
  )
}
clearSeed()

console.log('All CFB checks passed.')
