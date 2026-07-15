let activeLeague = 'NFL';
let TEAMS = {};
let MATCHES = [];
let REAL_MATCHES = [];

function rng(a,b){const r=[];for(let i=a;i<=b;i++)r.push(i);return r;}

function isoOffset(dateStr, hour, min, offset) {
  const d = new Date(`${dateStr}T${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}:00${offset}`);
  return d.toISOString();
}
function isoIST(d,h,m) { return isoOffset(d,h,m,'+05:30'); }
function isoET(d,h,m,dst=true)  { return isoOffset(d,h,m,dst?'-04:00':'-05:00'); }

// ── IPL teams (shared between current + archive) ──────────────
const IPL_TEAMS = {
  RCB:  { n:'Royal Challengers Bengaluru', e:'🔴' },
  CSK:  { n:'Chennai Super Kings',          e:'🦁' },
  MI:   { n:'Mumbai Indians',               e:'💙' },
  KKR:  { n:'Kolkata Knight Riders',        e:'🟣' },
  SRH:  { n:'Sunrisers Hyderabad',          e:'🌅' },
  DC:   { n:'Delhi Capitals',               e:'🔵' },
  RR:   { n:'Rajasthan Royals',             e:'👑' },
  LSG:  { n:'Lucknow Super Giants',         e:'🦊' },
  GT:   { n:'Gujarat Titans',               e:'⚡' },
  PBKS: { n:'Punjab Kings',                 e:'🏴' },
};

// ── NFL teams ─────────────────────────────────────────────────
const NFL_TEAMS = {
  ARI:{ n:'Arizona Cardinals',      e:'🔴' },
  ATL:{ n:'Atlanta Falcons',        e:'🦅' },
  BAL:{ n:'Baltimore Ravens',       e:'🟣' },
  BUF:{ n:'Buffalo Bills',          e:'🦬' },
  CAR:{ n:'Carolina Panthers',      e:'🐾' },
  CHI:{ n:'Chicago Bears',          e:'🐻' },
  CIN:{ n:'Cincinnati Bengals',     e:'🐯' },
  CLE:{ n:'Cleveland Browns',       e:'🟠' },
  DAL:{ n:'Dallas Cowboys',         e:'⭐' },
  DEN:{ n:'Denver Broncos',         e:'🐴' },
  DET:{ n:'Detroit Lions',          e:'🦁' },
  GB: { n:'Green Bay Packers',      e:'🧀' },
  HOU:{ n:'Houston Texans',         e:'🤠' },
  IND:{ n:'Indianapolis Colts',     e:'🐎' },
  JAX:{ n:'Jacksonville Jaguars',   e:'🐆' },
  KC: { n:'Kansas City Chiefs',     e:'👑' },
  LAC:{ n:'LA Chargers',            e:'💛' },
  LAR:{ n:'LA Rams',                e:'🐏' },
  LV: { n:'Las Vegas Raiders',      e:'☠️' },
  MIA:{ n:'Miami Dolphins',         e:'🐬' },
  MIN:{ n:'Minnesota Vikings',      e:'🪓' },
  NE: { n:'New England Patriots',   e:'⚓' },
  NO: { n:'New Orleans Saints',     e:'⚜️' },
  NYG:{ n:'New York Giants',        e:'🗽' },
  NYJ:{ n:'New York Jets',          e:'✈️' },
  PHI:{ n:'Philadelphia Eagles',    e:'🦅' },
  PIT:{ n:'Pittsburgh Steelers',    e:'⚙️' },
  SF: { n:'San Francisco 49ers',    e:'🌉' },
  SEA:{ n:'Seattle Seahawks',       e:'🌊' },
  TB: { n:'Tampa Bay Buccaneers',   e:'🏴‍☠️' },
  TEN:{ n:'Tennessee Titans',       e:'⚡' },
  WAS:{ n:'Washington Commanders',  e:'🏛️' },
};

// ── IPL 2026 matches ──────────────────────────────────────────
const IPL_2026_MATCHES = [
  {id:1,  t1:'RCB', t2:'SRH', date:'28 Mar', tossTime:isoIST('2026-03-28',19,30), venue:'Bengaluru',      pl:false},
  {id:2,  t1:'MI',  t2:'KKR', date:'29 Mar', tossTime:isoIST('2026-03-29',19,30), venue:'Mumbai',         pl:false},
  {id:3,  t1:'RR',  t2:'CSK', date:'30 Mar', tossTime:isoIST('2026-03-30',19,30), venue:'Guwahati',       pl:false},
  {id:4,  t1:'PBKS',t2:'GT',  date:'31 Mar', tossTime:isoIST('2026-03-31',19,30), venue:'New Chandigarh', pl:false},
  {id:5,  t1:'LSG', t2:'DC',  date:'01 Apr', tossTime:isoIST('2026-04-01',19,30), venue:'Lucknow',        pl:false},
  {id:6,  t1:'KKR', t2:'SRH', date:'02 Apr', tossTime:isoIST('2026-04-02',19,30), venue:'Kolkata',        pl:false},
  {id:7,  t1:'CSK', t2:'PBKS',date:'03 Apr', tossTime:isoIST('2026-04-03',19,30), venue:'Chennai',        pl:false},
  {id:8,  t1:'DC',  t2:'MI',  date:'04 Apr', tossTime:isoIST('2026-04-04',15,30), venue:'Delhi',          pl:false},
  {id:9,  t1:'GT',  t2:'RR',  date:'04 Apr', tossTime:isoIST('2026-04-04',19,30), venue:'Ahmedabad',      pl:false},
  {id:10, t1:'SRH', t2:'LSG', date:'05 Apr', tossTime:isoIST('2026-04-05',15,30), venue:'Hyderabad',      pl:false},
  {id:11, t1:'RCB', t2:'CSK', date:'05 Apr', tossTime:isoIST('2026-04-05',19,30), venue:'Bengaluru',      pl:false},
  {id:12, t1:'KKR', t2:'PBKS',date:'06 Apr', tossTime:isoIST('2026-04-06',19,30), venue:'Kolkata',        pl:false},
  {id:13, t1:'RR',  t2:'MI',  date:'07 Apr', tossTime:isoIST('2026-04-07',19,30), venue:'Guwahati',       pl:false},
  {id:14, t1:'DC',  t2:'GT',  date:'08 Apr', tossTime:isoIST('2026-04-08',19,30), venue:'Delhi',          pl:false},
  {id:15, t1:'KKR', t2:'LSG', date:'09 Apr', tossTime:isoIST('2026-04-09',19,30), venue:'Kolkata',        pl:false},
  {id:16, t1:'RR',  t2:'RCB', date:'10 Apr', tossTime:isoIST('2026-04-10',19,30), venue:'Guwahati',       pl:false},
  {id:17, t1:'PBKS',t2:'SRH', date:'11 Apr', tossTime:isoIST('2026-04-11',15,30), venue:'New Chandigarh', pl:false},
  {id:18, t1:'CSK', t2:'DC',  date:'11 Apr', tossTime:isoIST('2026-04-11',19,30), venue:'Chennai',        pl:false},
  {id:19, t1:'LSG', t2:'GT',  date:'12 Apr', tossTime:isoIST('2026-04-12',15,30), venue:'Lucknow',        pl:false},
  {id:20, t1:'MI',  t2:'RCB', date:'12 Apr', tossTime:isoIST('2026-04-12',19,30), venue:'Mumbai',         pl:false},
  {id:21, t1:'SRH', t2:'RR',  date:'13 Apr', tossTime:isoIST('2026-04-13',19,30), venue:'Hyderabad',      pl:false},
  {id:22, t1:'CSK', t2:'KKR', date:'14 Apr', tossTime:isoIST('2026-04-14',19,30), venue:'Chennai',        pl:false},
  {id:23, t1:'RCB', t2:'LSG', date:'15 Apr', tossTime:isoIST('2026-04-15',19,30), venue:'Bengaluru',      pl:false},
  {id:24, t1:'MI',  t2:'PBKS',date:'16 Apr', tossTime:isoIST('2026-04-16',19,30), venue:'Mumbai',         pl:false},
  {id:25, t1:'GT',  t2:'KKR', date:'17 Apr', tossTime:isoIST('2026-04-17',19,30), venue:'Ahmedabad',      pl:false},
  {id:26, t1:'RCB', t2:'DC',  date:'18 Apr', tossTime:isoIST('2026-04-18',15,30), venue:'Bengaluru',      pl:false},
  {id:27, t1:'SRH', t2:'CSK', date:'18 Apr', tossTime:isoIST('2026-04-18',19,30), venue:'Hyderabad',      pl:false},
  {id:28, t1:'KKR', t2:'RR',  date:'19 Apr', tossTime:isoIST('2026-04-19',15,30), venue:'Kolkata',        pl:false},
  {id:29, t1:'PBKS',t2:'LSG', date:'19 Apr', tossTime:isoIST('2026-04-19',19,30), venue:'New Chandigarh', pl:false},
  {id:30, t1:'GT',  t2:'MI',  date:'20 Apr', tossTime:isoIST('2026-04-20',19,30), venue:'Ahmedabad',      pl:false},
  {id:31, t1:'SRH', t2:'DC',  date:'21 Apr', tossTime:isoIST('2026-04-21',19,30), venue:'Hyderabad',      pl:false},
  {id:32, t1:'LSG', t2:'RR',  date:'22 Apr', tossTime:isoIST('2026-04-22',19,30), venue:'Lucknow',        pl:false},
  {id:33, t1:'MI',  t2:'CSK', date:'23 Apr', tossTime:isoIST('2026-04-23',19,30), venue:'Mumbai',         pl:false},
  {id:34, t1:'RCB', t2:'GT',  date:'24 Apr', tossTime:isoIST('2026-04-24',19,30), venue:'Bengaluru',      pl:false},
  {id:35, t1:'DC',  t2:'PBKS',date:'25 Apr', tossTime:isoIST('2026-04-25',15,30), venue:'Delhi',          pl:false},
  {id:36, t1:'RR',  t2:'SRH', date:'25 Apr', tossTime:isoIST('2026-04-25',19,30), venue:'Jaipur',         pl:false},
  {id:37, t1:'GT',  t2:'CSK', date:'26 Apr', tossTime:isoIST('2026-04-26',15,30), venue:'Ahmedabad',      pl:false},
  {id:38, t1:'LSG', t2:'KKR', date:'26 Apr', tossTime:isoIST('2026-04-26',19,30), venue:'Lucknow',        pl:false},
  {id:39, t1:'DC',  t2:'RCB', date:'27 Apr', tossTime:isoIST('2026-04-27',19,30), venue:'Delhi',          pl:false},
  {id:40, t1:'PBKS',t2:'RR',  date:'28 Apr', tossTime:isoIST('2026-04-28',19,30), venue:'New Chandigarh', pl:false},
  {id:41, t1:'MI',  t2:'SRH', date:'29 Apr', tossTime:isoIST('2026-04-29',19,30), venue:'Mumbai',         pl:false},
  {id:42, t1:'GT',  t2:'RCB', date:'30 Apr', tossTime:isoIST('2026-04-30',19,30), venue:'Ahmedabad',      pl:false},
  {id:43, t1:'RR',  t2:'DC',  date:'01 May', tossTime:isoIST('2026-05-01',19,30), venue:'Jaipur',         pl:false},
  {id:44, t1:'CSK', t2:'MI',  date:'02 May', tossTime:isoIST('2026-05-02',19,30), venue:'Chennai',        pl:false},
  {id:45, t1:'SRH', t2:'KKR', date:'03 May', tossTime:isoIST('2026-05-03',15,30), venue:'Hyderabad',      pl:false},
  {id:46, t1:'GT',  t2:'PBKS',date:'03 May', tossTime:isoIST('2026-05-03',19,30), venue:'Ahmedabad',      pl:false},
  {id:47, t1:'MI',  t2:'LSG', date:'04 May', tossTime:isoIST('2026-05-04',19,30), venue:'Mumbai',         pl:false},
  {id:48, t1:'DC',  t2:'CSK', date:'05 May', tossTime:isoIST('2026-05-05',19,30), venue:'Delhi',          pl:false},
  {id:49, t1:'SRH', t2:'PBKS',date:'06 May', tossTime:isoIST('2026-05-06',19,30), venue:'Hyderabad',      pl:false},
  {id:50, t1:'LSG', t2:'RCB', date:'07 May', tossTime:isoIST('2026-05-07',19,30), venue:'Lucknow',        pl:false},
  {id:51, t1:'DC',  t2:'KKR', date:'08 May', tossTime:isoIST('2026-05-08',19,30), venue:'Delhi',          pl:false},
  {id:52, t1:'RR',  t2:'GT',  date:'09 May', tossTime:isoIST('2026-05-09',19,30), venue:'Jaipur',         pl:false},
  {id:53, t1:'CSK', t2:'LSG', date:'10 May', tossTime:isoIST('2026-05-10',15,30), venue:'Chennai',        pl:false},
  {id:54, t1:'RCB', t2:'MI',  date:'10 May', tossTime:isoIST('2026-05-10',19,30), venue:'Raipur',         pl:false},
  {id:55, t1:'PBKS',t2:'DC',  date:'11 May', tossTime:isoIST('2026-05-11',19,30), venue:'Dharamshala',    pl:false},
  {id:56, t1:'GT',  t2:'SRH', date:'12 May', tossTime:isoIST('2026-05-12',19,30), venue:'Ahmedabad',      pl:false},
  {id:57, t1:'RCB', t2:'KKR', date:'13 May', tossTime:isoIST('2026-05-13',19,30), venue:'Raipur',         pl:false},
  {id:58, t1:'PBKS',t2:'MI',  date:'14 May', tossTime:isoIST('2026-05-14',19,30), venue:'Dharamshala',    pl:false},
  {id:59, t1:'LSG', t2:'CSK', date:'15 May', tossTime:isoIST('2026-05-15',19,30), venue:'Lucknow',        pl:false},
  {id:60, t1:'KKR', t2:'GT',  date:'16 May', tossTime:isoIST('2026-05-16',19,30), venue:'Kolkata',        pl:false},
  {id:61, t1:'PBKS',t2:'RCB', date:'17 May', tossTime:isoIST('2026-05-17',15,30), venue:'Dharamshala',    pl:false},
  {id:62, t1:'DC',  t2:'RR',  date:'17 May', tossTime:isoIST('2026-05-17',19,30), venue:'Delhi',          pl:false},
  {id:63, t1:'CSK', t2:'SRH', date:'18 May', tossTime:isoIST('2026-05-18',19,30), venue:'Chennai',        pl:false},
  {id:64, t1:'RR',  t2:'LSG', date:'19 May', tossTime:isoIST('2026-05-19',19,30), venue:'Jaipur',         pl:false},
  {id:65, t1:'KKR', t2:'MI',  date:'20 May', tossTime:isoIST('2026-05-20',19,30), venue:'Kolkata',        pl:false},
  {id:66, t1:'CSK', t2:'GT',  date:'21 May', tossTime:isoIST('2026-05-21',19,30), venue:'Chennai',        pl:false},
  {id:67, t1:'SRH', t2:'RCB', date:'22 May', tossTime:isoIST('2026-05-22',19,30), venue:'Hyderabad',      pl:false},
  {id:68, t1:'LSG', t2:'PBKS',date:'23 May', tossTime:isoIST('2026-05-23',19,30), venue:'Lucknow',        pl:false},
  {id:69, t1:'MI',  t2:'RR',  date:'24 May', tossTime:isoIST('2026-05-24',15,30), venue:'Mumbai',         pl:false},
  {id:70, t1:'KKR', t2:'DC',  date:'24 May', tossTime:isoIST('2026-05-24',19,30), venue:'Kolkata',        pl:false},
  {id:71, t1:'TBD', t2:'TBD', date:'26 May', tossTime:isoIST('2026-05-26',19,30), venue:'TBD', pl:true, label:'Qualifier 1'},
  {id:72, t1:'TBD', t2:'TBD', date:'27 May', tossTime:isoIST('2026-05-27',19,30), venue:'TBD', pl:true, label:'Eliminator'},
  {id:73, t1:'TBD', t2:'TBD', date:'29 May', tossTime:isoIST('2026-05-29',19,30), venue:'TBD', pl:true, label:'Qualifier 2'},
  {id:74, t1:'TBD', t2:'TBD', date:'31 May', tossTime:isoIST('2026-05-31',19,30), venue:'TBD', pl:true, label:'🏆 FINAL'},
];

// ── NFL 2026 full schedule (all times UTC, DST-aware) ─────────
// Sep–Oct = ET (UTC-4), Nov onwards = EST (UTC-5)
const NFL_2026_MATCHES = [
  // ── WEEK 1 ─────────────────────────────────────────────────
  // Wed Sep 9
  {id:1,  t1:'SEA', t2:'NE',  date:'09 Sep', tossTime:isoET('2026-09-10',0,20),  venue:'Seattle',         pl:false, network:'NBC'},
  // Thu Sep 10
  {id:2,  t1:'LAR', t2:'SF',  date:'10 Sep', tossTime:isoET('2026-09-11',0,35),  venue:'Melbourne',       pl:false, network:'Netflix', label:'Melbourne Game'},
  // Sun Sep 13
  {id:3,  t1:'CAR', t2:'CHI', date:'13 Sep', tossTime:isoET('2026-09-13',13,0),  venue:'Carolina',        pl:false, network:'FOX'},
  {id:4,  t1:'CIN', t2:'TB',  date:'13 Sep', tossTime:isoET('2026-09-13',13,0),  venue:'Cincinnati',      pl:false, network:'FOX'},
  {id:5,  t1:'DET', t2:'NO',  date:'13 Sep', tossTime:isoET('2026-09-13',13,0),  venue:'Detroit',         pl:false, network:'FOX'},
  {id:6,  t1:'HOU', t2:'BUF', date:'13 Sep', tossTime:isoET('2026-09-13',13,0),  venue:'Houston',         pl:false, network:'CBS'},
  {id:7,  t1:'IND', t2:'BAL', date:'13 Sep', tossTime:isoET('2026-09-13',13,0),  venue:'Indianapolis',    pl:false, network:'CBS'},
  {id:8,  t1:'JAX', t2:'CLE', date:'13 Sep', tossTime:isoET('2026-09-13',13,0),  venue:'Jacksonville',    pl:false, network:'CBS'},
  {id:9,  t1:'PIT', t2:'ATL', date:'13 Sep', tossTime:isoET('2026-09-13',13,0),  venue:'Pittsburgh',      pl:false, network:'FOX'},
  {id:10, t1:'TEN', t2:'NYJ', date:'13 Sep', tossTime:isoET('2026-09-13',13,0),  venue:'Tennessee',       pl:false, network:'CBS'},
  {id:11, t1:'LAC', t2:'ARI', date:'13 Sep', tossTime:isoET('2026-09-13',16,25), venue:'Los Angeles',     pl:false, network:'CBS'},
  {id:12, t1:'LV',  t2:'MIA', date:'13 Sep', tossTime:isoET('2026-09-13',16,25), venue:'Las Vegas',       pl:false, network:'FOX'},
  {id:13, t1:'MIN', t2:'GB',  date:'13 Sep', tossTime:isoET('2026-09-13',16,25), venue:'Minnesota',       pl:false, network:'CBS'},
  {id:14, t1:'PHI', t2:'WAS', date:'13 Sep', tossTime:isoET('2026-09-13',16,25), venue:'Philadelphia',    pl:false, network:'FOX'},
  {id:15, t1:'NYG', t2:'DAL', date:'13 Sep', tossTime:isoET('2026-09-13',20,20), venue:'New York',        pl:false, network:'NBC'},
  // Mon Sep 14
  {id:16, t1:'KC',  t2:'DEN', date:'14 Sep', tossTime:isoET('2026-09-14',20,15), venue:'Kansas City',     pl:false, network:'ESPN/ABC'},

  // ── WEEK 2 ─────────────────────────────────────────────────
  // Thu Sep 17
  {id:17, t1:'BUF', t2:'DET', date:'17 Sep', tossTime:isoET('2026-09-17',20,15), venue:'Buffalo',         pl:false, network:'AMZ'},
  // Sun Sep 20
  {id:18, t1:'ATL', t2:'CAR', date:'20 Sep', tossTime:isoET('2026-09-20',13,0),  venue:'Atlanta',         pl:false, network:'FOX'},
  {id:19, t1:'BAL', t2:'NO',  date:'20 Sep', tossTime:isoET('2026-09-20',13,0),  venue:'Baltimore',       pl:false, network:'CBS'},
  {id:20, t1:'CHI', t2:'MIN', date:'20 Sep', tossTime:isoET('2026-09-20',13,0),  venue:'Chicago',         pl:false, network:'FOX'},
  {id:21, t1:'HOU', t2:'CIN', date:'20 Sep', tossTime:isoET('2026-09-20',13,0),  venue:'Houston',         pl:false, network:'CBS'},
  {id:22, t1:'NE',  t2:'PIT', date:'20 Sep', tossTime:isoET('2026-09-20',13,0),  venue:'New England',     pl:false, network:'CBS'},
  {id:23, t1:'NYJ', t2:'GB',  date:'20 Sep', tossTime:isoET('2026-09-20',13,0),  venue:'New York Jets',   pl:false, network:'FOX'},
  {id:24, t1:'TB',  t2:'CLE', date:'20 Sep', tossTime:isoET('2026-09-20',13,0),  venue:'Tampa Bay',       pl:false, network:'CBS'},
  {id:25, t1:'TEN', t2:'PHI', date:'20 Sep', tossTime:isoET('2026-09-20',13,0),  venue:'Tennessee',       pl:false, network:'FOX'},
  {id:26, t1:'DEN', t2:'JAX', date:'20 Sep', tossTime:isoET('2026-09-20',16,5),  venue:'Denver',          pl:false, network:'CBS'},
  {id:27, t1:'LAC', t2:'LV',  date:'20 Sep', tossTime:isoET('2026-09-20',16,5),  venue:'Los Angeles',     pl:false, network:'CBS'},
  {id:28, t1:'ARI', t2:'SEA', date:'20 Sep', tossTime:isoET('2026-09-20',16,25), venue:'Arizona',         pl:false, network:'FOX'},
  {id:29, t1:'DAL', t2:'WAS', date:'20 Sep', tossTime:isoET('2026-09-20',16,25), venue:'Dallas',          pl:false, network:'FOX'},
  {id:30, t1:'SF',  t2:'MIA', date:'20 Sep', tossTime:isoET('2026-09-20',16,25), venue:'San Francisco',   pl:false, network:'FOX'},
  {id:31, t1:'KC',  t2:'IND', date:'20 Sep', tossTime:isoET('2026-09-20',20,20), venue:'Kansas City',     pl:false, network:'NBC'},
  // Mon Sep 21
  {id:32, t1:'LAR', t2:'NYG', date:'21 Sep', tossTime:isoET('2026-09-21',20,15), venue:'Los Angeles',     pl:false, network:'ESPN/ABC'},

  // ── WEEK 3 ─────────────────────────────────────────────────
  // Thu Sep 24
  {id:33, t1:'GB',  t2:'ATL', date:'24 Sep', tossTime:isoET('2026-09-24',20,15), venue:'Green Bay',       pl:false, network:'AMZ'},
  // Sun Sep 27
  {id:34, t1:'BUF', t2:'LAC', date:'27 Sep', tossTime:isoET('2026-09-27',13,0),  venue:'Buffalo',         pl:false, network:'FOX'},
  {id:35, t1:'CLE', t2:'CAR', date:'27 Sep', tossTime:isoET('2026-09-27',13,0),  venue:'Cleveland',       pl:false, network:'FOX'},
  {id:36, t1:'DET', t2:'NYJ', date:'27 Sep', tossTime:isoET('2026-09-27',13,0),  venue:'Detroit',         pl:false, network:'FOX'},
  {id:37, t1:'IND', t2:'HOU', date:'27 Sep', tossTime:isoET('2026-09-27',13,0),  venue:'Indianapolis',    pl:false, network:'CBS'},
  {id:38, t1:'JAX', t2:'NE',  date:'27 Sep', tossTime:isoET('2026-09-27',13,0),  venue:'Jacksonville',    pl:false, network:'CBS'},
  {id:39, t1:'MIA', t2:'KC',  date:'27 Sep', tossTime:isoET('2026-09-27',13,0),  venue:'Miami',           pl:false, network:'CBS'},
  {id:40, t1:'NYG', t2:'TEN', date:'27 Sep', tossTime:isoET('2026-09-27',13,0),  venue:'New York',        pl:false, network:'CBS'},
  {id:41, t1:'PIT', t2:'CIN', date:'27 Sep', tossTime:isoET('2026-09-27',13,0),  venue:'Pittsburgh',      pl:false, network:'CBS'},
  {id:42, t1:'WAS', t2:'SEA', date:'27 Sep', tossTime:isoET('2026-09-27',13,0),  venue:'Washington',      pl:false, network:'FOX'},
  {id:43, t1:'SF',  t2:'ARI', date:'27 Sep', tossTime:isoET('2026-09-27',16,5),  venue:'San Francisco',   pl:false, network:'FOX'},
  {id:44, t1:'TB',  t2:'MIN', date:'27 Sep', tossTime:isoET('2026-09-27',16,5),  venue:'Tampa Bay',       pl:false, network:'FOX'},
  {id:45, t1:'DAL', t2:'BAL', date:'27 Sep', tossTime:isoET('2026-09-27',16,25), venue:'Rio de Janeiro',  pl:false, network:'CBS', label:'International Game'},
  {id:46, t1:'NO',  t2:'LV',  date:'27 Sep', tossTime:isoET('2026-09-27',16,25), venue:'New Orleans',     pl:false, network:'CBS'},
  {id:47, t1:'DEN', t2:'LAR', date:'27 Sep', tossTime:isoET('2026-09-27',20,20), venue:'Denver',          pl:false, network:'NBC'},
  // Mon Sep 28
  {id:48, t1:'CHI', t2:'PHI', date:'28 Sep', tossTime:isoET('2026-09-28',20,15), venue:'Chicago',         pl:false, network:'ESPN/ABC'},

  // ── WEEK 4 ─────────────────────────────────────────────────
  // Thu Oct 1
  {id:49, t1:'CLE', t2:'PIT', date:'01 Oct', tossTime:isoET('2026-10-01',20,15), venue:'Cleveland',       pl:false, network:'AMZ'},
  // Sun Oct 4 — International (Tottenham)
  {id:50, t1:'WAS', t2:'IND', date:'04 Oct', tossTime:isoET('2026-10-04',9,30),  venue:'London (Tottenham)', pl:false, network:'NFLN', label:'International Game'},
  // Sun Oct 4
  {id:51, t1:'BAL', t2:'TEN', date:'04 Oct', tossTime:isoET('2026-10-04',13,0),  venue:'Baltimore',       pl:false, network:'CBS'},
  {id:52, t1:'BUF', t2:'NE',  date:'04 Oct', tossTime:isoET('2026-10-04',13,0),  venue:'Buffalo',         pl:false, network:'CBS'},
  {id:53, t1:'CHI', t2:'NYJ', date:'04 Oct', tossTime:isoET('2026-10-04',13,0),  venue:'Chicago',         pl:false, network:'FOX'},
  {id:54, t1:'CIN', t2:'JAX', date:'04 Oct', tossTime:isoET('2026-10-04',13,0),  venue:'Cincinnati',      pl:false, network:'CBS'},
  {id:55, t1:'HOU', t2:'DAL', date:'04 Oct', tossTime:isoET('2026-10-04',13,0),  venue:'Houston',         pl:false, network:'FOX'},
  {id:56, t1:'NYG', t2:'ARI', date:'04 Oct', tossTime:isoET('2026-10-04',13,0),  venue:'New York',        pl:false, network:'CBS'},
  {id:57, t1:'PHI', t2:'LAR', date:'04 Oct', tossTime:isoET('2026-10-04',13,0),  venue:'Philadelphia',    pl:false, network:'FOX'},
  {id:58, t1:'TB',  t2:'GB',  date:'04 Oct', tossTime:isoET('2026-10-04',13,0),  venue:'Tampa Bay',       pl:false, network:'FOX'},
  {id:59, t1:'MIN', t2:'MIA', date:'04 Oct', tossTime:isoET('2026-10-04',16,5),  venue:'Minnesota',       pl:false, network:'FOX'},
  {id:60, t1:'LV',  t2:'KC',  date:'04 Oct', tossTime:isoET('2026-10-04',16,25), venue:'Las Vegas',       pl:false, network:'CBS'},
  {id:61, t1:'SEA', t2:'LAC', date:'04 Oct', tossTime:isoET('2026-10-04',16,25), venue:'Seattle',         pl:false, network:'CBS'},
  {id:62, t1:'SF',  t2:'DEN', date:'04 Oct', tossTime:isoET('2026-10-04',16,25), venue:'San Francisco',   pl:false, network:'CBS'},
  {id:63, t1:'CAR', t2:'DET', date:'04 Oct', tossTime:isoET('2026-10-04',20,20), venue:'Carolina',        pl:false, network:'NBC'},
  // Mon Oct 5
  {id:64, t1:'NO',  t2:'ATL', date:'05 Oct', tossTime:isoET('2026-10-05',20,15), venue:'New Orleans',     pl:false, network:'ESPN'},

  // ── WEEK 5 ─────────────────────────────────────────────────
  // Thu Oct 8
  {id:65, t1:'DAL', t2:'TB',  date:'08 Oct', tossTime:isoET('2026-10-08',20,15), venue:'Dallas',          pl:false, network:'AMZ'},
  // Sun Oct 11 — International (Tottenham)
  {id:66, t1:'JAX', t2:'PHI', date:'11 Oct', tossTime:isoET('2026-10-11',9,30),  venue:'London (Tottenham)', pl:false, network:'NFLN', label:'International Game'},
  // Sun Oct 11
  {id:67, t1:'MIA', t2:'CIN', date:'11 Oct', tossTime:isoET('2026-10-11',13,0),  venue:'Miami',           pl:false, network:'FOX'},
  {id:68, t1:'NE',  t2:'LV',  date:'11 Oct', tossTime:isoET('2026-10-11',13,0),  venue:'New England',     pl:false, network:'CBS'},
  {id:69, t1:'NO',  t2:'MIN', date:'11 Oct', tossTime:isoET('2026-10-11',13,0),  venue:'New Orleans',     pl:false, network:'FOX'},
  {id:70, t1:'NYJ', t2:'CLE', date:'11 Oct', tossTime:isoET('2026-10-11',13,0),  venue:'New York Jets',   pl:false, network:'CBS'},
  {id:71, t1:'PIT', t2:'IND', date:'11 Oct', tossTime:isoET('2026-10-11',13,0),  venue:'Pittsburgh',      pl:false, network:'CBS'},
  {id:72, t1:'TEN', t2:'HOU', date:'11 Oct', tossTime:isoET('2026-10-11',13,0),  venue:'Tennessee',       pl:false, network:'CBS'},
  {id:73, t1:'WAS', t2:'NYG', date:'11 Oct', tossTime:isoET('2026-10-11',13,0),  venue:'Washington',      pl:false, network:'FOX'},
  {id:74, t1:'LAC', t2:'DEN', date:'11 Oct', tossTime:isoET('2026-10-11',16,5),  venue:'Los Angeles',     pl:false, network:'CBS'},
  {id:75, t1:'ARI', t2:'DET', date:'11 Oct', tossTime:isoET('2026-10-11',16,25), venue:'Arizona',         pl:false, network:'FOX'},
  {id:76, t1:'GB',  t2:'CHI', date:'11 Oct', tossTime:isoET('2026-10-11',16,25), venue:'Green Bay',       pl:false, network:'FOX'},
  {id:77, t1:'SEA', t2:'SF',  date:'11 Oct', tossTime:isoET('2026-10-11',16,25), venue:'Seattle',         pl:false, network:'FOX'},
  {id:78, t1:'ATL', t2:'BAL', date:'11 Oct', tossTime:isoET('2026-10-11',20,20), venue:'Atlanta',         pl:false, network:'NBC'},
  // Mon Oct 12
  {id:79, t1:'LAR', t2:'BUF', date:'12 Oct', tossTime:isoET('2026-10-12',20,15), venue:'Los Angeles',     pl:false, network:'ESPN/ABC'},

  // ── WEEK 6 ─────────────────────────────────────────────────
  // Thu Oct 15
  {id:80, t1:'DEN', t2:'SEA', date:'15 Oct', tossTime:isoET('2026-10-15',20,15), venue:'Denver',          pl:false, network:'AMZ'},
  // Sun Oct 18 — International (Wembley)
  {id:81, t1:'JAX', t2:'HOU', date:'18 Oct', tossTime:isoET('2026-10-18',9,30),  venue:'London (Wembley)',pl:false, network:'NFLN', label:'International Game'},
  // Sun Oct 18
  {id:82, t1:'ATL', t2:'CHI', date:'18 Oct', tossTime:isoET('2026-10-18',13,0),  venue:'Atlanta',         pl:false, network:'FOX'},
  {id:83, t1:'CLE', t2:'BAL', date:'18 Oct', tossTime:isoET('2026-10-18',13,0),  venue:'Cleveland',       pl:false, network:'FOX'},
  {id:84, t1:'IND', t2:'TEN', date:'18 Oct', tossTime:isoET('2026-10-18',13,0),  venue:'Indianapolis',    pl:false, network:'FOX'},
  {id:85, t1:'NE',  t2:'NYJ', date:'18 Oct', tossTime:isoET('2026-10-18',13,0),  venue:'New England',     pl:false, network:'CBS'},
  {id:86, t1:'NYG', t2:'NO',  date:'18 Oct', tossTime:isoET('2026-10-18',13,0),  venue:'New York',        pl:false, network:'FOX'},
  {id:87, t1:'PHI', t2:'CAR', date:'18 Oct', tossTime:isoET('2026-10-18',13,0),  venue:'Philadelphia',    pl:false, network:'CBS'},
  {id:88, t1:'TB',  t2:'PIT', date:'18 Oct', tossTime:isoET('2026-10-18',13,0),  venue:'Tampa Bay',       pl:false, network:'CBS'},
  {id:89, t1:'LAR', t2:'ARI', date:'18 Oct', tossTime:isoET('2026-10-18',16,5),  venue:'Los Angeles',     pl:false, network:'FOX'},
  {id:90, t1:'KC',  t2:'LAC', date:'18 Oct', tossTime:isoET('2026-10-18',16,25), venue:'Kansas City',     pl:false, network:'CBS'},
  {id:91, t1:'LV',  t2:'BUF', date:'18 Oct', tossTime:isoET('2026-10-18',16,25), venue:'Las Vegas',       pl:false, network:'CBS'},
  {id:92, t1:'GB',  t2:'DAL', date:'18 Oct', tossTime:isoET('2026-10-18',20,20), venue:'Green Bay',       pl:false, network:'NBC'},
  // Mon Oct 19
  {id:93, t1:'SF',  t2:'WAS', date:'19 Oct', tossTime:isoET('2026-10-19',20,15), venue:'San Francisco',   pl:false, network:'ESPN/ABC'},

  // ── WEEK 7 ─────────────────────────────────────────────────
  // Thu Oct 22
  {id:94, t1:'CHI', t2:'NE',  date:'22 Oct', tossTime:isoET('2026-10-22',20,15), venue:'Chicago',         pl:false, network:'AMZ'},
  // Sun Oct 25 — International (Paris)
  {id:95, t1:'NO',  t2:'PIT', date:'25 Oct', tossTime:isoET('2026-10-25',9,30),  venue:'Paris',           pl:false, network:'NFLN', label:'International Game'},
  // Sun Oct 25
  {id:96, t1:'ATL', t2:'SF',  date:'25 Oct', tossTime:isoET('2026-10-25',13,0),  venue:'Atlanta',         pl:false, network:'FOX'},
  {id:97, t1:'BAL', t2:'CIN', date:'25 Oct', tossTime:isoET('2026-10-25',13,0),  venue:'Baltimore',       pl:false, network:'CBS'},
  {id:98, t1:'CAR', t2:'TB',  date:'25 Oct', tossTime:isoET('2026-10-25',13,0),  venue:'Carolina',        pl:false, network:'FOX'},
  {id:99, t1:'HOU', t2:'NYG', date:'25 Oct', tossTime:isoET('2026-10-25',13,0),  venue:'Houston',         pl:false, network:'FOX'},
  {id:100,t1:'MIN', t2:'IND', date:'25 Oct', tossTime:isoET('2026-10-25',13,0),  venue:'Minnesota',       pl:false, network:'CBS'},
  {id:101,t1:'NYJ', t2:'MIA', date:'25 Oct', tossTime:isoET('2026-10-25',13,0),  venue:'New York Jets',   pl:false, network:'CBS'},
  {id:102,t1:'TEN', t2:'CLE', date:'25 Oct', tossTime:isoET('2026-10-25',13,0),  venue:'Tennessee',       pl:false, network:'CBS'},
  {id:103,t1:'ARI', t2:'DEN', date:'25 Oct', tossTime:isoET('2026-10-25',16,5),  venue:'Arizona',         pl:false, network:'CBS'},
  {id:104,t1:'DET', t2:'GB',  date:'25 Oct', tossTime:isoET('2026-10-25',16,25), venue:'Detroit',         pl:false, network:'FOX'},
  {id:105,t1:'LV',  t2:'LAR', date:'25 Oct', tossTime:isoET('2026-10-25',16,25), venue:'Las Vegas',       pl:false, network:'FOX'},
  {id:106,t1:'SEA', t2:'KC',  date:'25 Oct', tossTime:isoET('2026-10-25',20,20), venue:'Seattle',         pl:false, network:'NBC'},
  // Mon Oct 26
  {id:107,t1:'PHI', t2:'DAL', date:'26 Oct', tossTime:isoET('2026-10-26',20,15), venue:'Philadelphia',    pl:false, network:'ESPN/ABC'},

  // ── WEEK 8 ─────────────────────────────────────────────────
  // Thu Oct 29
  {id:108,t1:'GB',  t2:'CAR', date:'29 Oct', tossTime:isoET('2026-10-29',20,15), venue:'Green Bay',       pl:false, network:'AMZ'},
  // Sun Nov 1
  {id:109,t1:'BUF', t2:'BAL', date:'01 Nov', tossTime:isoET('2026-11-01',13,0),  venue:'Buffalo',         pl:false, network:'CBS'},
  {id:110,t1:'CIN', t2:'TEN', date:'01 Nov', tossTime:isoET('2026-11-01',13,0),  venue:'Cincinnati',      pl:false, network:'CBS'},
  {id:111,t1:'DAL', t2:'ARI', date:'01 Nov', tossTime:isoET('2026-11-01',13,0),  venue:'Dallas',          pl:false, network:'FOX'},
  {id:112,t1:'DET', t2:'MIN', date:'01 Nov', tossTime:isoET('2026-11-01',13,0),  venue:'Detroit',         pl:false, network:'FOX'},
  {id:113,t1:'JAX', t2:'IND', date:'01 Nov', tossTime:isoET('2026-11-01',13,0),  venue:'Jacksonville',    pl:false, network:'CBS'},
  {id:114,t1:'NYJ', t2:'LV',  date:'01 Nov', tossTime:isoET('2026-11-01',13,0),  venue:'New York Jets',   pl:false, network:'FOX'},
  {id:115,t1:'PIT', t2:'CLE', date:'01 Nov', tossTime:isoET('2026-11-01',13,0),  venue:'Pittsburgh',      pl:false, network:'CBS'},
  {id:116,t1:'TB',  t2:'ATL', date:'01 Nov', tossTime:isoET('2026-11-01',13,0),  venue:'Tampa Bay',       pl:false, network:'FOX'},
  {id:117,t1:'LAR', t2:'LAC', date:'01 Nov', tossTime:isoET('2026-11-01',16,5),  venue:'Los Angeles',     pl:false, network:'FOX'},
  {id:118,t1:'DEN', t2:'KC',  date:'01 Nov', tossTime:isoET('2026-11-01',16,25), venue:'Denver',          pl:false, network:'CBS'},
  {id:119,t1:'MIA', t2:'NE',  date:'01 Nov', tossTime:isoET('2026-11-01',16,25), venue:'Miami',           pl:false, network:'CBS'},
  {id:120,t1:'WAS', t2:'PHI', date:'01 Nov', tossTime:isoET('2026-11-01',20,20), venue:'Washington',      pl:false, network:'NBC'},
  // Mon Nov 2
  {id:121,t1:'SEA', t2:'CHI', date:'02 Nov', tossTime:isoET('2026-11-02',20,15), venue:'Seattle',         pl:false, network:'ESPN'},

  // ── WEEK 9 (clocks back — EST UTC-5) ────────────────────────
  // Thu Nov 5
  {id:122,t1:'BAL', t2:'JAX', date:'05 Nov', tossTime:isoET('2026-11-05',20,15,false), venue:'Baltimore',  pl:false, network:'AMZ'},
  // Sun Nov 8 — International (Madrid)
  {id:123,t1:'ATL', t2:'CIN', date:'08 Nov', tossTime:isoET('2026-11-08',9,30,false),  venue:'Madrid',     pl:false, network:'NFLN', label:'International Game'},
  // Sun Nov 8
  {id:124,t1:'CAR', t2:'DEN', date:'08 Nov', tossTime:isoET('2026-11-08',13,0,false),  venue:'Carolina',   pl:false, network:'CBS'},
  {id:125,t1:'IND', t2:'DAL', date:'08 Nov', tossTime:isoET('2026-11-08',13,0,false),  venue:'Indianapolis',pl:false, network:'FOX'},
  {id:126,t1:'KC',  t2:'NYJ', date:'08 Nov', tossTime:isoET('2026-11-08',13,0,false),  venue:'Kansas City', pl:false, network:'CBS'},
  {id:127,t1:'MIA', t2:'DET', date:'08 Nov', tossTime:isoET('2026-11-08',13,0,false),  venue:'Miami',       pl:false, network:'FOX'},
  {id:128,t1:'NO',  t2:'CLE', date:'08 Nov', tossTime:isoET('2026-11-08',13,0,false),  venue:'New Orleans', pl:false, network:'CBS'},
  {id:129,t1:'PHI', t2:'NYG', date:'08 Nov', tossTime:isoET('2026-11-08',13,0,false),  venue:'Philadelphia',pl:false, network:'FOX'},
  {id:130,t1:'WAS', t2:'LAR', date:'08 Nov', tossTime:isoET('2026-11-08',13,0,false),  venue:'Washington',  pl:false, network:'FOX'},
  {id:131,t1:'LAC', t2:'HOU', date:'08 Nov', tossTime:isoET('2026-11-08',16,5,false),  venue:'Los Angeles', pl:false, network:'CBS'},
  {id:132,t1:'SF',  t2:'LV',  date:'08 Nov', tossTime:isoET('2026-11-08',16,5,false),  venue:'San Francisco',pl:false, network:'CBS'},
  {id:133,t1:'NE',  t2:'GB',  date:'08 Nov', tossTime:isoET('2026-11-08',16,25,false), venue:'New England', pl:false, network:'FOX'},
  {id:134,t1:'SEA', t2:'ARI', date:'08 Nov', tossTime:isoET('2026-11-08',16,25,false), venue:'Seattle',     pl:false, network:'FOX'},
  {id:135,t1:'CHI', t2:'TB',  date:'08 Nov', tossTime:isoET('2026-11-08',20,20,false), venue:'Chicago',     pl:false, network:'NBC'},
  // Mon Nov 9
  {id:136,t1:'MIN', t2:'BUF', date:'09 Nov', tossTime:isoET('2026-11-09',20,15,false), venue:'Minnesota',   pl:false, network:'ESPN/ABC'},

  // ── WEEK 10 ─────────────────────────────────────────────────
  // Thu Nov 12
  {id:137,t1:'NYG', t2:'WAS', date:'12 Nov', tossTime:isoET('2026-11-12',20,15,false), venue:'New York',    pl:false, network:'AMZ'},
  // Sun Nov 15 — International (Munich)
  {id:138,t1:'DET', t2:'NE',  date:'15 Nov', tossTime:isoET('2026-11-15',9,30,false),  venue:'Munich',      pl:false, network:'FOX', label:'International Game'},
  // Sun Nov 15
  {id:139,t1:'ATL', t2:'KC',  date:'15 Nov', tossTime:isoET('2026-11-15',13,0,false),  venue:'Atlanta',     pl:false, network:'CBS'},
  {id:140,t1:'CLE', t2:'HOU', date:'15 Nov', tossTime:isoET('2026-11-15',13,0,false),  venue:'Cleveland',   pl:false, network:'FOX'},
  {id:141,t1:'GB',  t2:'MIN', date:'15 Nov', tossTime:isoET('2026-11-15',13,0,false),  venue:'Green Bay',   pl:false, network:'FOX'},
  {id:142,t1:'IND', t2:'MIA', date:'15 Nov', tossTime:isoET('2026-11-15',13,0,false),  venue:'Indianapolis',pl:false, network:'CBS'},
  {id:143,t1:'NO',  t2:'CAR', date:'15 Nov', tossTime:isoET('2026-11-15',13,0,false),  venue:'New Orleans', pl:false, network:'FOX'},
  {id:144,t1:'NYJ', t2:'BUF', date:'15 Nov', tossTime:isoET('2026-11-15',13,0,false),  venue:'New York Jets',pl:false, network:'CBS'},
  {id:145,t1:'TEN', t2:'JAX', date:'15 Nov', tossTime:isoET('2026-11-15',13,0,false),  venue:'Tennessee',   pl:false, network:'FOX'},
  {id:146,t1:'ARI', t2:'LAR', date:'15 Nov', tossTime:isoET('2026-11-15',16,5,false),  venue:'Arizona',     pl:false, network:'CBS'},
  {id:147,t1:'LV',  t2:'SEA', date:'15 Nov', tossTime:isoET('2026-11-15',16,5,false),  venue:'Las Vegas',   pl:false, network:'CBS'},
  {id:148,t1:'DAL', t2:'SF',  date:'15 Nov', tossTime:isoET('2026-11-15',16,25,false), venue:'Dallas',      pl:false, network:'FOX'},
  {id:149,t1:'CIN', t2:'PIT', date:'15 Nov', tossTime:isoET('2026-11-15',20,20,false), venue:'Cincinnati',  pl:false, network:'NBC'},
  // Mon Nov 16
  {id:150,t1:'BAL', t2:'LAC', date:'16 Nov', tossTime:isoET('2026-11-16',20,15,false), venue:'Baltimore',   pl:false, network:'ESPN'},

  // ── WEEK 11 ─────────────────────────────────────────────────
  // Thu Nov 19
  {id:151,t1:'HOU', t2:'IND', date:'19 Nov', tossTime:isoET('2026-11-19',20,15,false), venue:'Houston',     pl:false, network:'AMZ'},
  // Sun Nov 22
  {id:152,t1:'BUF', t2:'MIA', date:'22 Nov', tossTime:isoET('2026-11-22',13,0,false),  venue:'Buffalo',     pl:false, network:'FOX'},
  {id:153,t1:'CAR', t2:'BAL', date:'22 Nov', tossTime:isoET('2026-11-22',13,0,false),  venue:'Carolina',    pl:false, network:'FOX'},
  {id:154,t1:'CHI', t2:'NO',  date:'22 Nov', tossTime:isoET('2026-11-22',13,0,false),  venue:'Chicago',     pl:false, network:'FOX'},
  {id:155,t1:'DAL', t2:'TEN', date:'22 Nov', tossTime:isoET('2026-11-22',13,0,false),  venue:'Dallas',      pl:false, network:'FOX'},
  {id:156,t1:'DET', t2:'TB',  date:'22 Nov', tossTime:isoET('2026-11-22',13,0,false),  venue:'Detroit',     pl:false, network:'CBS'},
  {id:157,t1:'KC',  t2:'ARI', date:'22 Nov', tossTime:isoET('2026-11-22',13,0,false),  venue:'Kansas City', pl:false, network:'CBS'},
  {id:158,t1:'NYG', t2:'JAX', date:'22 Nov', tossTime:isoET('2026-11-22',13,0,false),  venue:'New York',    pl:false, network:'CBS'},
  {id:159,t1:'LAC', t2:'NYJ', date:'22 Nov', tossTime:isoET('2026-11-22',16,5,false),  venue:'Los Angeles', pl:false, network:'FOX'},
  {id:160,t1:'DEN', t2:'LV',  date:'22 Nov', tossTime:isoET('2026-11-22',16,25,false), venue:'Denver',      pl:false, network:'CBS'},
  {id:161,t1:'PHI', t2:'PIT', date:'22 Nov', tossTime:isoET('2026-11-22',16,25,false), venue:'Philadelphia',pl:false, network:'CBS'},
  {id:162,t1:'SF',  t2:'MIN', date:'22 Nov', tossTime:isoET('2026-11-22',20,20,false), venue:'Mexico City', pl:false, network:'NBC', label:'Mexico City Game'},
  // Mon Nov 23
  {id:163,t1:'WAS', t2:'CIN', date:'23 Nov', tossTime:isoET('2026-11-23',20,15,false), venue:'Washington',  pl:false, network:'ESPN'},

  // ── WEEK 12 ─────────────────────────────────────────────────
  // Wed Nov 25
  {id:164,t1:'LAR', t2:'GB',  date:'25 Nov', tossTime:isoET('2026-11-25',20,0,false),  venue:'Los Angeles', pl:false, network:'Netflix'},
  // Thu Nov 26 — Thanksgiving
  {id:165,t1:'DET', t2:'CHI', date:'26 Nov', tossTime:isoET('2026-11-26',13,0,false),  venue:'Detroit',     pl:false, network:'CBS',  label:'Thanksgiving Game 1'},
  {id:166,t1:'DAL', t2:'PHI', date:'26 Nov', tossTime:isoET('2026-11-26',16,30,false), venue:'Dallas',      pl:false, network:'FOX',  label:'Thanksgiving Game 2'},
  {id:167,t1:'BUF', t2:'KC',  date:'26 Nov', tossTime:isoET('2026-11-26',20,20,false), venue:'Buffalo',     pl:false, network:'NBC',  label:'Thanksgiving Night'},
  // Fri Nov 27
  {id:168,t1:'PIT', t2:'DEN', date:'27 Nov', tossTime:isoET('2026-11-27',15,0,false),  venue:'Pittsburgh',  pl:false, network:'AMZ'},
  // Sun Nov 29
  {id:169,t1:'CIN', t2:'NO',  date:'29 Nov', tossTime:isoET('2026-11-29',13,0,false),  venue:'Cincinnati',  pl:false, network:'CBS'},
  {id:170,t1:'CLE', t2:'LV',  date:'29 Nov', tossTime:isoET('2026-11-29',13,0,false),  venue:'Cleveland',   pl:false, network:'FOX'},
  {id:171,t1:'HOU', t2:'BAL', date:'29 Nov', tossTime:isoET('2026-11-29',13,0,false),  venue:'Houston',     pl:false, network:'CBS'},
  {id:172,t1:'IND', t2:'NYG', date:'29 Nov', tossTime:isoET('2026-11-29',13,0,false),  venue:'Indianapolis',pl:false, network:'FOX'},
  {id:173,t1:'MIA', t2:'NYJ', date:'29 Nov', tossTime:isoET('2026-11-29',13,0,false),  venue:'Miami',       pl:false, network:'CBS'},
  {id:174,t1:'MIN', t2:'ATL', date:'29 Nov', tossTime:isoET('2026-11-29',13,0,false),  venue:'Minnesota',   pl:false, network:'FOX'},
  {id:175,t1:'JAX', t2:'TEN', date:'29 Nov', tossTime:isoET('2026-11-29',16,5,false),  venue:'Jacksonville',pl:false, network:'CBS'},
  {id:176,t1:'ARI', t2:'WAS', date:'29 Nov', tossTime:isoET('2026-11-29',16,25,false), venue:'Arizona',     pl:false, network:'FOX'},
  {id:177,t1:'SF',  t2:'SEA', date:'29 Nov', tossTime:isoET('2026-11-29',16,25,false), venue:'San Francisco',pl:false, network:'FOX'},
  {id:178,t1:'LAC', t2:'NE',  date:'29 Nov', tossTime:isoET('2026-11-29',20,20,false), venue:'Los Angeles', pl:false, network:'NBC'},
  // Mon Nov 30
  {id:179,t1:'TB',  t2:'CAR', date:'30 Nov', tossTime:isoET('2026-11-30',20,15,false), venue:'Tampa Bay',   pl:false, network:'ESPN'},

  // ── WEEK 13 ─────────────────────────────────────────────────
  // Thu Dec 3
  {id:180,t1:'LAR', t2:'KC',  date:'03 Dec', tossTime:isoET('2026-12-03',20,15,false), venue:'Los Angeles', pl:false, network:'AMZ'},
  // Sun Dec 6
  {id:181,t1:'ATL', t2:'DET', date:'06 Dec', tossTime:isoET('2026-12-06',13,0,false),  venue:'Atlanta',     pl:false, network:'CBS'},
  {id:182,t1:'CHI', t2:'JAX', date:'06 Dec', tossTime:isoET('2026-12-06',13,0,false),  venue:'Chicago',     pl:false, network:'FOX'},
  {id:183,t1:'CLE', t2:'CIN', date:'06 Dec', tossTime:isoET('2026-12-06',13,0,false),  venue:'Cleveland',   pl:false, network:'CBS'},
  {id:184,t1:'NO',  t2:'GB',  date:'06 Dec', tossTime:isoET('2026-12-06',13,0,false),  venue:'New Orleans', pl:false, network:'FOX'},
  {id:185,t1:'NYG', t2:'SF',  date:'06 Dec', tossTime:isoET('2026-12-06',13,0,false),  venue:'New York',    pl:false, network:'FOX'},
  {id:186,t1:'TB',  t2:'LAC', date:'06 Dec', tossTime:isoET('2026-12-06',13,0,false),  venue:'Tampa Bay',   pl:false, network:'CBS'},
  {id:187,t1:'TEN', t2:'WAS', date:'06 Dec', tossTime:isoET('2026-12-06',13,0,false),  venue:'Tennessee',   pl:false, network:'CBS'},
  {id:188,t1:'ARI', t2:'PHI', date:'06 Dec', tossTime:isoET('2026-12-06',16,5,false),  venue:'Arizona',     pl:false, network:'FOX'},
  {id:189,t1:'DEN', t2:'MIA', date:'06 Dec', tossTime:isoET('2026-12-06',16,5,false),  venue:'Denver',      pl:false, network:'FOX'},
  {id:190,t1:'MIN', t2:'CAR', date:'06 Dec', tossTime:isoET('2026-12-06',16,25,false), venue:'Minnesota',   pl:false, network:'CBS'},
  {id:191,t1:'NE',  t2:'BUF', date:'06 Dec', tossTime:isoET('2026-12-06',16,25,false), venue:'New England', pl:false, network:'CBS'},
  {id:192,t1:'PIT', t2:'HOU', date:'06 Dec', tossTime:isoET('2026-12-06',20,20,false), venue:'Pittsburgh',  pl:false, network:'NBC'},
  // Mon Dec 7
  {id:193,t1:'SEA', t2:'DAL', date:'07 Dec', tossTime:isoET('2026-12-07',20,15,false), venue:'Seattle',     pl:false, network:'ESPN/ABC'},

  // ── WEEK 14 ─────────────────────────────────────────────────
  // Thu Dec 10
  {id:194,t1:'NE',  t2:'MIN', date:'10 Dec', tossTime:isoET('2026-12-10',20,15,false), venue:'New England', pl:false, network:'AMZ'},
  // Sun Dec 13
  {id:195,t1:'BAL', t2:'TB',  date:'13 Dec', tossTime:isoET('2026-12-13',13,0,false),  venue:'Baltimore',   pl:false, network:'FOX'},
  {id:196,t1:'CAR', t2:'NO',  date:'13 Dec', tossTime:isoET('2026-12-13',13,0,false),  venue:'Carolina',    pl:false, network:'CBS'},
  {id:197,t1:'CLE', t2:'ATL', date:'13 Dec', tossTime:isoET('2026-12-13',13,0,false),  venue:'Cleveland',   pl:false, network:'CBS'},
  {id:198,t1:'DET', t2:'TEN', date:'13 Dec', tossTime:isoET('2026-12-13',13,0,false),  venue:'Detroit',     pl:false, network:'FOX'},
  {id:199,t1:'MIA', t2:'CHI', date:'13 Dec', tossTime:isoET('2026-12-13',13,0,false),  venue:'Miami',       pl:false, network:'CBS'},
  {id:200,t1:'NYJ', t2:'DEN', date:'13 Dec', tossTime:isoET('2026-12-13',13,0,false),  venue:'New York Jets',pl:false, network:'CBS'},
  {id:201,t1:'PHI', t2:'IND', date:'13 Dec', tossTime:isoET('2026-12-13',13,0,false),  venue:'Philadelphia',pl:false, network:'FOX'},
  {id:202,t1:'WAS', t2:'HOU', date:'13 Dec', tossTime:isoET('2026-12-13',13,0,false),  venue:'Washington',  pl:false, network:'CBS'},
  {id:203,t1:'LV',  t2:'LAC', date:'13 Dec', tossTime:isoET('2026-12-13',16,5,false),  venue:'Las Vegas',   pl:false, network:'CBS'},
  {id:204,t1:'CIN', t2:'KC',  date:'13 Dec', tossTime:isoET('2026-12-13',16,25,false), venue:'Cincinnati',  pl:false, network:'FOX'},
  {id:205,t1:'SEA', t2:'NYG', date:'13 Dec', tossTime:isoET('2026-12-13',16,25,false), venue:'Seattle',     pl:false, network:'FOX'},
  {id:206,t1:'SF',  t2:'LAR', date:'13 Dec', tossTime:isoET('2026-12-13',16,25,false), venue:'San Francisco',pl:false, network:'FOX'},
  {id:207,t1:'GB',  t2:'BUF', date:'13 Dec', tossTime:isoET('2026-12-13',20,20,false), venue:'Green Bay',   pl:false, network:'NBC'},
  // Mon Dec 14
  {id:208,t1:'JAX', t2:'PIT', date:'14 Dec', tossTime:isoET('2026-12-14',20,15,false), venue:'Jacksonville',pl:false, network:'ESPN'},

  // ── WEEK 15 ─────────────────────────────────────────────────
  // Thu Dec 17
  {id:209,t1:'LAC', t2:'SF',  date:'17 Dec', tossTime:isoET('2026-12-17',20,15,false), venue:'Los Angeles', pl:false, network:'AMZ'},
  // Sat Dec 19
  {id:210,t1:'PHI', t2:'SEA', date:'19 Dec', tossTime:isoET('2026-12-19',17,0,false),  venue:'Philadelphia',pl:false, network:'FOX'},
  {id:211,t1:'BUF', t2:'CHI', date:'19 Dec', tossTime:isoET('2026-12-19',20,20,false), venue:'Buffalo',     pl:false, network:'CBS'},
  // Sun Dec 20
  {id:212,t1:'CAR', t2:'CIN', date:'20 Dec', tossTime:isoET('2026-12-20',13,0,false),  venue:'Carolina',    pl:false, network:'FOX'},
  {id:213,t1:'GB',  t2:'MIA', date:'20 Dec', tossTime:isoET('2026-12-20',13,0,false),  venue:'Green Bay',   pl:false, network:'FOX'},
  {id:214,t1:'HOU', t2:'JAX', date:'20 Dec', tossTime:isoET('2026-12-20',13,0,false),  venue:'Houston',     pl:false, network:'CBS'},
  {id:215,t1:'NYG', t2:'CLE', date:'20 Dec', tossTime:isoET('2026-12-20',13,0,false),  venue:'New York',    pl:false, network:'CBS'},
  {id:216,t1:'PIT', t2:'BAL', date:'20 Dec', tossTime:isoET('2026-12-20',13,0,false),  venue:'Pittsburgh',  pl:false, network:'CBS'},
  {id:217,t1:'TB',  t2:'NO',  date:'20 Dec', tossTime:isoET('2026-12-20',13,0,false),  venue:'Tampa Bay',   pl:false, network:'FOX'},
  {id:218,t1:'TEN', t2:'IND', date:'20 Dec', tossTime:isoET('2026-12-20',13,0,false),  venue:'Tennessee',   pl:false, network:'CBS'},
  {id:219,t1:'WAS', t2:'ATL', date:'20 Dec', tossTime:isoET('2026-12-20',13,0,false),  venue:'Washington',  pl:false, network:'FOX'},
  {id:220,t1:'ARI', t2:'NYJ', date:'20 Dec', tossTime:isoET('2026-12-20',16,5,false),  venue:'Arizona',     pl:false, network:'FOX'},
  {id:221,t1:'LAR', t2:'DAL', date:'20 Dec', tossTime:isoET('2026-12-20',16,25,false), venue:'Los Angeles', pl:false, network:'CBS'},
  {id:222,t1:'LV',  t2:'DEN', date:'20 Dec', tossTime:isoET('2026-12-20',16,25,false), venue:'Las Vegas',   pl:false, network:'CBS'},
  {id:223,t1:'MIN', t2:'DET', date:'20 Dec', tossTime:isoET('2026-12-20',20,20,false), venue:'Minnesota',   pl:false, network:'NBC'},
  // Mon Dec 21
  {id:224,t1:'KC',  t2:'NE',  date:'21 Dec', tossTime:isoET('2026-12-21',20,15,false), venue:'Kansas City', pl:false, network:'ESPN/ABC'},

  // ── WEEK 16 ─────────────────────────────────────────────────
  // Thu Dec 24
  {id:225,t1:'PHI', t2:'HOU', date:'24 Dec', tossTime:isoET('2026-12-24',20,15,false), venue:'Philadelphia',pl:false, network:'AMZ'},
  // Fri Dec 25 (Netflix)
  {id:226,t1:'CHI', t2:'GB',  date:'25 Dec', tossTime:isoET('2026-12-25',13,0,false),  venue:'Chicago',     pl:false, network:'Netflix', label:'Christmas Game 1'},
  {id:227,t1:'DEN', t2:'BUF', date:'25 Dec', tossTime:isoET('2026-12-25',16,30,false), venue:'Denver',      pl:false, network:'Netflix', label:'Christmas Game 2'},
  {id:228,t1:'SEA', t2:'LAR', date:'25 Dec', tossTime:isoET('2026-12-25',20,15,false), venue:'Seattle',     pl:false, network:'FOX',     label:'Christmas Game 3'},
  // Sat Dec 26
  // (2 NFLN TBD games — skip, times unknown)
  // Sun Dec 27
  {id:229,t1:'ATL', t2:'TB',  date:'27 Dec', tossTime:isoET('2026-12-27',13,0,false),  venue:'Atlanta',     pl:false, network:'TBD'},
  {id:230,t1:'BAL', t2:'CLE', date:'27 Dec', tossTime:isoET('2026-12-27',13,0,false),  venue:'Baltimore',   pl:false, network:'CBS'},
  {id:231,t1:'LAC', t2:'MIA', date:'27 Dec', tossTime:isoET('2026-12-27',13,0,false),  venue:'Los Angeles', pl:false, network:'FOX'},
  {id:232,t1:'NO',  t2:'ARI', date:'27 Dec', tossTime:isoET('2026-12-27',13,0,false),  venue:'New Orleans', pl:false, network:'FOX'},
  {id:233,t1:'NE',  t2:'NYJ', date:'27 Dec', tossTime:isoET('2026-12-27',13,0,false),  venue:'New England', pl:false, network:'CBS'},
  {id:234,t1:'LV',  t2:'TEN', date:'27 Dec', tossTime:isoET('2026-12-27',16,5,false),  venue:'Las Vegas',   pl:false, network:'FOX'},
  {id:235,t1:'DAL', t2:'JAX', date:'27 Dec', tossTime:isoET('2026-12-27',20,20,false), venue:'Dallas',      pl:false, network:'NBC'},
  // Mon Dec 28
  {id:236,t1:'DET', t2:'NYG', date:'28 Dec', tossTime:isoET('2026-12-28',20,15,false), venue:'Detroit',     pl:false, network:'ESPN'},

  // ── WEEK 17 ─────────────────────────────────────────────────
  // Thu Dec 31
  {id:237,t1:'CIN', t2:'BAL', date:'31 Dec', tossTime:isoET('2026-12-31',20,15,false), venue:'Cincinnati',  pl:false, network:'AMZ'},
  // Sun Jan 3
  {id:238,t1:'ATL', t2:'NO',  date:'03 Jan', tossTime:isoET('2027-01-03',13,0,false),  venue:'Atlanta',     pl:false, network:'FOX'},
  {id:239,t1:'CAR', t2:'SEA', date:'03 Jan', tossTime:isoET('2027-01-03',13,0,false),  venue:'Carolina',    pl:false, network:'FOX'},
  {id:240,t1:'CLE', t2:'IND', date:'03 Jan', tossTime:isoET('2027-01-03',13,0,false),  venue:'Cleveland',   pl:false, network:'FOX'},
  {id:241,t1:'DAL', t2:'NYG', date:'03 Jan', tossTime:isoET('2027-01-03',13,0,false),  venue:'Dallas',      pl:false, network:'FOX'},
  {id:242,t1:'MIA', t2:'BUF', date:'03 Jan', tossTime:isoET('2027-01-03',13,0,false),  venue:'Miami',       pl:false, network:'CBS'},
  {id:243,t1:'MIN', t2:'NYJ', date:'03 Jan', tossTime:isoET('2027-01-03',13,0,false),  venue:'Minnesota',   pl:false, network:'CBS'},
  {id:244,t1:'PIT', t2:'TEN', date:'03 Jan', tossTime:isoET('2027-01-03',13,0,false),  venue:'Pittsburgh',  pl:false, network:'CBS'},
  {id:245,t1:'SF',  t2:'PHI', date:'03 Jan', tossTime:isoET('2027-01-03',20,20,false), venue:'San Francisco',pl:false, network:'NBC'},
  // Mon Jan 4
  {id:246,t1:'GB',  t2:'HOU', date:'04 Jan', tossTime:isoET('2027-01-04',20,15,false), venue:'Green Bay',   pl:false, network:'ESPN'},

  // ── WEEK 18 (all TBD — placeholders with correct matchups) ──
  {id:247,t1:'ARI', t2:'SF',  date:'10 Jan', tossTime:isoET('2027-01-10',13,0,false),  venue:'Arizona',     pl:false, network:'TBD'},
  {id:248,t1:'BAL', t2:'PIT', date:'10 Jan', tossTime:isoET('2027-01-10',13,0,false),  venue:'Baltimore',   pl:false, network:'TBD'},
  {id:249,t1:'BUF', t2:'NYJ', date:'10 Jan', tossTime:isoET('2027-01-10',13,0,false),  venue:'Buffalo',     pl:false, network:'TBD'},
  {id:250,t1:'CAR', t2:'ATL', date:'10 Jan', tossTime:isoET('2027-01-10',13,0,false),  venue:'Carolina',    pl:false, network:'TBD'},
  {id:251,t1:'CIN', t2:'CLE', date:'10 Jan', tossTime:isoET('2027-01-10',13,0,false),  venue:'Cincinnati',  pl:false, network:'TBD'},
  {id:252,t1:'DEN', t2:'LAC', date:'10 Jan', tossTime:isoET('2027-01-10',13,0,false),  venue:'Denver',      pl:false, network:'TBD'},
  {id:253,t1:'GB',  t2:'DET', date:'10 Jan', tossTime:isoET('2027-01-10',13,0,false),  venue:'Green Bay',   pl:false, network:'TBD'},
  {id:254,t1:'HOU', t2:'TEN', date:'10 Jan', tossTime:isoET('2027-01-10',13,0,false),  venue:'Houston',     pl:false, network:'TBD'},
  {id:255,t1:'IND', t2:'JAX', date:'10 Jan', tossTime:isoET('2027-01-10',13,0,false),  venue:'Indianapolis',pl:false, network:'TBD'},
  {id:256,t1:'KC',  t2:'LV',  date:'10 Jan', tossTime:isoET('2027-01-10',13,0,false),  venue:'Kansas City', pl:false, network:'TBD'},
  {id:257,t1:'LAR', t2:'SEA', date:'10 Jan', tossTime:isoET('2027-01-10',13,0,false),  venue:'Los Angeles', pl:false, network:'TBD'},
  {id:258,t1:'MIN', t2:'CHI', date:'10 Jan', tossTime:isoET('2027-01-10',13,0,false),  venue:'Minnesota',   pl:false, network:'TBD'},
  {id:259,t1:'NE',  t2:'MIA', date:'10 Jan', tossTime:isoET('2027-01-10',13,0,false),  venue:'New England', pl:false, network:'TBD'},
  {id:260,t1:'NO',  t2:'TB',  date:'10 Jan', tossTime:isoET('2027-01-10',13,0,false),  venue:'New Orleans', pl:false, network:'TBD'},
  {id:261,t1:'NYG', t2:'PHI', date:'10 Jan', tossTime:isoET('2027-01-10',13,0,false),  venue:'New York',    pl:false, network:'TBD'},
  {id:262,t1:'WAS', t2:'DAL', date:'10 Jan', tossTime:isoET('2027-01-10',13,0,false),  venue:'Washington',  pl:false, network:'TBD'},

  // ── PLAYOFFS ────────────────────────────────────────────────
  {id:263,t1:'TBD', t2:'TBD', date:'17 Jan', tossTime:isoET('2027-01-17',13,0,false),  venue:'TBD', pl:true, label:'Wild Card #1'},
  {id:264,t1:'TBD', t2:'TBD', date:'17 Jan', tossTime:isoET('2027-01-17',16,30,false), venue:'TBD', pl:true, label:'Wild Card #2'},
  {id:265,t1:'TBD', t2:'TBD', date:'17 Jan', tossTime:isoET('2027-01-17',20,15,false), venue:'TBD', pl:true, label:'Wild Card #3'},
  {id:266,t1:'TBD', t2:'TBD', date:'18 Jan', tossTime:isoET('2027-01-18',13,0,false),  venue:'TBD', pl:true, label:'Wild Card #4'},
  {id:267,t1:'TBD', t2:'TBD', date:'18 Jan', tossTime:isoET('2027-01-18',16,30,false), venue:'TBD', pl:true, label:'Wild Card #5'},
  {id:268,t1:'TBD', t2:'TBD', date:'19 Jan', tossTime:isoET('2027-01-19',20,15,false), venue:'TBD', pl:true, label:'Wild Card #6'},
  {id:269,t1:'TBD', t2:'TBD', date:'24 Jan', tossTime:isoET('2027-01-24',15,0,false),  venue:'TBD', pl:true, label:'Divisional #1'},
  {id:270,t1:'TBD', t2:'TBD', date:'24 Jan', tossTime:isoET('2027-01-24',18,30,false), venue:'TBD', pl:true, label:'Divisional #2'},
  {id:271,t1:'TBD', t2:'TBD', date:'25 Jan', tossTime:isoET('2027-01-25',15,0,false),  venue:'TBD', pl:true, label:'Divisional #3'},
  {id:272,t1:'TBD', t2:'TBD', date:'25 Jan', tossTime:isoET('2027-01-25',18,30,false), venue:'TBD', pl:true, label:'Divisional #4'},
  {id:273,t1:'TBD', t2:'TBD', date:'01 Feb', tossTime:isoET('2027-02-01',15,0,false),  venue:'TBD', pl:true, label:'AFC Championship'},
  {id:274,t1:'TBD', t2:'TBD', date:'01 Feb', tossTime:isoET('2027-02-01',18,30,false), venue:'TBD', pl:true, label:'NFC Championship'},
  {id:275,t1:'TBD', t2:'TBD', date:'07 Feb', tossTime:isoET('2027-02-07',18,30,false), venue:'New Orleans', pl:true, label:'🏆 SUPER BOWL LXI'},
];

// ── League registry ───────────────────────────────────────────
const LEAGUES = {
  IPL: {
    key: 'IPL',
    displayName: 'IPL 2026',
    icon: '🏏',
    heroBadge: '🗄 TATA IPL 2026 · Season Ended · Read-Only Archive',
    seasonLabel: 'IPL 2026 Archive',
    totalMatches: 74,
    archived: true,   // Season ended — all matches locked, read-only
    hasTie: false,
    phases: [
      { label: 'PHASE 1 · Mar 28 – Apr 20',  ids: rng(1,30)  },
      { label: 'PHASE 2 · Apr 21 – May 10',  ids: rng(31,54) },
      { label: 'PHASE 3 · May 11 – May 24',  ids: rng(55,70) },
      { label: 'PLAYOFFS',                    ids: rng(71,74) },
    ],
    teams: IPL_TEAMS,
    matches: IPL_2026_MATCHES,
  },
  NFL: {
    key: 'NFL',
    displayName: 'NFL 2026',
    icon: '🏈',
    heroBadge: '🏈 NFL 2026 · Season Active · Chiefs Defending Champions',
    seasonLabel: '2026 Season',
    totalMatches: 275,
    archived: false,
    hasTie: true,  // NFL regular season allows ties; +5 pts for correct tie prediction
    phases: [
      { label: 'WEEK 1 · Sep 9–14',          ids: rng(1,16)   },
      { label: 'WEEK 2 · Sep 17–21',         ids: rng(17,32)  },
      { label: 'WEEK 3 · Sep 24–28',         ids: rng(33,48)  },
      { label: 'WEEK 4 · Oct 1–5',           ids: rng(49,64)  },
      { label: 'WEEK 5 · Oct 8–12',          ids: rng(65,79)  },
      { label: 'WEEK 6 · Oct 15–19',         ids: rng(80,93)  },
      { label: 'WEEK 7 · Oct 22–26',         ids: rng(94,107) },
      { label: 'WEEK 8 · Oct 29–Nov 2',      ids: rng(108,121)},
      { label: 'WEEK 9 · Nov 5–9',           ids: rng(122,136)},
      { label: 'WEEK 10 · Nov 12–16',        ids: rng(137,150)},
      { label: 'WEEK 11 · Nov 19–23',        ids: rng(151,163)},
      { label: 'WEEK 12 · Thanksgiving',     ids: rng(164,179)},
      { label: 'WEEK 13 · Dec 3–7',          ids: rng(180,193)},
      { label: 'WEEK 14 · Dec 10–14',        ids: rng(194,208)},
      { label: 'WEEK 15 · Dec 17–21',        ids: rng(209,224)},
      { label: 'WEEK 16 · Christmas',        ids: rng(225,236)},
      { label: 'WEEK 17 · Dec 31–Jan 4',     ids: rng(237,246)},
      { label: 'WEEK 18 · Jan 10 (Final)',   ids: rng(247,262)},
      { label: 'WILD CARD WEEKEND',          ids: rng(263,268)},
      { label: 'DIVISIONAL ROUND',           ids: rng(269,272)},
      { label: 'CHAMPIONSHIP SUNDAY',        ids: rng(273,274)},
      { label: '🏆 SUPER BOWL LXI',          ids: [275]       },
    ],
    teams: NFL_TEAMS,
    matches: NFL_2026_MATCHES,
  },
  // IPL 2026 is now the archive — see the IPL entry above (archived: true)
  // To add IPL 2027 next year:
  //   1. Change IPL.archived to false and update IPL.matches
  //   2. Rename the old IPL entry to IPL_2026 with archived:true
  // No other code changes needed.
};

// ── League API ────────────────────────────────────────────────
function setLeague(leagueKey) {
  if (!LEAGUES[leagueKey]) { console.warn('Unknown league', leagueKey); return; }
  activeLeague = leagueKey;
  TEAMS = LEAGUES[leagueKey].teams;
  MATCHES = [...LEAGUES[leagueKey].matches];
  REAL_MATCHES = [...MATCHES];
}
function getLeagueConfig() { return LEAGUES[activeLeague] || LEAGUES.IPL; }
function isArchived() { return !!getLeagueConfig().archived; }
function getTeam(code) { return TEAMS[code] || {}; }
function getMatch(mid) { return MATCHES.find(x => x.id === mid); }

setLeague(activeLeague);

// ── Time helpers ──────────────────────────────────────────────
const LOCK_BUFFER_MS = 0;

function matchLockTime(m) {
  // Archived leagues: all matches are always locked (read-only)
  if (isArchived()) return 0;
  return new Date(m.tossTime).getTime() - LOCK_BUFFER_MS;
}
function isMatchLocked(m) { return Date.now() >= matchLockTime(m); }
function secsUntilLock(m) { return Math.max(0, Math.floor((matchLockTime(m) - Date.now()) / 1000)); }

function matchTimeLabel(m) {
  const toss   = new Date(m.tossTime);
  const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Full date + time in user's local timezone
  const dateStr = toss.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', timeZone: userTZ,
  });
  const timeStr = toss.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: userTZ,
  });
  const tzLabel = toss.toLocaleTimeString('en-US', {
    timeZoneName: 'short', timeZone: userTZ,
  }).split(' ').pop();

  const label = getLeagueConfig().key === 'NFL' ? 'Kickoff' : 'Toss';
  return `${dateStr} · ${timeStr} ${tzLabel} (${label})`;
}
