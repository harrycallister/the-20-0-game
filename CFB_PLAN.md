# The 15-0 Game — College Football Edition Build Plan

## Architecture summary (current NFL game)

~4,200 lines total. Everything static except the Supabase leaderboard.

| File | Role | Sport-coupling |
|---|---|---|
| `ratings.py` (474) | nflreadpy → per-position per-season z-scores → re-standardized across years → `to_rating()` (76 avg, 99 cap) → flat `players.json`. Curated `LEGENDS` list inline. | NFL-specific (data layer) |
| `players.json` (3.1 MB) | Flat list: `{name, team, year, pos, rating, tier: modern|legend, ratings:{...}, stats:{...}, dpos?, role?}`. Positions: QB/RB/WR/TE/OL/DC/DEF. | NFL data |
| `src/game.js` (294) | mulberry32 + `dailySeed(dateStr)` (FNV hash); `FORMATIONS` (5 playbooks, personnel groupings); `buildSlots()` (9 picks: QB + 5 skill + OL + DC + DEF); team index; position flex; captain candidates (DB/LB/DL guaranteed); sim: `REG_GAMES=17`, `PLAYOFF_CUTOFF=10`, 3 `PLAYOFF_ROUNDS` (DIV 90 / CONF 94 / SB 97), `CAPTAIN_BONUS` + `PASS_HEAVY_RATE=0.55`, `NOISE=11`, league base 85 spread 22, `MISS_TIERS`, `resultTier()`. | **Mixed** — engine is generic, constants/copy are NFL |
| `src/score.js` (49) | `WEIGHTS`: 17×3 + 3×9 + 8 + 6 + underdog 5 + legend 3 = 100 exactly. | **Mixed** — formula generic, weights tied to 17/3 |
| `src/share.js` (139) | Share text ("The 20-0 Game #N", Super Bowl flavor lines), `SITE_URL` from `VITE_SITE_URL`, `DAILY_EPOCH='2026-06-09'`, PNG render. | Mixed |
| `src/stats.js` (117) | localStorage career stats + daily lock. Keys `twenty-zero-*`. | Mixed (keys + "perfects") |
| `src/leaderboard.js` (114) | Supabase REST, table `daily_runs`, unique (day, client_id). | Mixed (table name) |
| `src/App.jsx` (1245) | All screens/copy: playbook select, draft, captain page, sim ticker, recap, leaderboard. NFL copy throughout. | Mixed |
| `src/index.css` (1733) | Vintage program theme. Mostly sport-agnostic. | ~Agnostic |
| `index.html` | Title/OG/JSON-LD/SEO footer — all NFL copy; GA4 `G-DH17K0Z0QZ`. | NFL copy |
| `vite.config.js`, `.github/workflows/deploy.yml` | `base:'./'`, GitHub Pages deploy. | Agnostic |

Determinism: ALL randomness flows through `rng()` in game.js; daily seed = FNV-1a of `YYYY-MM-DD`. Env keys: `VITE_SITE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Approach: sport-config layer + two Vite builds, one repo

Extract every sport-specific constant into `src/sports/nfl.js` and `src/sports/cfb.js`; engine modules take the config. Sport chosen at build time via `VITE_SPORT` (defaults `nfl`), so `npm run build` stays byte-equivalent for the NFL game. CFB ships as a second build artifact deployed to its own GitHub Pages site/domain. No fork; one engine.

Sport config object contains:
- `meta`: title ("The 15-0 Game"), tagline, dailyEpoch, siteUrl env key, GA id, og copy, localStorage key prefix (`fifteen-zero-*`), players.json path
- `formations`: CFB playbooks — Air Raid (10), Spread (11), Pro Style (12), Power/I-Form (21), Triple Option/Wishbone-flavored Smashmouth (22). Same `skill:{RB,WR,TE}` shape ⇒ `buildSlots()` unchanged (still 9 picks: QB, 5 skill, OL, CAPT, DEF).
- `season`: `regGames:12`, `playoffCutoff:10` (10-2 ≈ at-large floor), rounds `[Quarterfinal 90, Semifinal 94, National Championship 97]` (top-4 seed bye framing — QF is your first game), missTiers (CFB flavor: "New Year's Six", "Bowl Eligible", "5-7", "Fire the Coach", …), tier names ("15-0 — Perfect. Immortal." / "National Champion" — Indiana 2025-26 as canonical reference), pass-heavy rate, captain bonus (reuse NFL values initially, re-verify EV over 20k sims)
- `score`: REG_WIN 4 (48) + PLAYOFF_WIN 10 (30) + CHAMPION 8 + PERFECT 6 + UNDERDOG 5 + LEGEND 3 = **100 exactly**
- `copy`: all App.jsx strings (trophy = "the natty", flavor lines, captain explainer)

Supabase: same project, new table `daily_runs_cfb` (identical schema + RLS) — zero risk to the NFL table.

## Phases (each leaves NFL green: `npm run build` + `node scripts/test-share.mjs` after every phase)

**Phase 1 — Refactor NFL constants into `src/sports/nfl.js`** (no behavior change). Engine modules (`game.js`, `score.js`, `share.js`, `stats.js`, `leaderboard.js`) read from an injected sport config; `App.jsx` copy moved progressively (only strings that differ). Verify: build, share-text tests, one daily run in browser matches pre-refactor spins for today's seed (CRITICAL determinism check).

**Phase 2 — CFB data pipeline (`ratings_cfb.py`)** — the hard part, done before any UI.
- `cfbd` Python package, key from `CFBD_API_KEY` env (never hardcoded).
- **Cache-first**: every API response saved to `data/cfbd_cache/<endpoint>_<season>.json`; loader checks cache before any HTTP call; a full re-run after first pull makes **zero** API calls. Budget: ~3-5 calls/season (player season stats, team season stats, games) × ~24 seasons ≈ 100-150 calls total, well under the 1,000/month cap. Pull season-by-season with progress logging so an interrupted run loses nothing.
- Modern era **2001-2024** (reliable player stats window). FBS only.
- Same method as NFL, documented in comments: per-position per-season z-scores vs that season's qualifiers (volume thresholds scaled to 12-game seasons), weighted composite, re-standardize across all seasons, same `to_rating()` scale. Era/conference variance is absorbed by the season-relative z-scores; conference-strength adjustment noted as a future iteration, not chased now.
- Positions emitted: QB/RB/WR/TE (with Madden-style attrs reusing NFL labels), DC (DL/LB/DB roles from cfbd position strings), DEF unit (points allowed, sacks, INTs per team-season), OL unit (team rush YPC + sack rate allowed).
- **Legends**: separate, hand-curated, editable `cfb_legends.py` (Herschel Walker '82, Barry Sanders '88, Bo Jackson '85, Tim Brown '87, Desmond Howard '91, Charles Woodson '97, Tommie Frazier '95, '01 Miami DEF, '95 Nebraska OL, etc.) with **only real documented stats — anything unverifiable left blank and flagged `# TODO verify`**, gold badge via `tier:"legend"`.
- Output `players_cfb.json` in the exact engine schema.
- **Verification gate before wiring in**: spot-check ~10 known seasons (e.g. 2019 Joe Burrow, 2020 DeVonta Smith, 1988 Barry Sanders legend entry, 2024-25 Ashton Jeanty) against published numbers; sanity-check top-10 lists per position pass the eye test. Report to you before Phase 3.

**Phase 3 — CFB front.** `cfb.html` entry + `src/sports/cfb.js` config; Vite multi-page or `VITE_SPORT` mode build (`npm run build:cfb` → `dist-cfb/`). New OG image/copy/title, keep the vintage-program aesthetic (palette can stay; copy says "game-day program" either way). Dev: `npm run dev:cfb`.

**Phase 4 — Leaderboard + share.** `daily_runs_cfb` table + RLS (via Supabase MCP, after your OK), share text "The 15-0 Game #N … 🟩×12 | 🏆×3", new `DAILY_EPOCH` for CFB puzzle #1.

**Phase 5 — Deploy.** Second workflow job building with `VITE_SPORT=cfb` + `VITE_SITE_URL_CFB`, publishing to a second repo's Pages (or same-repo second Pages via artifact) with its own CNAME. NFL deploy untouched.

**Phase 6 — Balance pass.** 20k-sim harness (like the captain EV check) to confirm 15-0 rate ≈ current 20-0 rate and captain roles stay near-equal EV; extend `scripts/test-share.mjs` for CFB score weights (max = 100) and share text.

## Open questions for you
1. CFB domain name (for `VITE_SITE_URL_CFB` / CNAME)? e.g. go15-0.com
2. Deploy target: second GitHub repo for Pages, or another host (Cloudflare Pages would simplify two-site deploys from one repo)?
3. OK to create `daily_runs_cfb` in the existing Supabase project?
4. CFB playbook names: keep the five NFL-style ones, or swap one for Triple Option (RB:3/WR:1/TE:1 would need a 6th personnel shape — engine handles it fine)?
