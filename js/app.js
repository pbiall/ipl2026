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

  const phases = [
    {label:'PHASE 1 · Mar 28 – Apr 9',  ids:rng(1,20)},
    {label:'PHASE 2 · Apr 10 – Apr 27', ids:rng(21,50)},
    {label:'PHASE 3 · Apr 28 – May 18', ids:rng(51,74)},
  ];
  let html = '';
  phases.forEach(ph => {
    const ms = vis.filter(m=>ph.ids.includes(m.id));
    if (!ms.length) return;
    html += `<div class="phase-hdr">${ph.label}</div><div class="grid">`;
    ms.forEach(m => { html += matchCard(m); });
    html += '</div>';
  });
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

  let cardCls = 'mcard';
  if (!res && secs<=7200 && secs>0) cardCls+=' live';
  if (p!==null&&p>0)  cardCls+=' res-win';
  else if (p===0)     cardCls+=' res-loss';
  else if (pred&&!locked) cardCls+=' predicted';

  let badge='OPEN', bc='b-open';
  if (res)          {badge='RESULT IN'; bc='b-done';}
  else if (locked)  {badge='🔒 LOCKED'; bc='b-live';}
  else if (imminent){badge='⚠ CLOSING'; bc='b-live';}
  else if (pred)    {badge='PREDICTED'; bc='b-pred';}

  function btnCls(team) {
    if (res) {
      if (team===res&&team===pred) return 'pbtn correct-pick';
      if (team===res)              return 'pbtn winner-label';
      if (team===pred)             return 'pbtn wrong-pick';
      return 'pbtn neutral';
    }
    if (locked) return pred===team?'pbtn selected':'pbtn neutral';
    return pred===team?'pbtn selected':'pbtn';
  }

  const canPick = !locked && !res;
  const o1=canPick?`onclick="pick(${m.id},'${m.t1}')"` :'';
  const o2=canPick?`onclick="pick(${m.id},'${m.t2}')"` :'';

  let rl='';
  if (res&&p!==null) {
    if (p>0)     rl=`<div class="res-label lbl-w">✅ +${p} pts — Correct!</div>`;
    else if (pred) rl=`<div class="res-label lbl-l">❌ 0 pts — ${TEAMS[res]?.n||res} won</div>`;
    else           rl=`<div class="res-label lbl-n">No prediction — ${TEAMS[res]?.n||res} won</div>`;
  }

  return `
  <div class="${cardCls}">
    <div class="mcard-top">
      <div class="mnum">MATCH ${m.id}${m.pl?' · ×2':''}</div>
      <div class="badge ${bc}">${badge}</div>
    </div>
    <div class="teams">
      <div class="team"><div class="t-emoji">${t1?.e||'🏏'}</div><div class="t-code">${m.t1}</div><div class="t-name">${t1?.n||''}</div></div>
      <div class="vs">VS</div>
      <div class="team"><div class="t-emoji">${t2?.e||'🏏'}</div><div class="t-code">${m.t2}</div><div class="t-name">${t2?.n||''}</div></div>
    </div>
    <div class="minfo">
      <div class="venue">📍 ${m.venue}</div>
      <div class="mdate">📅 ${m.date} · ${matchTimeLabel(m)}</div>
      ${!res?`<div class="${imminent?'cd-chip cd-urgent':'cd-chip'}" id="cd-${m.id}">${countdownLabel(m)}</div>`:''}
    </div>
    <div class="pred-area">
      <button class="${btnCls(m.t1)}" ${o1}>${t1?.e||''} ${m.t1}</button>
      <button class="${btnCls(m.t2)}" ${o2}>${t2?.e||''} ${m.t2}</button>
    </div>
    ${rl}
    ${locked&&!res&&pred?`<div class="res-label lbl-n" style="color:var(--gold)">🔒 Your pick: ${pred} · Awaiting result</div>`:''}
  </div>`;
}

// ── Pick ─────────────────────────────────────────────────────
async function pick(mid, team) {
  if (allResults[mid] || isMatchLocked(mid)) return;
  myPredictions[mid] = team;
  renderMatches();
  updateHero();
  toast(`🔒 ${team} locked in for Match ${mid}!`);
  await savePrediction(mid, team);
}

// ── Hero stats ────────────────────────────────────────────────
function updateHero() {
  const pts=calcMyTotalPts(), pred=Object.keys(myPredictions).length, acc=calcMyAcc();
  document.getElementById('hs-pred').textContent = pred;
  document.getElementById('hs-pts').textContent  = pts;
  document.getElementById('hs-acc').textContent  = acc!==null?acc+'%':'—';
  document.getElementById('hdr-pts').textContent = pts+' PTS';
}

// ── Leaderboard ───────────────────────────────────────────────
async function renderLeaderboard() {
  await loadPlayers();
  const sorted = [...allPlayers].sort((a,b)=>b.pts-a.pts);
  const myIdx  = sorted.findIndex(p=>p.uid===currentUser?.id);
  const me     = sorted[myIdx]||{};
  document.getElementById('lb-rank').textContent   = myIdx+1||'—';
  document.getElementById('lb-myname').textContent = me.name||'You';
  document.getElementById('lb-pts').textContent    = (me.pts||0)+' PTS';
  document.getElementById('lb-sub').textContent    = `${me.corr||0} correct · ${me.pred||0} predicted`;
  document.getElementById('lb-body').innerHTML = sorted.map((p,i)=>{
    const isMe=p.uid===currentUser?.id;
    const rkCls=i===0?'r1':i===1?'r2':i===2?'r3':'';
    const acc=p.pred>0?Math.round(p.corr/p.pred*100)+'%':'—';
    return `
    <tr ${isMe?'class="you-row"':''}>
      <td><div class="rk ${rkCls}">${i+1}</div></td>
      <td><div class="pnm">
        <div class="av" style="background:${p.color+'22'};color:${p.color}">${p.avatar}</div>
        <div><b>${p.name}${isMe?' (You)':''}</b>${p.isAdmin?'<span class="admin-crown">ADMIN</span>':''}</div>
      </div></td>
      <td style="color:var(--muted);font-size:13px">${p.corr}</td>
      <td style="color:var(--muted);font-size:13px">${p.pred}</td>
      <td class="pts-c">${p.pts}</td>
    </tr>`;
  }).join('');
}

// ── My Stats ──────────────────────────────────────────────────
function renderStats() {
  const pts=calcMyTotalPts(), pred=Object.keys(myPredictions).length, corr=calcMyCorrect(), acc=calcMyAcc();
  document.getElementById('ms-pts').textContent  = pts;
  document.getElementById('ms-pred').textContent = pred;
  document.getElementById('ms-corr').textContent = corr;
  document.getElementById('ms-acc').textContent  = acc!==null?acc+'%':'—';
  let best=0,cur=0;
  REAL_MATCHES.forEach(m=>{const x=calcPts(m.id);if(x===null){cur=0;return;}x>0?(cur++,best=Math.max(best,cur)):(cur=0);});
  document.getElementById('ms-str').textContent = best;
  const sorted=[...allPlayers].sort((a,b)=>b.pts-a.pts);
  document.getElementById('ms-rank').textContent=(sorted.findIndex(p=>p.uid===currentUser?.id)+1)||'—';
  const settled=REAL_MATCHES.filter(m=>myPredictions[m.id]&&allResults[m.id]).slice(-20);
  document.getElementById('streak-row').innerHTML=
    settled.map(m=>calcPts(m.id)>0?`<div class="sd sw">W</div>`:`<div class="sd sl">L</div>`).join('')+
    Array(Math.max(0,10-settled.length)).fill('<div class="sd sp">·</div>').join('');
  const hist=REAL_MATCHES.filter(m=>myPredictions[m.id]).reverse().slice(0,50);
  if(!hist.length){document.getElementById('hist-list').innerHTML=`<div style="color:var(--muted);font-size:13px;padding:10px 0">No predictions yet.</div>`;return;}
  document.getElementById('hist-list').innerHTML=hist.map(m=>{
    const team=myPredictions[m.id],x=calcPts(m.id);
    let ph,rc='hrow';
    if(x===null) ph=`<div class="hrow-pts hp-pend">Pending</div>`;
    else if(x>0){ph=`<div class="hrow-pts hp-pos">+${x} pts</div>`;rc='hrow hw';}
    else        {ph=`<div class="hrow-pts hp-neg">0 pts</div>`;rc='hrow hl';}
    return `<div class="${rc}">
      <div style="font-size:18px;width:24px;flex-shrink:0">${TEAMS[team]?.e||'🏏'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500">Match ${m.id}: ${m.t1} vs ${m.t2}</div>
        <div style="font-size:11px;color:var(--muted)">Picked: ${team} · ${m.date}${allResults[m.id]?' · Winner: '+allResults[m.id]:isMatchLocked(m)?' · 🔒 Locked':''}</div>
      </div>${ph}</div>`;
  }).join('');
}

// ── Admin ─────────────────────────────────────────────────────
function renderAdmin() { renderAdminResults(); renderAdminUsers(); renderAdminMatchStatus(); }

function renderAdminResults() {
  let ms=REAL_MATCHES;
  if(adminFilt==='live')    ms=ms.filter(m=>!allResults[m.id]&&secsUntilLock(m)<7200);
  else if(adminFilt==='pending') ms=ms.filter(m=>!allResults[m.id]);
  else if(adminFilt==='done')    ms=ms.filter(m=>!!allResults[m.id]);
  document.getElementById('admin-out').innerHTML=ms.map(m=>{
    const t1=TEAMS[m.t1],t2=TEAMS[m.t2],res=allResults[m.id];
    return `<div class="ac">
      <div class="ac-title">Match ${m.id} · ${m.t1} vs ${m.t2}</div>
      <div class="ac-sub">${m.date} · ${matchTimeLabel(m)} · ${isMatchLocked(m)?'🔒 Locked':'⏱ '+countdownLabel(m)}</div>
      <div class="ac-btns">
        <button class="arbtn ${res===m.t1?'set':''}" onclick="adminSetResult(${m.id},'${m.t1}')">${t1?.e} ${m.t1}</button>
        <button class="arbtn ${res===m.t2?'set':''}" onclick="adminSetResult(${m.id},'${m.t2}')">${t2?.e} ${m.t2}</button>
        <button class="arbtn ${res==='NR'?'set-nr':''}" onclick="adminSetResult(${m.id},'NR')">No Result</button>
        ${res?`<button class="arbtn set-clr" onclick="adminClearResult(${m.id})">✕ Clear</button>`:''}
      </div>
      ${res?`<div style="font-size:11px;margin-top:8px;color:var(--green)">✅ Winner: <b>${res}</b></div>`:''}
    </div>`;
  }).join('');
}

async function adminSetResult(mid, winner) {
  if(!isAdmin) return;
  const btn = event.target;
  btn.textContent = '⏳';  btn.disabled = true;
  allResults[mid] = winner;
  renderAdminResults(); renderMatches(); updateHero();
  await saveResult(mid, winner);
  const p=calcPts(mid);
  if(p>0)                toast(`🎉 Result saved! +${p} pts for you`);
  else if(p===0&&myPredictions[mid]) toast('Result saved. Wrong pick.','err');
  else                   toast(`✅ Match ${mid}: ${winner} won`);
}

async function adminClearResult(mid) {
  if(!isAdmin||!confirm(`Clear result for Match ${mid}?`)) return;
  delete allResults[mid];
  await clearResultDB(mid);
  renderAdminResults(); renderMatches(); updateHero();
  toast(`Result for Match ${mid} cleared`,'warn');
}

function setAdminFilter(f,btn){
  adminFilt=f;
  document.querySelectorAll('#admin-results .fbtn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  renderAdminResults();
}

function renderAdminMatchStatus() {
  document.getElementById('admin-match-status').innerHTML=REAL_MATCHES.map(m=>{
    const locked=isMatchLocked(m),res=allResults[m.id];
    return `<div class="ac">
      <div class="ac-title">Match ${m.id} · ${m.t1} vs ${m.t2}</div>
      <div class="ac-sub">${m.date} · ${matchTimeLabel(m)}</div>
      <div style="font-size:11px;margin-bottom:8px;color:${res?'var(--green)':locked?'var(--red)':'var(--green)'}">
        ${res?'✅ Result entered':locked?'🔒 Auto-locked':'🟢 Open · '+countdownLabel(m)}
      </div>
      <div class="ac-btns">
        <button class="arbtn" onclick="adminForceLock(${m.id})">🔒 Force Lock</button>
        <button class="arbtn" onclick="adminForceOpen(${m.id})">🔓 Force Open</button>
      </div>
    </div>`;
  }).join('');
}

function adminForceLock(mid){
  const m=MATCHES.find(x=>x.id===mid);if(!m)return;
  m.tossTime=new Date(Date.now()-LOCK_BUFFER_MS-1000).toISOString();
  lastLockState[mid]=true;renderAdminMatchStatus();renderMatches();toast(`Match ${mid} force-locked`);
}
function adminForceOpen(mid){
  const m=MATCHES.find(x=>x.id===mid);if(!m)return;
  m.tossTime=new Date(Date.now()+6*3600*1000+LOCK_BUFFER_MS).toISOString();
  lastLockState[mid]=false;renderAdminMatchStatus();renderMatches();toast(`Match ${mid} force-opened`,'warn');
}

async function renderAdminUsers() {
  const el = document.getElementById('admin-users');
  el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px 0">Loading players...</div>';
  await loadPlayers();
  if (!allPlayers.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:12px 0">
      No players yet — players appear here after they sign up and log in.
    </div>`;
    return;
  }
  el.innerHTML = allPlayers.map(p => {
    const safeName = p.name.replace(/'/g, "\'");
    const isMe = p.uid === currentUser?.id;
    return `
    <div class="user-card">
      <div class="uc-av" style="background:${p.color}22;color:${p.color}">${p.avatar}</div>
      <div class="uc-info">
        <div class="uc-name">${p.name} ${p.isAdmin ? '🔐' : ''}</div>
        <div class="uc-email">${p.email || 'No email'}</div>
        <div style="font-size:11px;color:var(--gold);margin-top:2px">
          ${p.pts} pts &middot; ${p.corr} correct &middot; ${p.pred} predicted
        </div>
      </div>
      <div class="uc-btns">
        <button class="uc-btn ${p.isAdmin ? '' : 'admin-promote'}"
          onclick="adminToggleAdmin('${p.uid}', ${p.isAdmin})">
          ${p.isAdmin ? '✅ Admin' : 'Make Admin'}
        </button>
        <button class="uc-btn" onclick="adminPickForUser('${p.uid}', '${safeName}')">
          🏏 Pick
        </button>
        <button class="uc-btn" onclick="adminResetUserPreds('${p.uid}', '${safeName}')">
          Reset Preds
        </button>
        ${!isMe ? `<button class="uc-btn" style="color:var(--red);border-color:rgba(255,87,51,0.3)"
          onclick="adminDeleteUser('${p.uid}', '${safeName}')">
          🗑 Delete
        </button>` : '<button class="uc-btn" style="opacity:0.3;cursor:default">You</button>'}
      </div>
    </div>`;
  }).join('');
}

async function adminToggleAdmin(uid, currently) {
  const newVal = !currently;
  const { error } = await sb.from('profiles').update({ is_admin: newVal }).eq('id', uid);
  if (error) {
    console.error('adminToggleAdmin:', error.message);
    toast('Failed to update — check Supabase RLS policy', 'err');
    return;
  }
  await renderAdminUsers();
  toast(newVal ? '🔐 User promoted to admin' : 'Admin access removed', 'warn');
}

async function adminResetUserPreds(uid, name) {
  if (!confirm(`Reset ALL predictions for ${name}? This cannot be undone.`)) return;
  const { error: e1 } = await sb.from('predictions').delete().eq('user_id', uid);
  const { error: e2 } = await sb.from('profiles').update({ total_pts:0, correct:0, predicted:0 }).eq('id', uid);
  if (e1 || e2) {
    console.error('resetUserPreds:', e1?.message, e2?.message);
    toast('Error resetting — check console', 'err');
    return;
  }
  if (uid === currentUser.id) { myPredictions = {}; }
  // Update local cache
  const idx = allPlayers.findIndex(p => p.uid === uid);
  if (idx >= 0) { allPlayers[idx].pts = 0; allPlayers[idx].corr = 0; allPlayers[idx].pred = 0; }
  await renderAdminUsers();
  renderMatches(); updateHero();
  toast(`${name}'s predictions cleared`, 'warn');
}

// ── Admin: pick on behalf of a user ─────────────────────────
async function adminPickForUser(uid, name) {
  // Build a pick modal overlay
  const existing = document.getElementById('admin-pick-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'admin-pick-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:2000;
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;

  // Build match options — show all real matches grouped, highlight locked ones
  const matchOpts = REAL_MATCHES.map(m => {
    const locked = isMatchLocked(m) || allResults[m.id];
    const label = `M${m.id}: ${m.t1} vs ${m.t2} (${m.date})${locked ? ' 🔒' : ''}`;
    return `<option value="${m.id}">${label}</option>`;
  }).join('');

  modal.innerHTML = `
    <div style="background:#0e1120;border:1px solid rgba(245,200,66,0.3);border-radius:16px;padding:24px;width:100%;max-width:420px;max-height:90vh;overflow-y:auto">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:1.5px;color:#f5c842;margin-bottom:4px">PICK FOR ${name.toUpperCase()}</div>
      <div style="font-size:12px;color:#6b7280;margin-bottom:20px">Admin override — bypasses lock</div>

      <div style="margin-bottom:14px">
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6b7280;display:block;margin-bottom:6px">Match</label>
        <select id="apf-match" style="width:100%;padding:10px 12px;border-radius:9px;border:1px solid rgba(255,255,255,0.12);background:#151826;color:#e8eaf0;font-size:13px;outline:none"
          onchange="adminPickUpdateTeams()">
          <option value="">— Select match —</option>
          ${matchOpts}
        </select>
      </div>

      <div style="margin-bottom:20px">
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6b7280;display:block;margin-bottom:6px">Pick Winner</label>
        <div id="apf-teams" style="display:flex;gap:10px">
          <div style="color:#6b7280;font-size:13px">Select a match first</div>
        </div>
      </div>

      <input type="hidden" id="apf-uid" value="${uid}">
      <input type="hidden" id="apf-name" value="${name}">
      <input type="hidden" id="apf-team" value="">

      <div style="display:flex;gap:10px">
        <button onclick="adminPickSubmit()" id="apf-submit"
          style="flex:1;padding:12px;border-radius:9px;border:none;background:#f5c842;color:#000;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:1.5px;cursor:pointer">
          CONFIRM PICK
        </button>
        <button onclick="document.getElementById('admin-pick-modal').remove()"
          style="padding:12px 16px;border-radius:9px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#6b7280;cursor:pointer;font-size:14px">
          Cancel
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  // Close on outside tap
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function adminPickUpdateTeams() {
  const mid = parseInt(document.getElementById('apf-match').value);
  const m = MATCHES.find(x => x.id === mid);
  const container = document.getElementById('apf-teams');
  if (!m) { container.innerHTML = '<div style="color:#6b7280;font-size:13px">Select a match first</div>'; return; }
  const t1 = TEAMS[m.t1], t2 = TEAMS[m.t2];
  container.innerHTML = `
    <button onclick="adminPickSelectTeam('${m.t1}', this)" style="flex:1;padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:#151826;color:#e8eaf0;cursor:pointer;font-size:13px;font-weight:600;transition:all .15s">
      ${t1?.e||''} ${m.t1}
    </button>
    <button onclick="adminPickSelectTeam('${m.t2}', this)" style="flex:1;padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:#151826;color:#e8eaf0;cursor:pointer;font-size:13px;font-weight:600;transition:all .15s">
      ${t2?.e||''} ${m.t2}
    </button>`;
  document.getElementById('apf-team').value = '';
}

function adminPickSelectTeam(team, btn) {
  document.getElementById('apf-team').value = team;
  document.querySelectorAll('#apf-teams button').forEach(b => {
    b.style.background = '#151826';
    b.style.borderColor = 'rgba(255,255,255,0.1)';
    b.style.color = '#e8eaf0';
  });
  btn.style.background = '#f5c842';
  btn.style.borderColor = '#f5c842';
  btn.style.color = '#000';
}

async function adminPickSubmit() {
  const uid  = document.getElementById('apf-uid').value;
  const name = document.getElementById('apf-name').value;
  const mid  = parseInt(document.getElementById('apf-match').value);
  const team = document.getElementById('apf-team').value;

  if (!mid)  { toast('Select a match', 'err'); return; }
  if (!team) { toast('Select a team', 'err'); return; }

  const btn = document.getElementById('apf-submit');
  btn.textContent = 'SAVING...'; btn.disabled = true;

  // Admin uses upsert — bypasses lock completely
  const { error } = await sb.from('predictions').upsert(
    { user_id: uid, match_id: mid, pick: team, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,match_id' }
  );

  if (error) {
    console.error('adminPickSubmit:', error.message);
    // RLS may block inserting for other users — show helpful message
    if (error.message.includes('row-level security') || error.code === '42501') {
      toast('Run the SQL fix in Supabase first — see admin panel', 'err');
    } else {
      toast('Failed: ' + error.message, 'err');
    }
    btn.textContent = 'CONFIRM PICK'; btn.disabled = false;
    return;
  }

  // Recalc points for that user
  const { data: preds } = await sb.from('predictions').select('match_id,pick').eq('user_id', uid);
  if (preds) {
    let pts = 0, corr = 0;
    preds.forEach(p => {
      const res = allResults[p.match_id];
      if (!res) return;
      const match = MATCHES.find(x => x.id === p.match_id);
      const earned = res === 'NR' ? 0 : p.pick === res ? (match?.pl ? 20 : 10) : 0;
      pts += earned; if (earned > 0) corr++;
    });
    await sb.from('profiles').update({ total_pts: pts, correct: corr, predicted: preds.length }).eq('id', uid);
  }

  document.getElementById('admin-pick-modal').remove();
  await renderAdminUsers();
  toast(`✅ Picked ${team} for Match ${mid} on behalf of ${name}`);
}

// ── Admin: delete a user completely ──────────────────────────
async function adminDeleteUser(uid, name) {
  if (!confirm(`Delete ${name} completely?\nThis removes their account, all predictions and points. Cannot be undone.`)) return;
  if (!confirm(`Last chance — permanently delete ${name}?`)) return;

  // Delete predictions
  await sb.from('predictions').delete().eq('user_id', uid);
  // Delete profile
  await sb.from('profiles').delete().eq('id', uid);
  // Delete auth user via Supabase admin API (requires service role — soft delete via profile only)
  // Note: full auth deletion needs service role key, so we just remove profile + predictions
  // The user won't be able to log in meaningfully without a profile

  // Remove from local cache
  const idx = allPlayers.findIndex(p => p.uid === uid);
  if (idx >= 0) allPlayers.splice(idx, 1);

  await renderAdminUsers();
  toast(`${name} deleted`, 'warn');
}

async function sendBroadcast(){
  const msg=document.getElementById('broadcast-msg').value.trim();
  if(!msg){toast('Enter a message first','err');return;}
  await sb.from('broadcast').update({message:msg,set_at:new Date().toISOString()}).eq('id',1);
  showBroadcast(msg);toast('📢 Broadcast sent!');
}
async function clearBroadcast(){
  await sb.from('broadcast').update({message:null}).eq('id',1);
  document.getElementById('broadcast-banner').classList.add('hidden');
  toast('Banner cleared');
}
function showBroadcast(msg){
  document.getElementById('broadcast-text').textContent='📢 '+msg;
  document.getElementById('broadcast-banner').classList.remove('hidden');
}
function dismissBanner(){document.getElementById('broadcast-banner').classList.add('hidden');}

async function adminResetAllResults(){
  if(!confirm('⚠ Clear ALL results? All points reset to 0.')) return;
  await sb.from('results').delete().neq('match_id',0);
  allResults={};
  await recalcAllPlayerPoints();
  renderAdminResults();renderMatches();updateHero();
  toast('All results cleared','warn');
}
async function adminResetAllPredictions(){
  if(!confirm('⚠ Clear ALL predictions for ALL players?')) return;
  await sb.from('predictions').delete().neq('id','00000000-0000-0000-0000-000000000000');
  await sb.from('profiles').update({total_pts:0,correct:0,predicted:0}).neq('id','00000000-0000-0000-0000-000000000000');
  myPredictions={};
  renderMatches();updateHero();toast('All predictions cleared','warn');
}
async function adminResetSeason(){
  if(!confirm('⚠⚠ FULL SEASON RESET?')||!confirm('Last chance — cannot undo!')) return;
  await adminResetAllResults();
  await adminResetAllPredictions();
  toast('🔄 Full season reset','warn');
}

// ── Auth ──────────────────────────────────────────────────────
function switchAuthTab(tab){
  ['login','signup'].forEach(t=>{
    document.getElementById('tab-'+t).classList.toggle('on',t===tab);
    document.getElementById('form-'+t).classList.toggle('hidden',t!==tab);
  });
}

async function doLogin(){
  const email=document.getElementById('login-email').value.trim();
  const pass=document.getElementById('login-password').value;
  const errEl=document.getElementById('login-err');
  errEl.textContent='';
  if(!email||!pass){errEl.textContent='Fill in all fields.';return;}
  setAuthLoading('login',true);
  const{data,error}=await sb.auth.signInWithPassword({email,password:pass});
  setAuthLoading('login',false);
  if(error){errEl.textContent=error.message;return;}
  await onLogin(data.user);
}

async function doSignup(){
  const name=document.getElementById('signup-name').value.trim();
  const email=document.getElementById('signup-email').value.trim();
  const pass=document.getElementById('signup-password').value;
  const errEl=document.getElementById('signup-err');
  errEl.textContent='';errEl.style.color='var(--red)';
  if(!name||!email||!pass){errEl.textContent='Fill in all fields.';return;}
  if(name.length<2){errEl.textContent='Name must be 2+ chars.';return;}
  if(pass.length<6){errEl.textContent='Password must be 6+ chars.';return;}
  setAuthLoading('signup',true);
  const{data,error}=await sb.auth.signUp({email,password:pass,options:{data:{display_name:name}}});
  setAuthLoading('signup',false);
  if(error){errEl.textContent=error.message;return;}
  if(data.user&&!data.session){
    errEl.style.color='var(--green)';
    errEl.textContent='✅ Check your email to confirm, then sign in!';
  } else if(data.user) await onLogin(data.user);
}

async function doGoogleAuth(){
  await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.href}});
}

async function doLogout(){
  stopClock();
  await sb.auth.signOut();
  myPredictions={};currentUser=null;isAdmin=false;
  showScreen('auth');toast('Signed out 👋');
}

function setAuthLoading(form,on){
  document.getElementById(`${form}-btn-txt`).textContent=on?(form==='login'?'Signing in…':'Creating…'):(form==='login'?'Sign In':'Create Account');
  document.getElementById(`${form}-spinner`).classList.toggle('hidden',!on);
  document.querySelector(`#form-${form} .auth-btn`).disabled=on;
}

// ── Nav ───────────────────────────────────────────────────────
function go(id,btn){
  if(!isAdmin&&id==='admin') return;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ntab').forEach(t=>t.classList.remove('on'));
  document.getElementById('page-'+id).classList.add('on');
  if(btn) btn.classList.add('on');
  if(id==='leaderboard') renderLeaderboard();
  if(id==='stats')       renderStats();
  if(id==='admin')       renderAdmin();
  document.getElementById('user-dropdown')?.classList.add('hidden');
}
function setFilter(f,btn){
  activeFilt=f;
  document.querySelectorAll('#page-predict .fbtn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');renderMatches();
}
function switchAdminTab(tab,btn){
  document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('on'));
  document.querySelectorAll('.admin-stab').forEach(b=>b.classList.remove('on'));
  document.getElementById('admin-'+tab).classList.add('on');
  btn.classList.add('on');
  if(tab==='manage')  renderAdminUsers();
  if(tab==='matches') renderAdminMatchStatus();
}
function toggleUserMenu(){document.getElementById('user-dropdown').classList.toggle('hidden');}
document.addEventListener('click',e=>{if(!e.target.closest('.hdr-right'))document.getElementById('user-dropdown')?.classList.add('hidden');});
function showScreen(which){
  document.getElementById('auth-screen').classList.toggle('hidden',which!=='auth');
  document.getElementById('app-screen').classList.toggle('hidden',which!=='app');
}

// ── Toast ─────────────────────────────────────────────────────
function strToColor(s){
  let h=0;for(let i=0;i<s.length;i++)h=s.charCodeAt(i)+((h<<5)-h);
  return['#ffc107','#ff5733','#4da6ff','#b44dff','#25d366','#4dffaa','#ff7a33','#4dcccc'][Math.abs(h)%8];
}
function toast(msg,type=''){
  const t=document.getElementById('toast');
  t.textContent=msg;t.className='toast show'+(type?' '+type:'');
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),3500);
}
