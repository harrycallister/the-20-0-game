# The 20-0 Game 🏈

Draft an all-time NFL roster team-by-team and chase the perfect **20-0 season** (17 regular-season wins + a first-round bye + 3 playoff wins).

**▶ Play: https://harrycallister.github.io/the-20-0-game/**

## How it works

1. **Pick a playbook** — Air Raid, Spread, Pro Style, Power Run, or Smashmouth. It sets your offensive personnel (how many RB / WR / TE you draft).
2. **Teams come on the clock one at a time** (with a spin). From each, draft one player into an open position.
3. **Position flex** — versatile players (a fast TE, a pass-catching RB) can fill multiple spots, and you choose where they line up.
4. **Build a 9-player roster**, then **simulate a season** — 17 games plus the playoffs. Higher-rated rosters win more, but only an elite team runs the table to 20-0.

### Modes & features
- **Daily Challenge** — everyone gets the same teams each day (seeded); build the best run and share it.
- **Free Play** — fresh randomness every game.
- **Expert Mode** — toggle real NFL season stats instead of Madden-style attribute ratings.
- **Pre-1999 legends** mixed into the pool (Montana, Rice, Barry Sanders, the '85 Bears…).
- **Career stats + shareable result cards.**

## Ratings

Player ratings are computed by `ratings.py` from [nflverse](https://github.com/nflverse) data (1999–2024) using era-relative z-scores per position, plus a hand-curated pool of pre-1999 legends.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
```

Regenerate player data (needs Python + the deps in `ratings.py`):

```bash
python3 ratings.py          # writes players.json
cp players.json public/     # the app serves the public/ copy
```

## Deploy

Static site (no backend). The live build is published to the `gh-pages` branch:

```bash
npm run build
cd dist && git init && git add -A && git commit -m deploy \
  && git branch -M gh-pages \
  && git remote add origin <repo-url> \
  && git push -f origin gh-pages
```

Built with Vite + React.
