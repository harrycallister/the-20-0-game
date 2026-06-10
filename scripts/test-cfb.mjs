// CFB-edition checks: score weights, share text, and sim balance.
// Run: VITE_SPORT=cfb node scripts/test-cfb.mjs
import assert from 'node:assert'
import { computeScore, WEIGHTS } from '../src/score.js'
import { buildShareText, puzzleNumber } from '../src/share.js'
import { FORMATIONS, simulateSeason, setSeed, clearSeed } from '../src/game.js'
import SPORT from '../src/sport.js'

assert.equal(SPORT.key, 'cfb', 'run with VITE_SPORT=cfb')

// Max score is exactly 100: perfect 15-0 + underdog cap + 0 legends
const perfect = { regWins: 12, playoffWins: 3, champion: true, tier: { perfect: true } }
const roster80 = Object.fromEntries(
  Array.from({ length: 9 }, (_, i) => [i, { rating: 80 }]),
)
assert.equal(
  12 * WEIGHTS.REG_WIN + 3 * WEIGHTS.PLAYOFF_WIN + WEIGHTS.CHAMPION +
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

// Share text: CFB title + 12-game grid + playoff trio
const summary = {
  wins: 13,
  losses: 1,
  made: true,
  champion: false,
  perfect: false,
  reg: Array.from({ length: 12 }, () => true),
  playoffs: [true, true, false],
  score: 88,
  daily: SPORT.meta.dailyEpoch,
}
const text = buildShareText(summary)
console.log('--- cfb share ---\n' + text + '\n-----------------')
assert.ok(text.startsWith('The 15-0 Game #1\n'))
assert.ok(text.includes('Lost the National Championship 😤'))
assert.equal(puzzleNumber(SPORT.meta.dailyEpoch), 1)
assert.ok([...text].length < 280)

// Sim balance: perfect-season and title rates by roster strength over 20k
// seasons each. Sanity targets: 15-0 should be rare but reachable for elite
// rosters, near-impossible for average ones (mirrors the NFL game's feel).
setSeed(12345)
for (const avg of [80, 85, 88, 90, 93]) {
  let titles = 0
  let perfects = 0
  const N = 20000
  for (let i = 0; i < N; i += 1) {
    const r = simulateSeason(avg, 'LB')
    if (r.champion) titles += 1
    if (r.tier.perfect) perfects += 1
  }
  console.log(
    `avg ${avg}: natty ${(100 * titles / N).toFixed(1)}%  15-0 ${(100 * perfects / N).toFixed(2)}%`,
  )
}
clearSeed()

console.log('All CFB checks passed.')
