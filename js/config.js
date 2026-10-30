// League setup. Each league finds its new seasons through this Sleeper account,
// so if the account changes, update sleeperUsername.
export const CONFIG = {
  sleeperUsername: 'vpcalv',

  // Any season of a league works as leagueId; the site follows its history both ways.
  // The first league is the default. `key` becomes the link prefix for every other league (#dynasty-…).
  leagues: [
    { key: 'redraft', name: 'KSE Sleeper', short: 'KSE Sleeper', leagueId: '1312006417497989120', format: 'redraft' },
    { key: 'dynasty', name: 'Kse Dynasty III', short: 'Dynasty', leagueId: '1312005992099102720', format: 'dynasty' }
  ],

  // Manager Score weights (must add up to 1).
  weights: { results: 0.35, startSit: 0.20, waivers: 0.15, trades: 0.20, draft: 0.10 },

  // Kickers and defenses count for this share of their value in waiver, trade and draft numbers
  // (they're easy to replace and swing week to week). 1 = full value.
  kDefWeight: 0.5,

  // Bonus points added to the Results part of the score.
  bonus: { playoffs: 3, final: 5, title: 10 },

  // How often the live tab refreshes scores while open (seconds).
  liveRefreshSeconds: 60,

  // Simulated seasons for playoff odds.
  simulations: 10000
};
