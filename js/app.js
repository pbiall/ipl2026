const SUPABASE_URL      = 'https://dephieggvbqhpslzwncm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cV0zIPW01Dd5sDbkK7YMOQ_twd3V4Be';
const ADMIN_EMAILS      = ['allservices2022@outlook.com'];

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── State ────────────────────────────────────────────────────
let currentUser   = null;
let isAdmin       = false;
let myPredictions = {};  // { matchId: teamCode }
let allResults    = {};  // { matchId: teamCode|'NR' }
let allPlayers    = [];
let activeFilt    = 'all';
let adminFilt     = 'all';
let clockInterval = null;
let lastLockState = {};

// ── Init ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) await onLogin(session.user);
  else showScreen('auth');

  sb.auth.onAuthStateChange(async (ev, session) => {
    if (ev === 'SIGNED_IN' && session) await onLogin(session.user);
    else if (ev === 'SIGNED_OUT') { showScreen('auth'); stopClock(); }
  });
});

async function onLogin(user) {
  currentUser = user;
  isAdmin = ADMIN_EMAILS.includes(user.email);
  await loadAllData();
  renderApp();
  showScreen('app');
  startClock();
  subscribeToUpdates();
}

// ── Realtime subscriptions ───────────────────────────────────
function subscribeToUpdates() {
  // Results change → refresh cards + hero for everyone
  sb.channel('results-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, async () => {
      await loadResults();
      renderMatches();
      updateHero();
      if (document.getElementById('page-leaderboard').classList.contains('on')) renderLeaderboard();
    })
    .subscribe();

  // Broadcast change → show banner
  sb.channel('broadcast-channel')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'broadcast' }, payload => {
      const msg = payload.new.message;
      if (msg) showBroadcast(msg);
      else document.getElementById('broadcast-banner').classList.add('hidden');
    })
    .subscribe();
}

// ── Load data from Supabase ──────────────────────────────────
async function loadAllData() {
  await Promise.all([loadResults(), loadMyPredictions(), loadPlayers(), loadBroadcast()]);
  REAL_MATCHES.forEach(m => { lastLockState[m.id] = isMatchLocked(m); });
}

async function loadResults() {
  const { data } = await sb.from('results').select('match_id,winner');
  allResults = {};
  if (data) data.forEach(r => { allResults[r.match_id] = r.winner; });
}

async function loadMyPredictions() {
  const { data } = await sb.from('predictions')
    .select('match_id,pick')
    .eq('user_id', currentUser.id);
  myPredictions = {};
  if (data) data.forEach(p => { myPredictions[p.match_id] = p.pick; });
}

async function loadPlayers() {
  const { data, error } = await sb.from('profiles').select('*').order('total_pts', { ascending: false });
  if (error) { console.error('loadPlayers:', error.message); return; }
  if (data && data.length) {
    allPlayers = data.map(p => ({
      uid: p.id,
      name: p.display_name || p.email?.split('@')[0] || 'Player',
      email: p.email || '',
      pts: p.total_pts || 0,
      corr: p.correct || 0,
      pred: p.predicted || 0,
      isAdmin: p.is_admin || false,
      avatar: (p.display_name || p.email || 'P')[0].toUpperCase(),
      color: strToColor(p.display_name || p.email || '')
    }));
  }
}

async function loadBroadcast() {
  const { data } = await sb.from('broadcast').select('message').eq('id', 1).single();
  if (data?.message) showBroadcast(data.message);
}

// ── Save prediction to Supabase ──────────────────────────────
async function savePrediction(matchId, team) {
  await sb.from('predictions').upsert(
    { user_id: currentUser.id, match_id: matchId, pick: team, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,match_id' }
  );
  await refreshMyStats();
}

async function refreshMyStats() {
  const corr = calcMyCorrect();
  const pts  = calcMyTotalPts();
  const pred = Object.keys(myPredictions).length;
  await sb.from('profiles').update({ total_pts: pts, correct: corr, predicted: pred })
    .eq('id', currentUser.id);
}

// ── Save result to Supabase (admin only) ─────────────────────
async function saveResult(matchId, winner) {
  await sb.from('results').upsert(
    { match_id: matchId, winner, set_by: currentUser.id, set_at: new Date().toISOString() },
    { onConflict: 'match_id' }
  );
  // Recalculate points for all players (simplified: trigger full refresh)
  await recalcAllPlayerPoints();
}

async function clearResultDB(matchId) {
  await sb.from('results').delete().eq('match_id', matchId);
  await recalcAllPlayerPoints();
}

async function recalcAllPlayerPoints() {
  // For each player, reload their predictions and recalc against current results
  const { data: allPreds } = await sb.from('predictions').select('user_id,match_id,pick');
  const { data: allRes   } = await sb.from('results').select('match_id,winner');
  if (!allPreds || !allRes) return;

  const resMap = {};
  allRes.forEach(r => { resMap[r.match_id] = r.winner; });

  const playerMap = {};
  allPreds.forEach(p => {
    if (!playerMap[p.user_id]) playerMap[p.user_id] = { pts:0, corr:0, pred:0 };
    playerMap[p.user_id].pred++;
    const res = resMap[p.match_id];
    if (res) {
      const m = MATCHES.find(x => x.id === p.match_id);
      const pts = res === 'NR' ? 0 : p.pick === res ? (m?.pl ? 20 : 10) : 0;
      playerMap[p.user_id].pts  += pts;
      if (pts > 0) playerMap[p.user_id].corr++;
    }
  });

  for (const [uid, stats] of Object.entries(playerMap)) {
    await sb.from('profiles').update({ total_pts: stats.pts, correct: stats.corr, predicted: stats.pred }).eq('id', uid);
  }
  await loadPlayers();
}

// ── Scoring (local calc for display) ─────────────────────────
function calcPts(mid) {
  const pred = myPredictions[mid], res = allResults[mid];
  if (!pred || !res) return null;
  if (res === 'NR') return 0;
  const m = MATCHES.find(x => x.id === mid);
  return pred === res ? (m?.pl ? 20 : 10) : 0;
}
function calcMyTotalPts() { return REAL_MATCHES.reduce((s,m) => s + (calcPts(m.id) ?? 0), 0); }
function calcMyCorrect()  { return REAL_MATCHES.filter(m => (calcPts(m.id) ?? 0) > 0).length; }
function calcMyAcc() {
  const s = REAL_MATCHES.filter(m => myPredictions[m.id] && allResults[m.id]);
  return s.length ? Math.round(s.filter(m => calcPts(m.id) > 0).length / s.length * 100) : null;
}

// ── Clock (1-second tick for auto-lock countdowns) ────────────
function startClock() {
  stopClock();
  clockInterval = setInterval(clockTick, 1000);
  clockTick();
}
function stopClock() { if (clockInterval) { clearInterval(clockInterval); clockInterval = null; } }

function clockTick() {
  let needsRender = false;
  REAL_MATCHES.forEach(m => {
    const nowLocked = isMatchLocked(m) && !allResults[m.id];
    if (nowLocked && !lastLockState[m.id]) {
      lastLockState[m.id] = true;
      needsRender = true;
      toast(`🔒 Match ${m.id} (${m.t1} vs ${m.t2}) LOCKED — toss in 1 min!`, 'warn');
    }
    const el = document.getElementById(`cd-${m.id}`);
    if (el) el.textContent = countdownLabel(m);
  });
  if (needsRender) renderMatches();
}

function countdownLabel(m) {
  if (allResults[m.id]) return '';
  const secs = secsUntilLock(m);
  if (secs <= 0) return '🔒 LOCKED';
  if (secs < 60) return `🔴 Locks in ${secs}s`;
  const mins = Math.ceil(secs / 60);
  if (mins <= 60) return `⏱ ${mins}m to lock`;
  const hrs = Math.floor(secs / 3600), rem = Math.ceil((secs % 3600) / 60);
  return `⏱ ${hrs}h ${rem}m`;
}

// ── Render app shell ─────────────────────────────────────────
function renderApp() {
  if (isAdmin) document.getElementById('admin-nav-btn')?.classList.remove('hidden');
  const name = currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'User';
  document.getElementById('hdr-name').textContent   = name;
  document.getElementById('hdr-avatar').textContent = name[0].toUpperCase();
  document.getElementById('ud-name').textContent    = name;
  document.getElementById('ud-email').textContent   = currentUser?.email || '';
  if (isAdmin) document.getElementById('hdr-avatar').style.background = '#ff5733';
  buildTicker();
  renderMatches();
  updateHero();
}

function buildTicker() {
  const t = REAL_MATCHES.slice(0,14).map(m=>`M${m.id}: ${m.t1} vs ${m.t2} · ${m.date}`).join('   |   ');
  document.getElementById('ticker-txt').textContent = t + '   |   ' + t;
}

// ── Match cards ──────────────────────────────────────────────
function renderMatches() {
  let vis = REAL_MATCHES;
  if      (activeFilt==='live')        vis = vis.filter(m=>!isMatchLocked(m)&&!allResults[m.id]&&secsUntilLock(m)<7200);
  else if (activeFilt==='upcoming')    vis = vis.filter(m=>!allResults[m.id]&&!myPredictions[m.id]);
  else if (activeFilt==='predicted')   vis = vis.filter(m=>!!myPredictions[m.id]);
  else if (activeFilt==='unpredicted') vis = vis.filter(m=>!myPredictions[m.id]&&!allResults[m.id]);
  else if (activeFilt==='completed')   vis = vis.filter(m=>!!allResults[m.id]);
  else {
    // Default 'all' view — completed matches go to bottom, upcoming/live on top
    const done      = vis.filter(m => !!allResults[m.id]);
    const notDone   = vis.filter(m => !allResults[m.id]);
    vis = [...notDone, ...done];
  }

  const phases = [
    {label:'PHASE 1 · Mar 28 – Apr 9',  ids:rng(1,20)},
    {label:'PHASE 2 · Apr 10 – Apr 27', ids:rng(21,50)},
    {label:'PHASE 3 · Apr 28 – May 18', ids:rng(51,74)},
  ];

  let html = '';

  if (activeFilt === 'all') {
    // Show upcoming/live first without phase headers, then completed section
    const notDone = vis.filter(m => !allResults[m.id]);
    const done    = vis.filter(m => !!allResults[m.id]);

    if (notDone.length) {
      // Group upcoming by phase
      phases.forEach(ph => {
        const ms = notDone.filter(m => ph.ids.includes(m.id));
        if (!ms.length) return;
        html += `<div class="phase-hdr">${ph.label}</div><div class="grid">`;
        ms.forEach(m => { html += matchCard(m); });
        html += '</div>';
      });
    }

    if (done.length) {
      html += `<div class="phase-hdr" style="margin-top:24px">🏁 COMPLETED MATCHES</div><div class="grid">`;
      // Show completed in reverse order (most recent first)
      [...done].reverse().forEach(m => { html += matchCard(m); });
      html += '</div>';
    }
  } else {
    // Filtered views — use phase grouping as before
    phases.forEach(ph => {
      const ms = vis.filter(m=>ph.ids.includes(m.id));
      if (!ms.length) return;
      html += `<div class="phase-hdr">${ph.label}</div><div class="grid">`;
      ms.forEach(m => { html += matchCard(m); });
      html += '</div>';
    });
  }

  if (!html) html = `<div style="color:var(--muted);font-size:14px;padding:20px 0">No matches here.</div>`;
  document.getElementById('matches-out').innerHTML = html;
}

function rng(a,b){const r=[];for(let i=a;i<=b;i++)r.push(i);return r;}

function matchCard(m) {
  const t1=TEAMS[m.t1], t2=TEAMS[m.t2];
  const pred=myPredictions[m.id], res=allResults[m.id], p=calcPts(m.id);
  const locked = res ? true : isMatchLocked(m);
  const secs   = secsUntilLock(m);
  const imminent = !res && secs > 0 && secs <= 300;
  const canPick = !locked && !res;

  // Community pick % (simulated from all players — in future can be real)
  const totalPicks = allPlayers.filter(pl => pl.pred > 0).length || 0;
  // We don't have per-match breakdown so show 50/50 until result
  const t1pct = res ? (res===m.t1?60:40) : pred===m.t1?55:pred===m.t2?45:50;
  const t2pct = 100 - t1pct;

  // Team colors
  const TCOLORS = {
    RCB:'#c8102e', CSK:'#f5c842', MI:'#004ba0', KKR:'#3a1f6e',
    SRH:'#ff6000', DC:'#1a73e8', RR:'#e91e8c', LSG:'#00c89a',
    GT:'#1c4966', PBKS:'#c8102e'
  };
  const c1 = TCOLORS[m.t1]||'#333';
  const c2 = TCOLORS[m.t2]||'#555';

  // Status
  let statusTxt='', statusColor='var(--gold)';
  if (res) { statusTxt='RESULT IN'; statusColor='var(--muted)'; }
  else if (locked) { statusTxt='🔒 LOCKED'; statusColor='var(--red)'; }
  else if (imminent) { statusTxt='⚠ CLOSING SOON'; statusColor='var(--red)'; }
  else if (pred) { statusTxt='✅ PREDICTED'; statusColor='var(--green)'; }
  else { statusTxt='OPEN'; statusColor='var(--gold)'; }

  // Result outcome
  let outcomeHtml = '';
  if (res && p!==null) {
    if (p>0) outcomeHtml=`<div class="cb-outcome win">✅ Correct! +${p} pts</div>`;
    else if(pred) outcomeHtml=`<div class="cb-outcome loss">❌ Wrong — ${TEAMS[res]?.n||res} won</div>`;
    else outcomeHtml=`<div class="cb-outcome neutral">${TEAMS[res]?.n||res} won</div>`;
  }

  // Countdown
  let cdHtml = '';
  if (!res) {
    const cd = countdownLabel(m);
    const cdCls = imminent ? 'cb-cd urgent' : 'cb-cd';
    cdHtml = `<div class="${cdCls}" id="cd-${m.id}">${cd}</div>`;
  }

  // Pick buttons
  function pickBtn(team, tObj, color) {
    if (res) {
      const isWinner = team===res;
      const isPick   = team===pred;
      if (isWinner && isPick) return `<button class="cb-pick-btn correct" style="--tc:${color}">${tObj?.e||''} ${team}<span class="cb-pick-mark">✅</span></button>`;
      if (isWinner)           return `<button class="cb-pick-btn winner" style="--tc:${color}">${tObj?.e||''} ${team}<span class="cb-pick-mark">🏆</span></button>`;
      if (isPick)             return `<button class="cb-pick-btn wrong"  style="--tc:${color}">${tObj?.e||''} ${team}<span class="cb-pick-mark">❌</span></button>`;
      return `<button class="cb-pick-btn faded" style="--tc:${color}">${tObj?.e||''} ${team}</button>`;
    }
    if (locked) {
      const sel = pred===team;
      return `<button class="cb-pick-btn ${sel?'selected':''}" style="--tc:${color}" disabled>${tObj?.e||''} ${team}${sel?'<span class="cb-pick-mark">🔒</span>':''}</button>`;
    }
    const sel = pred===team;
    return `<button class="cb-pick-btn ${sel?'selected':''}" style="--tc:${color}" onclick="pick(${m.id},'${team}')">${tObj?.e||''} ${team}</button>`;
  }

  return `
  <div class="cb-card">
    <div class="cb-header" style="background:linear-gradient(135deg,${c1}22,${c2}22)">
      <div class="cb-meta">
        <span class="cb-match-num">MATCH ${m.id}${m.pl?' · ×2 PLAYOFF':''}</span>
        <span class="cb-status" style="color:${statusColor}">${statusTxt}</span>
      </div>
      <div class="cb-venue">📍 ${m.venue} · 📅 ${m.date} · ${matchTimeLabel(m)}</div>
      ${cdHtml}
    </div>

    <div class="cb-teams-row">
      <div class="cb-team" style="--tc:${c1}">
        <div class="cb-team-logo" style="background:${c1}22;border-color:${c1}44">${t1?.e||'🏏'}</div>
        <div class="cb-team-code">${m.t1}</div>
        <div class="cb-team-name">${t1?.n||''}</div>
      </div>
      <div class="cb-vs">
        <div class="cb-vs-circle">VS</div>
      </div>
      <div class="cb-team" style="--tc:${c2}">
        <div class="cb-team-logo" style="background:${c2}22;border-color:${c2}44">${t2?.e||'🏏'}</div>
        <div class="cb-team-code">${m.t2}</div>
        <div class="cb-team-name">${t2?.n||''}</div>
      </div>
    </div>

    <div class="cb-pct-bar">
      <div class="cb-pct-fill" style="width:${t1pct}%;background:${c1}"></div>
      <div class="cb-pct-labels">
        <span style="color:${c1}">${t1pct}%</span>
        <span style="font-size:10px;color:var(--muted)">Community Picks</span>
        <span style="color:${c2}">${t2pct}%</span>
      </div>
    </div>

    <div class="cb-question">Who will win the match?</div>

    <div class="cb-picks">
      ${pickBtn(m.t1, t1, c1)}
      ${pickBtn(m.t2, t2, c2)}
    </div>

    ${outcomeHtml}
  </div>`;
}


