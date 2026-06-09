// Numeric score for a completed season — the single comparable number that
// goes on the recap screen and in every share.
//
// Pure + deterministic: same sim result + same roster always gives the same
// score (no randomness, no dates, no globals). All tuning lives in WEIGHTS.

export const WEIGHTS = {
  // Regular season: 17 wins x 3 = 51 pts max. The bulk of the score, so a
  // 12-5 also-ran and a 16-1 contender feel meaningfully different.
  REG_WIN: 3,
  // Playoff depth: 3 wins x 9 = 27 pts max. A playoff win is worth three
  // regular-season wins — going deep matters more than padding the record.
  PLAYOFF_WIN: 9,
  // Winning the Super Bowl at all: +8.
  CHAMPION: 8,
  // The perfect 20-0 on top of the title: +6 (base total 92).
  PERFECT: 6,
  // Underdog bonus: +0.5 pt per rating point your roster average sits below
  // the pivot, capped. Rewards winning with a weaker roster.
  UNDERDOG_PIVOT: 90,
  UNDERDOG_RATE: 0.5,
  UNDERDOG_MAX: 5,
  // Legend restraint: champions get +1 per legend they did NOT use, up to 3.
  // (Champion-only so a 4-13 legend-free team doesn't farm free points.)
  LEGEND_BONUS_MAX: 3,
  // Max possible: 51 + 27 + 8 + 6 + 5 + 3 = 100 exactly.
}

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
