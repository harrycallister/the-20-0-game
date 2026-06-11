// College Football sport config — "The 16-0 Game".
// A perfect season under the 12-team CFP is 16-0 for a top-4 seed:
// 12 regular-season games + the conference championship + first-round bye +
// Quarterfinal + Semifinal + National Championship. (Indiana went 16-0 to
// win it all in 2025-26.) Same shape as nfl.js; the engine reads everything
// from here.

export default {
  key: 'cfb',

  meta: {
    title: 'The 16-0 Game',
    perfectName: '16-0',
    seasonsLabel: '1924–2025',
    dailyEpoch: '2026-06-10', // launch day = daily puzzle #1 (UTC)
    defaultSiteUrl: 'https://go16-0game.com',
    shareFilePrefix: 'the-16-0-game',
    storagePrefix: 'sixteen-zero',
    leaderboardTable: 'daily_runs_cfb',
    playersUrl: 'players_cfb.json',
  },

  // Recap extras the NFL game doesn't (yet) show.
  features: { mvp: true, heisman: true },

  // College playbooks. Same engine rule as the NFL game: QB + 5 skill + OL +
  // CAPT + DEF = 9 picks; the playbook decides the RB/WR/TE split.
  formations: [
    {
      key: 'air-raid',
      name: 'Air Raid',
      personnel: '10 personnel',
      blurb: 'Born in college. Empty the backfield and let it fly.',
      skill: { RB: 1, WR: 4, TE: 0 },
    },
    {
      key: 'spread',
      name: 'Spread',
      personnel: '11 personnel',
      blurb: 'The modern college standard — tempo and space.',
      skill: { RB: 1, WR: 3, TE: 1 },
    },
    {
      key: 'pro-style',
      name: 'Pro Style',
      personnel: '12 personnel',
      blurb: 'Two tight ends, play-action, NFL polish.',
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
    {
      key: 'triple-option',
      name: 'Triple Option',
      personnel: '31 personnel',
      blurb: 'The wishbone lives. Three backs, dive-keep-pitch.',
      skill: { RB: 3, WR: 1, TE: 1 },
    },
  ],

  season: {
    regGames: 13, // 12 regular-season games + the conference championship
    // Game 13 is the Conference Championship: tougher than a normal week,
    // and winning it is surfaced as its own "Conference Champion" badge.
    ccg: { label: 'CCG', name: 'Conference Championship', oppBase: 88, spread: 14 },
    playoffCutoff: 10, // 10+ wins earns the top-4 seed and the bye
    // First-round bye, then three rounds. Win all 13 + all 3 -> 16-0.
    playoffRounds: [
      { name: 'Quarterfinal', short: 'QF', oppBase: 90 },
      { name: 'Semifinal', short: 'SF', oppBase: 94 },
      { name: 'National Championship', short: 'NC', oppBase: 97 },
    ],
    leagueBase: 85,
    leagueSpread: 22,
    playoffSpread: 10,
    noise: 11,
    passHeavyRate: 0.55,
    captainBonus: {
      DB: { pass: 4.0, run: 0.0 },
      LB: { pass: 2.0, run: 2.0 },
      DL: { pass: 2.0, run: 2.5 },
    },
    tiers: {
      perfect: { name: '16-0', blurb: 'Perfect. Immortal.' },
      champion: { name: 'National Champion', blurb: 'Won the natty.' },
      runnerUp: { name: 'National Runner-Up', blurb: 'One win from glory.' },
      semifinalExit: { name: 'CFP Semifinalist', blurb: 'Fell a game short of the title game.' },
      earlyExit: { name: 'Quarterfinal Exit', blurb: 'The bye didn’t help.' },
    },
    missTiers: [
      { min: 9, name: 'Left Out', blurb: 'Snubbed by the committee.' },
      { min: 7, name: 'Bowl Season', blurb: 'Playing in December, not January.' },
      { min: 6, name: 'Bowl Eligible', blurb: '6-6 and proud of it.' },
      { min: 3, name: 'Rebuilding', blurb: 'Trust the process.' },
      { min: 0, name: 'Fire the Coach', blurb: 'The buyout talks have started.' },
    ],
  },

  // Max possible: 13*3 + 3*13 + 8 + 6 + 5 + 3 = 100 exactly.
  score: {
    REG_WIN: 3,
    PLAYOFF_WIN: 13,
    CHAMPION: 8,
    PERFECT: 6,
    UNDERDOG_PIVOT: 90,
    UNDERDOG_RATE: 0.5,
    UNDERDOG_MAX: 5,
    LEGEND_BONUS_MAX: 3,
  },

  share: {
    flavor: {
      perfect: 'PERFECT SEASON 🐐',
      champion: 'Won the National Championship 🏆',
      missed: 'Missed the Playoff 💀',
      lostFinal: 'Lost the National Championship 😤',
      lostSemifinal: 'Lost in the Semifinal 😩',
      oneAndDone: 'One-and-done in the Playoff 😬',
    },
  },
}
