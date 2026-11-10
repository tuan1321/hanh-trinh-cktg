// ===== Trạng thái & lưu trữ =====
const $ = s => document.querySelector(s);
const fmt = n => Math.round(n).toLocaleString('vi-VN');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GUEST_KEY = 'hanhtrinh_cktg_v1';
let SAVE_KEY = GUEST_KEY; // đổi sang khóa riêng của tài khoản khi đăng nhập (xem auth.js)
let S = null;
const SAVE_VER = 3;

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { }
  if (typeof cloudSave === 'function') cloudSave(); // đồng bộ lên tài khoản nếu đã đăng nhập
}
// Nâng cấp bản lưu cũ lên phiên bản hiện tại (dùng cả cho bản lưu trên tài khoản)
function migrate(s) {
  if (!s || typeof s !== 'object') return null;
  if (s.v === 1) { s.v = 2; s.best = {}; s.run = null; }
  if (s.v === 2) {
    // v3: giải đấu theo thể thức thật + độ khó. Giữ các giải đã vô địch (thành chương Dễ), hủy giải đang dở.
    s.v = 3; s.run = null; s.best = {};
    Object.keys(s.won || {}).forEach(id => { if (TOUR[id]) s.best[id] = TOUR[id].stages.length - 1; else delete s.won[id]; });
  }
  if (s.v !== SAVE_VER) return null;
  s.won = s.won || {}; s.best = s.best || {}; s.ach = s.ach || {}; s.packs = s.packs || [];
  s.stats = Object.assign({ w: 0, l: 0, titles: 0, fw: 0, maxUp: 0, maxPow: 0, ups: 0 }, s.stats || {});
  // bỏ thẻ không còn tồn tại
  Object.keys(s.cards || {}).forEach(k => { if (!cardOf(k) || !(s.cards[k] > 0)) delete s.cards[k]; });
  ROLES.forEach(r => { const c = cardOf(s.lineup && s.lineup[r]); if (!c || c.role !== r || !s.cards[s.lineup[r]]) s.lineup[r] = null; });
  return s;
}
function load() {
  try { return migrate(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch (e) { return null; }
}

const owned = k => S.cards[k] || 0;
const addCard = k => { S.cards[k] = owned(k) + 1; };
const removeCard = k => { S.cards[k]--; if (S.cards[k] <= 0) delete S.cards[k]; };
const inLineup = k => Object.values(S.lineup).includes(k);
const ownedKeys = () => Object.keys(S.cards).filter(k => cardOf(k));
const ownedBase = id => ownedKeys().some(k => cardOf(k).baseId === id);
// Xếp thẻ: các cấp + của cùng một thẻ (cùng tuyển thủ, cùng mùa) đứng liền nhau, cấp cao trước.
// cmp so sánh 2 nhóm qua thẻ đại diện (cấp cao nhất trong nhóm); first(c) = nhóm được ưu tiên lên đầu.
function groupSort(cards, cmp, first) {
  const g = new Map();
  cards.forEach(c => { if (!g.has(c.baseId)) g.set(c.baseId, []); g.get(c.baseId).push(c); });
  const groups = [...g.values()].map(arr => arr.sort((a, b) => b.lv - a.lv));
  const pri = arr => (first && arr.some(first) ? 1 : 0);
  groups.sort((A, B) => pri(B) - pri(A) || cmp(A[0], B[0]) || A[0].baseId.localeCompare(B[0].baseId));
  return groups.flat();
}

function newGame() {
  const keep = S ? { profile: S.profile, friends: S.friends } : {}; // chơi lại vẫn giữ mã kết bạn & bạn bè
  const nameKeep = S ? { teamName: S.teamName, nameKey: S.nameKey, myNames: S.myNames, nameChanges: S.nameChanges, wantName: S.wantName } : {}; // chơi lại vẫn giữ tên đội
  S = { v: SAVE_VER, ...keep, teamName: null, ...nameKeep, money: 1500, level: 1, exp: 0, cards: {}, lineup: { TOP: null, JNG: null, MID: null, ADC: null, SUP: null }, packs: [], won: {}, best: {}, run: null, ach: {}, stats: { w: 0, l: 0, titles: 0, fw: 0, maxUp: 0, maxPow: 0, ups: 0 } };
  const got = [];
  const used = new Set();
  ROLES.forEach(r => {
    const c = pick(CARDS.filter(c => c.role === r && c.rating <= 64));
    addCard(c.id); S.lineup[r] = c.id; got.push(c); used.add(c.name);
  });
  for (let i = 0; i < 2; i++) {
    const c = pick(CARDS.filter(c => c.rating <= 70 && !used.has(c.name)));
    addCard(c.id); got.push(c); used.add(c.name);
  }
  ensureSocial(); ensureName();
  save();
  return got;
}

// ===== Sức mạnh đội hình =====
const lineupCards = () => ROLES.map(r => (S.lineup[r] ? cardOf(S.lineup[r]) : null));
// Độ ăn ý: mỗi liên kết cộng điểm cho từng tuyển thủ tham gia.
// Sức mạnh đội = TB chỉ số tổng + TB chỉ số ẩn × HIDDEN_W + điểm ăn ý đội (tối đa +CHEM_TEAM_CAP).
const CHEM_CARD_CAP = 7, CHEM_MULT = 1.5, CHEM_TEAM_CAP = 9;
const isChamp = c => WORLDS_CHAMPS[c.year] === c.team;
function groupBy(arr, fn) { const g = {}; arr.forEach(x => (g[fn(x)] = g[fn(x)] || []).push(x)); return g; }
function chemistry(cards) {
  const cs = cards.filter(Boolean);
  const per = Object.fromEntries(cs.map(c => [c.id, 0]));
  const links = [];
  const add = (members, b, icon, name, desc, team) => {
    members.forEach(c => per[c.id] += b);
    links.push({ icon, name, desc, b, team, names: members.map(c => c.name) });
  };
  // 1. Đồng đội cùng đội, cùng mùa
  Object.values(groupBy(cs, c => c.team + '|' + c.year)).filter(g => g.length >= 2).forEach(g => {
    add(g, (g.length - 1) * 1.0, '🤝', `Đồng đội ${g[0].team} ${g[0].year}`, `${g.length} người cùng đội cùng mùa: +${g.length - 1} mỗi người`, g[0].team);
    if (g.length === 5) add(g, 2, '👑', 'Đội hình huyền thoại', `Đủ 5 người của ${g[0].team} ${g[0].year}: +2 mỗi người`, g[0].team);
  });
  // 2. Cùng màu áo (cùng đội, khác mùa)
  Object.values(groupBy(cs, c => c.team)).forEach(g => {
    const yrs = new Set(g.map(c => c.year));
    if (g.length < 2 || yrs.size < 2) return;
    const mem = g.filter(c => g.some(o => o.year !== c.year));
    mem.forEach(c => per[c.id] += 0.4 * g.filter(o => o.year !== c.year).length);
    links.push({ icon: '🎽', name: `Cùng màu áo ${g[0].team}`, desc: '+0.4 cho mỗi đồng đội khác mùa', b: 0.4, team: g[0].team, names: mem.map(c => c.name) });
  });
  // 3. Bộ đôi ăn ý theo vị trí (cùng đội cùng mùa)
  const R = Object.fromEntries(cs.map(c => [c.role, c]));
  const duo = (a, b) => R[a] && R[b] && R[a].team === R[b].team && R[a].year === R[b].year;
  if (duo('ADC', 'SUP')) add([R.ADC, R.SUP], 1, '🏹', 'Cặp đôi đường dưới', 'Xạ thủ + Hỗ trợ cùng đội cùng mùa: +1', R.ADC.team);
  if (duo('MID', 'JNG')) add([R.MID, R.JNG], 1, '🔮', 'Song sát giữa – rừng', 'Đường giữa + Đi rừng cùng đội cùng mùa: +1', R.MID.team);
  if (duo('TOP', 'JNG')) add([R.TOP, R.JNG], 0.6, '🛡️', 'Trục đường trên', 'Đường trên + Đi rừng cùng đội cùng mùa: +0.6', R.TOP.team);
  // 4. Cùng khu vực
  Object.entries(groupBy(cs, c => c.region)).forEach(([rg, g]) => {
    if (g.length === 5) add(g, 1, '🌏', `Thuần ${rg}`, `Cả 5 người khu vực ${rg}: +1`);
    else if (g.length >= 3) add(g, 0.5, '🌏', `Liên minh ${rg}`, `${g.length} người khu vực ${rg}: +0.5`);
  });
  // 5. Cùng thế hệ (cùng năm, khác đội cũng tính)
  Object.entries(groupBy(cs, c => c.year)).forEach(([y, g]) => {
    if (g.length >= 3) add(g, 0.5, '📅', `Thế hệ ${y}`, `${g.length} người cùng mùa ${y}: +0.5`);
  });
  // 6. Nhà vô địch thế giới
  const ch = cs.filter(isChamp);
  if (ch.length) add(ch, 0.5, '🏆', 'Nhà vô địch CKTG', 'Thẻ của mùa vô địch thế giới: +0.5');
  if (ch.length >= 3) add(ch, 0.5, '🔥', 'Bản lĩnh vô địch', '3+ nhà vô địch thế giới: +0.5 nữa');

  Object.keys(per).forEach(id => per[id] = Math.min(CHEM_CARD_CAP, +per[id].toFixed(1)));
  const sum = Object.values(per).reduce((a, b) => a + b, 0);
  return { bonus: Math.min(CHEM_TEAM_CAP, +(sum / 5 * CHEM_MULT).toFixed(1)), per, links };
}
const hiddenBonus = cs => +(cs.reduce((s, c) => s + c.hidden, 0) / 5 * HIDDEN_W).toFixed(1);
function powerOf(cards) {
  const cs = cards.filter(Boolean);
  if (cs.length < 5) return null;
  return +(cs.reduce((s, c) => s + c.rating, 0) / 5 + hiddenBonus(cs) + chemistry(cs).bonus).toFixed(1);
}
const winProb = (a, b) => 1 / (1 + Math.exp(-(a - b) / 5.5));
function myTeam() {
  const cs = lineupCards();
  const power = powerOf(cs);
  if (power == null) return null;
  if (power > (S.stats.maxPow || 0)) S.stats.maxPow = power;
  return { name: S.teamName, players: Object.fromEntries(ROLES.map((r, i) => [r, cs[i]])), power };
}
function makeOpponent(region, P, name) {
  const players = {};
  const mine = new Set(lineupCards().filter(Boolean).map(c => c.name));
  const base = CARDS.filter(c => !mine.has(c.name));
  ROLES.forEach(r => {
    let pool = base.filter(c => c.role === r && Math.abs(c.rating - P) <= 5 && (region === 'INT' || c.region === region));
    if (pool.length < 2) pool = base.filter(c => c.role === r && Math.abs(c.rating - P) <= 7);
    if (!pool.length) pool = base.filter(c => c.role === r).sort((a, b) => Math.abs(a.rating - P) - Math.abs(b.rating - P)).slice(0, 3);
    players[r] = pick(pool);
  });
  if (!name) {
    name = pick(region === 'INT' ? allTeamNames() : TEAM_NAMES[region]);
    if (name === S.teamName) name += ' II';
  }
  return { name, players, power: +P.toFixed(1), region };
}

// ===== Kinh nghiệm & cấp độ =====
const expNeed = lv => 100 + (lv - 1) * 60;
function levelPack(lv) {
  const order = ['bronze', 'silver', 'gold', 'diamond', 'legend'];
  let i = lv >= 25 ? 3 : lv >= 15 ? 2 : lv >= 7 ? 1 : 0;
  if (lv % 5 === 0) i = Math.min(4, i + 1);
  return order[i];
}
function gainExp(x) {
  S.exp += x;
  const ups = [];
  while (S.exp >= expNeed(S.level)) {
    S.exp -= expNeed(S.level); S.level++;
    const p = levelPack(S.level); S.packs.push(p);
    ups.push({ level: S.level, pack: p });
  }
  return ups;
}

// ===== Quyền khi xem trận =====
const SKIP_LEVEL = 10;
const anyWon = tid => DIFFS.some(d => S.won[tk(tid, d.id)]);
function matchPerms() {
  return { maxSpeed: anyWon('lcs1') ? 4 : 2, skip: S.level >= SKIP_LEVEL };
}

// ===== Thẻ =====
const lvClass = lv => (lv >= 10 ? 'lv-max' : lv >= 8 ? 'lv-gold' : lv >= 5 ? 'lv-silver' : 'lv-bronze');
const lvBadge = c => (c.lv ? `<span class="c-lv ${lvClass(c.lv)}">+${c.lv}</span>` : '');
const isMsiChamp = c => typeof MSI_CHAMPS !== 'undefined' && MSI_CHAMPS[c.year] === c.team;
// Vòng nguyệt quế quanh ảnh thẻ mùa vô địch (tạo 1 lần)
const LAUREL_SVG = (() => {
  let leaves = '';
  for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
    const deg = 90 + side * (28 + i * 15);          // từ dưới đáy vòng lên đỉnh, hai bên
    const a = deg * Math.PI / 180, x = 50 + Math.cos(a) * 47, y = 50 + Math.sin(a) * 47;
    const rot = deg + 90 + side * 28;               // lá xuôi theo vòng, chếch ra ngoài
    leaves += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="6" ry="2.6" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  return `<svg class="c-laurel" viewBox="0 0 100 100" aria-hidden="true">${leaves}</svg>`;
})();
function cardHTML(c, o = {}) {
  const t = c.tier;
  const hide = o.locked; // thẻ chưa mở: ẩn ảnh và chỉ số
  const champ = !hide && isChamp(c), msi = !hide && isMsiChamp(c);
  const teamName = esc(TEAM_INFO[c.team]?.name || c.team);
  // huy hiệu trạng thái xếp thành 2 cột hai bên ảnh, không che mặt / chữ
  const left = (o.inLineup ? '<span class="c-chip c-in" title="Đang dùng trong đội hình">✓</span>' : '')
    + (o.isNew ? '<span class="c-chip c-new">MỚI</span>' : '')
    + (champ && msi ? `<span class="c-chip c-msi" title="Vô địch MSI ${c.year}">MSI</span>` : '')
    + (o.chem > 0 ? `<span class="c-chip c-chem" title="Điểm ăn ý">🔗+${o.chem}</span>` : '');
  const right = (o.count > 1 ? `<span class="c-chip c-count" title="Đang có ${o.count} thẻ">${o.count} thẻ</span>` : '')
    + (o.delta != null ? `<span class="c-chip c-delta ${o.delta > 0 ? 'up' : o.delta < 0 ? 'down' : ''}">⚡${o.delta > 0 ? '+' : ''}${o.delta}</span>` : '');
  const yearTag = champ ? `<em class="champ" title="Vô địch CKTG ${c.year}">🏆 CKTG ${c.year}</em>`
    : msi ? `<em class="msi" title="Vô địch MSI ${c.year}">⭐ MSI ${c.year}</em>` : `<em>${c.year}</em>`;
  return `<div class="card tier-${t.cls} ${hide ? 'locked' : ''} ${c.lv ? 'upg ' + lvClass(c.lv) : ''} ${champ ? 'champ' : ''} ${msi ? 'msi' : ''} ${o.small ? 'small' : ''} ${o.click ? 'clickable' : ''}" data-id="${c.id}" style="${teamStyle(c.team)}">
    <div class="c-frame"></div><div class="c-bgi"></div>
    <div class="c-fx"></div>${champ || msi ? '<div class="c-glitter"></div>' : ''}
    <div class="c-teamglow"></div>
    <div class="c-watermark">${teamLogoHTML(c.team)}</div>
    <div class="card-head"><span class="c-tier">${t.id}</span><span class="c-logo" title="${teamName}">${teamLogoHTML(c.team)}</span><span class="c-rating">${hide ? '??' : c.rating}</span></div>
    <div class="c-avatar">${champ || msi ? LAUREL_SVG : ''}<div class="c-ph">${hide ? hiddenAvatarSVG() : avatarHTML(c)}</div>${yearTag}</div>
    ${left ? `<div class="c-chips l">${left}</div>` : ''}${right ? `<div class="c-chips r">${right}</div>` : ''}
    <div class="c-name"><span>${hide ? '? ? ?' : esc(c.name)}</span>${c.lv && !hide ? `<b class="c-nlv ${lvClass(c.lv)}">+${c.lv}</b>` : ''}</div>
    <div class="c-role">${ROLE_INFO[c.role].icon} ${c.role} · ${c.region}</div>
    <div class="c-team" title="${teamName}"><b>${c.team}</b><span>${c.year}</span></div>
    <div class="card-shine"></div>
  </div>`;
}
function equip(k) {
  const c = cardOf(k);
  const clash = ROLES.find(r => r !== c.role && S.lineup[r] && cardOf(S.lineup[r]).name === c.name);
  if (clash) { toast(`${c.name} đã có trong đội hình ở vị trí khác!`, 'err'); return false; }
  S.lineup[c.role] = k;
  save(); renderAll();
  toast(`Đã đưa ${c.name} (${c.year}${c.lv ? ' +' + c.lv : ''}) vào vị trí ${ROLE_INFO[c.role].vn}`);
  return true;
}
const freeCount = k => owned(k) - (inLineup(k) ? 1 : 0);
function sellCard(k) {
  if (freeCount(k) < 1) { toast('Không thể bán thẻ đang dùng trong đội hình!', 'err'); return false; }
  const c = cardOf(k), price = sellPrice(c);
  if (c.lv >= 3 && !confirm(`Bán ${c.name} ${c.year} +${c.lv} với giá ${fmt(price)} 💰?`)) return false;
  removeCard(k);
  S.money += price; save(); renderAll();
  toast(`Đã bán ${c.name} ${c.year}${c.lv ? ' +' + c.lv : ''} (+${fmt(price)} 💰)`);
  return true;
}
function sellDupes() {
  let total = 0, n = 0;
  ownedKeys().forEach(k => { const extra = S.cards[k] - 1; if (extra > 0) { total += extra * sellPrice(cardOf(k)); n += extra; } });
  if (!n) return toast('Không có thẻ trùng nào.');
  if (!confirm(`Bán ${n} thẻ trùng để nhận ${fmt(total)} 💰?\nLưu ý: thẻ trùng là nguyên liệu để nâng cấp thẻ.`)) return;
  ownedKeys().forEach(k => { if (S.cards[k] > 1) S.cards[k] = 1; });
  S.money += total; save(); renderAll();
  toast(`Đã bán ${n} thẻ trùng, nhận ${fmt(total)} 💰`);
}

// ===== Gói thẻ =====
function rollTier(odds) {
  const tot = Object.values(odds).reduce((a, b) => a + b, 0);
  let x = Math.random() * tot;
  for (const [t, w] of Object.entries(odds)) { x -= w; if (x <= 0) return t; }
  return Object.keys(odds)[0];
}
function openPack(pid, fromInventory) {
  const p = PACK[pid];
  if (fromInventory) {
    const i = S.packs.indexOf(pid); if (i < 0) return; S.packs.splice(i, 1);
  } else {
    if (S.money < p.price) return toast('Không đủ tiền!', 'err');
    S.money -= p.price;
  }
  const res = [];
  for (let i = 0; i < p.count; i++) {
    const tier = rollTier(p.odds);
    const c = pick(CARDS.filter(c => c.tier.id === tier));
    res.push({ c, isNew: !ownedBase(c.id) });
    addCard(c.id);
  }
  save(); renderAll();
  showPackModal(p, res);
}
// Hiệu ứng theo bậc: i = độ "hoành tráng", c = màu ánh sáng, n = số lần nhấp nháy trước khi mở
const TIER_FX = {
  B: { i: 0, c: '#a3aec2', n: 2 }, A: { i: 1, c: '#3ec5ff', n: 3 }, S: { i: 2, c: '#b57bff', n: 3 },
  'S+': { i: 3, c: '#ffb81f', n: 4 }, SS: { i: 4, c: '#ff4d6d', n: 5 }, SSS: { i: 5, c: '#ff5ee0', n: 6 },
};
// Mở gói: gói rung → từng thẻ bay ra → nhấp nháy → ánh sáng màu bậc → lật thẻ → vào khay → thẻ tiếp theo
function showPackModal(p, res) {
  SFX.ctx(); // mở khóa âm thanh ngay trong lượt bấm
  const fxOf = r => TIER_FX[r.c.tier.id] || TIER_FX.B;
  openModal(`<div class="po pack-${p.id}">
    <div class="po-head"><b>${p.icon} ${p.name}</b><span class="po-step" id="po-step">${res.length} thẻ</span></div>
    <div class="po-stage" id="po-stage">
      <div class="po-rays"></div><div class="po-glow"></div>
      <div class="po-card idle" id="po-card"><div class="po-pack"><span>${p.icon}</span><b>${p.name}</b></div></div>
      <div class="po-burst" id="po-burst"></div><div class="po-flash"></div>
      <div class="po-tap" id="po-tap">Chạm để mở gói</div>
    </div>
    <div class="po-tray" id="po-tray">${res.map(() => '<span class="po-slot">?</span>').join('')}</div>
    <div class="actions" id="po-act"><button class="btn ghost" id="po-skip">⏩ Mở hết</button><button class="btn primary" id="po-next">🎁 Mở gói</button></div>
  </div>`);
  const root = $('#modal-box .po'), stage = $('#po-stage'), slot = $('#po-card');
  const alive = () => root.isConnected;
  let fast = false, skipAll = false, wake = null, step = null;
  // chờ có thể bị rút ngắn khi người chơi chạm
  const wait = ms => new Promise(r => {
    if (fast || skipAll) return r();
    const t = setTimeout(() => { wake = null; r(); }, ms);
    wake = () => { clearTimeout(t); wake = null; r(); };
  });
  const waitTap = () => new Promise(r => { step = () => { step = null; r(); }; });
  stage.onclick = () => { if (step) step(); else { fast = true; SFX.cutSuspense(); if (wake) wake(); } };
  $('#po-next').onclick = () => { if (step) step(); };
  $('#po-skip').onclick = () => { skipAll = true; SFX.cutSuspense(); if (wake) wake(); if (step) step(); };
  const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const burst = n => { $('#po-burst').innerHTML = Array.from({ length: n }, (_, i) => `<i style="--a:${(360 / n * i + rand(-8, 8)).toFixed(0)}deg;--r:${rand(90, 180).toFixed(0)}px;--d:${rand(0, .12).toFixed(2)}s"></i>`).join(''); };
  const mini = (r, fx) => `<span class="po-mini" style="--tcol:${fx.c}" title="${esc(r.c.name)} ${r.c.year}"><span class="po-av">${avatarHTML(r.c)}</span><b>${r.c.tier.id}</b></span>`;

  (async () => {
    // 0) chờ người chơi bấm mở gói
    await waitTap();
    if (!alive()) return;
    $('#po-next').disabled = true;
    $('#po-tap').textContent = 'Chạm để mở nhanh';
    // 1) gói rung rồi bung ra
    slot.classList.remove('idle'); replay(slot, 'shake');
    SFX.packShake(); SFX.heartbeat(0.3); SFX.heartbeat(0.9, 1.1);
    await wait(1350);
    SFX.cutSuspense();
    if (!alive()) return;
    replay(stage, 'flash');
    for (let i = 0; i < res.length; i++) {
      if (!alive()) return;
      const r = res[i], fx = fxOf(r), last = i === res.length - 1;
      fast = false;
      $('#po-step').textContent = `Thẻ ${i + 1} / ${res.length}`;
      $('#po-tap').textContent = 'Chạm để mở nhanh';
      $('#po-next').disabled = true;
      stage.className = 'po-stage';
      stage.style.setProperty('--tc', fx.c);
      $('#po-burst').innerHTML = '';
      slot.className = 'po-card';
      slot.innerHTML = `<div class="flip"><div class="flip-inner"><div class="flip-back pack-${p.id}"><span>${p.icon}</span><b>?</b></div><div class="flip-front">${cardHTML(r.c, { isNew: r.isNew })}</div></div></div>`;
      if (!skipAll) {
        // 2) thẻ bay ra
        replay(slot, 'enter'); SFX.whoosh();
        await wait(800);
        // 3) nhấp nháy vài lần kèm nhịp tim (bậc càng cao càng nhiều lần, càng dồn dập)
        for (let k = 0; k < fx.n && !fast && !skipAll && alive(); k++) {
          replay(slot, 'pulse'); SFX.tick(k); SFX.heartbeat(0, 0.8 + k * 0.08);
          await wait(Math.max(300, 640 - k * 70));
        }
        if (!alive()) return;
        // 4) ánh sáng màu của bậc thẻ + trống lăn dồn tới lúc lật
        const D = [1.3, 1.5, 1.8, 2.1, 2.6, 3.0][fx.i];
        stage.classList.add('lit');
        if (fx.i >= 5) stage.classList.add('sss');
        if (fx.i >= 4) stage.classList.add('big');
        SFX.glow(fx.i);
        if (fx.i >= 3) SFX.stinger();
        if (!fast && !skipAll) { SFX.drumroll(D - 0.1, 0.1, 0.8 + fx.i * 0.08); SFX.swell(D - 0.05, 0.05, 0.8 + fx.i * 0.08); }
        await wait(D * 1000);
        SFX.cutSuspense();
        if (!alive()) return;
      } else {
        stage.classList.add('lit');
        SFX.flipQuick();
      }
      // 5) lật thẻ
      slot.querySelector('.flip').classList.add('flipped');
      replay(stage, 'flash');
      burst(12 + fx.i * 6);
      if (!skipAll) SFX.reveal(fx.i);
      if (fx.i >= 4) toast(`🔥 Thẻ ${r.c.tier.id}: ${r.c.name} ${r.c.year}!`, 'gold');
      $('#po-tray').children[i].outerHTML = mini(r, fx);
      if (skipAll) { await new Promise(rs => setTimeout(rs, 140)); continue; }
      // 6) chờ người chơi chạm để mở thẻ tiếp
      $('#po-next').disabled = false;
      $('#po-next').textContent = last ? 'Xem tất cả ▶' : 'Thẻ tiếp theo ▶';
      $('#po-tap').textContent = last ? 'Chạm để xem tất cả' : 'Chạm để mở thẻ tiếp';
      await waitTap();
    }
    if (!alive()) return;
    // tổng kết: cả gói
    if (skipAll) SFX.reveal(Math.max(...res.map(r => fxOf(r).i)));
    $('#po-step').textContent = `${res.length} thẻ mới`;
    stage.outerHTML = `<div class="po-sum">${res.map((r, i) => `<div class="po-sc" style="--i:${i}">${cardHTML(r.c, { isNew: r.isNew })}</div>`).join('')}</div>`;
    $('#po-tray').remove();
    $('#po-act').innerHTML = '<button class="btn primary" id="pack-done">Xong</button>';
    $('#pack-done').onclick = closeModal;
  })();
}

// ===== Modal & thông báo =====
function openModal(html, wide) {
  const wasOpen = !$('#modal').classList.contains('hidden');
  $('#modal-box').innerHTML = html;
  $('#modal-box').classList.toggle('wide', !!wide);
  $('#modal').classList.remove('hidden');
  modalOpenFx(wasOpen);
}
function closeModal() { modalGhostOut(); $('#modal').classList.add('hidden'); }
function toast(msg, type = '') {
  const d = document.createElement('div');
  d.className = `toast ${type}`; d.textContent = msg;
  $('#toasts').appendChild(d);
  setTimeout(() => d.classList.add('out'), 2600);
  setTimeout(() => d.remove(), 3100);
}

// ===== Render: header =====
function renderHeader() {
  animMoney(S.money);
  animLevel(S.level);
  $('#level').textContent = S.level;
  const need = expNeed(S.level);
  $('#xpfill').style.width = `${(S.exp / need) * 100}%`;
  $('#xptext').textContent = `${S.exp}/${need} EXP`;
  $('#pack-dot').classList.toggle('hidden', !S.packs.length);
  if (typeof achClaimable === 'function') $('#ach-dot').classList.toggle('hidden', !achClaimable());
}

// ===== Render: đội hình =====
function renderTeam() {
  const cs = lineupCards();
  const me = myTeam();
  const power = me ? me.power : null;
  const chem = chemistry(cs);
  const full = cs.filter(Boolean);
  const avg = full.length ? (full.reduce((s, c) => s + c.rating, 0) / full.length).toFixed(1) : '-';
  const hb = full.length === 5 ? hiddenBonus(full) : 0;
  $('#view-team').innerHTML = `
  <div class="panel team-hero">
    <div class="panel-head">
      <div class="team-name"><span class="my-logo">${clubLogoHTML(S.teamName, true)}</span><div class="tn-box"><label>Đội của bạn</label><button class="tn-name" id="team-name" title="Đổi tên đội"><b>${esc(S.teamName)}</b><i>✏️</i></button>${isDefaultName(S.teamName) ? '<small class="tn-hint">Tên mặc định · bấm để đặt tên riêng</small>' : ''}</div></div>
      <div class="power-ring" style="--p:${power ? Math.max(4, Math.min(100, (power - 55) / 60 * 100)).toFixed(0) : 0}"><div><small>Sức mạnh</small><b>${power ?? '—'}</b><span>TB ${avg} · ẩn +${hb} · ăn ý +${chem.bonus}</span></div></div>
    </div>
    <div class="lineup">
      ${ROLES.map((r, i) => `<div class="slot" data-role="${r}">
        <div class="slot-label">${ROLE_INFO[r].icon} ${ROLE_INFO[r].vn}</div>
        ${cs[i] ? cardHTML(cs[i], { click: true, chem: chem.per[cs[i].id] }) : `<div class="card empty clickable"><span>+</span><small>Chọn tuyển thủ</small></div>`}
      </div>`).join('')}
    </div>
  </div>
  ${chemPanelHTML(chem, power)}
  <div class="grid2">
    <div class="panel play-cta">
      <h3>🎮 Thi đấu</h3>
      <p class="muted">Giao hữu để kiếm tiền và kinh nghiệm. Tham gia giải đấu để mở khóa khu vực mới, tiến tới Chung Kết Thế Giới.</p>
      <div class="actions left">
        <button class="btn primary" id="btn-friendly">⚔️ Giao hữu (BO1)</button>
        <button class="btn" id="btn-gomap">🗺️ Bản đồ giải đấu</button>
      </div>
      ${S.run ? `<div class="notice">Đang dự <b>${TOUR[S.run.tid].name}</b> (${DIFFS[S.run.d].name}) – ${TOUR[S.run.tid].stages[S.run.stage].n}. <button class="btn small primary" id="btn-resume">Tiếp tục</button></div>` : ''}
      <p class="muted small">⏩ Tua x4: ${anyWon('lcs1') ? '✅ đã mở' : '🔒 vô địch LCS Hạng 1'} · ⏭ Bỏ qua ván: ${S.level >= SKIP_LEVEL ? '✅ đã mở' : `🔒 cấp ${SKIP_LEVEL}`}</p>
    </div>
    <div class="panel">
      <h3>📊 Thành tích</h3>
      <div class="stat-tiles">
        <div class="tile"><small>Thắng / Thua</small><b>${S.stats.w} / ${S.stats.l}</b></div>
        <div class="tile"><small>Danh hiệu</small><b>🏆 ${S.stats.titles}</b></div>
        <div class="tile"><small>Giải đã vô địch</small><b>${Object.keys(S.won).length} / ${TOURS.length * DIFFS.length}</b></div>
        <div class="tile"><small>Thẻ sưu tầm</small><b>${new Set(ownedKeys().map(k => cardOf(k).baseId)).size} / ${CARDS.length}</b></div>
      </div>
    </div>
  </div>`;
  $('#team-name').onclick = renameModal;
  document.querySelectorAll('#view-team .slot').forEach(el => el.onclick = () => pickModal(el.dataset.role));
  document.querySelectorAll('[data-sugg]').forEach(b => b.onclick = () => equip(b.dataset.sugg));
  $('#btn-friendly').onclick = friendly;
  $('#btn-gomap').onclick = () => switchView('map');
  if (S.run) $('#btn-resume').onclick = nextMatch;
}
// Sức mạnh đội nếu đưa thẻ k vào vị trí của nó (null nếu trùng tuyển thủ hoặc chưa đủ 5 người)
function powerIf(k) {
  const c = cardOf(k);
  if (ROLES.some(r => r !== c.role && S.lineup[r] && cardOf(S.lineup[r]).name === c.name)) return null;
  return powerOf(ROLES.map(r => (r === c.role ? c : S.lineup[r] ? cardOf(S.lineup[r]) : null)));
}
const CHEM_RULES = [
  ['🤝', 'Đồng đội cùng đội, cùng mùa', '+1 mỗi người cho mỗi đồng đội'],
  ['👑', 'Đội hình huyền thoại', 'Đủ 5 người cùng đội cùng mùa: +2 mỗi người'],
  ['🎽', 'Cùng màu áo', 'Cùng đội nhưng khác mùa: +0.4'],
  ['🏹', 'Cặp đôi đường dưới', 'Xạ thủ + Hỗ trợ cùng đội cùng mùa: +1'],
  ['🔮', 'Song sát giữa – rừng', 'Đường giữa + Đi rừng cùng đội cùng mùa: +1'],
  ['🛡️', 'Trục đường trên', 'Đường trên + Đi rừng cùng đội cùng mùa: +0.6'],
  ['🌏', 'Cùng khu vực', '3–4 người: +0.5 · đủ 5 người: +1'],
  ['📅', 'Cùng thế hệ', '3+ người cùng mùa giải (khác đội cũng được): +0.5'],
  ['🏆', 'Nhà vô địch CKTG', 'Thẻ mùa vô địch thế giới: +0.5 · 3+ thẻ: thêm +0.5'],
];
function chemPanelHTML(chem, power) {
  // gợi ý: thẻ trong bộ sưu tập giúp tăng sức mạnh nhiều nhất
  let sugg = [];
  if (power != null) {
    sugg = ownedKeys().filter(k => !inLineup(k))
      .map(k => ({ k, p: powerIf(k) })).filter(x => x.p != null && x.p > power)
      .sort((a, b) => b.p - a.p).slice(0, 3);
  }
  return `<div class="panel chem-panel">
    <div class="chem-head">
      <h3>🔗 Độ ăn ý <span class="chem-total">+${chem.bonus}</span></h3>
      <small class="muted">Trung bình điểm ăn ý của 5 tuyển thủ × ${CHEM_MULT}, cộng thẳng vào sức mạnh đội (tối đa +${CHEM_TEAM_CAP}).</small>
    </div>
    <div class="chem-list">${chem.links.length ? chem.links.map(l => `
      <div class="chem-row ${l.team ? 'teamed' : ''}" style="${l.team ? teamStyle(l.team) : ''}">
        <span class="cr-icon">${l.icon}</span>
        <div class="cr-main"><b>${esc(l.name)}</b><small>${l.names.map(esc).join(' · ')}</small></div>
        <em>${esc(l.desc)}</em>
      </div>`).join('') : '<p class="muted">Chưa có liên kết nào. Ghép tuyển thủ cùng đội, cùng mùa, cùng khu vực… để tăng sức mạnh!</p>'}</div>
    ${sugg.length ? `<div class="sugg"><b>💡 Gợi ý thay người</b>${sugg.map(s => { const c = cardOf(s.k); return `
      <button class="sugg-item" data-sugg="${s.k}" style="${teamStyle(c.team)}"><span class="si-av tier-${c.tier.cls}">${avatarHTML(c)}</span>
        <span><b>${esc(c.name)}${c.lv ? ' +' + c.lv : ''}</b> <small>${c.team} ${c.year} · ${ROLE_INFO[c.role].vn}</small></span><em>⚡ +${(s.p - power).toFixed(1)}</em></button>`; }).join('')}</div>` : ''}
    <details class="chem-rules"><summary>Cách tính điểm ăn ý</summary>
      <div class="rules">${CHEM_RULES.map(([i, n, d]) => `<div><span>${i}</span><b>${n}</b><small>${d}</small></div>`).join('')}</div>
      <p class="muted small">Mỗi tuyển thủ được cộng tối đa +${CHEM_CARD_CAP}. Thẻ có 🏆 cạnh năm là thẻ của mùa vô địch thế giới. Ngoài ra mỗi thẻ có <b>chỉ số ẩn “Bản lĩnh”</b> (xem trong chi tiết thẻ) cộng thêm vào sức mạnh đội.</p>
    </details>
  </div>`;
}
function pickModal(role) {
  const cur = powerOf(lineupCards());
  const list = ownedKeys().map(cardOf).filter(c => c.role === role)
    .map(c => ({ c, p: powerIf(c.id) }))
    .sort((a, b) => (b.p ?? -1) - (a.p ?? -1) || b.c.rating - a.c.rating);
  openModal(`<h2>${ROLE_INFO[role].icon} Chọn ${ROLE_INFO[role].vn}</h2>
    <p class="muted">Sắp xếp theo sức mạnh đội sau khi đổi (đã tính độ ăn ý và chỉ số ẩn). ⚡ là mức tăng/giảm so với hiện tại.</p>
    ${list.length ? `<div class="card-grid">${list.map(({ c, p }) => cardHTML(c, { click: true, count: owned(c.id), inLineup: S.lineup[role] === c.id, delta: cur != null && p != null && S.lineup[role] !== c.id ? +(p - cur).toFixed(1) : null })).join('')}</div>` : '<p class="muted center">Bạn chưa có thẻ nào ở vị trí này. Hãy mua gói trong Cửa hàng!</p>'}
    <div class="actions"><button class="btn" id="pm-close">Đóng</button></div>`, true);
  document.querySelectorAll('#modal-box .card[data-id]').forEach(el => el.onclick = () => { if (equip(el.dataset.id)) closeModal(); });
  $('#pm-close').onclick = closeModal;
}

// ===== Render: bộ sưu tập =====
const colFilter = { role: 'ALL', tier: 'ALL', all: false, sort: 'rating' };
function renderCollection() {
  // chỉ hiện thẻ gốc: gom mọi cấp + của cùng một thẻ thành 1 ô (số lượng = tổng các cấp)
  const groups = new Map();
  ownedKeys().forEach(k => {
    const c = cardOf(k);
    const g = groups.get(c.baseId) || { n: 0, keys: [] };
    g.n += owned(k); g.keys.push(c); groups.set(c.baseId, g);
  });
  const openKey = g => (g.keys.find(c => inLineup(c.id)) || g.keys.sort((a, b) => b.lv - a.lv)[0]).id;
  const mine = [...groups.keys()].map(id => CARD[id]);
  let list = colFilter.all ? mine.concat(CARDS.filter(c => !groups.has(c.id))) : mine;
  list = list.filter(c => (colFilter.role === 'ALL' || c.role === colFilter.role) && (colFilter.tier === 'ALL' || c.tier.id === colFilter.tier));
  list = list.slice().sort(colFilter.sort === 'rating' ? (a, b) => b.rating - a.rating : colFilter.sort === 'year' ? (a, b) => b.year - a.year || b.rating - a.rating : (a, b) => a.name.localeCompare(b.name) || a.year - b.year);
  const dupes = ownedKeys().reduce((s, k) => s + S.cards[k] - 1, 0);
  const nBase = groups.size;
  $('#view-collection').innerHTML = `
  <div class="panel">
    <div class="filters">
      <select id="f-role"><option value="ALL">Mọi vị trí</option>${ROLES.map(r => `<option value="${r}" ${colFilter.role === r ? 'selected' : ''}>${ROLE_INFO[r].vn}</option>`).join('')}</select>
      <select id="f-tier"><option value="ALL">Mọi bậc</option>${TIERS.map(t => `<option value="${t.id}" ${colFilter.tier === t.id ? 'selected' : ''}>${t.id}</option>`).join('')}</select>
      <select id="f-sort"><option value="rating">Chỉ số cao</option><option value="year" ${colFilter.sort === 'year' ? 'selected' : ''}>Năm mới nhất</option><option value="name" ${colFilter.sort === 'name' ? 'selected' : ''}>Tên A-Z</option></select>
      <label class="check"><input type="checkbox" id="f-all" ${colFilter.all ? 'checked' : ''}> Hiện cả thẻ chưa mở</label>
      <button class="btn small" id="sell-dupes">💸 Bán ${dupes} thẻ trùng</button>
    </div>
    <div class="tier-legend">${TIERS.map((t, i) => `<span class="tl tier-${t.cls}"><b>${t.id}</b> ${t.min ? '≥' + t.min : '<' + TIERS[i - 1].min} · ${t.desc}</span>`).join('')}</div>
    <p class="muted">Đã sưu tầm ${nBase}/${CARDS.length} thẻ. Nhấn vào thẻ để xem chi tiết, chỉ số ẩn và nâng cấp. Thẻ trùng dùng làm nguyên liệu nâng cấp.</p>
    <div class="card-grid">${list.map(c => { const g = groups.get(c.id); return g ? cardHTML(c, { click: true, count: g.n, inLineup: g.keys.some(x => inLineup(x.id)) }).replace(`data-id="${c.id}"`, `data-id="${openKey(g)}"`) : cardHTML(c, { locked: true }); }).join('') || '<p class="muted">Không có thẻ.</p>'}</div>
  </div>`;
  $('#f-role').onchange = e => { colFilter.role = e.target.value; renderCollection(); };
  $('#f-tier').onchange = e => { colFilter.tier = e.target.value; renderCollection(); };
  $('#f-sort').onchange = e => { colFilter.sort = e.target.value; renderCollection(); };
  $('#f-all').onchange = e => { colFilter.all = e.target.checked; renderCollection(); };
  $('#sell-dupes').onclick = sellDupes;
  document.querySelectorAll('#view-collection .card.clickable').forEach(el => el.onclick = () => cardModal(el.dataset.id));
}
function statBars(c, next) {
  return `<div class="sbars">${STAT_NAMES.map(([k, n], i) => {
    const v = c.stats[i], w = Math.max(4, Math.min(100, (v - 40) / 90 * 100));
    return `<div class="sbar"><span>${n}</span><div class="sb-track"><i style="width:${w}%"></i></div><b>${v}${next ? ` <em>→ ${next.stats[i]}</em>` : ''}</b></div>`;
  }).join('')}</div>`;
}
function cardModal(k) {
  const c = cardOf(k);
  const other = CARDS.filter(x => x.name === c.name).sort((a, b) => a.year - b.year);
  const canUp = c.lv < MAX_UP && owned(k) >= 2;
  const lvs = ownedKeys().map(cardOf).filter(x => x.baseId === c.baseId).sort((a, b) => a.lv - b.lv);
  openModal(`<div class="card-detail">${cardHTML(c)}
    <div>
      <h2>${esc(c.name)} <span class="muted">${c.year}${c.lv ? ' · +' + c.lv : ''}</span></h2>
      ${lvs.length > 1 ? `<div class="cd-levels">${lvs.map(x => `<button class="ugl ${x.id === k ? 'cur' : ''}" data-k="${x.id}"><b class="${x.lv ? lvClass(x.lv) : ''}">${x.lv ? '+' + x.lv : 'Gốc'}</b><small>${owned(x.id)} thẻ</small></button>`).join('')}</div>` : ''}
      <div class="kv"><span>Vị trí</span><b>${ROLE_INFO[c.role].icon} ${ROLE_INFO[c.role].vn}</b></div>
      <div class="kv"><span>Đội / Khu vực</span><b class="kv-team"><span class="mini-logo">${teamLogoHTML(c.team)}</span>${esc(TEAM_INFO[c.team]?.name || c.team)} · ${c.region}</b></div>
      <div class="kv"><span>Bậc · Chỉ số tổng</span><b class="tier-text tier-${c.tier.cls}">${c.tier.id} · ${c.rating}${c.lv ? ` <small class="muted">(gốc ${CARD[c.baseId].rating} +${UPG_BONUS[c.lv]})</small>` : ''}</b></div>
      <div class="kv"><span>🔮 Chỉ số ẩn – Bản lĩnh</span><b class="hidden-stat">${c.hidden.toFixed(1)} / 10</b></div>
      ${c.traits.length ? `<div class="traits">${c.traits.map(t => `<span>${t}</span>`).join('')}</div>` : ''}
      ${statBars(c)}
      <div class="kv"><span>Đang sở hữu</span><b>${owned(k)}</b></div>
      <div class="kv"><span>Giá bán</span><b>${fmt(sellPrice(c))} 💰</b></div>
      <p class="muted small">Các mùa của ${esc(c.name)}: ${other.map(o => `<span class="tier-text tier-${o.tier.cls}">${o.year} (${o.rating})</span>`).join(' · ')}</p>
    </div></div>
    <div class="actions">
      ${S.lineup[c.role] === k ? '<button class="btn" disabled>Đang trong đội hình</button>' : '<button class="btn primary" id="cd-equip">Đưa vào đội hình</button>'}
      <button class="btn" id="cd-up" ${c.lv >= MAX_UP ? 'disabled' : ''}>⬆️ Nâng cấp${canUp ? '' : ' (cần 2 thẻ)'}</button>
      <button class="btn" id="cd-sell">Bán (+${fmt(sellPrice(c))})</button>
      <button class="btn ghost" id="cd-close">Đóng</button>
    </div>`, true);
  if ($('#cd-equip')) $('#cd-equip').onclick = () => { if (equip(k)) closeModal(); };
  $('#cd-up').onclick = () => { closeModal(); upgSel = k; switchView('upgrade'); };
  $('#cd-sell').onclick = () => { if (sellCard(k)) { owned(k) ? cardModal(k) : closeModal(); } };
  $('#cd-close').onclick = closeModal;
  document.querySelectorAll('#modal-box .cd-levels .ugl').forEach(b => b.onclick = () => cardModal(b.dataset.k));
}

// ===== Render: cửa hàng =====
function renderShop() {
  const inv = {};
  S.packs.forEach(p => inv[p] = (inv[p] || 0) + 1);
  $('#view-shop').innerHTML = `
  ${S.packs.length ? `<div class="panel"><h3>🎁 Gói của bạn (phần thưởng)</h3><div class="inv">${Object.entries(inv).map(([id, n]) => `<div class="inv-item pack-${id}"><span>${PACK[id].icon}</span><b>${PACK[id].name}</b><small>×${n}</small><button class="btn small primary" data-open="${id}">Mở</button></div>`).join('')}</div></div>` : ''}
  <div class="panel">
    <h3>🛒 Cửa hàng gói thẻ</h3>
    <div class="packs">${PACKS.map(p => `<div class="pack pack-${p.id}">
      <div class="pack-icon">${p.icon}</div>
      <h4>${p.name}</h4>
      <div class="muted">${p.count} thẻ / gói</div>
      <div class="odds">${Object.entries(p.odds).map(([t, w]) => `<div class="odd"><span class="tier-text tier-${TIERS.find(x => x.id === t).cls}">${t}</span><div class="obar"><i style="width:${Math.max(1.5, w)}%" class="tier-bg-${TIERS.find(x => x.id === t).cls}"></i></div><small>${w}%</small></div>`).join('')}</div>
      <button class="btn primary" data-buy="${p.id}" ${S.money < p.price ? 'disabled' : ''}>Mua ${fmt(p.price)} 💰</button>
    </div>`).join('')}</div>
  </div>`;
  document.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => openPack(b.dataset.buy, false));
  document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openPack(b.dataset.open, true));
}

// ===== Trước trận =====
function rosterList(team) {
  return ROLES.map(r => {
    const c = team.players[r];
    return `<div class="ro"><span class="ro-av tier-${c.tier.cls}">${avatarHTML(c)}</span><b>${ROLE_INFO[r].icon} ${esc(c.name)}${c.lv ? ` <span class="lv-txt ${lvClass(c.lv)}">+${c.lv}</span>` : ''}</b><small><span class="mini-logo">${teamLogoHTML(c.team)}</span>${c.team} ${c.year}</small><span class="tier-text tier-${c.tier.cls}">${c.rating}</span></div>`;
  }).join('');
}
function preMatch({ title, opp, bo, onEnd, allowCancel, extra }) {
  const me = myTeam();
  if (!me) { toast('Đội hình cần đủ 5 vị trí!', 'err'); switchView('team'); return; }
  const p = winProb(me.power, opp.power);
  openModal(`<h2 class="center">${esc(title)}</h2>
    ${extra || ''}
    <div class="vs">
      <div class="vs-team blue"><div class="vs-logo">${clubLogoHTML(me.name, true)}</div><h3>${esc(me.name)}</h3><div class="pw">⚡ ${me.power}</div>${rosterList(me)}</div>
      <div class="vs-mid"><b>VS</b><small>BO${bo}</small><div class="wp">Cơ hội thắng mỗi ván<br><b>${Math.round(p * 100)}%</b></div></div>
      <div class="vs-team red"><div class="vs-logo">${clubLogoHTML(opp.name)}</div><h3>${esc(opp.name)}</h3><div class="pw">⚡ ${opp.power}</div>${rosterList(opp)}</div>
    </div>
    <div class="actions">
      <button class="btn primary" id="pm-watch">▶ Vào trận</button>
      ${allowCancel ? '<button class="btn ghost" id="pm-cancel">Để sau</button>' : ''}
    </div>`, true);
  $('#pm-watch').onclick = () => { closeModal(); MatchUI.playSeries({ title, teams: [me, opp], bo, pWin: p, onEnd }); };
  if (allowCancel) $('#pm-cancel').onclick = closeModal;
}
function rewardHTML(lines, ups) {
  return `<div class="rewards">${lines.map(l => `<div>${l}</div>`).join('')}
    ${ups.map(u => `<div class="lvup">⭐ LÊN CẤP ${u.level}! Nhận ${PACK[u.pack].icon} ${PACK[u.pack].name}${u.level === SKIP_LEVEL ? ' · Đã mở khóa ⏭ Bỏ qua ván' : ''}</div>`).join('')}</div>`;
}
function friendly() {
  const me = myTeam();
  if (!me) return toast('Đội hình cần đủ 5 vị trí!', 'err');
  const opp = makeOpponent(pick(Object.keys(TEAM_NAMES)), me.power + rand(-4, 2));
  preMatch({
    title: 'Giao hữu', opp, bo: 1, allowCancel: true,
    onEnd: (won, score) => {
      const money = won ? 100 + S.level * 5 : 25, exp = won ? 20 : 8;
      S.money += money; won ? S.stats.w++ : S.stats.l++;
      const ups = gainExp(exp); save(); renderAll();
      openModal(`<h2 class="center ${won ? 'win-t' : 'lose-t'}">${won ? '🎉 Chiến thắng!' : '😞 Thất bại'}</h2>
        <p class="center">Tỉ số ${score[0]} - ${score[1]}</p>${rewardHTML([`+${fmt(money)} 💰`, `+${exp} EXP`], ups)}
        <div class="actions"><button class="btn primary" id="r-again">Đánh tiếp</button><button class="btn ghost" id="r-close">Đóng</button></div>`);
      $('#r-again').onclick = friendly;
      $('#r-close').onclick = closeModal;
    },
  });
}

// ===== Ủng hộ nhà phát hành =====
function openDonate() {
  const D = typeof DONATE !== 'undefined' ? DONATE : {};
  const bank = D.bank && D.bank.bankId && D.bank.account ? D.bank : null;
  const qr = bank ? `https://img.vietqr.io/image/${encodeURIComponent(bank.bankId)}-${encodeURIComponent(bank.account)}-compact2.png?accountName=${encodeURIComponent(bank.name || '')}&addInfo=${encodeURIComponent(bank.note || 'Ung ho Hanh Trinh CKTG')}` : '';
  const links = (D.links || []).filter(l => l && /^https:\/\//.test(l.url));
  const any = bank || D.momo || links.length;
  openModal(`<div class="donate">
    <div class="dn-heart">💖</div>
    <h2 class="center">Ủng hộ nhà phát hành</h2>
    <p class="center muted">${esc(D.message || 'Hành Trình CKTG là game miễn phí, không quảng cáo. Nếu bạn thích game, một ly cà phê nhỏ sẽ giúp nhà phát hành có thêm động lực cập nhật tuyển thủ, giải đấu và tính năng mới!')}</p>
    ${any ? `<div class="dn-opts">
      ${bank ? `<div class="dn-card"><h4>🏦 Chuyển khoản / quét mã QR</h4><img src="${qr}" alt="Mã QR chuyển khoản" loading="lazy">
        <div class="kv"><span>Ngân hàng</span><b>${esc(bank.bankName || bank.bankId)}</b></div>
        <div class="kv"><span>Số tài khoản</span><b>${esc(bank.account)}</b></div>
        ${bank.name ? `<div class="kv"><span>Chủ tài khoản</span><b>${esc(bank.name)}</b></div>` : ''}</div>` : ''}
      ${D.momo ? `<div class="dn-card"><h4>📱 Ví MoMo</h4><div class="kv"><span>Số điện thoại</span><b>${esc(D.momo)}</b></div></div>` : ''}
      ${links.length ? `<div class="dn-card"><h4>🌐 Ủng hộ trực tuyến</h4>${links.map(l => `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || l.url)}</a>`).join('')}</div>` : ''}
    </div>` : '<p class="center notice">Nhà phát hành chưa thêm thông tin ủng hộ. (Chủ trang: điền vào <code>js/donate-config.js</code>.)</p>'}
    <p class="center muted small">Ủng hộ là tự nguyện và không mua được vật phẩm trong game. Cảm ơn bạn rất nhiều! 🙏</p>
    <div class="actions"><button class="btn" id="dn-close">Đóng</button></div></div>`);
  $('#dn-close').onclick = closeModal;
}

// ===== Góp ý & báo lỗi gửi nhà phát triển =====
const FEEDBACK = { email: 'hoanqtuan404@gmail.com', zalo: '0382984896' };
const FB_TYPES = { bug: '🐞 Báo lỗi', idea: '💡 Góp ý tính năng', balance: '⚖️ Cân bằng chỉ số / thẻ', other: '💬 Khác' };
function feedbackInfo() {
  const ua = navigator.userAgent;
  const dev = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'macOS' : 'Khác';
  const v = (document.querySelector('script[src*="main.js"]') || {}).src || '';
  return [
    `Đội: ${S ? S.teamName : '?'} · Mã kết bạn: ${S && S.profile ? S.profile.id : '?'} · Cấp ${S ? S.level : '?'}`,
    `Tài khoản: ${typeof AUTH !== 'undefined' && AUTH.user ? 'đã đăng nhập' : 'Khách'}`,
    `Thiết bị: ${dev} · màn hình ${innerWidth}x${innerHeight} · phiên bản ${(v.match(/v=(\d+)/) || [])[1] || '?'}`,
  ].join('\n');
}
function openFeedback() {
  openModal(`<h2 class="center">📮 Góp ý & báo lỗi</h2>
    <p class="center muted">Gặp lỗi, có ý tưởng hay muốn góp ý? Gửi thẳng cho nhà phát triển nhé – mọi phản hồi đều được đọc!</p>
    <div class="fb-types">${Object.entries(FB_TYPES).map(([k, n], i) => `<label><input type="radio" name="fb-type" value="${k}" ${i ? '' : 'checked'}><span>${n}</span></label>`).join('')}</div>
    <textarea id="fb-text" rows="5" maxlength="2000" placeholder="Mô tả lỗi hoặc góp ý của bạn… (VD: bấm vào đâu, chuyện gì xảy ra, bạn mong muốn điều gì)"></textarea>
    <label class="fb-inc"><input type="checkbox" id="fb-info" checked> Kèm thông tin để dễ tìm lỗi (tên đội, mã kết bạn, thiết bị)</label>
    <div class="dn-opts fb-opts">
      <div class="dn-card"><h4>📧 Gửi email</h4><div class="kv"><span>Email</span><b>${FEEDBACK.email}</b></div>
        <button class="btn primary" id="fb-mail">Mở ứng dụng email</button></div>
      <div class="dn-card"><h4>💬 Nhắn Zalo</h4><div class="kv"><span>Số Zalo</span><b>${FEEDBACK.zalo}</b></div>
        <button class="btn primary" id="fb-zalo">Sao chép nội dung & mở Zalo</button></div>
    </div>
    <p class="muted small center">Zalo không cho điền sẵn tin nhắn: nội dung được sao chép sẵn, bạn chỉ cần dán vào khung chat.</p>
    <div class="actions"><button class="btn ghost" id="fb-copy">📋 Chỉ sao chép nội dung</button><button class="btn" id="fb-close">Đóng</button></div>`, true);
  const msg = () => {
    const type = FB_TYPES[(document.querySelector('[name="fb-type"]:checked') || {}).value || 'other'];
    const text = $('#fb-text').value.trim();
    return { type, body: `[${type}]\n${text || '(chưa nhập nội dung)'}${$('#fb-info').checked ? '\n\n---\n' + feedbackInfo() : ''}` };
  };
  const need = () => { if ($('#fb-text').value.trim().length >= 5) return true; toast('Hãy nhập nội dung góp ý trước nhé', 'err'); $('#fb-text').focus(); return false; };
  $('#fb-mail').onclick = () => {
    if (!need()) return;
    const m = msg();
    location.href = `mailto:${FEEDBACK.email}?subject=${encodeURIComponent('[Hành Trình CKTG] ' + m.type)}&body=${encodeURIComponent(m.body)}`;
  };
  $('#fb-zalo').onclick = () => {
    if (!need()) return;
    copyText(msg().body);
    window.open('https://zalo.me/' + FEEDBACK.zalo, '_blank', 'noopener');
  };
  $('#fb-copy').onclick = () => { if (need()) copyText(msg().body); };
  $('#fb-close').onclick = closeModal;
  setTimeout(() => $('#fb-text') && $('#fb-text').focus({ preventScroll: true }), 300);
}

// ===== Điều hướng =====
let currentView = 'team';
function switchView(v) {
  const prev = currentView;
  currentView = v;
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  document.querySelectorAll('.view').forEach(s => s.classList.toggle('active', s.id === 'view-' + v));
  if (v === 'map') { mapSel = null; mapDiff = null; } // mở bản đồ: tự chọn chương & khu vực hiện tại
  renderAll();
  window.scrollTo({ top: 0, behavior: 'instant' });
  moveInk();
  animateViewSwap(prev, v);
}
function renderAll() {
  renderHeader();
  ({ team: renderTeam, map: renderMap, rank: () => RANKED.render(), shop: renderShop, collection: renderCollection, upgrade: renderUpgrade, achieve: renderAch, friends: renderFriends })[currentView]();
}

// ===== Khởi động =====
function welcome(got) {
  openModal(`<h2 class="center">🎮 Chào mừng tới Hành Trình CKTG!</h2>
    <p class="center">Bạn nhận được ${got.length} thẻ tuyển thủ ngẫu nhiên để bắt đầu sự nghiệp HLV:</p>
    <div class="card-grid center-grid">${got.map(c => cardHTML(c, { small: true })).join('')}</div>
    <ul class="howto">
      <li>⚔️ Đánh <b>giao hữu</b> và các <b>giải đấu</b> (thể thức như giải thật: vòng bảng, playoffs, tối đa BO5) để kiếm tiền & kinh nghiệm.</li>
      <li>🛒 Dùng tiền mua <b>gói thẻ</b> – thẻ có bậc B → A → S → S+ → SS → SSS theo thành tích từng năm. Thẻ xịn rất hiếm!</li>
      <li>⬆️ Ghép <b>2 thẻ giống nhau</b> để nâng cấp +1 … +10 (tới +6 rất dễ, từ +8 khó dần, +10 chỉ 10%).</li>
      <li>🚫 Đội hình không được có 2 thẻ của cùng một tuyển thủ (dù khác mùa).</li>
      <li>🔗 <b>Độ ăn ý</b> và <b>chỉ số ẩn</b> cộng thêm sức mạnh đội.</li>
      <li>🗺️ 4 chương: <b>Dễ → Thường → Khó → Địa ngục</b>. Vô địch giải nhỏ để mở giải lớn: VCS → PCS → LCS → LEC → LPL → LCK → MSI → <b>CKTG</b>!</li>
    </ul>
    <div class="actions"><button class="btn primary" id="w-go">Bắt đầu!</button></div>`, true);
  $('#w-go').onclick = closeModal;
}

document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => switchView(b.dataset.view));
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !$('#modal-box').querySelector('#w-go') && !$('#modal-box').querySelector('.upg-anim')) closeModal(); });
$('#credits-btn').onclick = () => {
  const list = typeof IMAGE_CREDITS !== 'undefined' ? IMAGE_CREDITS : [];
  openModal(`<h2>📷 Nguồn ảnh & logo</h2>
    <p class="muted">Ảnh và logo tự do từ Wikimedia Commons, dùng theo giấy phép ghi bên dưới. Tuyển thủ/đội không có ảnh dùng hình tự vẽ. Logo là nhãn hiệu của các đội tương ứng, chỉ dùng để nhận diện trong game fan phi thương mại.</p>
    <ol class="credits">${list.map(c => `<li><b>${esc(c.name)}${c.year ? ' (' + c.year + ')' : ''}</b> – ảnh của ${esc(c.artist || 'không rõ')}, giấy phép <a href="${esc(c.licenseUrl || c.page)}" target="_blank" rel="noopener">${esc(c.license)}</a>, <a href="${esc(c.page)}" target="_blank" rel="noopener">nguồn</a>${c.edited ? ' (đã cắt/thu nhỏ)' : ''}</li>`).join('') || '<li>Chưa có ảnh.</li>'}</ol>
    <h3>🎵 Nhạc nền</h3>
    <ul class="credits"><li><b>“Heroic Age”</b> và <b>“Five Armies”</b> – Kevin MacLeod (<a href="https://incompetech.com" target="_blank" rel="noopener">incompetech.com</a>), giấy phép <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>.</li>
      <li>Hiệu ứng âm thanh tự tạo bằng Web Audio.</li></ul>
    <div class="actions"><button class="btn" id="cr-close">Đóng</button></div>`, true);
  $('#cr-close').onclick = closeModal;
};
$('#donate-btn').onclick = openDonate;
$('#donate-btn2').onclick = openDonate;
$('#feedback-btn').onclick = openFeedback;
// ===== Cài đặt âm thanh =====
const sfxIcon = () => {
  const any = AUDIO_CFG.sfx || AUDIO_CFG.music;
  $('#sfx-btn').textContent = any ? '🔊' : '🔇'; $('#sfx-btn').classList.toggle('off', !any);
};
function audioModal() {
  SFX.ctx(true);
  const row = (k, icon, name, desc, vol) => `<div class="au-row">
      <label class="au-sw"><input type="checkbox" data-k="${k}" ${AUDIO_CFG[k] ? 'checked' : ''}><i></i></label>
      <div class="au-txt"><b>${icon} ${name}</b><small>${desc}</small>
        ${vol ? `<input type="range" min="0" max="1" step="0.05" value="${AUDIO_CFG[vol]}" data-v="${vol}" aria-label="Âm lượng ${name}">` : ''}</div>
    </div>`;
  openModal(`<h2>🔊 Âm thanh</h2>
    ${row('music', '🎵', 'Nhạc nền', 'Nhạc sảnh và nhạc trận đấu', 'mv')}
    ${row('sfx', '💥', 'Hiệu ứng', 'Mở thẻ, nâng cấp, diễn biến trận đấu', 'sv')}
    <p class="muted small">Nhạc nền: “Heroic Age”, “Five Armies” – Kevin MacLeod (incompetech.com), giấy phép <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Hiệu ứng âm thanh được tạo trực tiếp trong trình duyệt.</p>
    <div class="actions"><button class="btn primary" id="au-close">Xong</button></div>`);
  document.querySelectorAll('#modal-box [data-k]').forEach(i => i.onchange = () => {
    AUDIO_CFG[i.dataset.k] = i.checked; AUDIO_CFG.save(); sfxIcon();
    if (i.dataset.k === 'music') MUSIC.refresh();
    if (i.dataset.k === 'sfx' && i.checked) SFX.tick(3);
  });
  document.querySelectorAll('#modal-box [data-v]').forEach(i => {
    i.oninput = () => { const v = +i.value; if (i.dataset.v === 'mv') MUSIC.setVolume(v); else SFX.setVolume(v); };
    i.onchange = () => { AUDIO_CFG.save(); if (i.dataset.v === 'sv') SFX.tick(2); };
  });
  $('#au-close').onclick = closeModal;
}
$('#sfx-btn').onclick = audioModal;
sfxIcon();
// tạm ẩn mục ủng hộ khi DONATE.enabled = false (js/donate-config.js)
if (typeof DONATE === 'undefined' || DONATE.enabled === false) ['#donate-btn', '#donate-btn2'].forEach(s => $(s).classList.add('hidden'));
$('#reset').onclick = () => {
  if (!confirm('Xóa toàn bộ tiến trình và chơi lại từ đầu?')) return;
  const got = newGame(); switchView('team'); welcome(got);
  if (typeof GUIDE !== 'undefined') GUIDE.maybe();
};

S = load();
if (!S) { const got = newGame(); renderAll(); welcome(got); }
else { ensureSocial(); ensureName(); save(); renderAll(); }
moveInk(true);
loadCustomImages(() => { if ($('#modal').classList.contains('hidden')) renderAll(); });
