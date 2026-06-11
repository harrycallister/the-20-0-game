# The 16-0 Game 🏈

Draft an all-time college football roster program-by-program and chase the perfect **16-0 season**: 12 regular-season wins, your conference championship, a first-round Playoff bye, and 3 College Football Playoff wins.

**▶ Play: https://go16-0game.com**

The CFB sibling of [The 20-0 Game](https://go20-0.com) (NFL) — same engine, same repo, completely separate game. See [README.md](README.md) for the NFL edition and the shared-engine architecture.

---

## How a game works

1. **Pick your mode.** Daily Challenge or Free Play.
2. **Pick your style.** Classic (ratings shown) or Expert (real stats only, draft blind).
3. **Pick a playbook.** Air Raid, Spread, Pro Style, Power Run, Smashmouth, or the Triple Option. The playbook sets your offensive personnel (how many RB / WR / TE you draft), labeled with real personnel groupings (10/11/12/21/22/31). A Start button confirms your choices, so you can change your mind before locking in.
4. **Draft 8 players, one program at a time.** Hit "Spin for a Team" and a random program-season lands on the clock (Alabama 2020, USC 2004, Miami 2001, Boise State 2024, …). Draft one player from it into an open slot. You get 2 rerolls per game to skip a team.
5. **Use position flex.** Versatile players can fill more than one spot: a pass-catching RB or a fast, route-running TE can play WR, and a big red-zone WR can play TE. You choose where they line up.
6. **Choose your Defensive Captain**, the dedicated final pick (see below).
7. **Simulate the season.** 12 regular-season games, the Conference Championship, then the Playoff — with a week-by-week W/L ticker, a bracket, and post-season awards. Higher-rated rosters win more, but only an elite team runs the table to 16-0.

## The road to 16-0

Under the 12-team College Football Playoff, a perfect title run for a top-4 seed is:

| Games | What |
|---|---|
| 12 | Regular season |
| 1 | **Conference Championship** (game 13 — a tougher opponent than a normal week) |
| — | First-round bye (the reward for the top-4 seed) |
| 1 | CFP Quarterfinal |
| 1 | CFP Semifinal |
| 1 | **National Championship** |

Win all 16 and the verdict reads **16-0 — Perfect. Immortal.** 🐐 (Indiana ran exactly this table in 2025-26.)

Make the Playoff with 10+ wins. Miss it and you land on a ladder of consolation verdicts: *Left Out* (snubbed by the committee), *Bowl Season*, *Bowl Eligible*, *Rebuilding*, down to *Fire the Coach*.

## The roster

Every roster is 9 picks:

| Slot | What it is |
|------|-----------|
| QB | Quarterback |
| RB / WR / TE (×5 total) | Skill players. The split is set by your playbook |
| OL | A program's entire offensive line, rated as a unit |
| CAPT | Defensive Captain: the best defender on a team, any position |
| DEF | A program's entire defense, rated as a unit |

### The playbooks

| Playbook | Personnel | Skill split | Identity |
|---|---|---|---|
| Air Raid | 10 | 1 RB · 4 WR · 0 TE | Born in college. Empty the backfield and let it fly |
| Spread | 11 | 1 RB · 3 WR · 1 TE | The modern college standard — tempo and space |
| Pro Style | 12 | 1 RB · 2 WR · 2 TE | Two tight ends, play-action, NFL polish |
| Power Run | 21 | 2 RB · 2 WR · 1 TE | I-formation, lead blocker, downhill runs |
| Smashmouth | 22 | 2 RB · 1 WR · 2 TE | Jumbo sets. Ground and pound |
| Triple Option | 31 | 3 RB · 1 WR · 1 TE | The wishbone lives. Three backs, dive-keep-pitch |

The playbook isn't just cosmetic: it shapes who you draft, the field view (the Triple Option renders a true wishbone — fullback behind the QB, halfbacks split deep), and who wins your post-season awards.

## The Defensive Captain

After your lineup is set, a dedicated final-pick page appears: choose one captain from four candidates drawn from teams you haven't used. The candidates include at least one DB, one LB, and one D-lineman, plus a wildcard.

**The captain's position changes how your defense plays, and that changes your score.** Every simulated opponent leans pass-heavy or run-heavy:

- **DB** (CB / S): erases pass-heavy teams. Boom or bust: dominant through the air, nothing extra against the run.
- **LB**: steady against both run and pass.
- **DL** (DE / DT / EDGE): stuffs the run, and the pass rush travels too.

The three roles have near-equal expected value over thousands of simulated seasons, so you're betting on a playstyle, not picking a stat stick.

## Post-season awards

### 🏆 The Heisman Trophy

Your star can **win the Heisman** — it's an in-game award decided by your season, not a badge for historical winners. After the sim, your skill players (and your captain, at a steep discount — a true two-way star can pull a Charles Woodson) compete on:

- overall rating,
- how featured they are in your playbook (an Air Raid QB or a wishbone workhorse RB has the volume narrative),
- and the season itself — every win counts, the conference title helps, and **winning the natty is worth the most by far**.

Calibration: every national champion crowns a Heisman winner; an elite featured star wins it in roughly half his seasons even without the title; ordinary rosters only get one by winning it all. Players whose real-life season actually won the Heisman (all winners 1935–2025 are in the data) get a quiet "the voters already love him" boost — drafting 2019 Joe Burrow makes him *likelier to win yours*.

A win renders a gold trophy card on the recap, with escalating copy for champions and perfect seasons.

### ⭐ Team MVP

Every completed season also names a Team MVP — the roster's top performer given your scheme. It's deterministic (overall rating + playbook positional emphasis + captain matchup value), so the daily names the same MVP for everyone:

- Air Raid pushes it toward your QB and receivers; the Triple Option and run schemes push it toward your backs — and a ground-and-pound O-line can take it;
- your Defensive Captain competes too, weighted by his matchup value;
- even the defense unit can win it when it's clearly the class of the team.

The card shows the player's real stat line (legends show their top attributes), badges, and a scheme-flavored blurb.

### 🏆 Conference Champion

Game 13 is your Conference Championship. Win it and the recap carries a "Conference Champion" honor; lose it and that's noted too (and your Playoff path likely just got harder).

## Modes & features

- **Daily Challenge.** Everyone in the world gets the same teams in the same order each day, seeded by the date. One run per day, with a streak counter and 7-day calendar. Daily puzzle #1 was June 10, 2026.
- **Daily Leaderboard.** Post your score under any name and see today's top 20 runs (one entry per device per day). Supabase with row-level security handles storage.
- **Free Play.** Unlimited games, fresh randomness every time.
- **Classic vs Expert.** Classic shows 0-99 overall and attribute ratings (Madden-style: ARM/ACC/AWR/DEEP/RUN for QBs, COV/INT/TAK for DBs, and so on). Expert hides every rating; you scout real stat lines (yards, TDs, sacks, INTs) and draft on football knowledge alone.
- **Score (0-100).** Regular-season wins (3 pts each), playoff wins (13 each — a playoff win is worth more than four regular-season wins), a championship bonus (+8), a perfect-season bonus (+6), an underdog bonus for winning with a weaker roster (up to +5), and a legend-restraint bonus for champions (up to +3). A perfect 16-0 with maximum bonuses is exactly 100.
- **Career stats.** Games played, titles, 16-0s, best record, and daily streak, saved on your device.
- **Sharing.** Share your result as text (Wordle-style emoji grid 🟩🟥 — 13 squares + the Playoff trio 🏆 — with your score and the site link, straight into iMessage/WhatsApp via the native share sheet) or as an image (a generated PNG result card with your record, score, and full depth chart). Falls back gracefully to clipboard copy everywhere, including non-HTTPS contexts.
- **Spin reveal.** Every pick starts behind a mystery "? ? ?" banner and a Spin button, with a slot-machine team reel (respects reduced-motion settings).
- **Mobile-tuned field.** The depth-chart field gets a taller aspect on phones so the wishbone's center column never collides.
- **Home button.** The masthead title returns you to the home screen from anywhere.

## The player pool

**28,000+ real player seasons across a century of college football:**

- **Modern era (2006–2025):** every qualifying season rated from real [CollegeFootballData.com](https://collegefootballdata.com) stats. QBs (including a RUN attribute — college quarterbacks run), RBs, WRs, TEs, plus whole O-lines and defenses rated as units. Individual defenders (sacks/TFL/QB hurries for linemen, tackles for linebackers, INTs/passes defended for DBs) join from 2016, when the API's individual defensive stats begin.
- **Legends (1924–2015):** 130+ hand-rated all-time greats on the same scale — Red Grange, Sammy Baugh, Jim Brown, Herschel Walker, Barry Sanders, Bo Jackson, Tommie Frazier, Randy Moss at Marshall, Charles Woodson, the 1995 Nebraska Pipeline, the 2001 Miami defense. The legend pool deliberately covers the API's blind spots: the 1999–2003 seasons, pre-2016 defensive stars (Suh '09, Aaron Donald '13, the Honey Badger '11), and a couple of outright data holes (Cam Newton 2010 exists nowhere in the API). Legends carry a gold badge in the draft.

Ratings are **era-relative**: each player is measured against his own season's qualifiers (z-scores per position per year, re-standardized across years), so a 1988 star and a 2025 star are comparable. An average starter sits around 76; the elite cap is 99. The team pool spans **2,600+ program-seasons**, so the spin reel runs deep — you'll draft from Boise State and Old Dominion as often as Alabama.

## The simulation

- 12 regular-season games against a national slate of varying strength, then the Conference Championship against a contender, then (with 10+ wins) the three-round Playoff against tougher opponents each round: Quarterfinal, Semifinal, National Championship.
- Each game: your roster average + captain matchup bonus + noise vs. the opponent's roll. Better rosters win more, and a bad roll can still lose any week.
- **Date-seeded determinism.** The Daily Challenge seeds every spin and every sim from the date (mulberry32 PRNG, FNV-1a hash of YYYY-MM-DD). Identical picks produce identical seasons for everyone on Earth — no server required.

## Design

The same vintage game-day-program aesthetic as the NFL edition: aged-paper palette, varsity block display font (Graduate), hard-offset ink shadows, chalkboard team banners, and a newspaper-masthead header.

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + Vite 5, plain JavaScript, single-page |
| Engine | Shared with the NFL game via a sport-config layer (`src/sports/cfb.js` holds every CFB constant) |
| Bundle isolation | Vite resolves `src/sport.js` to exactly one sport per build — the CFB bundle contains zero NFL strings and vice versa |
| Styling | Hand-written CSS (no framework), sport-scoped tweaks via a `sport-cfb` body class |
| Data pipeline | Python (`ratings_cfb.py`): the official `cfbd` package / pandas / numpy → `players_cfb.json` |
| API budget | Cache-first (`data/cfbd_cache/`): every response cached forever, warm re-runs make **zero** API calls |
| Leaderboard | Supabase (PostgreSQL + PostgREST), table `daily_runs_cfb`, row-level security, no SDK, plain `fetch` |
| Awards | `heismanRace()` / `teamMVP()` — pure deterministic functions, config-gated per sport |
| Share image | html-to-image (client-side PNG render) |
| Analytics | Google Analytics 4 (its own property — never mixed with the NFL site's data) |
| SEO | OG/Twitter cards + promo image, canonical URL, schema.org VideoGame JSON-LD, robots.txt, sitemap.xml, static crawlable footer |
| Hosting | GitHub Pages + GitHub Actions auto-deploy, custom domain `go16-0game.com`, HTTPS enforced |

Everything except the leaderboard is static; there is no game server. Any device can reproduce a daily challenge from the date alone.

## Develop

```bash
npm install
npm run dev:cfb        # local CFB dev server (opens /cfb.html)
npm run build:cfb      # production build → dist-cfb/ (entry renamed to index.html)
VITE_SPORT=cfb node scripts/test-cfb.mjs   # score weights, share text, CCG,
                                           # MVP/Heisman logic, 20k-sim balance
```

Regenerate player data (needs the CFB venv — the `cfbd` package's pydantic pin conflicts with the NFL pipeline, so they can't share one):

```bash
python3 -m venv .venv-cfb && .venv-cfb/bin/pip install cfbd pandas numpy   # once
CFBD_API_KEY=... .venv-cfb/bin/python ratings_cfb.py   # key only needed on cache misses
cp players_cfb.json public-cfb/                         # the app serves the public-cfb copy
```

Useful pipeline switches: `CFBD_SEASONS=2023` limits a run to specific seasons (cache-only testing); `--probe YEAR` dumps the API's real field names for a season before you trust any composite. Editable data files: `cfb_legends.py` (the hand-rated pool — real seasons only, never invented stats) and `cfb_heisman.py` (every real Heisman winner 1935–2025, used for the in-game voters' boost).

## Deploy

Pushing to `main` triggers `.github/workflows/deploy-cfb.yml`, which builds `dist-cfb/` and publishes it to the `the-15-0-game` repo's GitHub Pages under go16-0game.com (CNAME written on every deploy; the deploy step skips cleanly if the `CFB_DEPLOY_TOKEN` secret is absent). The NFL deploy (`deploy.yml`) is fully independent — neither game's pipeline can break the other's.
