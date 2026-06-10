// Daily leaderboard backed by Supabase's REST API — plain fetch, no SDK,
// zero bundle cost. RLS only allows anon insert + select on daily_runs.
//
// Anti-spam is intentionally light for launch: one row per device per day
// (unique day+client_id). `picks` is stored with each run so suspicious
// scores can be replay-validated later (daily runs are fully seeded).

import SPORT from './sport.js'

const SUPA_URL = import.meta.env?.VITE_SUPABASE_URL
const SUPA_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY
const RUNS = `${SUPA_URL}/rest/v1/${SPORT.meta.leaderboardTable}`

export const leaderboardEnabled = Boolean(SUPA_URL && SUPA_KEY)

const HEADERS = {
  apikey: SUPA_KEY,
  Authorization: `Bearer ${SUPA_KEY}`,
  'Content-Type': 'application/json',
}

// ---- local identity --------------------------------------------------------

const PREFIX = SPORT.meta.storagePrefix
const CLIENT_KEY = `${PREFIX}-client-v1`
const NAME_KEY = `${PREFIX}-name-v1`
const SUBMIT_KEY = `${PREFIX}-lb-v1` // { [day]: name } — days already submitted

export function clientId() {
  try {
    let id = localStorage.getItem(CLIENT_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(CLIENT_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

export function getPlayerName() {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}

export function getSubmitted(day) {
  try {
    return JSON.parse(localStorage.getItem(SUBMIT_KEY) || '{}')[day] || null
  } catch {
    return null
  }
}

function markSubmitted(day, name) {
  try {
    localStorage.setItem(NAME_KEY, name)
    const all = JSON.parse(localStorage.getItem(SUBMIT_KEY) || '{}')
    all[day] = name
    localStorage.setItem(SUBMIT_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

// ---- API -------------------------------------------------------------------

// Submit today's run. Resolves true on success OR if this device already
// submitted (409 from the unique constraint) — both mean "you're on the board".
export async function submitDailyRun({ day, name, score, wins, losses, rosterAvg, picks }) {
  const trimmed = name.trim().slice(0, 20)
  if (!trimmed) throw new Error('Enter a name first')
  const res = await fetch(RUNS, {
    method: 'POST',
    headers: { ...HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify({
      day,
      client_id: clientId(),
      name: trimmed,
      score,
      wins,
      losses,
      roster_avg: rosterAvg ? Math.round(rosterAvg * 10) / 10 : null,
      picks,
    }),
  })
  if (!res.ok && res.status !== 409) {
    throw new Error(`Leaderboard unavailable (HTTP ${res.status})`)
  }
  markSubmitted(day, trimmed)
  return true
}

// Top runs for a day, best score first (earlier submission breaks ties).
export async function fetchDailyTop(day, limit = 20) {
  const params = new URLSearchParams({
    day: `eq.${day}`,
    select: 'name,score,wins,losses,roster_avg,client_id',
    order: 'score.desc,created_at.asc',
    limit: String(limit),
  })
  const res = await fetch(`${RUNS}?${params}`, { headers: HEADERS })
  if (!res.ok) throw new Error(`Leaderboard unavailable (HTTP ${res.status})`)
  const rows = await res.json()
  const me = clientId()
  return rows.map((r, i) => ({
    rank: i + 1,
    name: r.name,
    score: r.score,
    record: `${r.wins}-${r.losses}`,
    avg: r.roster_avg,
    mine: r.client_id === me,
  }))
}
