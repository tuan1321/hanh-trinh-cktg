// ===== Bản đồ thu nhỏ (toạ độ 0-100, đội Xanh ở góc dưới trái; đội Đỏ = hoán đổi x/y) =====
const MAPD = {
  towers: { top: [[8, 30], [8, 52], [8, 72]], mid: [[38, 62], [31, 69], [24, 76]], bot: [[70, 92], [48, 92], [28, 92]] },
  inhib: { top: [8, 81], mid: [19, 81], bot: [19, 92] },
  nexusT: [[13, 84], [16, 87]],
  nexus: [10, 90],
  fountain: [4, 96],
  dragon: [68, 68],
  baron: [32, 32],
};
const LANES = ['top', 'mid', 'bot'];
const LANE_VN = { top: 'đường trên', mid: 'đường giữa', bot: 'đường dưới' };
const TOWER_VN = ['trụ ngoài', 'trụ trong', 'trụ bảo vệ Nhà Lính'];
const sidePt = (s, p) => (s === 0 ? [p[0], p[1]] : [p[1], p[0]]);
const LANE_SPOT = { TOP: [9, 24], MID: [43, 57], ADC: [76, 91], SUP: [73, 88] };
const JG_SPOTS = [[26, 46], [40, 74], [30, 58], [56, 80], [22, 62]];
const GROUP_SPOT = { TOP: [12, 38], JNG: [40, 56], MID: [44, 58], ADC: [46, 62], SUP: [42, 60] };
const KILL_SPOT = { top: [11, 12], mid: [50, 50], bot: [88, 89] };
const FIGHT_SPOTS = [
  { loc: [68, 68], label: 'tại hang Rồng' },
  { loc: [32, 32], label: 'tại hang Baron' },
  { loc: [50, 50], label: 'ở đường giữa' },
  { loc: [34, 62], label: 'trong rừng đội Xanh' },
  { loc: [62, 34], label: 'trong rừng đội Đỏ' },
  { loc: [84, 82], label: 'ở đường dưới' },
  { loc: [16, 14], label: 'ở đường trên' },
];

// ===== Sinh diễn biến 1 ván đấu =====
// teams[0] = đội Xanh, teams[1] = đội Đỏ; winner = 0/1 (định trước theo sức mạnh)
function genGame(teams, winner) {
  const ev = [];
  const mkKD = () => Object.fromEntries(ROLES.map(r => [r, [0, 0]]));
  const st = {
    kills: [0, 0], gold: [2500, 2500], towers: [0, 0], drag: [0, 0], baron: [0, 0],
    kd: [mkKD(), mkKD()], lanes: [[0, 0, 0], [0, 0, 0]], inhib: [[0, 0, 0], [0, 0, 0]], nt: [0, 0], nexus: [1, 1],
  };
  let sec = 0, ended = false, m = 0, fb = false, herald = false, dragCount = 0, dragNext = 5, baronNext = 20, elderNext = 0, soul = -1;
  const baronUntil = [-1, -1], elderUntil = [-1, -1];
  const els = shuffle(['Hỏa Long', 'Thủy Long', 'Phong Long', 'Thổ Long', 'Hextech Long', 'Hóa Kỹ Long']);
  const N = (s, r) => teams[s].players[r].name;
  const T = s => teams[s].name;
  const all = s => ROLES.map(r => [s, r]);
  const grp = s => shuffle(ROLES).slice(0, randi(2, 5)).map(r => [s, r]);

  let kbuf = []; // các pha hạ gục của sự kiện đang tạo: {s, k (người hạ), v (nạn nhân)}
  function add(e) {
    e.t = sec; sec += randi(5, 12);
    e.snap = JSON.parse(JSON.stringify(st));
    e.inv = e.inv || []; e.dead = e.dead || [];
    e.kills = kbuf; kbuf = [];
    ev.push(e);
  }
  function kill(s, k, v) { st.kills[s]++; st.kd[s][k][0]++; st.kd[1 - s][v][1]++; st.gold[s] += 300; kbuf.push({ s, k, v }); }
  // Ai thắng sự kiện: thiên về đội thắng định trước, cộng ảnh hưởng vàng/bùa lợi
  function ew() {
    if (m >= 42) return winner;
    const b = m < 14 ? 0.3 : m < 25 ? 0.55 : 0.9;
    let lg = (winner === 0 ? b : -b) + (st.gold[0] - st.gold[1]) / 7000;
    if (soul >= 0) lg += soul === 0 ? 0.3 : -0.3;
    if (baronUntil[0] >= m) lg += 0.4;
    if (baronUntil[1] >= m) lg -= 0.4;
    return Math.random() < 1 / (1 + Math.exp(-lg)) ? 0 : 1;
  }

  function laneKill(isFB) {
    if (ended) return;
    const w = ew(), l = 1 - w;
    const lane = pick(['top', 'mid', 'bot', 'bot']);
    const gank = Math.random() < 0.35;
    let killer, victim, inv;
    if (lane === 'bot') {
      victim = pick(['ADC', 'SUP']); killer = gank ? 'JNG' : pick(['ADC', 'ADC', 'SUP']);
      inv = [[w, 'ADC'], [w, 'SUP'], [l, 'ADC'], [l, 'SUP']];
    } else {
      const r = lane === 'top' ? 'TOP' : 'MID';
      victim = r; killer = gank ? 'JNG' : r; inv = [[w, r], [l, r]];
    }
    if (gank) inv.push([w, 'JNG']);
    kill(w, killer, victim);
    let text;
    if (isFB) { st.gold[w] += 100; text = `🩸 FIRST BLOOD! ${N(w, killer)} hạ gục ${N(l, victim)} ở ${LANE_VN[lane]}!`; }
    else if (gank) text = pick([
      `${N(w, 'JNG')} gank ${LANE_VN[lane]} thành công, ${N(l, victim)} không kịp thoát!`,
      `Pha gank chuẩn xác của ${N(w, 'JNG')}! ${N(l, victim)} bị hạ gục.`,
      `${N(w, 'JNG')} xuất hiện bất ngờ, ${N(l, victim)} ngã xuống ở ${LANE_VN[lane]}.`]);
    else text = pick([
      `${N(w, killer)} SOLO KILL ${N(l, victim)}!`,
      `${N(w, killer)} đọc vị hoàn hảo, ${N(l, victim)} phải về bệ đá cổ.`,
      `Pha xử lý cực đỉnh của ${N(w, killer)} hạ gục ${N(l, victim)}.`]);
    add({ type: 'kill', side: w, text, loc: KILL_SPOT[lane], inv, dead: [[l, victim]], big: isFB, banner: isFB ? 'FIRST BLOOD' : null });
  }

  function fight(where) {
    if (ended) return { w: ew(), kw: 0 };
    const w = ew(), l = 1 - w;
    const kw = randi(2, 5);
    const kl = Math.random() < 0.55 ? randi(1, Math.min(2, kw - 1)) : 0;
    const vw = shuffle(ROLES).slice(0, kw), vl = shuffle(ROLES).slice(0, kl);
    const star = pick(ROLES);
    vw.forEach((v, i) => kill(w, i < 2 ? star : pick(ROLES), v));
    vl.forEach(v => kill(l, pick(ROLES), v));
    const text = pick([
      `⚔️ Giao tranh tổng ${where.label}! ${T(w)} thắng ${kw}-${kl}, ${N(w, star)} tỏa sáng!`,
      `⚔️ ${N(w, star)} mở giao tranh cực hay ${where.label}! ${T(w)} đổi ${kw}-${kl}.`,
      `⚔️ Combat nổ ra ${where.label}, ${T(w)} giành chiến thắng ${kw} đổi ${kl}.`]);
    add({ type: 'fight', side: w, text, loc: where.loc, inv: [...all(0), ...all(1)], dead: [...vw.map(v => [l, v]), ...vl.map(v => [w, v])], big: true });
    if (kw === 5) add({ type: 'ace', side: w, text: `💀 ACE! ${T(w)} quét sạch ${T(l)}!`, loc: where.loc, big: true, banner: 'ACE' });
    return { w, kw };
  }

  function push(att, opts = {}) {
    if (ended) return false;
    const d = 1 - att;
    const o = [];
    LANES.forEach((ln, i) => {
      const lost = st.lanes[d][i];
      if (lost < 3) { if (!opts.early || lost === 0) o.push({ k: 't', i }); }
      else if (!st.inhib[d][i] && !opts.early) o.push({ k: 'i', i });
    });
    // chỉ đội thắng định trước mới được đánh vào Nhà Chính
    if (!opts.early && att === winner && st.inhib[d].some(Boolean)) o.push(st.nt[d] < 2 ? { k: 'nt' } : { k: 'nx' });
    if (!o.length) return false;
    const x = o.find(z => z.k === 'nx') || o.find(z => z.k === 'nt') || (Math.random() < 0.5 ? o.find(z => z.k === 'i') : null) || pick(o);
    let text, loc;
    if (x.k === 't') {
      const lost = st.lanes[d][x.i];
      loc = sidePt(d, MAPD.towers[LANES[x.i]][lost]);
      st.lanes[d][x.i]++; st.towers[att]++; st.gold[att] += 550;
      const first = st.towers[0] + st.towers[1] === 1;
      text = `${first ? '🏰 TRỤ ĐẦU TIÊN! ' : '🏰 '}${T(att)} phá ${TOWER_VN[lost]} ${LANE_VN[LANES[x.i]]}.`;
    } else if (x.k === 'i') {
      loc = sidePt(d, MAPD.inhib[LANES[x.i]]);
      st.inhib[d][x.i] = 1; st.gold[att] += 350;
      text = `🧱 ${T(att)} phá Nhà Lính ${LANE_VN[LANES[x.i]]}! Siêu lính xuất hiện.`;
    } else if (x.k === 'nt') {
      loc = sidePt(d, MAPD.nexusT[st.nt[d]]);
      st.nt[d]++; st.towers[att]++;
      text = `🔥 ${T(att)} hạ trụ bảo vệ Nhà Chính (${st.nt[d]}/2)!`;
    } else {
      st.nexus[d] = 0; ended = true;
      add({ type: 'end', side: att, text: `💥 ${T(att)} PHÁ HỦY NHÀ CHÍNH! CHIẾN THẮNG!`, loc: sidePt(d, MAPD.nexus), inv: all(att), big: true });
      return true;
    }
    if (opts.prefix) text = opts.prefix + text;
    add({ type: 'tower', side: att, text, loc, inv: grp(att), banner: st.towers[0] + st.towers[1] === 1 && x.k === 't' ? 'TRỤ ĐẦU TIÊN' : x.k === 'i' ? 'PHÁ NHÀ LÍNH' : null });
    return true;
  }

  function dragon(forced) {
    if (ended) return;
    const w = forced != null ? forced : ew();
    const el = dragCount < 2 ? els[dragCount] : els[2];
    dragCount++; st.drag[w]++; st.gold[w] += 200; dragNext = m + 5;
    const stolen = forced == null && Math.random() < 0.07;
    add({
      type: 'obj', obj: 'dragon', side: w, loc: MAPD.dragon, inv: [[w, 'JNG'], [w, 'ADC'], [w, 'SUP'], [w, 'MID']],
      text: stolen ? `😱 ${N(w, 'JNG')} CƯỚP ${el} ngay trước mũi đối thủ!` : `🐉 ${N(w, 'JNG')} kết liễu ${el}. ${T(w)} có ${st.drag[w]} rồng.`,
    });
    if (st.drag[w] >= 4) {
      soul = w; elderNext = m + 6;
      add({ type: 'obj', obj: 'soul', side: w, text: `✨ ${T(w)} nhận LINH HỒN ${el.toUpperCase()}!`, loc: MAPD.dragon, big: true, banner: 'LINH HỒN RỒNG' });
    }
  }

  function heraldF() {
    if (ended) return;
    const w = ew(); herald = true;
    add({ type: 'obj', obj: 'herald', side: w, text: `👁️ ${T(w)} hạ Sứ Giả Khe Nứt.`, loc: MAPD.baron, inv: [[w, 'JNG'], [w, 'MID'], [w, 'TOP']] });
    push(w, { early: true, prefix: 'Sứ Giả húc trụ! ' });
  }

  function baron(forced) {
    if (ended) return;
    const w = forced != null ? forced : ew();
    const steal = Math.random() < 0.08;
    const g = steal ? 1 - w : w;
    st.baron[g]++; st.gold[g] += 1500; baronUntil[g] = m + 3; baronNext = m + 6;
    add({
      type: 'obj', obj: 'baron', side: g, loc: MAPD.baron, big: true, banner: steal ? 'CƯỚP BARON!' : 'BARON NASHOR',
      inv: steal ? [[g, 'JNG'], ...all(1 - g)] : all(g),
      text: steal ? `😱😱 ${N(g, 'JNG')} CƯỚP BARON!!! Khán giả như vỡ òa!` : `🟣 ${T(g)} hạ Baron Nashor! Bùa lợi Baron kích hoạt.`,
    });
  }

  function elder(w) {
    if (ended) return;
    elderUntil[w] = m + 2; elderNext = m + 6; st.gold[w] += 500;
    add({ type: 'obj', obj: 'elder', side: w, text: `🐲 ${T(w)} hạ RỒNG NGÀN TUỔI! Hiệu ứng hành quyết!`, loc: MAPD.dragon, inv: all(w), big: true, banner: 'RỒNG NGÀN TUỔI' });
  }

  function filler() {
    const s = Math.random() < 0.5 ? 0 : 1;
    const g = st.gold[0] - st.gold[1];
    const lines = [
      `${N(s, 'MID')} đang ép lính rất tốt trước ${N(1 - s, 'MID')}.`,
      `${N(s, 'JNG')} dọn rừng nhanh, chuẩn bị chuyển hướng.`,
      `${N(s, 'SUP')} cắm mắt sâu vào rừng ${T(1 - s)}.`,
      `${N(s, 'TOP')} đẩy lẻ, gây áp lực lớn lên ${T(1 - s)}.`,
      `${N(s, 'ADC')} farm cực kỳ ổn định.`,
      `Hai đội đang dò xét nhau quanh khu vực sông.`,
      `🎙️ BLV: "Một thế trận rất căng thẳng!"`,
    ];
    if (Math.abs(g) > 1500) lines.push(`💰 ${T(g > 0 ? 0 : 1)} đang dẫn trước ${(Math.abs(g) / 1000).toFixed(1)}k vàng.`);
    add({ type: 'info', side: -1, text: pick(lines), loc: null });
  }

  for (m = 1; m <= 70 && !ended; m++) {
    sec = Math.max(sec, m * 60 + randi(0, 10));
    st.gold[0] += randi(1550, 1750); st.gold[1] += randi(1550, 1750);
    const before = ev.length;
    if (!fb && m >= 2 && (Math.random() < 0.3 || m >= 7)) { fb = true; laneKill(true); }
    else if (m >= 3 && m < 14 && Math.random() < 0.3) laneKill(false);
    if (!herald && m >= 8 && Math.random() < (m >= 13 ? 1 : 0.25)) heraldF();
    if (soul < 0 && m >= dragNext && Math.random() < 0.5) {
      if (m >= 15 && Math.random() < 0.5) { const f = fight(FIGHT_SPOTS[0]); dragon(f.w); } else dragon();
    }
    if (m >= 11 && m < 14 && Math.random() < 0.3) push(ew(), { early: true });
    if (m >= 14 && m < 42) {
      if (Math.random() < 0.38) { const f = fight(pick(FIGHT_SPOTS)); if (f.kw >= 3) push(f.w); if (f.kw === 5) push(f.w); }
      if (Math.random() < 0.35) push(ew());
      if (Math.random() < 0.2) laneKill(false);
    }
    if (m >= baronNext && Math.random() < (m >= 28 ? 0.4 : 0.22)) {
      if (Math.random() < 0.5) { const f = fight(FIGHT_SPOTS[1]); baron(f.w); } else baron();
    }
    if (elderNext && m >= elderNext && Math.random() < 0.4) { const f = fight(FIGHT_SPOTS[0]); elder(f.w); }
    for (const s of [0, 1]) {
      if (baronUntil[s] >= m) { push(s); if (Math.random() < 0.5) push(s); }
      if (elderUntil[s] >= m) push(s);
    }
    if (m >= 42) { if (Math.random() < 0.5) fight(pick(FIGHT_SPOTS)); push(winner); push(winner); }
    if (!ended && ev.length === before && Math.random() < 0.7) filler();
  }
  let guard = 0;
  while (!ended && guard++ < 40) push(winner);
  return { events: ev, winner, duration: ev[ev.length - 1].t };
}

// ===== Đồ thị đường đi trên bản đồ (tướng đi theo đường/rừng/sông, không xuyên tường) =====
const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const NAV = (() => {
  const N = {
    BASE: [7, 93], T1: [8, 74], T2: [8, 52], T3: [8, 30], TC: [11, 11],
    M1: [22, 78], M2: [35, 65], M3: [50, 50],
    B1: [26, 92], B2: [48, 92], B3: [70, 92], BC: [89, 89],
    RV1: [20, 20], RV2: [32, 32], RV3: [41, 41], RV4: [59, 59], RV5: [68, 68], RV6: [80, 80],
    J1: [24, 47], J2: [15, 44], J3: [26, 58], J4: [34, 50], J5: [52, 76], J6: [47, 64], J7: [55, 85], J8: [40, 72],
  };
  const E = [
    ['BASE', 'T1'], ['T1', 'T2'], ['T2', 'T3'], ['T3', 'TC'], ['BASE', 'M1'], ['M1', 'M2'], ['M2', 'M3'], ['BASE', 'B1'], ['B1', 'B2'], ['B2', 'B3'], ['B3', 'BC'],
    ['TC', 'RV1'], ['RV1', 'RV2'], ['RV2', 'RV3'], ['RV3', 'M3'], ['M3', 'RV4'], ['RV4', 'RV5'], ['RV5', 'RV6'], ['RV6', 'BC'],
    ['T2', 'J2'], ['J2', 'J1'], ['T3', 'J1'], ['J1', 'J4'], ['J1', 'J3'], ['J3', 'M1'], ['J3', 'J4'], ['J4', 'M2'], ['J4', 'RV3'], ['J4', 'RV2'],
    ['M2', 'J8'], ['M1', 'J8'], ['J8', 'J6'], ['J6', 'J5'], ['J5', 'J7'], ['J7', 'B2'], ['J7', 'B3'], ['J6', 'RV4'], ['J5', 'RV5'],
  ];
  const key = p => p[0] + ',' + p[1];
  const byPos = {};
  Object.entries(N).forEach(([k, p]) => (byPos[key(p)] = k));
  const mir = k => {
    const q = [N[k][1], N[k][0]];
    let m = byPos[key(q)];
    if (!m) { m = k + "'"; N[m] = q; byPos[key(q)] = m; }
    return m;
  };
  Object.keys(N).slice().forEach(mir);
  const edges = [];
  E.forEach(([a, b]) => { edges.push([a, b]); edges.push([mir(a), mir(b)]); });
  const adj = Object.fromEntries(Object.keys(N).map(k => [k, []]));
  edges.forEach(([a, b]) => { const d = dist2(N[a], N[b]); adj[a].push([b, d]); adj[b].push([a, d]); });
  const jungleEdges = edges.filter(([a, b]) => /^J/.test(a) || /^J/.test(b));
  return { N, adj, jungleEdges };
})();
function navNearest(p) {
  let best = null, bd = 1e9;
  for (const k in NAV.N) { const d = dist2(p, NAV.N[k]); if (d < bd) { bd = d; best = k; } }
  return best;
}
function navPath(a, b) {
  const D = { [a]: 0 }, prev = {}, done = new Set();
  while (true) {
    let u = null, ud = 1e9;
    for (const k in D) if (!done.has(k) && D[k] < ud) { ud = D[k]; u = k; }
    if (u === null || u === b) break;
    done.add(u);
    for (const [v, w] of NAV.adj[u]) if (D[v] === undefined || ud + w < D[v]) { D[v] = ud + w; prev[v] = u; }
  }
  const out = [b];
  while (out[0] !== a && prev[out[0]]) out.unshift(prev[out[0]]);
  return out;
}
function route(from, to) {
  if (dist2(from, to) < 9) return [to.slice()];
  const pts = navPath(navNearest(from), navNearest(to)).map(k => NAV.N[k].slice());
  if (pts.length > 1 && dist2(from, pts[1]) < dist2(pts[0], pts[1])) pts.shift();
  if (pts.length > 1 && dist2(pts[pts.length - 2], to) < dist2(pts[pts.length - 2], pts[pts.length - 1])) pts.pop();
  pts.push(to.slice());
  return pts;
}

// ===== Bãi quái rừng, bụi cỏ, đường lính =====
const CAMPS_BLUE = [
  { n: 'Bùa Xanh', p: [24, 47], c: '#4ea1ff', big: 1, rs: 300 },
  { n: 'Ếch', p: [15, 44], c: '#9ccc65', rs: 135 },
  { n: 'Sói', p: [26, 58], c: '#cfd8dc', rs: 135 },
  { n: 'Chim', p: [47, 64], c: '#ffb74d', rs: 135 },
  { n: 'Bùa Đỏ', p: [52, 76], c: '#ff6b6b', big: 1, rs: 300 },
  { n: 'Golem', p: [55, 85], c: '#bcaaa4', rs: 135 },
];
const BRUSH_BLUE = [[13, 63], [12, 36], [30, 87], [62, 88], [38, 57], [43, 79], [27, 31], [62, 71], [19, 70], [35, 44]];
const MINION_LANES = [ // từ nhà Xanh sang nhà Đỏ
  [[9, 86], [8, 74], [8, 12], [12, 8], [74, 8], [86, 9]],
  [[14, 86], [86, 14]],
  [[14, 91], [88, 92], [92, 88], [91, 14]],
];
const LANE_GEO = MINION_LANES.map(pts => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist2(pts[i - 1], pts[i]));
  return { pts, cum, len: cum[cum.length - 1] };
});
function laneAt(li, s) {
  const g = LANE_GEO[li]; s = Math.max(0, Math.min(g.len, s));
  let i = 1; while (i < g.cum.length - 1 && g.cum[i] < s) i++;
  const t = (s - g.cum[i - 1]) / (g.cum[i] - g.cum[i - 1] || 1);
  const a = g.pts[i - 1], b = g.pts[i];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
function laneProject(li, p) {
  let best = 0, bd = 1e9;
  for (let s = 0; s <= LANE_GEO[li].len; s += 0.5) { const d = dist2(laneAt(li, s), p); if (d < bd) { bd = d; best = s; } }
  return best;
}
// vị trí (theo chiều dài đường) của trụ ngoài/trong/bảo vệ + nhà lính mỗi bên
const LANE_STOPS = LANES.map((ln, li) => [0, 1].map(s => [...MAPD.towers[ln].map(t => laneProject(li, sidePt(s, t))), laneProject(li, sidePt(s, MAPD.inhib[ln]))]));

// ===== Nền bản đồ (vẽ một lần) =====
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let MAP_BG = null;
function mapBackground(W) {
  if (MAP_BG && MAP_BG.width === W) return MAP_BG;
  const cv = document.createElement('canvas'); cv.width = cv.height = W;
  const ctx = cv.getContext('2d');
  const P = v => (v / 100) * W;
  const rnd = mulberry(20261107);
  const both = (pts, fn) => [0, 1].forEach(s => fn(pts.map(p => sidePt(s, p)), s));
  const poly = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(P(x), P(y)) : ctx.moveTo(P(x), P(y)))); ctx.closePath(); };
  const line = (pts, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = P(w); ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(P(x), P(y)) : ctx.moveTo(P(x), P(y)))); ctx.stroke(); };

  // 1. vách đá / rừng rậm ngoài cùng
  ctx.fillStyle = '#0c1a14'; ctx.fillRect(0, 0, W, W);
  for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${20 + rnd() * 20},${45 + rnd() * 30},${30 + rnd() * 20},.5)`; ctx.beginPath(); ctx.arc(rnd() * W, rnd() * W, P(0.4 + rnd() * 1.2), 0, 7); ctx.fill(); }
  // 2. khu rừng 4 góc phần tư
  const quads = [[[13, 18], [44, 49], [44, 54], [15, 84]], [[52, 56], [84, 87], [18, 87], [48, 57]]];
  quads.forEach(q => both(q, pts => { poly(pts); ctx.fillStyle = '#17321f'; ctx.fill(); }));
  // cây trong rừng
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * 100, y = rnd() * 100;
    if (x < 10 || y < 10 || x > 90 || y > 90 || Math.abs(x - y) < 7 || Math.abs(x + y - 100) < 5) continue;
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(10,30,18,.7)' : 'rgba(34,70,40,.55)';
    ctx.beginPath(); ctx.arc(P(x), P(y), P(0.6 + rnd() * 1.3), 0, 7); ctx.fill();
  }
  // 3. lối mòn trong rừng + khoảng trống ở bãi quái
  NAV.jungleEdges.forEach(([a, b]) => line([NAV.N[a], NAV.N[b]], 3.6, '#2b4a30'));
  NAV.jungleEdges.forEach(([a, b]) => line([NAV.N[a], NAV.N[b]], 2.2, '#35573a'));
  CAMPS_BLUE.forEach(c => [0, 1].forEach(s => { const p = sidePt(s, c.p); ctx.fillStyle = '#3a5e3e'; ctx.beginPath(); ctx.arc(P(p[0]), P(p[1]), P(c.big ? 3.6 : 3), 0, 7); ctx.fill(); }));
  // 4. sông
  const river = []; for (let t = -2; t <= 102; t += 2) { const o = Math.sin(t / 7) * 1.4; river.push([t + o, t - o]); }
  line(river, 11, '#173e52'); line(river, 8, '#1e5670'); line(river, 4.5, '#2a7090');
  for (let i = 0; i < 60; i++) { const t = rnd() * 100; ctx.strokeStyle = 'rgba(160,220,255,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P(t - 1.5), P(t + 0.5)); ctx.lineTo(P(t + 1.5), P(t + 2)); ctx.stroke(); }
  // hố Rồng / Baron
  [[MAPD.dragon, '#6b4f1d'], [MAPD.baron, '#4b2a6b']].forEach(([p, col]) => {
    ctx.fillStyle = '#22301f'; ctx.beginPath(); ctx.arc(P(p[0]), P(p[1]), P(5.2), 0, 7); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = P(0.8); ctx.stroke();
  });
  // 5. đường đi (đất)
  MINION_LANES.forEach(pts => { line(pts, 6.2, '#3a3524'); line(pts, 4.6, '#5a5034'); line(pts, 2.2, '#665b3c'); });
  // 6. bụi cỏ
  BRUSH_BLUE.forEach(b => [0, 1].forEach(s => {
    const p = sidePt(s, b);
    for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? '#1f5a33' : '#174a29'; ctx.beginPath(); ctx.ellipse(P(p[0] + (rnd() - 0.5) * 3), P(p[1] + (rnd() - 0.5) * 3), P(1.4), P(1), rnd() * 3, 0, 7); ctx.fill(); }
  }));
  // 7. căn cứ
  [[0, '#1d3a66', '#4f8cff'], [1, '#5a1d2b', '#ff5370']].forEach(([s, fill, glow]) => {
    const c = s === 0 ? [0, 100] : [100, 0];
    const g = ctx.createRadialGradient(P(c[0]), P(c[1]), 0, P(c[0]), P(c[1]), P(24));
    g.addColorStop(0, fill); g.addColorStop(0.75, fill + 'cc'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(P(c[0]), P(c[1]), P(24), 0, 7); ctx.fill();
    ctx.strokeStyle = glow + '88'; ctx.lineWidth = P(0.5); ctx.beginPath(); ctx.arc(P(c[0]), P(c[1]), P(18), 0, 7); ctx.stroke();
    const f = sidePt(s, MAPD.fountain);
    const fg = ctx.createRadialGradient(P(f[0]), P(f[1]), 0, P(f[0]), P(f[1]), P(4));
    fg.addColorStop(0, glow); fg.addColorStop(1, 'transparent');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(P(f[0]), P(f[1]), P(4), 0, 7); ctx.fill();
  });
  // viền khung
  const vg = ctx.createRadialGradient(W / 2, W / 2, W * 0.45, W / 2, W / 2, W * 0.75);
  vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, W);
  MAP_BG = cv;
  return cv;
}

// ===== Giao diện xem trận =====
const MatchUI = (() => {
  const GS = 45;      // giây trong game / 1 giây thực ở tốc độ x1
  const SPEED = 2.6;  // tốc độ chạy của tướng (đơn vị bản đồ / giây trong game)
  const LEAD = 18;    // tướng bắt đầu di chuyển tới chỗ giao tranh trước bấy nhiêu giây
  let speed = 2, raf = null;
  const $id = id => document.getElementById(id);

  function playSeries(cfg) {
    const score = [0, 0];
    const need = Math.ceil(cfg.bo / 2);
    let gameNo = 0;
    const isOver = () => score[0] >= need || score[1] >= need;
    const me = cfg.me || 0; // góc nhìn: 0 = mình là đội Xanh, 1 = mình là đội Đỏ (khách trong trận trực tuyến)
    const finish = () => { $id('match').classList.add('hidden'); cfg.onEnd(score[me] >= need, score.slice()); };
    const next = () => {
      gameNo++;
      // trận trực tuyến: dùng các ván do chủ phòng tạo sẵn để hai bên xem giống hệt nhau
      const g = cfg.games ? cfg.games[gameNo - 1] : genGame(cfg.teams, Math.random() < cfg.pWin ? 0 : 1);
      showGame(g, cfg, score, gameNo, () => { if (isOver()) finish(); else next(); });
    };
    next();
  }

  const fmtTime = s => { s = Math.max(0, Math.floor(s)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const jit = (p, a) => [p[0] + rand(-a, a), p[1] + rand(-a, a)];

  function homePos(c, gs) {
    let p;
    if (gs < 14 * 60) p = c.r === 'JNG' ? pick(JG_SPOTS) : LANE_SPOT[c.r];
    else if (gs < 25 * 60) p = GROUP_SPOT[c.r];
    else p = c.r === 'TOP' && c.split ? [10, 30] : [46 + c.off[0], 56 + c.off[1]];
    return sidePt(c.s, p);
  }

  function showGame(g, cfg, score, gameNo, onDone) {
    const teams = cfg.teams;
    $id('match').classList.remove('hidden');
    $id('m-title').textContent = cfg.title;
    $id('m-sub').textContent = `Ván ${gameNo} · BO${cfg.bo}`;
    $id('m-series').textContent = `${score[0]} - ${score[1]}`;
    $id('m-blue').innerHTML = `<span class="sb-logo">${clubLogoHTML(teams[0].name, (cfg.me || 0) === 0)}</span><span></span>`;
    $id('m-blue').lastChild.textContent = teams[0].name;
    $id('m-red').innerHTML = `<span></span><span class="sb-logo">${clubLogoHTML(teams[1].name, cfg.me === 1)}</span>`;
    $id('m-red').firstChild.textContent = teams[1].name;
    $id('comm').innerHTML = '';
    $id('m-feed').innerHTML = '';
    $id('m-banner').className = 'm-banner';
    $id('m-result').className = 'm-result hidden';
    $id('m-next').classList.add('hidden');
    // Quyền tua/bỏ qua: x4 mở khi vô địch LCS, bỏ qua ván mở ở cấp 10
    const perm = typeof matchPerms === 'function' ? matchPerms() : { maxSpeed: 4, skip: true };
    if (speed > perm.maxSpeed) speed = perm.maxSpeed;
    const skipBtn = $id('m-skip');
    skipBtn.disabled = !perm.skip;
    skipBtn.textContent = perm.skip ? '⏭ Bỏ qua ván' : `🔒 Bỏ qua ván (cấp ${typeof SKIP_LEVEL !== 'undefined' ? SKIP_LEVEL : 10})`;
    document.querySelectorAll('.spd').forEach(b => {
      const s = +b.dataset.s, lock = s > perm.maxSpeed;
      b.disabled = lock;
      b.textContent = lock ? `🔒 x${s}` : `x${s}`;
      b.title = lock ? 'Vô địch LCS Hạng 1 để mở khóa' : '';
      b.classList.toggle('active', s === speed);
    });

    const canvas = $id('minimap');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const P = v => (v / 100) * W;
    const bg = mapBackground(W);
    const fountain = s => sidePt(s, MAPD.fountain);

    // --- trạng thái ---
    const champs = [];
    [0, 1].forEach(s => ROLES.forEach(r => {
      const f = fountain(s);
      champs.push({ s, r, name: teams[s].players[r].name, x: f[0] + rand(-1.5, 1.5), y: f[1] + rand(-1.5, 1.5), path: [], busyUntil: 0, deadAt: -99, deadUntil: -1, wasDead: false, nextIdle: 10 + rand(0, 8), task: null, labelUntil: 0, off: [rand(-6, 6), rand(-6, 6)], split: Math.random() < 0.5 });
    }));
    const C = (s, r) => champs.find(c => c.s === s && c.r === r);
    const camps = [0, 1].flatMap(s => CAMPS_BLUE.map(c => ({ ...c, s, p: sidePt(s, c.p), deadUntil: 90 })));
    const pits = { dragonUntil: 300, baronUntil: 1200, heraldTaken: false };
    let waves = [], nextWave = 65;
    const fx = [];
    const evs = g.events;
    let gs = 0, idx = 0, look = 0, done = false, last = performance.now(), lastDom = 0;
    let snap = { kills: [0, 0], gold: [2500, 2500], towers: [0, 0], drag: [0, 0], baron: [0, 0], kd: [0, 1].map(() => Object.fromEntries(ROLES.map(r => [r, [0, 0]]))), lanes: [[0, 0, 0], [0, 0, 0]], inhib: [[0, 0, 0], [0, 0, 0]], nt: [0, 0], nexus: [1, 1] };
    updateBoard(snap, teams);

    const goTo = (c, pt) => { c.path = route([c.x, c.y], pt); };
    const now = () => performance.now();
    const addFx = o => fx.push({ born: now(), ...o });
    const teamCol = s => (s === 0 ? '#4f8cff' : s === 1 ? '#ff5370' : '#ffd166');

    function addLine(e) {
      const d = document.createElement('div');
      d.className = `c-line ${e.side === 0 ? 'blue' : e.side === 1 ? 'red' : 'neutral'} ${e.big ? 'big' : ''}`;
      d.innerHTML = `<span class="c-time">${fmtTime(e.t)}</span><span class="c-text"></span>`;
      d.querySelector('.c-text').textContent = e.text;
      $id('comm').prepend(d);
    }
    function feed(k) {
      const el = document.createElement('div');
      el.className = 'kf ' + (k.s === 0 ? 'blue' : 'red');
      el.innerHTML = `<b></b><i>⚔</i><span></span>`;
      el.querySelector('b').textContent = teams[k.s].players[k.k].name;
      el.querySelector('span').textContent = teams[1 - k.s].players[k.v].name;
      const box = $id('m-feed');
      box.prepend(el);
      while (box.children.length > 4) box.lastChild.remove();
      setTimeout(() => el.classList.add('out'), 4500);
      setTimeout(() => el.remove(), 5000);
    }
    function banner(text, side) {
      const b = $id('m-banner');
      b.textContent = text;
      b.className = 'm-banner';
      void b.offsetWidth;
      b.className = 'm-banner show ' + (side === 0 ? 'blue' : side === 1 ? 'red' : '');
    }

    // --- áp dụng một sự kiện ---
    function apply(e, quiet) {
      snap = e.snap;
      addLine(e);
      if (e.obj === 'dragon' || e.obj === 'elder') pits.dragonUntil = e.t + (e.obj === 'elder' ? 360 : 300);
      if (e.obj === 'baron') pits.baronUntil = e.t + 360;
      if (e.obj === 'herald') pits.heraldTaken = true;
      if (!quiet) {
        const L = e.loc;
        if (L) {
          if (e.type === 'fight' || e.type === 'ace') { addFx({ t: 'spot', x: L[0], y: L[1], dur: 2200 }); addFx({ t: 'icon', x: L[0], y: L[1], txt: '⚔️', dur: 1400 }); }
          if (e.type === 'tower') { addFx({ t: 'boom', x: L[0], y: L[1], c: '#ffb347', dur: 1200 }); sparks(L, '#ffb347', 18); }
          if (e.type === 'obj') { addFx({ t: 'ring', x: L[0], y: L[1], c: e.obj === 'baron' ? '#b57bff' : '#ffb81f', dur: 1600 }); addFx({ t: 'icon', x: L[0], y: L[1], txt: { dragon: '🐉', soul: '✨', elder: '🐲', baron: '👾', herald: '👁️' }[e.obj] || '⭐', dur: 1600 }); }
          if (e.type === 'end') { addFx({ t: 'boom', x: L[0], y: L[1], c: '#ffffff', dur: 2000, big: 1 }); sparks(L, teamCol(e.side), 40); }
          if (e.type === 'kill') addFx({ t: 'spot', x: L[0], y: L[1], dur: 1200, small: 1 });
        }
        (e.kills || []).forEach(k => {
          const a = C(k.s, k.k), v = C(1 - k.s, k.v);
          addFx({ t: 'beam', x: a.x, y: a.y, x2: v.x, y2: v.y, c: teamCol(k.s), dur: 900 });
          sparks([v.x, v.y], teamCol(k.s), 10);
          a.labelUntil = v.labelUntil = now() + 2600;
          feed(k);
        });
        if (e.banner) banner(e.banner, e.side);
      }
      e.dead.forEach(([s, r]) => {
        const c = C(s, r);
        c.deadAt = e.t; c.deadUntil = e.t + 10 + (e.t / 60) * 1.1; c.wasDead = true; c.path = []; c.task = null;
      });
      updateBoard(snap, teams);
    }
    function sparks(p, c, n) {
      for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), v = rand(4, 12); addFx({ t: 'spark', x: p[0], y: p[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v, c, dur: rand(500, 900) }); }
    }

    // --- tướng tự hành động khi rảnh ---
    function idle(c) {
      if (c.r === 'JNG' && gs < 25 * 60 && gs >= 85 && Math.random() < 0.8) {
        const own = camps.filter(k => k.s === c.s && gs >= k.deadUntil);
        if (own.length) {
          const k = own.sort((a, b) => dist2([c.x, c.y], a.p) - dist2([c.x, c.y], b.p))[0];
          c.task = { camp: k }; goTo(c, k.p); c.nextIdle = gs + 40; return;
        }
      }
      goTo(c, jit(homePos(c, gs), 3));
      c.task = null; c.nextIdle = gs + rand(8, 16);
    }

    // --- lính ---
    function stepWaves(dtg) {
      if (gs >= nextWave) {
        nextWave += 30;
        LANES.forEach((ln, li) => [0, 1].forEach(s => waves.push({ s, li, pos: s === 0 ? 0 : LANE_GEO[li].len, stopAt: null })));
      }
      waves.forEach(w => {
        if (w.stopAt != null) return;
        const enemyIdx = Math.min(3, snap.lanes[1 - w.s][w.li]);
        const lim = enemyIdx >= 3 && snap.inhib[1 - w.s][w.li] ? (w.s === 0 ? LANE_GEO[w.li].len : 0) : LANE_STOPS[w.li][1 - w.s][enemyIdx];
        const front = waves.filter(o => o.li === w.li && o.s !== w.s && o.stopAt == null || (o.li === w.li && o.s !== w.s && o.stopAt > gs));
        const dir = w.s === 0 ? 1 : -1;
        w.pos += dir * 1.5 * dtg;
        let stop = (w.s === 0 && w.pos >= lim - 2) || (w.s === 1 && w.pos <= lim + 2);
        for (const o of front) if ((w.s === 0 && w.pos >= o.pos - 1.5) || (w.s === 1 && w.pos <= o.pos + 1.5)) { stop = true; if (o.stopAt == null) o.stopAt = gs + 14; }
        if (stop) w.stopAt = gs + 14;
      });
      waves = waves.filter(w => w.stopAt == null || gs < w.stopAt);
    }

    function finish() {
      done = true;
      gs = g.duration;
      const win = g.winner === (cfg.me || 0);
      const final = score.slice(); final[g.winner]++;
      $id('m-series').textContent = `${final[0]} - ${final[1]}`;
      const r = $id('m-result');
      r.className = `m-result ${win ? 'win' : 'lose'}`;
      r.textContent = win ? 'CHIẾN THẮNG' : 'THẤT BẠI';
      const need = Math.ceil(cfg.bo / 2);
      const over = final[0] >= need || final[1] >= need;
      const nb = $id('m-next');
      nb.textContent = over ? 'Xem kết quả ▶' : 'Ván tiếp theo ▶';
      nb.classList.remove('hidden');
      $id('m-skip').disabled = true;
      nb.onclick = () => { cancelAnimationFrame(raf); score[g.winner]++; onDone(); };
    }
    $id('m-skip').onclick = () => {
      while (idx < evs.length) apply(evs[idx++], true);
      gs = g.duration; look = evs.length; waves = [];
      champs.forEach(c => { if (gs < c.deadUntil) return; const h = homePos(c, gs); c.x = h[0]; c.y = h[1]; c.path = []; });
      finish();
    };
    document.querySelectorAll('.spd').forEach(b => b.onclick = () => {
      speed = +b.dataset.s;
      document.querySelectorAll('.spd').forEach(x => x.classList.toggle('active', x === b));
    });

    function step(t) {
      const dt = Math.min(0.1, (t - last) / 1000); last = t;
      const dtg = done ? dt * GS * 0.3 : dt * GS * speed;
      if (!done) {
        gs += dtg;
        // di chuyển trước tới vị trí sự kiện sắp xảy ra
        while (look < evs.length && evs[look].t <= gs + LEAD) {
          const e = evs[look++];
          if (!e.loc) continue;
          e.inv.forEach(([s, r]) => { const c = C(s, r); if (gs < c.deadUntil) return; goTo(c, jit(e.loc, 3)); c.busyUntil = e.t + 18; c.task = null; });
        }
        while (idx < evs.length && evs[idx].t <= gs) apply(evs[idx++], false);
        if (idx >= evs.length) finish();
        stepWaves(dtg);
      }
      // tướng
      champs.forEach(c => {
        if (gs < c.deadUntil) {
          if (gs - c.deadAt > 6) { const f = fountain(c.s); c.x = f[0]; c.y = f[1]; }
          return;
        }
        if (c.wasDead) { c.wasDead = false; const f = fountain(c.s); c.x = f[0]; c.y = f[1]; c.nextIdle = gs; }
        if (c.path.length) {
          let move = SPEED * dtg * (gs < c.busyUntil ? 1.25 : 1);
          while (move > 0 && c.path.length) {
            const p = c.path[0], d = dist2([c.x, c.y], p);
            if (d <= move) { c.x = p[0]; c.y = p[1]; c.path.shift(); move -= d; }
            else { c.x += (p[0] - c.x) / d * move; c.y += (p[1] - c.y) / d * move; move = 0; }
          }
          if (!c.path.length && c.task && c.task.camp) {
            const k = c.task.camp;
            if (gs >= k.deadUntil) { k.deadUntil = gs + k.rs; sparks(k.p, k.c, 6); }
            c.task = null; c.nextIdle = gs + 6;
          }
        } else if (gs > c.busyUntil && gs >= c.nextIdle && !done) idle(c);
      });
      $id('m-clock').textContent = fmtTime(Math.min(gs, g.duration));
      // cập nhật trạng thái hồi sinh trong bảng K/D (4 lần/giây)
      if (t - lastDom > 250) {
        lastDom = t;
        [0, 1].forEach(s => ROLES.forEach((r, i) => {
          const row = $id('m-kda' + s).children[i]; if (!row) return;
          const c = C(s, r), dead = gs < c.deadUntil && !done;
          row.classList.toggle('dead', dead);
          row.dataset.respawn = dead ? Math.ceil(c.deadUntil - gs) + 's' : '';
        }));
      }
      draw();
      raf = requestAnimationFrame(step);
    }

    // --- vẽ ---
    function draw() {
      ctx.drawImage(bg, 0, 0, W, W);
      const tnow = now();
      // bãi quái
      camps.forEach(k => {
        const alive = gs >= k.deadUntil;
        ctx.beginPath(); ctx.arc(P(k.p[0]), P(k.p[1]), P(alive ? (k.big ? 1.6 : 1.2) : 0.7), 0, 7);
        ctx.fillStyle = alive ? k.c : 'rgba(150,150,150,.45)'; ctx.fill();
        if (alive) { ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.5; ctx.stroke(); }
      });
      // hố Rồng / Baron
      const pit = (p, icon, until, col, spawn) => {
        if (gs >= until && gs >= spawn) {
          ctx.globalAlpha = 0.85 + Math.sin(tnow / 300) * 0.15;
          ctx.font = `${Math.round(P(4.4))}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(icon, P(p[0]), P(p[1]));
          ctx.globalAlpha = 1;
        } else {
          ctx.font = `bold ${Math.round(P(2.2))}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = col; ctx.fillText(fmtTime(Math.max(until, spawn) - gs), P(p[0]), P(p[1]));
        }
      };
      pit(MAPD.dragon, '🐉', pits.dragonUntil, '#ffb81f', 300);
      if (gs < 1200) { if (!pits.heraldTaken && gs >= 480) pit(MAPD.baron, '👁️', 0, '#b57bff', 480); else pit(MAPD.baron, '👾', 1200, '#b57bff', 1200); }
      else pit(MAPD.baron, '👾', pits.baronUntil, '#b57bff', 1200);
      // công trình
      const winner = done ? g.winner : -1;
      [0, 1].forEach(side => {
        const col = side === 0 ? '#4f8cff' : '#ff5370';
        LANES.forEach((ln, i) => {
          MAPD.towers[ln].forEach((t, j) => tower(sidePt(side, t), snap.lanes[side][i] <= j, col));
          const ip = sidePt(side, MAPD.inhib[ln]);
          ctx.beginPath(); ctx.arc(P(ip[0]), P(ip[1]), P(1.5), 0, 7);
          ctx.fillStyle = snap.inhib[side][i] ? '#3a3a3a' : col; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2; ctx.stroke();
        });
        MAPD.nexusT.forEach((t, k) => tower(sidePt(side, t), snap.nt[side] <= k, col));
        const np = sidePt(side, MAPD.nexus);
        const alive = snap.nexus[side] && winner !== 1 - side;
        ctx.save(); ctx.translate(P(np[0]), P(np[1])); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = alive ? col : '#333'; ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2;
        ctx.fillRect(-P(2.4), -P(2.4), P(4.8), P(4.8)); ctx.strokeRect(-P(2.4), -P(2.4), P(4.8), P(4.8));
        ctx.restore();
      });
      // lính
      waves.forEach(w => {
        const dir = w.s === 0 ? -1 : 1;
        for (let i = 0; i < 3; i++) {
          const p = laneAt(w.li, w.pos + dir * i * 1.1);
          ctx.fillStyle = w.s === 0 ? '#9cc3ff' : '#ffb3c0';
          ctx.beginPath(); ctx.arc(P(p[0]), P(p[1]), P(0.55), 0, 7); ctx.fill();
        }
      });
      // hiệu ứng nền (vùng sáng giao tranh)
      fx.forEach(f => {
        const a = (tnow - f.born) / f.dur; if (f.t !== 'spot' || a > 1) return;
        const r = P(f.small ? 7 : 12);
        const gr = ctx.createRadialGradient(P(f.x), P(f.y), 0, P(f.x), P(f.y), r);
        gr.addColorStop(0, `rgba(255,220,120,${0.35 * (1 - a)})`); gr.addColorStop(1, 'transparent');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(P(f.x), P(f.y), r, 0, 7); ctx.fill();
      });
      // tướng
      champs.forEach(c => {
        const dead = gs < c.deadUntil;
        const x = P(c.x), y = P(c.y), r = P(2.9);
        if (dead && gs - c.deadAt <= 6) {
          ctx.font = `${Math.round(P(3.6))}px "Segoe UI Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('💀', x, y);
          return;
        }
        if (dead) return;
        ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, 7);
        ctx.fillStyle = c.s === 0 ? '#4f8cff' : '#ff5370'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r - 1, 0, 7);
        ctx.fillStyle = c.s === 0 ? '#10204a' : '#4a1020'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(P(2.5))}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText({ TOP: 'T', JNG: 'J', MID: 'M', ADC: 'A', SUP: 'S' }[c.r], x, y + 0.5);
        if (tnow < c.labelUntil) {
          ctx.font = `bold ${Math.round(P(2.3))}px sans-serif`;
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(c.name, x, y - r - P(2));
          ctx.fillStyle = c.s === 0 ? '#bcd4ff' : '#ffc4ce'; ctx.fillText(c.name, x, y - r - P(2));
        }
      });
      // hiệu ứng trên cùng
      for (let i = fx.length - 1; i >= 0; i--) {
        const f = fx[i], a = (tnow - f.born) / f.dur;
        if (a > 1) { fx.splice(i, 1); continue; }
        if (f.t === 'beam') {
          ctx.strokeStyle = f.c; ctx.globalAlpha = 1 - a; ctx.lineWidth = P(0.8);
          ctx.beginPath(); ctx.moveTo(P(f.x), P(f.y)); ctx.lineTo(P(f.x2), P(f.y2)); ctx.stroke(); ctx.globalAlpha = 1;
        } else if (f.t === 'spark') {
          const k = a * f.dur / 1000;
          ctx.fillStyle = f.c; ctx.globalAlpha = 1 - a;
          ctx.beginPath(); ctx.arc(P(f.x + f.vx * k), P(f.y + f.vy * k), P(0.5), 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        } else if (f.t === 'ring' || f.t === 'boom') {
          ctx.strokeStyle = f.c; ctx.globalAlpha = 1 - a; ctx.lineWidth = P(f.t === 'boom' ? 1 : 0.7);
          ctx.beginPath(); ctx.arc(P(f.x), P(f.y), P((f.big ? 18 : f.t === 'boom' ? 6 : 9) * a + 1), 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
        } else if (f.t === 'icon') {
          ctx.globalAlpha = 1 - a * a;
          ctx.font = `${Math.round(P(5 + a * 2))}px "Segoe UI Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(f.txt, P(f.x), P(f.y) - P(4 + a * 4)); ctx.globalAlpha = 1;
        }
      }
    }
    function tower(p, alive, col) {
      const x = P(p[0]), y = P(p[1]), s = P(1.5);
      if (!alive) { ctx.fillStyle = 'rgba(90,90,90,.7)'; ctx.fillRect(x - s * 0.7, y - s * 0.4, s * 1.4, s * 0.8); return; }
      ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(x, y - s * 1.3); ctx.lineTo(x + s, y + s * 0.9); ctx.lineTo(x - s, y + s * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(step);
  }

  function updateBoard(s, teams) {
    $id('m-k0').textContent = s.kills[0];
    $id('m-k1').textContent = s.kills[1];
    const gold = v => (v / 1000).toFixed(1) + 'k';
    $id('m-s0').innerHTML = `💰 ${gold(s.gold[0])} · 🏰 ${s.towers[0]} · 🐉 ${s.drag[0]} · 🟣 ${s.baron[0]}`;
    $id('m-s1').innerHTML = `🟣 ${s.baron[1]} · 🐉 ${s.drag[1]} · 🏰 ${s.towers[1]} · 💰 ${gold(s.gold[1])}`;
    const diff = s.gold[0] - s.gold[1];
    $id('m-gd').textContent = diff === 0 ? 'Cân bằng vàng' : `${diff > 0 ? '◀' : ''} ${(Math.abs(diff) / 1000).toFixed(1)}k ${diff < 0 ? '▶' : ''}`;
    $id('m-gd').className = 'gd ' + (diff > 0 ? 'blue' : diff < 0 ? 'red' : '');
    [0, 1].forEach(side => {
      const box = $id('m-kda' + side);
      const prev = [...box.children].map(r => [r.className, r.dataset.respawn]);
      box.innerHTML = ROLES.map(r => {
        const [k, d] = s.kd[side][r];
        const c = teams[side].players[r];
        return `<div class="kda-row"><span class="kav tier-${c.tier.cls}">${avatarHTML(c)}</span><span class="kn"></span><span class="kdv">${k} / ${d}</span></div>`;
      }).join('');
      box.querySelectorAll('.kn').forEach((el, i) => el.textContent = teams[side].players[ROLES[i]].name);
      [...box.children].forEach((r, i) => { if (prev[i]) { r.className = prev[i][0]; r.dataset.respawn = prev[i][1] || ''; } });
    });
  }

  // Tạo sẵn toàn bộ các ván của một loạt (dùng cho trận trực tuyến)
  function genSeries(teams, bo, pWin) {
    const need = Math.ceil(bo / 2), sc = [0, 0], games = [];
    while (sc[0] < need && sc[1] < need) { const g = genGame(teams, Math.random() < pWin ? 0 : 1); sc[g.winner]++; games.push(g); }
    return games;
  }

  return { playSeries, genSeries };
})();
