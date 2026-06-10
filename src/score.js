// Numeric score for a completed season — the single comparable number that
// goes on the recap screen and in every share.
//
// Pure + deterministic: same sim result + same roster always gives the same
// score (no randomness, no dates, no globals). All tuning lives in WEIGHTS.

import SPORT from './sport.js'

// Weights live in the sport config, tuned per sport so the max possible
// score is exactly 100 (regular wins + playoff wins + champion + perfect +
// underdog cap + legend bonus). NFL: 17*3 + 3*9 + 8 + 6 + 5 + 3 = 100.
// CFB: 12*4 + 3*10 + 8 + 6 + 5 + 3 = 100. A playoff win is worth ~3x a
// regular-season win; the underdog bonus (+0.5/pt below the pivot, capped)
// rewards winning with a weaker roster; champions get +1 per legend they
// did NOT use (champion-only so a losing legend-free team can't farm it).
export const WEIGHTS = SPORT.score

// `roster` is the slotKey -> player object map (or any iterable of players).
export function computeScore(result, roster) {
  const W = WEIGHTS
  const picks = (Array.isArray(roster) ? roster : Object.values(roster || {})).filter(Boolean)

  let score = result.regWins * W.REG_WIN + result.playoffWins * W.PLAYOFF_WIN
  if (result.champion) score += W.CHAMPION
  if (result.tier?.perfect || result.perfect) score += W.PERFECT

  if (picks.length > 0) {
    const avg = picks.reduce((s, p) => s + p.rating, 0) / picks.length
    score += Math.min(W.UNDERDOG_MAX, Math.max(0, (W.UNDERDOG_PIVOT - avg) * W.UNDERDOG_RATE))

    if (result.champion) {
      const legends = picks.filter((p) => p.tier === 'legend').length
      score += Math.max(0, W.LEGEND_BONUS_MAX - legends)
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}
