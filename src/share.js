// Share flow: text-first via the native share sheet (lands straight in
// iMessage / WhatsApp), with clipboard + download fallbacks, plus a
// render-the-recap-to-PNG path for image shares.

import { toBlob, getFontEmbedCSS } from 'html-to-image'
import SPORT from './sport.js'

// Single source of truth for the site's absolute URL. Set in `.env`
// (VITE_SITE_URL) — change it there once when moving to a custom domain.
export const SITE_URL = (
  import.meta.env?.VITE_SITE_URL || SPORT.meta.defaultSiteUrl
).replace(/\/+$/, '')

// Daily puzzle numbering: puzzle #1 is DAILY_EPOCH (UTC). Keys are
// YYYY-MM-DD, so Date.parse gives clean UTC midnights.
const DAILY_EPOCH = SPORT.meta.dailyEpoch
export function puzzleNumber(dateKey) {
  const days = (Date.parse(dateKey) - Date.parse(DAILY_EPOCH)) / 86400000
  return Math.round(days) + 1
}

// One-line verdict a stranger can parse without knowing the game.
function flavorLine(s) {
  const F = SPORT.share.flavor
  if (s.perfect) return F.perfect
  if (s.champion) return F.champion
  if (!s.made) return F.missed
  const playoffWins = s.playoffs.filter(Boolean).length
  if (playoffWins === 2) return F.lostFinal
  if (playoffWins === 1) return F.lostSemifinal
  return F.oneAndDone
}

// Build the share payload from a normalized summary:
// { wins, losses, made, champion, perfect, reg: [bool], playoffs: [bool],
//   score, daily } — `daily` is the YYYY-MM-DD key, or falsy for Free Play.
// Kept under ~280 chars so it pastes cleanly to X too.
export function buildShareText(s) {
  const header = `${SPORT.meta.title} ${s.daily ? `#${puzzleNumber(s.daily)}` : '— Free Play'}`
  const regGrid = s.reg.map((w) => (w ? '🟩' : '🟥')).join('')
  const poGrid = s.made ? ' | ' + s.playoffs.map((w) => (w ? '🏆' : '🟥')).join('') : ''
  return [
    header,
    `${s.wins}-${s.losses} — ${flavorLine(s)}`,
    regGrid + poGrid,
    Number.isFinite(s.score) ? `Score: ${s.score}` : null,
    // utm_source=share lets GA4 split friend-share visits from other channels
    `${SITE_URL}/?utm_source=share&utm_medium=social`,
  ]
    .filter(Boolean)
    .join('\n')
}

// Adapt a live sim result (game.js shape) to the share summary shape.
export function summaryFromResult(result, daily) {
  return {
    wins: result.wins,
    losses: result.losses,
    made: result.made,
    champion: !!result.champion,
    perfect: !!result.tier?.perfect,
    reg: result.reg.map((g) => g.win),
    playoffs: result.playoffs.map((g) => g.win),
    score: result.score,
    daily,
  }
}

// Adapt a stored daily summary (stats.js shape) — already mostly normalized.
export function summaryFromDaily(d) {
  return { ...d, daily: d.date }
}

// Native share sheet first; clipboard fallback. Returns how it ended so the
// button can confirm ("Copied!" vs the sheet handling its own feedback).
// NB: navigator.share and navigator.clipboard only exist in secure contexts
// (https) — on a plain-http page (e.g. while a new domain's TLS cert is
// pending) we fall back to the legacy execCommand copy, which still works.
export async function shareResultText(text) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      // URL rides inside `text` (not the `url` field) so it survives every
      // target, including the clipboard fallback and plain SMS.
      await navigator.share({ text })
      return 'shared'
    } catch (err) {
      if (err && err.name === 'AbortError') return 'dismissed'
      // fall through to clipboard on any other failure
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok ? 'copied' : 'failed'
  } catch {
    return 'failed'
  }
}

// Render a DOM node to a PNG and share it as a file (attaches directly in
// iMessage when supported); otherwise download it.
// The webfont-embedding CSS is expensive to compute (network fetches), so we
// do it once per session and reuse it for every share.
let _fontEmbedCss = null
export async function shareNodeAsImage(node, filename) {
  let blob
  try {
    if (_fontEmbedCss === null) {
      _fontEmbedCss = await getFontEmbedCSS(node).catch(() => '')
    }
    blob = await toBlob(node, {
      pixelRatio: 2,
      backgroundColor: '#f0e9d6',
      fontEmbedCSS: _fontEmbedCss,
    })
  } catch {
    return 'failed'
  }
  if (!blob) return 'failed'

  const file = new File([blob], filename, { type: 'image/png' })
  if (
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (err) {
      if (err && err.name === 'AbortError') return 'dismissed'
      // fall through to download
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'downloaded'
}
