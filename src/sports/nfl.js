// NFL sport config — every sport-specific constant the engine consumes.
// Values are extracted verbatim from the original game.js / score.js /
// share.js / stats.js / leaderboard.js so the NFL game behaves identically.
// The CFB edition ships its own file with the same shape (see cfb.js).

export default {
  key: 'nfl',

  meta: {
    title: 'The 20-0 Game',
    perfectName: '20-0',
    seasonsLabel: '1999–2024',
    dailyEpoch: '2026-06-09', // daily puzzle #1 (UTC)
    defaultSiteUrl: 'https://harrycallister.github.io/the-20-0-game',
    shareFilePrefix: 'the-20-0-game',
    // localStorage namespace. MUST stay 'twenty-zero' for NFL or existing
    // players lose their stats, streaks, and daily locks.
    storagePrefix: 'twenty-zero',
    leaderboardTable: 'daily_runs',
    playersUrl: 'players.json',
  },

  // Popular playbooks. Every offense fields the same 5 skill players (QB + 5
  // OL aside) — the playbook just decides how those 5 split across RB/WR/TE,
  // i.e. real NFL personnel groupings.
  formations: [
    {
      key: 'air-raid',
      name: 'Air Raid',
      personnel: '10 personnel',
      blurb: 'Empty the backfield and let it fly.',
      skill: { RB: 1, WR: 4, TE: 0 },
    },
    {
      key: 'spread',
      name: 'Spread',
      personnel: '11 personnel',
      blurb: 'The modern league standard — balanced and versatile.',
      skill: { RB: 1, WR: 3, TE: 1 },
    },
    {
      key: 'pro-style',
      name: 'Pro Style',
      personnel: '12 personnel',
      blurb: 'Two tight ends, heavy play-action.',
      skill: { RB: 1, WR: 2, TE: 2 },
    },
    {
      key: 'power-run',
      name: 'Power Run',
      personnel: '21 personnel',
      blurb: 'I-formation, lead blocker, downhill runs.',
      skill: { RB: 2, WR: 2, TE: 1 },
    },
    {
      key: 'smashmouth',
      name: 'Smashmouth',
      personnel: '22 personnel',
      blurb: 'Jumbo sets. Ground and pound, impose your will.',
      skill: { RB: 2, WR: 1, TE: 2 },
    },
  ],

  season: {
    regGames: 17,
    playoffCutoff: 10, // regular-season wins needed to make the playoffs
    // Earn a #1-seed bye, then three rounds. Win all 17 + all 3 -> 20-0.
    // Opponent bases sit ~2 pts above the pre-captain values to absorb the
    // average captain bonus.
    playoffRounds: [
      { name: 'Divisional', short: 'DIV', oppBase: 90 },
      { name: 'Conference', short: 'CONF', oppBase: 94 },
      { name: 'Super Bowl', short: 'SB', oppBase: 97 },
    ],
    leagueBase: 85, // regular-season opponent strength ~74-96
    leagueSpread: 22,
    playoffSpread: 10,
    noise: 11, // per-side randomness per game
    passHeavyRate: 0.55, // share of opponents that lean pass
    // Defensive Captain matchup bonus; expected values tuned near-equal
    // (~2.0-2.2 pts) so the choice is a playstyle bet, not a power pick.
    captainBonus: {
      DB: { pass: 4.0, run: 0.0 },
      LB: { pass: 2.0, run: 2.0 },
      DL: { pass: 2.0, run: 2.5 },
    },
    // Headline result tiers, best first.
    tiers: {
      perfect: { name: '20-0', blurb: 'Perfect. Immortal.' },
      champion: { name: 'Super Bowl Champion', blurb: 'Hoisted the Lombardi.' },
      runnerUp: { name: 'Super Bowl Runner-Up', blurb: 'One win from glory.' },
      semifinalExit: { name: 'Conference Finalist', blurb: 'Fell in the title game.' },
      earlyExit: { name: 'Divisional Exit', blurb: 'One and done in January.' },
    },
    // Missed-playoff ladder (by regular-season wins), best first.
    missTiers: [
      { min: 9, name: 'In the Hunt', blurb: 'Just missed the cut.' },
      { min: 7, name: 'Also-Ran', blurb: 'Stuck in the middle.' },
      { min: 5, name: 'Rebuilding', blurb: 'Flashes, not enough.' },
      { min: 3, name: 'Bottom Feeder', blurb: 'Eyeing the draft.' },
      { min: 0, name: 'Relegation', blurb: 'Send them down.' },
    ],
  },

  // Score weights. Max possible: 17*3 + 3*9 + 8 + 6 + 5 + 3 = 100 exactly.
  score: {
    REG_WIN: 3,
    PLAYOFF_WIN: 9,
    CHAMPION: 8,
    PERFECT: 6,
    UNDERDOG_PIVOT: 90,
    UNDERDOG_RATE: 0.5,
    UNDERDOG_MAX: 5,
    LEGEND_BONUS_MAX: 3,
  },

  // One-line share verdicts a stranger can parse without knowing the game.
  share: {
    flavor: {
      perfect: 'PERFECT SEASON 🐐',
      champion: 'Won the Super Bowl 🏆',
      missed: 'Missed the playoffs 💀',
      lostFinal: 'Lost the Super Bowl 😤',
      lostSemifinal: 'Lost the Conference title game 😩',
      oneAndDone: 'One-and-done in the playoffs 😬',
    },
  },
}
