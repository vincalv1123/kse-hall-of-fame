// League setup. The site finds new seasons through this Sleeper account,
// so if the commissioner account changes, update sleeperUsername.
export const CONFIG = {
  leagueName: 'KSE Sleeper',
  sleeperUsername: 'vpcalv',
  // Any season of the league works here; the site follows its history both ways.
  leagueId: '1312006417497989120',

  // Manager Score weights (must add up to 1).
  weights: { results: 0.35, startSit: 0.20, waivers: 0.15, trades: 0.20, draft: 0.10 },

  // Bonus points added to the Results part of the score.
  bonus: { playoffs: 3, final: 5, title: 10 },

  // How often the live tab refreshes scores while open (seconds).
  liveRefreshSeconds: 60,

  // Simulated seasons for playoff odds.
  simulations: 10000
};
