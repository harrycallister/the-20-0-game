// Career stats (localStorage) + shareable result text.

import SPORT from './sport.js'

// Per-sport namespace (NFL keeps its historical 'twenty-zero' keys so no
// existing player loses stats, streaks, or today's daily lock).
const PREFIX = SPORT.meta.storagePrefix

const KEY = `${PREFIX}-stats-v1`
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

// (Share text now lives in share.js — text-first, native share sheet.)

// ---- Daily challenge: one attempt per (UTC) day + a play streak ----------
const DAILY_KEY = `${PREFIX}-daily-v1`

export function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function loadDaily() {
  try {
    return JSON.parse(localStorage.getItem(DAILY_KEY) || '{}')
  } catch {
    return {}
  }
}

export function getDaily(dateKey) {
  return loadDaily()[dateKey] || null
}

// Records today's daily once; later calls are no-ops (one attempt per day).
// `rosterSnap` is a compact [{ key, label, pos, name, rating, team, year,
// tier }] snapshot so the recap can re-render the depth chart / share image
// after a reload.
export function saveDaily(dateKey, result, formationName, rosterSnap) {
  const all = loadDaily()
  if (all[dateKey]) return all[dateKey]
  all[dateKey] = {
    date: dateKey,
    formationName,
    wins: result.wins,
    losses: result.losses,
    tierName: result.tier.name,
    perfect: !!result.tier.perfect,
    champion: !!result.champion,
    made: result.made,
    reg: result.reg.map((g) => g.win),
    playoffs: result.playoffs.map((g) => g.win),
    score: result.score,
    roster: rosterSnap || null,
  }
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
  return all[dateKey]
}

// Consecutive days played, ending today (or yesterday if today isn't done yet).
export function dailyStreak() {
  const all = loadDaily()
  const d = new Date()
  const key = (dt) => dt.toISOString().slice(0, 10)
  if (!all[key(d)]) d.setUTCDate(d.getUTCDate() - 1)
  let streak = 0
  while (all[key(d)]) {
    streak += 1
    d.setUTCDate(d.getUTCDate() - 1)
  }
  return streak
}

// Last `n` days as { date, played, won } for a streak calendar.
export function lastNDays(n) {
  const all = loadDaily()
  const out = []
  const d = new Date()
  for (let i = 0; i < n; i += 1) {
    const k = d.toISOString().slice(0, 10)
    out.unshift({ date: k, played: !!all[k], champion: all[k]?.champion })
    d.setUTCDate(d.getUTCDate() - 1)
  }
  return out
}

