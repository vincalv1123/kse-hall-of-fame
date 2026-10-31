// League setup. Each league finds its new seasons through this Sleeper account,
// so if the account changes, update sleeperUsername.
export const CONFIG = {
  sleeperUsername: 'vpcalv',

  // Any season of a league works as leagueId; the site follows its history both ways.
  // The first league is the default. `key` becomes the link prefix for every other league (#dynasty-…).
  leagues: [
    // ownerFixes: rosters Sleeper lost the owner of, by season and roster id -> the Sleeper user_id who ran it.
    // 2024: roster 10 was Harryb69 (his stats join his other seasons); roster 12 was Gilbertpog.
    { key: 'redraft', name: 'KSE Sleeper', short: 'KSE Sleeper', leagueId: '1312006417497989120', format: 'redraft',
      ownerFixes: { '2024': { 10: '695454131292299264', 12: '1124112046297010176' } } },
    { key: 'dynasty', name: 'Kse Dynasty III', short: 'Dynasty', leagueId: '1312005992099102720', format: 'dynasty' }
  ],

  // Manager Score weights (must add up to 1).
  weights: { results: 0.35, startSit: 0.20, waivers: 0.15, trades: 0.20, draft: 0.10 },

  // Redraft draft grades: share of each pick's expected value that comes from hindsight
  // (the Nth-best player's value that season for the Nth pick). The rest comes from what
  // that slot has produced across the league's drafts. 0 = slot history only.
  draftHindsight: 0.3,

  // Kickers and defenses count for this share of their value in waiver, trade and draft numbers
  // (they're easy to replace and swing week to week). 1 = full value.
  kDefWeight: 0.5,

  // Dynasty trades: seasons counted after a trade (the trade season is the first) and how much less each later season counts.
  dynTrade: { seasons: 4, decay: 0.15 },

  // Bonus points added to the Results part of the score.
  bonus: { playoffs: 3, final: 5, title: 15 },

  // How often the live tab refreshes scores while open (seconds).
  liveRefreshSeconds: 60,

  // Simulated seasons for playoff odds.
  simulations: 10000
};
