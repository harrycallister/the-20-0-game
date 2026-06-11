// Quick checks for score determinism + share text format.
// Run: node scripts/test-share.mjs
import assert from 'node:assert'
import { computeScore, WEIGHTS } from '../src/score.js'
import { buildShareText, buildChallengeText, puzzleNumber } from '../src/share.js'

const mkPlayer = (rating, tier) => ({ rating, tier })

// Perfect 20-0, avg-90 roster, 0 legends: 51 + 27 + 8 + 6 + 0 underdog + 3 legend bonus = 95
const perfect = {
  regWins: 17,
  playoffWins: 3,
  champion: true,
  tier: { perfect: true },
}
const roster90 = Object.fromEntries(
  Array.from({ length: 9 }, (_, i) => [i, mkPlayer(90)]),
)
assert.equal(computeScore(perfect, roster90), 95)

// Same inputs -> same score (determinism)
assert.equal(computeScore(perfect, roster90), computeScore(perfect, roster90))

// Max score is exactly 100: perfect + avg 80 (underdog cap) + 0 legends
const roster80 = Object.fromEntries(
  Array.from({ length: 9 }, (_, i) => [i, mkPlayer(80)]),
)
assert.equal(computeScore(perfect, roster80), 100)

// Legends cost champions points: 3 legends wipe the legend bonus
const roster3Legends = Object.fromEntries(
  Array.from({ length: 9 }, (_, i) => [i, mkPlayer(90, i < 3 ? 'legend' : undefined)]),
)
assert.equal(computeScore(perfect, roster3Legends), 92)

// Winless season scores 0, not negative
assert.equal(
  computeScore({ regWins: 0, playoffWins: 0, champion: false, tier: {} }, roster90),
  0,
)

// 0-100 bounds always hold
assert.ok(computeScore(perfect, roster80) <= 100)

// ---- share text ----
assert.equal(puzzleNumber('2026-06-09'), 1)
assert.equal(puzzleNumber('2026-06-10'), 2)

const summary = {
  wins: 18,
  losses: 1,
  made: true,
  champion: false,
  perfect: false,
  reg: Array.from({ length: 17 }, (_, i) => i !== 16),
  playoffs: [true, true, false],
  score: 87,
  daily: '2026-06-09',
}
const text = buildShareText(summary)
console.log('--- daily share ---\n' + text + '\n-------------------')
assert.ok(text.startsWith('The 20-0 Game #1\n'))
assert.ok(text.includes('18-1 — Lost the Super Bowl 😤'))
assert.ok(text.includes('🏆🏆🟥'))
assert.ok(text.includes('Score: 87'))
assert.ok(text.includes('https://'))
assert.ok([...text].length < 280, `share text too long: ${[...text].length}`)

const freeText = buildShareText({ ...summary, daily: null })
assert.ok(freeText.startsWith('The 20-0 Game — Free Play\n'))

// Missed playoffs: no playoff grid, blunt flavor
const missed = buildShareText({
  ...summary,
  wins: 6,
  losses: 11,
  made: false,
  playoffs: [],
  score: 18,
})
assert.ok(missed.includes('Missed the playoffs 💀'))
assert.ok(!missed.includes('|'))

// NFL has no challenge copy configured — the engine returns null and the
// UI hides the challenge buttons.
assert.equal(buildChallengeText(summary, { played: 5 }), null)

console.log('All share/score checks passed. Max weights total:',
  17 * WEIGHTS.REG_WIN + 3 * WEIGHTS.PLAYOFF_WIN + WEIGHTS.CHAMPION +
  WEIGHTS.PERFECT + WEIGHTS.UNDERDOG_MAX + WEIGHTS.LEGEND_BONUS_MAX)
