// Renders the Hall of Fame. Routes: #all, #s<season>, #m-<managerId>, #vs-<id>-<id>.

import { CONFIG } from './config.js';
import { loadAll, loadLiveWeek } from './data.js';
import { buildModel } from './model.js';

const $app = document.getElementById('app');
const $tabs = document.getElementById('tabs');
let M = null;
let liveTimer = null;

// ---------- helpers ----------
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
const f2 = x => (Math.round(x * 100) / 100).toFixed(2);
const comma = x => Number(x).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signed = (x, d = 1) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(d);
const pct3 = x => x.toFixed(3).replace(/^0/, '');
const wl = (w, l, t) => w + '–' + l + (t ? '–' + t : '');
const name = id => esc(M.nameOf(id));
const mlink = id => '#m-' + encodeURIComponent(id);
const sign = x => (x > 0 ? 'up' : x < 0 ? 'down' : '');
const TROPHY = (color, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg>`;
const DOWN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F0907A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';
const MARK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/></svg>';
const GOLD = '#E8B04B';
const section = (inner, cls = '') => `<section class="${cls}"><div class="wrap">${inner}</div></section>`;
const seasonOf = s => M.seasons.find(x => x.season === s);
const completed = () => M.seasons.filter(s => !s.isCurrent);
const posLabel = pid => { const p = M.playerPos(pid); return p ? ' · ' + p : ''; };
const player = pid => esc(M.playerName(pid));

// ---------- tabs ----------
function renderTabs(route) {
  const items = [`<a class="pill${route.view === 'all' ? ' on' : ''}" href="#all">All-Time</a>`]
    .concat(M.seasons.map(s => `<a class="pill${route.view === 'season' && route.season === s.season ? ' on' : ''}" href="#s${s.season}">${s.isCurrent ? '<span class="dot"></span>' : ''}${s.season}</a>`));
  $tabs.innerHTML = items.join('');
  const on = $tabs.querySelector('.on');
  if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// ---------- All-Time ----------
function viewAll() {
  const done = completed();
  const first = M.seasons.length ? M.seasons[M.seasons.length - 1].season : '';
  const out = [];
  out.push(section(`<div class="eyebrow">${MARK} All-time archive · since ${first}</div>
    <h1>Every title, record and trade <span class="soft">since the league began.</span></h1>`, 'hero'));

  const reign = done.find(s => s.champion);
  if (reign) {
    const id = reign.ownerOf[reign.champion];
    const st = reign.st[reign.champion];
    const c = M.career[id];
    out.push(`<section class="paper"><div class="wrap">
      <div class="line2"><span class="label">Reigning champion</span>${TROPHY(GOLD, 26)}</div>
      <a href="${mlink(id)}" class="big" style="text-decoration:none">${name(id)} <span class="soft">${reign.season}</span></a>
      <div class="stats"><div><span>Record</span><span>${wl(st.wins, st.losses, st.ties)}</span></div>
      <div><span>Points for</span><span>${comma(st.pf)}</span></div>
      <div><span>Titles</span><span>${c.titles}</span></div></div></div></section>`);
  }

  if (done.length) {
    out.push(section(`<h2>Trophy case</h2><div class="rows">${done.map(s => `
      <a class="row r-trophy" href="#s${s.season}"><span class="year">${s.season}</span>
      <span class="stack"><span class="name">${s.champion ? name(s.ownerOf[s.champion]) : '—'}</span>
      <span class="sub">Runner-up ${s.runnerUp ? name(s.ownerOf[s.runnerUp]) : '—'} · Last ${s.lastPlace ? name(s.ownerOf[s.lastPlace]) : '—'}</span></span>
      ${TROPHY(GOLD)}</a>`).join('')}</div>`));

    out.push(section(`<div class="head"><h2>Wall of Shame</h2><span class="note">Worst regular-season record, every year</span></div>
      <div class="rows">${done.filter(s => s.lastPlace).map(s => { const st = s.st[s.lastPlace]; return `
      <a class="row r-trophy" href="${mlink(s.ownerOf[s.lastPlace])}"><span class="year">${s.season}</span>
      <span class="stack"><span class="name">${name(s.ownerOf[s.lastPlace])}</span><span class="sub">${wl(st.wins, st.losses, st.ties)} · ${comma(st.pf)} PF</span></span>${DOWN}</a>`; }).join('')}</div>`));
  }

  const lb = M.leaderboard;
  out.push(section(`<div class="head"><h2>Manager Score</h2><span class="note">Career · 0–100 · 50 is average</span></div>
    <div class="rows">${lb.map((c, i) => {
      const best = i === 0; const worst = i === lb.length - 1 && lb.length > 1;
      const color = best ? GOLD : worst ? '#F0907A' : '#7E9093';
      return `<a class="row r-score" href="${mlink(c.id)}"><span class="num" style="font-size:13px;color:${best ? GOLD : '#8A9C9F'}">${i + 1}</span>
        <span class="stack" style="gap:7px"><span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span class="name">${name(c.id)}</span>
        ${best ? '<span class="tag gold">Best manager</span>' : ''}${worst ? '<span class="tag down">Worst manager</span>' : ''}</span>
        <span class="bar"><i style="width:${c.score}%;background:${color}"></i></span></span>
        <span class="val">${Math.round(c.score)}</span></a>`;
    }).join('')}</div><span class="note">Tap a manager to see how the score breaks down.</span>`));

  if (M.records.length) {
    out.push(section(`<h2>Single-game records</h2><div class="tiles">${M.records.map(r => `
      <div class="tile">${r.isNew ? '<span class="tag gold" style="align-self:flex-start">New record</span>' : ''}
      <span class="k">${esc(r.label)}</span><span class="v">${esc(r.display)}</span><span class="w">${esc(r.who)}</span>
      <span class="d">${r.season}${r.week ? ' · Week ' + r.week : ''}${r.detail ? ' · ' + esc(r.detail) : ''}</span></div>`).join('')}</div>`));
  }

  const byLuck = lb.slice().sort((a, b) => b.luck - a.luck);
  if (byLuck.length > 1) {
    const L = byLuck[0]; const U = byLuck[byLuck.length - 1];
    out.push(section(`<div class="head"><h2>Luck Index</h2><span class="note">Actual wins minus expected wins</span></div>
      <div class="cards"><a class="card" href="${mlink(L.id)}"><span class="k">Luckiest</span><span class="v up">${signed(L.luck)}</span><span class="name">${name(L.id)}</span></a>
      <a class="card" href="${mlink(U.id)}"><span class="k">Unluckiest</span><span class="v down">${signed(U.luck)}</span><span class="name">${name(U.id)}</span></a></div>
      <p class="lead">Expected wins come from all-play: each week, how many teams your score would have beaten.</p>`));
  }

  const riv = M.rivalry; const heist = M.heist;
  if (riv || heist) {
    let html = '<h2>Rivalries &amp; trades</h2>';
    if (riv) html += `<a class="box" href="#vs-${encodeURIComponent(riv.a)}~${encodeURIComponent(riv.b)}" style="text-decoration:none">
      <span class="k note" style="text-transform:uppercase;letter-spacing:.05em;font-size:11px">Fiercest rivalry</span>
      <div class="line2"><span class="name" style="font-weight:600">${name(riv.a)} vs ${name(riv.b)}</span><span class="num">${wl(riv.aw, riv.bw, riv.t)}</span></div>
      <span class="note">${riv.games} games · average margin ${f1(riv.margin / riv.games)} pts${riv.playoff ? ' · ' + riv.playoff + ' playoff meeting' + (riv.playoff > 1 ? 's' : '') : ''}</span></a>`;
    if (heist && heist.side.net > 0) {
      const others = heist.trade.sides.filter(s => s.owner !== heist.side.owner).map(s => name(s.owner)).join(' & ');
      html += `<div class="box"><span class="note" style="text-transform:uppercase;letter-spacing:.05em;font-size:11px">Biggest trade heist</span>
        <div class="line2"><span style="font-weight:600">${name(heist.side.owner)} over ${others}</span><span class="num up">${signed(heist.side.net)}</span></div>
        <span class="note">${heist.trade.season} · Week ${heist.trade.week} · got ${heist.side.got.map(g => player(g.pid)).join(', ') || 'picks'} · starter pts gained, rest of season</span></div>`;
    }
    out.push(section(html));
  }

  // Schedule swap
  const swaps = lb.map(c => ({ c, s: M.swapCareer[c.id] })).filter(x => x.s && (x.s.actualW + x.s.actualL) > 0)
    .map(x => ({ ...x, diff: x.s.actualW - x.s.avgW })).sort((a, b) => b.diff - a.diff);
  if (swaps.length > 2) {
    const max = swaps[0]; const min = swaps[swaps.length - 1];
    out.push(section(`<h2>Schedule swap</h2><p class="lead">Your career record if you had played each other manager's schedule instead of your own.</p>
      <div class="scroll"><table class="table"><thead><tr><th>Manager</th><th>Actual</th><th>Swap avg</th><th>Best / worst</th></tr></thead><tbody>
      ${swaps.map(x => `<tr><td class="t"><a href="${mlink(x.c.id)}" style="text-decoration:none">${name(x.c.id)}</a>
        ${x === max && x.diff >= 1 ? ' <span class="tag up">Lucky</span>' : ''}${x === min && x.diff <= -1 ? ' <span class="tag down">Robbed</span>' : ''}</td>
        <td>${wl(x.s.actualW, x.s.actualL, x.s.actualT)}</td><td style="color:#C9D3D2">${Math.round(x.s.avgW)}–${Math.round(x.s.avgL)}</td>
        <td style="color:#8A9C9F">${x.s.bestW}–${x.s.bestL} / ${x.s.worstW}–${x.s.worstL}</td></tr>`).join('')}</tbody></table></div>`));
  }

  // Clutch
  const clutch = lb.filter(c => c.clutch != null && c.poGames >= 2).sort((a, b) => b.clutch - a.clutch);
  if (clutch.length) {
    out.push(section(`<div class="head"><h2>Clutch rating</h2><span class="note">Playoff vs. regular-season points per game</span></div>
      <div class="rows">${clutch.map(c => {
        const v = c.clutch * 100; const w = Math.min(50, Math.abs(v) * 3.5); const up = v >= 0;
        return `<a class="row" href="${mlink(c.id)}" style="grid-template-columns:minmax(0,1fr) 110px 64px">
          <span class="stack"><span class="name" style="font-size:14px">${name(c.id)}</span><span class="sub">${c.poGames} playoff games${c.titles ? ' · ' + c.titles + ' title' + (c.titles > 1 ? 's' : '') : ''}</span></span>
          <span class="bar thick" style="position:relative;overflow:visible"><i style="position:absolute;top:0;${up ? 'left' : 'right'}:50%;width:${w}%;background:${up ? '#5FC79B' : '#F0907A'}"></i>
          <i style="position:absolute;left:50%;top:-4px;width:1px;height:14px;background:#4A6168;border-radius:0"></i></span>
          <span class="num ${up ? 'up' : 'down'}" style="text-align:right;font-size:14px">${signed(v)}%</span></a>`;
      }).join('')}</div>`));
  }

  // Head-to-head grid
  if (lb.length > 1) {
    const ids = lb.map(c => c.id);
    const short = ids.map(id => esc(M.nameOf(id).slice(0, 4)));
    const head = '<tr><th></th>' + short.map((s, i) => `<th scope="col" title="${name(ids[i])}">${s}</th>`).join('') + '</tr>';
    const body = ids.map((a, i) => '<tr><th scope="row" class="rowh">' + short[i] + '</th>' + ids.map(b => {
      if (a === b) return '<td style="background:#13252A;color:#4A6168">—</td>';
      const r = M.h2hRecord(a, b);
      if (!r.games) return '<td style="background:#13252A;color:#4A6168">·</td>';
      const d = r.w - r.l; const al = Math.min(0.6, 0.14 + Math.abs(d) * 0.14);
      const bg = d > 0 ? `rgba(95,199,155,${al})` : d < 0 ? `rgba(240,144,122,${al})` : '#1A2F34';
      return `<td style="background:${bg}" title="${name(a)} vs ${name(b)}: ${wl(r.w, r.l, r.t)}">${wl(r.w, r.l, r.t)}</td>`;
    }).join('') + '</tr>').join('');
    out.push(section(`<div class="head"><h2>Head-to-head</h2><span class="note">Row's record vs. column</span></div>
      <div class="scroll"><table class="h2h"><thead>${head}</thead><tbody>${body}</tbody></table></div>
      <span class="note">Green = the row's manager owns that matchup. Includes playoff games.</span>
      <a class="btn" href="#vs-${encodeURIComponent(ids[0])}~${encodeURIComponent(ids[1])}">Compare two managers →</a>`));
  }
  return out.join('');
}

// ---------- Season ----------
const HL = ['#E8B04B', '#C9D3D2', '#F0907A', '#6FB7E0', '#B59CE6'];

function powerChart(S, highlight) {
  const weeks = S.regWeeks.length;
  if (weeks < 2) return '<p class="lead">The chart appears after Week 2.</p>';
  const n = S.rids.length;
  const x = i => 24 + i * (316 / (weeks - 1));
  const y = r => 10 + (r - 1) * (190 / Math.max(1, n - 1));
  const mid = Math.ceil(n / 2);
  const line = (rid, color, width) => `<polyline fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round" points="${S.power[rid].map((r, i) => x(i).toFixed(1) + ',' + y(r).toFixed(1)).join(' ')}"/>`;
  const base = S.rids.filter(r => highlight.indexOf(r) < 0).map(r => line(r, '#3B5258', 1.5)).join('');
  const top = highlight.slice().reverse().map(r => { const c = HL[highlight.indexOf(r)]; const last = S.power[r][weeks - 1];
    return line(r, c, 2.6) + `<circle cx="${x(weeks - 1)}" cy="${y(last)}" r="3.5" fill="${c}"/>`; }).join('');
  const midW = Math.ceil(weeks / 2);
  return `<div class="scroll"><svg viewBox="0 0 350 232" width="100%" style="max-width:560px;display:block" role="img" aria-label="Weekly power rankings by points for">
    <g stroke="#1F3237" stroke-width="1"><line x1="24" y1="${y(1)}" x2="340" y2="${y(1)}"/><line x1="24" y1="${y(mid)}" x2="340" y2="${y(mid)}"/><line x1="24" y1="${y(n)}" x2="340" y2="${y(n)}"/></g>
    <g fill="#8A9C9F" font-size="10"><text x="0" y="${y(1) + 3.5}">1</text><text x="0" y="${y(mid) + 3.5}">${mid}</text><text x="0" y="${y(n) + 3.5}">${n}</text>
    <text x="${x(0)}" y="224" text-anchor="middle">W1</text><text x="${x(midW - 1)}" y="224" text-anchor="middle">W${midW}</text><text x="340" y="224" text-anchor="end">W${weeks}</text></g>
    ${base}${top}</svg></div>`;
}

function liveGames(S, week, list) {
  const groups = {};
  (list || []).forEach(m => { if (m.matchup_id != null) (groups[m.matchup_id] = groups[m.matchup_id] || []).push(m); });
  const games = Object.values(groups).filter(g => g.length === 2);
  if (!games.length) return '<p class="lead">No matchups this week.</p>';
  const final = week <= S.scoredThrough;
  return games.map(([a, b]) => {
    const aLead = a.points >= b.points;
    return `<div class="box"><div class="top-line"><span>Week ${week}</span><span>${final ? 'Final' : 'Live'}</span></div><div class="game">
      <a class="${aLead ? 'lead-t' : 'trail-t'}" href="${mlink(S.ownerOf[a.roster_id])}" style="text-decoration:none">${name(S.ownerOf[a.roster_id])}</a><span class="score">${f2(a.points || 0)}</span>
      <a class="${aLead ? 'trail-t' : 'lead-t'}" href="${mlink(S.ownerOf[b.roster_id])}" style="text-decoration:none">${name(S.ownerOf[b.roster_id])}</a><span class="score">${f2(b.points || 0)}</span></div></div>`;
  }).join('');
}

function viewSeason(S) {
  const out = [];
  const nm = r => name(S.ownerOf[r]);
  const ml = r => mlink(S.ownerOf[r]);
  const liveWeek = S.isCurrent && S.currentWeek && S.currentWeek <= S.playoffWeekStart + 2 ? S.currentWeek : null;
  if (S.isCurrent) {
    out.push(section(`<div class="eyebrow"><span class="tag live"><span class="dot"></span>Live</span><span id="updated">Scores refresh every ${CONFIG.liveRefreshSeconds} seconds</span></div>
      <h1>${S.season} season. <span class="soft">${liveWeek ? 'Week ' + liveWeek + ' is underway.' : 'Through Week ' + S.scoredThrough + '.'}</span></h1>`, 'hero'));
    if (liveWeek) out.push(section(`<div class="head"><h2>This week's matchups</h2><span class="note">Current score</span></div><div id="live-games" style="display:flex;flex-direction:column;gap:10px">${liveGames(S, liveWeek, Object.values(S.byWeek[liveWeek] || {}))}</div>`));
    if (S.odds && S.odds.remainingWeeks > 0) {
      const rows = S.rids.slice().sort((a, b) => S.odds.byRid[b].playoffs - S.odds.byRid[a].playoffs);
      out.push(section(`<div class="head"><h2>Playoff odds</h2><span class="note">${CONFIG.simulations.toLocaleString()} simulated seasons</span></div>
        <div class="rows">${rows.map((r, i) => { const p = S.odds.byRid[r].playoffs * 100; const st = S.st[r];
          const label = p >= 99.5 && p < 100 ? '>99%' : p > 0 && p < 0.5 ? '<1%' : Math.round(p) + '%';
          return `<a class="row${i === S.playoffTeams ? ' cut' : ''}" href="${ml(r)}" style="grid-template-columns:minmax(0,1fr) 110px 52px;padding:10px 0">
            <span style="display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap"><span class="name" style="font-size:14px">${nm(r)}</span><span class="num" style="font-size:11px;color:#8A9C9F">${wl(st.wins, st.losses, st.ties)}</span></span>
            <span class="bar thick"><i style="width:${p}%;background:${i === 0 ? GOLD : p >= 50 ? '#C9D3D2' : '#5F7478'}"></i></span>
            <span class="num" style="text-align:right;font-size:14px">${label}</span></a>`; }).join('')}</div>
        <span class="note">Each remaining game is played out using every team's scoring this season. Dashed line = playoff cut (top ${S.playoffTeams}).</span>`));
    }
  } else {
    const rounds = S.games.filter(g => g.playoff).reduce((m, g) => Math.max(m, g.round || 0), 0);
    out.push(section(`<div class="eyebrow">Season complete · ${S.regWeeks.length} weeks + ${rounds} playoff rounds</div>
      <h1>${S.season} season. <span class="soft">${S.champion ? nm(S.champion) + ' beat ' + (S.runnerUp ? nm(S.runnerUp) : 'the field') + ' for the title.' : ''}</span></h1>
      <div class="chips">${S.champion ? `<a class="chip gold" href="${ml(S.champion)}" style="text-decoration:none">${TROPHY(GOLD, 13)} Champion · ${nm(S.champion)}</a>` : ''}
      ${S.runnerUp ? `<span class="chip">Runner-up · ${nm(S.runnerUp)}</span>` : ''}${S.lastPlace ? `<span class="chip">Last · ${nm(S.lastPlace)}</span>` : ''}</div>`, 'hero'));
  }

  out.push(section(`<h2>${S.isCurrent ? 'Standings' : 'Final standings'}</h2>
    <div class="scroll"><table class="table"><thead><tr><th>#</th><th style="text-align:left">Team</th><th>W–L</th><th>PF</th><th>All-play</th></tr></thead><tbody>
    ${S.standings.map((s, i) => `<tr class="${i === S.playoffTeams ? 'cut' : ''}"><td class="rk">${s.rank}</td><td class="t"><a href="${ml(s.rid)}" style="text-decoration:none">${nm(s.rid)}</a></td>
      <td>${wl(s.wins, s.losses, s.ties)}</td><td>${comma(s.pf)}</td><td style="color:#C9D3D2">${pct3(s.allPlayPct)}</td></tr>`).join('')}</tbody></table></div>
    <span class="note">Dashed line = playoff cut (top ${S.playoffTeams}). All-play = win rate if you'd played every team every week.</span>`));

  const defaultHL = [S.champion || S.standings[0].rid, S.runnerUp || (S.standings[1] && S.standings[1].rid), S.standings[S.standings.length - 1].rid].filter((v, i, a) => v && a.indexOf(v) === i);
  out.push(section(`<div class="head"><h2>Power rankings</h2><span class="note">Rank by total points for, each week</span></div>
    <div id="power" data-season="${S.season}">${powerChart(S, defaultHL)}</div>
    <div class="legend" id="power-legend">${S.standings.map(s => `<button type="button" data-rid="${s.rid}" aria-pressed="${defaultHL.indexOf(s.rid) >= 0}">
      <i style="background:${defaultHL.indexOf(s.rid) >= 0 ? HL[defaultHL.indexOf(s.rid)] : '#3B5258'}"></i>${nm(s.rid)}</button>`).join('')}</div>
    <span class="note">Tap names to highlight up to five teams.</span>`));

  const ranked = S.rids.slice().sort((a, b) => S.scores[b].total - S.scores[a].total);
  const best = ranked[0]; const worst = ranked[ranked.length - 1];
  out.push(section(`<div class="head"><h2>${S.season} Manager Scores</h2><a class="note" href="${ml(best)}">How it works</a></div>
    <div class="cards"><a class="card" href="${ml(best)}"><span class="k gold-t">Best manager</span><span class="v">${Math.round(S.scores[best].total)}</span><span class="name">${nm(best)}</span>
      <span class="note">Start/sit ${(S.efficiency[best].pct * 100).toFixed(1)}% of best lineup</span></a>
      <a class="card" href="${ml(worst)}"><span class="k down">Worst manager</span><span class="v">${Math.round(S.scores[worst].total)}</span><span class="name">${nm(worst)}</span>
      <span class="note">Left ${Math.round(S.efficiency[worst].benchLeft)} pts on the bench</span></a></div>
    <div class="rows">${ranked.map((r, i) => `<a class="row r-score" href="${ml(r)}"><span class="num" style="font-size:13px;color:#8A9C9F">${i + 1}</span>
      <span class="stack" style="gap:7px"><span class="name" style="font-size:14px">${nm(r)}</span><span class="bar"><i style="width:${S.scores[r].total}%;background:${i === 0 ? GOLD : '#7E9093'}"></i></span></span>
      <span class="val" style="font-size:17px">${Math.round(S.scores[r].total)}</span></a>`).join('')}</div>`));

  // Awards
  const aw = [];
  const wk = S.rids.slice().sort((a, b) => S.waivers[b].pts - S.waivers[a].pts)[0];
  if (wk != null) {
    const w = S.waivers[wk];
    aw.push({ k: 'Waiver Wire King', who: nm(wk), v: f1(w.pts) + ' pts', d: 'Starter points from pickups' + (w.perDollar != null ? ' · ' + f1(w.perDollar) + ' pts per FAAB dollar' : '') + (w.best ? ' · best add: ' + player(w.best.pid) : ''), cls: 'gold-t' });
  }
  let toy = null;
  S.trades.forEach(t => t.sides.forEach(s => { if (!toy || s.net > toy.s.net) toy = { t, s }; }));
  if (toy && toy.s.net > 0) aw.push({ k: 'Trade of the Year', who: nm(toy.s.rid), v: signed(toy.s.net), d: 'Week ' + toy.t.week + ' · got ' + (toy.s.got.map(g => player(g.pid)).join(', ') || 'picks'), cls: 'gold-t' });
  if (S.steal) aw.push({ k: 'Steal of the Draft', who: nm(S.steal.roster_id), v: 'R' + S.steal.round + ' → ' + esc(S.steal.pos) + S.posRank[S.steal.player_id], d: player(S.steal.player_id) + ', round ' + S.steal.round + ', finished ' + esc(S.steal.pos) + S.posRank[S.steal.player_id] + (S.isCurrent ? ' so far' : ''), cls: 'gold-t' });
  if (S.bust) aw.push({ k: 'Bust of the Draft', who: nm(S.bust.roster_id), v: 'R' + S.bust.round + ' → ' + esc(S.bust.pos) + (S.posRank[S.bust.player_id] || '—'), d: player(S.bust.player_id) + ', round ' + S.bust.round + (S.posRank[S.bust.player_id] ? ', finished ' + esc(S.bust.pos) + S.posRank[S.bust.player_id] : ', barely played') + (S.isCurrent ? ' so far' : ''), cls: 'down' });
  if (S.benchBlunder && S.benchBlunder.gap > 0) {
    const b = S.benchBlunder;
    aw.push({ k: 'Bench Blunder', who: nm(b.rid), v: f1(b.gap) + ' pts', d: 'Week ' + b.week + ' points left on the bench' + (b.wouldHaveWon ? ' · would have won' : b.lostBy != null ? ' · lost by ' + f1(b.lostBy) : ''), cls: 'down' });
  }
  const lastR = S.standings[S.standings.length - 1];
  aw.push({ k: S.isCurrent ? 'Sacko watch' : 'Sacko', who: nm(lastR.rid), v: wl(lastR.wins, lastR.losses, lastR.ties), d: (S.isCurrent ? 'Last place so far · ' : 'Last place · ') + comma(lastR.pf) + ' PF', cls: 'down' });
  out.push(section(`<h2>Season awards</h2><div class="tiles">${aw.map(a => `<div class="tile"><span class="k ${a.cls}">${a.k}</span>
    <span style="font-size:15px;font-weight:600">${a.who}</span><span class="num" style="font-size:15px">${a.v}</span><span class="d">${a.d}</span></div>`).join('')}</div>`));

  if (S.trades.length) {
    out.push(section(`<div class="head"><h2>Trades</h2><span class="note">${S.trades.length} trade${S.trades.length > 1 ? 's' : ''} · starter pts for the rest of the season</span></div>
      <div style="display:flex;flex-direction:column;gap:10px">${S.trades.slice().reverse().map(t => `<div class="box"><div class="top-line"><span>Week ${t.week}</span><span>Net starter pts</span></div>
      ${t.sides.map(s => `<div class="line2"><span style="font-size:14px;min-width:0"><a href="${ml(s.rid)}" style="text-decoration:none;font-weight:500">${nm(s.rid)}</a>
        <span style="color:#8A9C9F"> got ${s.got.map(g => player(g.pid)).join(', ') || 'draft picks'}</span></span>
        <span class="num ${sign(s.net)}" style="font-size:14px;white-space:nowrap">${signed(s.net)}</span></div>`).join('')}</div>`).join('')}</div>`));
  }

  out.push(section(`<div class="head"><h2>Team MVPs</h2><span class="note">Most starter points for that team</span></div><div class="rows">
    ${S.standings.map(s => { const m = S.mvp[s.rid]; return m ? `<div class="row" style="grid-template-columns:minmax(0,1fr) auto;padding:11px 0">
      <span class="stack"><span style="font-size:14px;font-weight:500">${player(m.pid)}${m.pos ? ' · ' + esc(m.pos) : ''}</span><span class="sub">${nm(s.rid)}</span></span>
      <span class="num" style="font-size:14px">${f1(m.pts)}</span></div>` : ''; }).join('')}</div>`));

  out.push(section(`<h2>Weekly highs</h2><div class="rows">${S.weeklyHighs.map(h => `<div class="row" style="grid-template-columns:52px minmax(0,1fr) auto;padding:12px 0">
    <span class="num" style="font-size:12px;color:#8A9C9F">WK ${h.week}</span><a href="${ml(h.rid)}" style="text-decoration:none;font-size:14px">${nm(h.rid)}</a><span class="num" style="font-size:15px">${f2(h.pts)}</span></div>`).join('')}</div>`));

  return { html: out.join(''), liveWeek, defaultHL };
}

function bindPowerLegend(S, initial) {
  const legend = document.getElementById('power-legend');
  if (!legend) return;
  let hl = initial.slice();
  legend.addEventListener('click', e => {
    const btn = e.target.closest('button[data-rid]');
    if (!btn) return;
    const rid = Number(btn.dataset.rid);
    const i = hl.indexOf(rid);
    if (i >= 0) hl.splice(i, 1); else { if (hl.length >= HL.length) hl.shift(); hl.push(rid); }
    document.getElementById('power').innerHTML = powerChart(S, hl);
    legend.querySelectorAll('button').forEach(b => {
      const r = Number(b.dataset.rid); const k = hl.indexOf(r);
      b.setAttribute('aria-pressed', String(k >= 0));
      b.querySelector('i').style.background = k >= 0 ? HL[k] : '#3B5258';
    });
  });
}

function startLive(S, week) {
  stopLive();
  liveTimer = setInterval(async () => {
    try {
      const list = await loadLiveWeek(S.leagueId, week);
      const el = document.getElementById('live-games');
      if (!el) return stopLive();
      el.innerHTML = liveGames(S, week, list);
      const u = document.getElementById('updated');
      if (u) u.textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (e) { /* keep last scores */ }
  }, CONFIG.liveRefreshSeconds * 1000);
}
function stopLive() { if (liveTimer) { clearInterval(liveTimer); liveTimer = null; } }

// ---------- Manager ----------
function careerDetail(id) {
  let ap = 0; let apg = 0; let draft = 0; let draftPicks = 0;
  M.seasons.forEach(S => S.rids.forEach(r => {
    if (S.ownerOf[r] !== id) return;
    ap += S.st[r].allPlay; apg += S.st[r].allPlayGames;
    draft += S.draftValue[r]; draftPicks += S.picks.filter(p => p.roster_id === r).length;
  }));
  return { allPlayPct: apg ? ap / apg : 0, draft, draftPicks };
}

function viewManager(id) {
  const c = M.career[id];
  if (!c) return section('<h1>Manager not found.</h1><a class="btn" href="#all">Back to All-Time</a>', 'hero');
  const lb = M.leaderboard;
  const rank = lb.findIndex(x => x.id === id) + 1;
  const det = careerDetail(id);
  const seasonsPlayed = c.bySeason.length;
  const completedPlayed = c.bySeason.filter(s => !s.current).length;
  const tag = rank === 1 ? '<span class="tag gold">Best manager</span>' : rank === lb.length && lb.length > 1 ? '<span class="tag down">Worst manager</span>' : '';
  const out = [];
  out.push(section(`<div class="eyebrow">${tag}<span>#${rank} of ${lb.length} · ${seasonsPlayed} season${seasonsPlayed > 1 ? 's' : ''}</span></div>
    <div class="line2" style="align-items:flex-end;gap:16px"><h1 style="min-width:0;overflow-wrap:anywhere">${name(id)}</h1>
    <span style="display:flex;flex-direction:column;align-items:flex-end"><span class="num" style="font-size:52px;line-height:1;color:${rank === 1 ? GOLD : '#F1F4F3'}">${Math.round(c.score)}</span><span class="note">Career score</span></span></div>
    ${M.managers[id].teamNames.length ? `<span class="note">Team names: ${M.managers[id].teamNames.map(esc).join(' · ')}</span>` : ''}
    <div class="stats four dark-stats"><div><span>Titles</span><span>${c.titles}</span></div><div><span>Record</span><span>${wl(c.wins, c.losses, c.ties)}</span></div>
    <div><span>Playoffs</span><span>${c.playoffs}/${completedPlayed}</span></div><div><span>Luck</span><span class="${sign(c.luck)}">${signed(c.luck)}</span></div></div>`, 'hero'));

  const W = CONFIG.weights;
  const parts = [
    ['Results', W.results, c.parts.results, `Win % ${pct3(c.winPct)} · all-play ${pct3(det.allPlayPct)}${c.titles ? ' · title bonus ×' + c.titles : ''}`],
    ['Start/sit', W.startSit, c.parts.startSit, `Started ${(c.effPct * 100).toFixed(1)}% of best possible points · ${Math.round(c.benchLeft)} pts left on the bench`],
    ['Waivers', W.waivers, c.parts.waivers, `${comma(c.waiverPts)} starter pts from pickups`],
    ['Trades', W.trades, c.parts.trades, `${c.trades} trade${c.trades === 1 ? '' : 's'} · net ${signed(c.tradeNet)} starter pts`],
    ['Draft', W.draft, c.parts.draft, `${det.draftPicks} picks · ${signed(det.draft, 0)} pts vs. what their draft slots usually produce`]
  ].filter(p => p[2] != null);
  out.push(section(`<h2>How the ${Math.round(c.score)} breaks down</h2><div class="rows">${parts.map(p => `
    <div class="row" style="grid-template-columns:1fr;gap:8px;padding:14px 0"><div class="line2"><span style="font-size:15px;font-weight:500">${p[0]} <span class="note">${Math.round(p[1] * 100)}%</span></span>
    <span class="num" style="font-size:17px">${Math.round(p[2])}</span></div><span class="bar thick"><i style="width:${p[2]}%;background:${p[2] >= 65 ? GOLD : '#7E9093'}"></i></span>
    <span class="note" style="color:#A3B2B4">${p[3]}</span></div>`).join('')}</div>
    <span class="note">50 = league average that season. The career score averages every season, weighted by games played.</span>`));

  const seasons = c.bySeason.slice().sort((a, b) => Number(a.season) - Number(b.season));
  let chart = '';
  if (seasons.length >= 2) {
    const x = i => 30 + i * (290 / (seasons.length - 1));
    const y = v => 120 - v * 1.1;
    const pts = seasons.map((s, i) => x(i).toFixed(1) + ',' + y(s.score).toFixed(1)).join(' ');
    chart = `<svg viewBox="0 0 350 150" width="100%" style="max-width:560px;display:block" role="img" aria-label="Manager Score by season">
      <line x1="30" y1="${y(50)}" x2="320" y2="${y(50)}" stroke="#4A6168" stroke-dasharray="4 4"/><text x="320" y="${y(50) - 6}" fill="#8A9C9F" font-size="10" text-anchor="end">League avg 50</text>
      <polygon points="${pts} ${x(seasons.length - 1)},120 30,120" fill="${GOLD}" fill-opacity="0.10"/>
      <polyline points="${pts}" fill="none" stroke="${GOLD}" stroke-width="2.4" stroke-linejoin="round"/>
      ${seasons.map((s, i) => `<circle cx="${x(i)}" cy="${y(s.score)}" r="3.5" fill="${GOLD}"/><text x="${x(i)}" y="140" fill="#8A9C9F" font-size="10" text-anchor="${i === 0 ? 'start' : i === seasons.length - 1 ? 'end' : 'middle'}">${s.season}</text>`).join('')}</svg>`;
  }
  out.push(section(`<h2>By season</h2>${chart}<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(100px,1fr))">${seasons.slice().reverse().map(s => `
    <a class="card" href="#s${s.season}"><span class="num note">${s.season}</span><span class="num" style="font-size:24px">${Math.round(s.score)}</span>
    <span class="note" style="${s.champion ? 'color:' + GOLD : ''}">${s.champion ? 'Champion' : s.runnerUp ? 'Runner-up' : s.last ? 'Last place' : s.current ? 'In progress · ' + ordinal(s.rank) : ordinal(s.rank) + ' · ' + wl(s.wins, s.losses, s.ties)}</span></a>`).join('')}</div>
    <a class="btn" href="#vs-${encodeURIComponent(id)}~${encodeURIComponent((lb.find(x => x.id !== id) || {}).id || id)}">Compare with another manager →</a>`));
  return out.join('');
}
const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');

// ---------- Compare ----------
function viewCompare(a, b) {
  const lb = M.leaderboard;
  if (!M.career[a]) a = lb[0].id;
  if (!M.career[b] || b === a) b = (lb.find(x => x.id !== a) || lb[0]).id;
  const A = M.career[a]; const B = M.career[b];
  const r = M.h2hRecord(a, b);
  const opts = sel => lb.map(c => `<option value="${esc(c.id)}"${c.id === sel ? ' selected' : ''}>${name(c.id)}</option>`).join('');
  const poW = r.list.filter(g => g.playoff && g.mine > g.theirs).length;
  const poL = r.list.filter(g => g.playoff && g.mine < g.theirs).length;
  const last = r.list.slice().sort((p, q) => Number(q.season) - Number(p.season) || q.week - p.week)[0];
  const out = [];
  out.push(section(`<h1>Head to head. <span class="soft">Pick any two.</span></h1>
    <div class="pickers"><label for="pickA">Manager 1<select id="pickA" class="a">${opts(a)}</select></label><span class="vs">vs</span>
    <label for="pickB">Manager 2<select id="pickB">${opts(b)}</select></label></div>`, 'hero'));
  out.push(`<section class="paper"><div class="wrap"><span class="label">All-time series</span>
    <div class="line2" style="align-items:center"><span class="stack"><span class="num" style="font-size:44px;line-height:1">${r.w}</span><span style="font-size:13px;font-weight:600">${name(a)}</span></span>
    <span style="color:#6B7B7E">${r.t ? r.t + ' tie' + (r.t > 1 ? 's' : '') : '–'}</span>
    <span class="stack" style="align-items:flex-end"><span class="num" style="font-size:44px;line-height:1;color:#6B7B7E">${r.l}</span><span style="font-size:13px;font-weight:600;color:#4A5A5D">${name(b)}</span></span></div>
    <div class="stats"><div><span>Avg margin</span><span>${r.games ? f1(r.margin) : '—'}</span></div><div><span>Playoffs</span><span>${r.playoff ? poW + '–' + poL : '—'}</span></div>
    <div><span>Last meeting</span><span style="font-size:13px">${last ? last.season + ' W' + last.week + ' · ' + (last.mine > last.theirs ? 'W' : last.mine < last.theirs ? 'L' : 'T') : '—'}</span></div></div></div></section>`);

  const keys = [['Overall', A.score, B.score], ['Results', A.parts.results, B.parts.results], ['Start/sit', A.parts.startSit, B.parts.startSit],
    ['Waivers', A.parts.waivers, B.parts.waivers], ['Trades', A.parts.trades, B.parts.trades], ['Draft', A.parts.draft, B.parts.draft]].filter(k => k[1] != null && k[2] != null);
  out.push(section(`<div class="head"><h2>Manager Score</h2><span class="legend"><span><i style="background:${GOLD}"></i> ${name(a)}</span><span><i style="background:#C9D3D2"></i> ${name(b)}</span></span></div>
    <div class="rows">${keys.map((k, i) => `<div class="row" style="grid-template-columns:82px minmax(0,1fr) 64px;padding:11px 0">
      <span style="font-size:13px;${i === 0 ? 'font-weight:600' : 'color:#C9D3D2'}">${k[0]}</span>
      <span class="stack" style="gap:4px"><span class="bar"><i style="width:${k[1]}%;background:${GOLD}"></i></span><span class="bar"><i style="width:${k[2]}%;background:#C9D3D2"></i></span></span>
      <span class="num" style="font-size:13px;text-align:right">${Math.round(k[1])} / ${Math.round(k[2])}</span></div>`).join('')}</div>`));

  const rows = [['Titles', A.titles, B.titles, A.titles - B.titles], ['Record', wl(A.wins, A.losses, A.ties), wl(B.wins, B.losses, B.ties), A.winPct - B.winPct],
    ['Points per game', f1(A.ppg), f1(B.ppg), A.ppg - B.ppg], ['Start/sit', (A.effPct * 100).toFixed(1) + '%', (B.effPct * 100).toFixed(1) + '%', A.effPct - B.effPct],
    ['Clutch rating', A.clutch != null ? signed(A.clutch * 100) + '%' : '—', B.clutch != null ? signed(B.clutch * 100) + '%' : '—', (A.clutch || 0) - (B.clutch || 0)],
    ['Luck Index', signed(A.luck), signed(B.luck), 0]];
  out.push(section(`<h2>Career side by side</h2><div class="scroll"><table class="table"><thead><tr><th></th><th>${name(a)}</th><th>${name(b)}</th></tr></thead><tbody>
    ${rows.map(x => `<tr><td class="t" style="font-weight:400;color:#A3B2B4;font-size:13px">${x[0]}</td><td style="${x[3] > 0 ? 'color:#F1F4F3;font-weight:500' : 'color:#8A9C9F'}">${x[1]}</td>
      <td style="${x[3] < 0 ? 'color:#F1F4F3;font-weight:500' : 'color:#8A9C9F'}">${x[2]}</td></tr>`).join('')}</tbody></table></div>`));

  const between = M.allTrades.filter(t => t.sides.some(s => s.owner === a) && t.sides.some(s => s.owner === b));
  out.push(section(`<h2>Trades between them</h2>${between.length ? between.map(t => {
    const sa = t.sides.find(s => s.owner === a); const win = sa.net >= 0 ? a : b;
    return `<div class="box"><div class="top-line"><span>${t.season} · Week ${t.week}</span><span>Winner</span></div>
      <div class="line2"><span style="font-size:14px;min-width:0">${name(a)} got ${sa.got.map(g => player(g.pid)).join(', ') || 'picks'} for ${sa.sent.map(g => player(g.pid)).join(', ') || 'picks'}</span>
      <span class="num up" style="font-size:14px;white-space:nowrap">${name(win)} ${signed(Math.abs(sa.net))}</span></div></div>`;
  }).join('') : '<p class="lead">These two have never traded with each other.</p>'}`));
  return out.join('');
}

function bindCompare() {
  const pa = document.getElementById('pickA'); const pb = document.getElementById('pickB');
  if (!pa) return;
  const go = () => { location.hash = 'vs-' + encodeURIComponent(pa.value) + '~' + encodeURIComponent(pb.value); };
  pa.addEventListener('change', go); pb.addEventListener('change', go);
}

// ---------- routing ----------
function parse() {
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (/^s\d{4}$/.test(h) && seasonOf(h.slice(1))) return { view: 'season', season: h.slice(1) };
  if (h.indexOf('m-') === 0) return { view: 'manager', id: h.slice(2) };
  if (h.indexOf('vs-') === 0) { const p = h.slice(3).split('~'); return { view: 'compare', a: p[0], b: p[1] }; }
  return { view: 'all' };
}

let lastRoute = '';
function render() {
  const route = parse();
  stopLive();
  renderTabs(route);
  if (route.view === 'season') {
    const S = seasonOf(route.season);
    const v = viewSeason(S);
    $app.innerHTML = v.html;
    bindPowerLegend(S, v.defaultHL);
    if (v.liveWeek && v.liveWeek > S.scoredThrough) startLive(S, v.liveWeek);
    document.title = S.season + ' · KSE Hall of Fame';
  } else if (route.view === 'manager') {
    $app.innerHTML = viewManager(route.id);
    document.title = M.nameOf(route.id) + ' · KSE Hall of Fame';
  } else if (route.view === 'compare') {
    $app.innerHTML = viewCompare(route.a, route.b);
    bindCompare();
    document.title = 'Compare · KSE Hall of Fame';
  } else {
    $app.innerHTML = viewAll();
    document.title = 'KSE Hall of Fame';
  }
  const key = location.hash;
  if (key !== lastRoute) { window.scrollTo(0, 0); lastRoute = key; }
}

async function start() {
  const $status = document.getElementById('status');
  try {
    const data = await loadAll(msg => { if ($status) $status.textContent = msg; });
    M = buildModel(data);
    const cur = M.seasons[0];
    document.getElementById('meta').textContent = cur && cur.rids ? cur.rids.length + '-team redraft' : CONFIG.leagueName;
    window.addEventListener('hashchange', render);
    render();
  } catch (e) {
    $app.innerHTML = `<div class="wrap status err">Couldn't load the league from Sleeper. Check your connection and reload the page.<br><span class="note">${esc(e.message)}</span></div>`;
  }
}
start();
