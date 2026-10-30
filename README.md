# KSE Hall of Fame

A live hall of fame for the KSE Sleeper and Kse Dynasty III fantasy football leagues, with a switch at the top for each. Every page view pulls fresh data straight from Sleeper's public API, so standings, records and scores are always current, and each new season gets its own tab automatically.

**What's on it**
- **All-Time:** trophy case, Wall of Shame, career Manager Score, single-game records, Luck Index, rivalries and trade heists, schedule swap, clutch rating and a head-to-head grid.
- **Each season:** standings, power rankings chart, Manager Scores, season awards, every trade, team MVPs and weekly highs.
- **Current season:** live scores that refresh every minute and playoff odds from 10,000 simulated seasons.
- **Manager pages** with a full score breakdown, and a **compare** page for any two managers.

## How the Manager Score works

Each part is scored against the rest of the league that season (50 = average), then weighted:

| Part | Weight | What it measures |
|---|---|---|
| Results | 35% | Half win %, half all-play win %, plus bonuses for playoffs, the final and the title |
| Start/sit | 20% | Points started ÷ points from the best possible lineup |
| Waivers | 15% | Starter points from waiver and free-agent pickups |
| Trades | 20% | Redraft: value got minus value given, rest of season. Each traded player counts his points above a replacement-level starter at his position (never below 0); each traded pick counts what a pick in its slot is expected to give. Dynasty: starter points gained minus given up |
| Draft | 10% | How picks scored compared with picks around the same slot |

The career score averages every season, weighted by games played.

In the dynasty league, the draft part is left out of the score (the other four are reweighted), trades keep counting in later seasons for as long as the player stays on that team, and taxi-squad players are left out of the best-possible lineup. Change weights and other settings in `js/config.js`.

## Files

- `index.html`, `style.css` — the page
- `js/config.js` — leagues (KSE Sleeper and Kse Dynasty III), Sleeper username, score weights
- `js/data.js` — loading from Sleeper (finished seasons are cached in the visitor's browser)
- `js/model.js` — all stats and scores
- `js/app.js` — rendering and navigation

Hosted free with GitHub Pages; no build step.
