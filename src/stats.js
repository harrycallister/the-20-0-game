// Career stats (localStorage) + shareable result text.

const KEY = 'twenty-zero-stats-v1'
const EMPTY = {
  played: 0,
  titles: 0,
  perfects: 0,
  bestWins: 0,
  streak: 0, // consecutive seasons making the playoffs
  bestStreak: 0,
}

export function loadStats() {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...EMPTY }
  }
}

export function recordResult(result) {
  const s = loadStats()
  s.played += 1
  if (result.champion) s.titles += 1
  if (result.tier.perfect) s.perfects += 1
  if (result.wins > s.bestWins) s.bestWins = result.wins
  if (result.made) {
    s.streak += 1
    if (s.streak > s.bestStreak) s.bestStreak = s.streak
  } else {
    s.streak = 0
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore quota / privacy-mode errors */
  }
  return s
}

// Wordle-style shareable summary.
export function shareText(result, formationName) {
  const url =
    typeof location !== 'undefined' ? location.origin + location.pathname : ''
  const crown = result.tier.perfect ? ' 🐐' : result.champion ? ' 🏆' : ''
  const reg = result.reg.map((g) => (g.win ? '🟩' : '⬜')).join('')
  const po = result.made
    ? '\n' + result.playoffs.map((g) => (g.win ? '🟩' : '⬜')).join('') + crown
    : ''
  return [
    'The 20-0 Game 🏈',
    `${formationName} · ${result.wins}-${result.losses} · ${result.tier.name}`,
    reg + po,
    url,
  ]
    .filter(Boolean)
    .join('\n')
}
