# The 20-0 Game 🏈

Draft an all-time NFL roster team-by-team and chase the perfect **20-0 season**: 17 regular-season wins, a first-round bye, and 3 playoff wins.

**▶ Play: https://go20-0.com**

---

## How a game works

1. **Pick your mode.** Daily Challenge or Free Play.
2. **Pick your style.** Classic (ratings shown) or Expert (real stats only, draft blind).
3. **Pick a playbook.** Air Raid, Spread, Pro Style, Power Run, or Smashmouth. The playbook sets your offensive personnel (how many RB / WR / TE you draft), labeled with real NFL personnel groupings (10/11/12/21/22). A Start button confirms your choices, so you can change your mind before locking in.
4. **Draft 8 players, one team at a time.** Hit "Spin for a Team" and a random NFL team-season lands on the clock (CHI 1985, KC 2022, …). Draft one player from it into an open slot. You get 2 rerolls per game to skip a team.
5. **Use position flex.** Versatile players can fill more than one spot: a pass-catching RB or a fast, route-running TE can play WR, and a big red-zone WR can play TE. You choose where they line up.
6. **Choose your Defensive Captain**, the dedicated final pick (see below).
7. **Simulate the season.** 17 games plus the playoffs, with a week-by-week W/L ticker and a playoff bracket. Higher-rated rosters win more, but only an elite team runs the table to 20-0.

## The roster

Every roster is 9 picks:

| Slot | What it is |
|------|-----------|
| QB | Quarterback |
| RB / WR / TE (×5 total) | Skill players. The split is set by your playbook |
| OL | A team's entire offensive line, rated as a unit |
| CAPT | Defensive Captain: the best defender on a team, any position |
| DEF | A team's entire defense, rated as a unit |

## The Defensive Captain

After your lineup is set, a dedicated final-pick page appears: choose one captain from four candidates drawn from teams you haven't used. The candidates include at least one DB, one LB, and one D-lineman, plus a wildcard.

**The captain's position changes how your defense plays, and that changes your score.** Every simulated opponent leans pass-heavy or run-heavy:

- **DB** (CB / S): erases pass-heavy teams. Boom or bust: dominant through the air, nothing extra against the run.
- **LB**: steady against both run and pass.
- **DL** (DE / DT): stuffs the run, and the pass rush travels too.

The three roles have near-equal expected value (verified over 20,000 simulated seasons), so you're betting on a playstyle. The final-roster screen explains what your captain does for the team.

## Modes & features

- **Daily Challenge.** Everyone in the world gets the same teams in the same order each day, seeded by the date. One run per day, with a streak counter and 7-day calendar. Daily puzzle #1 was June 9, 2026.
- **Daily Leaderboard.** Post your score under any name and see today's top 20 runs (one entry per device per day). Supabase with row-level security handles storage.
- **Free Play.** Unlimited games, fresh randomness every time.
- **Classic vs Expert.** Classic shows 0-99 overall and attribute ratings (Madden-style: ARM/ACC/AWR for QBs, COV/INT/TAK for DBs, and so on). Expert hides every rating; you scout real stat lines (yards, TDs, sacks, INTs) and draft on football knowledge alone.
- **Score (0-100).** Every completed season gets a score: regular-season wins, playoff wins, a championship bonus, a perfect-season bonus, plus an underdog bonus for winning with a weaker roster. A perfect 20-0 with maximum bonuses is exactly 100.
- **Career stats.** Games played, titles, 20-0s, best record, and daily streak, saved on your device.
- **Sharing.** Share your result as text (Wordle-style emoji grid 🟩🟥 + 🏆 with your score and the site link, straight into iMessage/WhatsApp via the native share sheet) or as an image (a generated PNG result card with your record, score, and full depth chart).
- **Spin reveal.** Every pick starts behind a mystery "? ? ?" banner and a Spin button, with a slot-machine team reel (respects reduced-motion settings).
- **Home button.** The masthead title returns you to the home screen from anywhere.

## The player pool

**14,000+ real player seasons:**

- **Modern era (1999–2024):** every qualifying season rated from real [nflverse](https://github.com/nflverse) stats. QBs, RBs, WRs, TEs, individual defenders at every position (sacks/TFL/QB hits for linemen, tackles for linebackers, INTs/passes defended for DBs), plus whole O-lines and defenses rated as units.
- **Legends (pre-1999):** 108 hand-rated all-time greats on the same scale, including Joe Montana, Dan Marino, Barry Sanders, Walter Payton, Jim Brown, Jerry Rice, Reggie White, Lawrence Taylor, Dick Butkus, Ronnie Lott, Deion Sanders, Jack Lambert, Night Train Lane, the '85 Bears defense, and The Hogs O-line. Legends carry a gold badge in the draft.

Ratings are **era-relative**: each player is measured against his own season's league (z-scores per position per year, re-standardized across years), so a 1999 star and a 2024 star are comparable. An average starter sits around 76; the elite cap is 99.

## The simulation

- 17 regular-season games against a league of varying strength, then (with 10+ wins) a three-round postseason against tougher opponents each round: Divisional, Conference, Super Bowl.
- Each game: your roster average + captain matchup bonus + noise vs. the opponent's roll. Better rosters win more, and a bad roll can still lose any week.
- Results land on a ladder from **Relegation** up through **Super Bowl Champion** and **20-0 — Perfect. Immortal.** 🐐

## Design

Vintage football-program aesthetic: aged-paper palette, varsity block display font (Graduate), hard-offset ink shadows, chalkboard team banners, and a newspaper-masthead header. It should feel like a 1970s game-day program.

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + Vite 5, plain JavaScript, single-page |
| Styling | Hand-written CSS (no framework) |
| Data pipeline | Python (`ratings.py`): nflreadpy / polars / numpy → `players.json` |
| Leaderboard | Supabase (PostgreSQL + PostgREST), row-level security, no SDK, plain `fetch` |
| Share image | html-to-image (client-side PNG render) |
| Daily seeding | mulberry32 PRNG seeded from the date: deterministic, no server |
| Analytics | Google Analytics 4 |
| SEO | OG/Twitter cards + promo image, canonical URL, schema.org VideoGame JSON-LD, robots.txt, sitemap.xml, static crawlable footer |
| Hosting | GitHub Pages + GitHub Actions auto-deploy, custom domain `go20-0.com` (Cloudflare DNS, HTTPS enforced) |

Everything except the leaderboard is static; there is no game server. Any device can reproduce a daily challenge from the date alone.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
node scripts/test-share.mjs   # score + share-text unit checks
```

Regenerate player data (needs Python + the deps in `ratings.py`):

```bash
python3 ratings.py          # writes players.json
cp players.json public/     # the app serves the public/ copy
```

## Deploy

Pushing to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`), which builds and publishes to GitHub Pages. The site URL lives in one place, `VITE_SITE_URL` in `.env`, and flows into the share links, OG tags, canonical URL, and structured data at build time.
