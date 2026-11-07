// ===== Trạng thái & lưu trữ =====
const $ = s => document.querySelector(s);
const fmt = n => Math.round(n).toLocaleString('vi-VN');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SAVE_KEY = 'hanhtrinh_cktg_v1';
let S = null;

function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s) return null;
    if (s.v === 1) { // nâng cấp bản lưu cũ: thêm tiến độ mốc, hủy giải đang dở (số vòng đã thay đổi)
      s.v = 2; s.best = {}; s.run = null;
      Object.keys(s.won).forEach(id => { if (TOUR[id]) s.best[id] = TOUR[id].rounds.length - 1; });
    }
    return s.v === 2 ? s : null;
  } catch (e) { return null; }
}

const owned = id => S.cards[id] || 0;
const addCard = id => { S.cards[id] = owned(id) + 1; };
const inLineup = id => Object.values(S.lineup).includes(id);

function newGame() {
  const keep = S ? { profile: S.profile, friends: S.friends } : {}; // chơi lại vẫn giữ mã kết bạn & bạn bè
  S = { v: 2, ...keep, teamName: 'Vietnam Legends', money: 1000, level: 1, exp: 0, cards: {}, lineup: { TOP: null, JNG: null, MID: null, ADC: null, SUP: null }, packs: [], won: {}, best: {}, run: null, stats: { w: 0, l: 0, titles: 0 } };
  const got = [];
  const used = new Set();
  ROLES.forEach(r => {
    const c = pick(CARDS.filter(c => c.role === r && c.rating <= 78));
    addCard(c.id); S.lineup[r] = c.id; got.push(c); used.add(c.name);
  });
  for (let i = 0; i < 2; i++) {
    const c = pick(CARDS.filter(c => c.rating <= 81 && !used.has(c.name)));
    addCard(c.id); got.push(c); used.add(c.name);
  }
  save();
  return got;
}

// ===== Sức mạnh đội hình =====
const lineupCards = () => ROLES.map(r => (S.lineup[r] ? CARD[S.lineup[r]] : null));
// Độ ăn ý: mỗi liên kết cộng điểm cho từng tuyển thủ tham gia.
// Sức mạnh đội = TB chỉ số + TB điểm ăn ý của 5 người (tối đa +CHEM_TEAM_CAP).
const CHEM_CARD_CAP = 7, CHEM_TEAM_CAP = 6;
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
  return { bonus: Math.min(CHEM_TEAM_CAP, +(sum / 5).toFixed(1)), per, links };
}
function powerOf(cards) {
  const cs = cards.filter(Boolean);
  if (cs.length < 5) return null;
  return +(cs.reduce((s, c) => s + c.rating, 0) / 5 + chemistry(cs).bonus).toFixed(1);
}
const winProb = (a, b) => 1 / (1 + Math.exp(-(a - b) / 3.5));
function myTeam() {
  const cs = lineupCards();
  const power = powerOf(cs);
  if (power == null) return null;
  return { name: S.teamName, players: Object.fromEntries(ROLES.map((r, i) => [r, cs[i]])), power };
}
function makeOpponent(region, P) {
  const players = {};
  const mine = new Set(lineupCards().filter(Boolean).map(c => c.name));
  const base = CARDS.filter(c => !mine.has(c.name));
  ROLES.forEach(r => {
    let pool = base.filter(c => c.role === r && Math.abs(c.rating - P) <= 3 && (region === 'INT' || c.region === region));
    if (!pool.length) pool = base.filter(c => c.role === r && Math.abs(c.rating - P) <= 4);
    if (!pool.length) pool = base.filter(c => c.role === r).sort((a, b) => Math.abs(a.rating - P) - Math.abs(b.rating - P)).slice(0, 3);
    players[r] = pick(pool);
  });
  const names = region === 'INT' ? Object.values(TEAM_NAMES).flat() : TEAM_NAMES[region];
  let name = pick(names);
  if (name === S.teamName) name += ' II';
  return { name, players, power: +P.toFixed(1), region };
}

// ===== Kinh nghiệm & cấp độ =====
const expNeed = lv => 100 + (lv - 1) * 60;
function levelPack(lv) {
  const order = ['bronze', 'silver', 'gold', 'diamond', 'legend'];
  let i = lv >= 20 ? 4 : lv >= 14 ? 3 : lv >= 9 ? 2 : lv >= 5 ? 1 : 0;
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

// ===== Thẻ =====
const initials = n => n.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();
function cardHTML(c, o = {}) {
  const t = c.tier;
  const champ = isChamp(c);
  return `<div class="card tier-${t.cls} ${o.locked ? 'locked' : ''} ${o.small ? 'small' : ''} ${o.click ? 'clickable' : ''}" data-id="${c.id}" style="${teamStyle(c.team)}">
    <div class="card-shine"></div>
    <div class="c-teamglow"></div>
    <div class="c-watermark">${teamLogoHTML(c.team)}</div>
    <div class="card-head"><span class="c-tier">${t.id}</span><span class="c-logo" title="${esc(TEAM_INFO[c.team]?.name || c.team)}">${teamLogoHTML(c.team)}</span><span class="c-rating">${c.rating}</span></div>
    <div class="c-avatar">${avatarHTML(c)}<em class="${champ ? 'champ' : ''}" ${champ ? `title="Vô địch CKTG ${c.year}"` : ''}>${champ ? '🏆 ' : ''}${c.year}</em></div>
    <div class="c-name">${esc(c.name)}</div>
    <div class="c-role">${ROLE_INFO[c.role].icon} ${c.role} · ${c.region}</div>
    <div class="c-team" title="${esc(TEAM_INFO[c.team]?.name || c.team)}"><b>${c.team}</b><span>${c.year}</span></div>
    ${o.chem > 0 ? `<span class="c-chem" title="Điểm ăn ý">🔗 +${o.chem}</span>` : ''}
    ${o.delta != null ? `<span class="c-delta ${o.delta > 0 ? 'up' : o.delta < 0 ? 'down' : ''}">⚡ ${o.delta > 0 ? '+' : ''}${o.delta}</span>` : ''}
    ${o.count > 1 ? `<span class="c-count">×${o.count}</span>` : ''}
    ${o.isNew ? '<span class="c-new">MỚI</span>' : ''}
    ${o.inLineup ? '<span class="c-in">ĐANG DÙNG</span>' : ''}
  </div>`;
}
function equip(id) {
  const c = CARD[id];
  const clash = ROLES.find(r => r !== c.role && S.lineup[r] && CARD[S.lineup[r]].name === c.name);
  if (clash) { toast(`${c.name} đã có trong đội hình ở vị trí khác!`, 'err'); return false; }
  S.lineup[c.role] = id;
  save(); renderAll();
  toast(`Đã đưa ${c.name} (${c.year}) vào vị trí ${ROLE_INFO[c.role].vn}`);
  return true;
}
function sellCard(id) {
  const free = owned(id) - (inLineup(id) ? 1 : 0);
  if (free < 1) { toast('Không thể bán thẻ đang dùng trong đội hình!', 'err'); return false; }
  const c = CARD[id];
  S.cards[id]--; if (!S.cards[id]) delete S.cards[id];
  S.money += c.tier.sell; save(); renderAll();
  toast(`Đã bán ${c.name} ${c.year} (+${fmt(c.tier.sell)} 💰)`);
  return true;
}
function sellDupes() {
  let total = 0, n = 0;
  Object.keys(S.cards).forEach(id => { const extra = S.cards[id] - 1; if (extra > 0) { total += extra * CARD[id].tier.sell; n += extra; S.cards[id] = 1; } });
  if (!n) return toast('Không có thẻ trùng nào.');
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
    res.push({ c, isNew: !owned(c.id) });
    addCard(c.id);
  }
  save(); renderAll();
  showPackModal(p, res);
}
function showPackModal(p, res) {
  openModal(`<h2>${p.icon} ${p.name}</h2><p class="muted center">Nhấn vào từng thẻ để lật</p>
    <div class="pack-cards">${res.map((r, i) => `<div class="flip" data-i="${i}"><div class="flip-inner"><div class="flip-back pack-${p.id}"><span>${p.icon}</span><b>?</b></div><div class="flip-front">${cardHTML(r.c, { isNew: r.isNew })}</div></div></div>`).join('')}</div>
    <div class="actions"><button class="btn" id="flip-all">Lật tất cả</button><button class="btn primary" id="pack-done">Xong</button></div>`);
  const flip = el => {
    if (el.classList.contains('flipped')) return;
    el.classList.add('flipped');
    const r = res[+el.dataset.i];
    if (['SS', 'SSS'].includes(r.c.tier.id)) { el.classList.add('epic'); toast(`🔥 Thẻ ${r.c.tier.id}: ${r.c.name} ${r.c.year}!`, 'gold'); }
  };
  document.querySelectorAll('.flip').forEach(el => el.onclick = () => flip(el));
  $('#flip-all').onclick = () => document.querySelectorAll('.flip').forEach((el, i) => setTimeout(() => flip(el), i * 250));
  $('#pack-done').onclick = closeModal;
}

// ===== Modal & thông báo =====
function openModal(html, wide) {
  $('#modal-box').innerHTML = html;
  $('#modal-box').classList.toggle('wide', !!wide);
  $('#modal').classList.remove('hidden');
}
function closeModal() { $('#modal').classList.add('hidden'); }
function toast(msg, type = '') {
  const d = document.createElement('div');
  d.className = `toast ${type}`; d.textContent = msg;
  $('#toasts').appendChild(d);
  setTimeout(() => d.classList.add('out'), 2600);
  setTimeout(() => d.remove(), 3100);
}

// ===== Render: header =====
function renderHeader() {
  $('#money').textContent = fmt(S.money);
  $('#level').textContent = S.level;
  const need = expNeed(S.level);
  $('#xpfill').style.width = `${(S.exp / need) * 100}%`;
  $('#xptext').textContent = `${S.exp}/${need} EXP`;
  $('#pack-dot').classList.toggle('hidden', !S.packs.length);
}

// ===== Render: đội hình =====
function renderTeam() {
  const cs = lineupCards();
  const power = powerOf(cs);
  const chem = chemistry(cs);
  const avg = cs.filter(Boolean).length ? (cs.filter(Boolean).reduce((s, c) => s + c.rating, 0) / cs.filter(Boolean).length).toFixed(1) : '-';
  $('#view-team').innerHTML = `
  <div class="panel team-hero">
    <div class="panel-head">
      <div class="team-name"><span class="my-logo">${clubLogoHTML(S.teamName, true)}</span><div><label>Đội của bạn ✏️</label><input id="team-name" maxlength="24" value="${esc(S.teamName)}" title="Nhấn để đổi tên đội"></div></div>
      <div class="power-ring" style="--p:${power ? Math.max(4, Math.min(100, (power - 65) / 35 * 100)).toFixed(0) : 0}"><div><small>Sức mạnh</small><b>${power ?? '—'}</b><span>TB ${avg} · ăn ý +${chem.bonus}</span></div></div>
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
      ${S.run ? `<div class="notice">Đang dự <b>${TOUR[S.run.tid].name}</b> – ${TOUR[S.run.tid].rounds[S.run.round].n}. <button class="btn small primary" id="btn-resume">Tiếp tục</button></div>` : ''}
    </div>
    <div class="panel">
      <h3>📊 Thành tích</h3>
      <div class="stat-tiles">
        <div class="tile"><small>Thắng / Thua</small><b>${S.stats.w} / ${S.stats.l}</b></div>
        <div class="tile"><small>Danh hiệu</small><b>🏆 ${S.stats.titles}</b></div>
        <div class="tile"><small>Giải đã vô địch</small><b>${Object.keys(S.won).length} / ${TOURS.length}</b></div>
        <div class="tile"><small>Thẻ sưu tầm</small><b>${Object.keys(S.cards).length} / ${CARDS.length}</b></div>
      </div>
    </div>
  </div>`;
  $('#team-name').onchange = e => { S.teamName = e.target.value.trim() || 'Vietnam Legends'; save(); renderTeam(); };
  document.querySelectorAll('#view-team .slot').forEach(el => el.onclick = () => pickModal(el.dataset.role));
  document.querySelectorAll('[data-sugg]').forEach(b => b.onclick = () => equip(b.dataset.sugg));
  $('#btn-friendly').onclick = friendly;
  $('#btn-gomap').onclick = () => switchView('map');
  if (S.run) $('#btn-resume').onclick = nextRound;
}
// Sức mạnh đội nếu đưa thẻ id vào vị trí của nó (null nếu trùng tuyển thủ hoặc chưa đủ 5 người)
function powerIf(id) {
  const c = CARD[id];
  if (ROLES.some(r => r !== c.role && S.lineup[r] && CARD[S.lineup[r]].name === c.name)) return null;
  return powerOf(ROLES.map(r => (r === c.role ? c : S.lineup[r] ? CARD[S.lineup[r]] : null)));
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
    sugg = Object.keys(S.cards).filter(id => !inLineup(id))
      .map(id => ({ id, p: powerIf(id) })).filter(x => x.p != null && x.p > power)
      .sort((a, b) => b.p - a.p).slice(0, 3);
  }
  return `<div class="panel chem-panel">
    <div class="chem-head">
      <h3>🔗 Độ ăn ý <span class="chem-total">+${chem.bonus}</span></h3>
      <small class="muted">Trung bình điểm ăn ý của 5 tuyển thủ, cộng thẳng vào sức mạnh đội (tối đa +${CHEM_TEAM_CAP}).</small>
    </div>
    <div class="chem-list">${chem.links.length ? chem.links.map(l => `
      <div class="chem-row ${l.team ? 'teamed' : ''}" style="${l.team ? teamStyle(l.team) : ''}">
        <span class="cr-icon">${l.icon}</span>
        <div class="cr-main"><b>${esc(l.name)}</b><small>${l.names.map(esc).join(' · ')}</small></div>
        <em>${esc(l.desc)}</em>
      </div>`).join('') : '<p class="muted">Chưa có liên kết nào. Ghép tuyển thủ cùng đội, cùng mùa, cùng khu vực… để tăng sức mạnh!</p>'}</div>
    ${sugg.length ? `<div class="sugg"><b>💡 Gợi ý thay người</b>${sugg.map(s => { const c = CARD[s.id]; return `
      <button class="sugg-item" data-sugg="${s.id}" style="${teamStyle(c.team)}"><span class="si-av tier-${c.tier.cls}">${avatarHTML(c)}</span>
        <span><b>${esc(c.name)}</b> <small>${c.team} ${c.year} · ${ROLE_INFO[c.role].vn}</small></span><em>⚡ +${(s.p - power).toFixed(1)}</em></button>`; }).join('')}</div>` : ''}
    <details class="chem-rules"><summary>Cách tính điểm ăn ý</summary>
      <div class="rules">${CHEM_RULES.map(([i, n, d]) => `<div><span>${i}</span><b>${n}</b><small>${d}</small></div>`).join('')}</div>
      <p class="muted small">Mỗi tuyển thủ được cộng tối đa +${CHEM_CARD_CAP}. Thẻ có 🏆 cạnh năm là thẻ của mùa vô địch thế giới.</p>
    </details>
  </div>`;
}
function pickModal(role) {
  const cur = powerOf(lineupCards());
  const list = Object.keys(S.cards).map(id => CARD[id]).filter(c => c.role === role)
    .map(c => ({ c, p: powerIf(c.id) }))
    .sort((a, b) => (b.p ?? -1) - (a.p ?? -1) || b.c.rating - a.c.rating);
  openModal(`<h2>${ROLE_INFO[role].icon} Chọn ${ROLE_INFO[role].vn}</h2>
    <p class="muted">Sắp xếp theo sức mạnh đội sau khi đổi (đã tính độ ăn ý). ⚡ là mức tăng/giảm so với hiện tại.</p>
    ${list.length ? `<div class="card-grid">${list.map(({ c, p }) => cardHTML(c, { click: true, count: owned(c.id), inLineup: S.lineup[role] === c.id, delta: cur != null && p != null && S.lineup[role] !== c.id ? +(p - cur).toFixed(1) : null })).join('')}</div>` : '<p class="muted center">Bạn chưa có thẻ nào ở vị trí này. Hãy mua gói trong Cửa hàng!</p>'}
    <div class="actions"><button class="btn" id="pm-close">Đóng</button></div>`, true);
  document.querySelectorAll('#modal-box .card[data-id]').forEach(el => el.onclick = () => { if (equip(el.dataset.id)) closeModal(); });
  $('#pm-close').onclick = closeModal;
}

// ===== Render: bộ sưu tập =====
const colFilter = { role: 'ALL', tier: 'ALL', all: false, sort: 'rating' };
function renderCollection() {
  let list = (colFilter.all ? CARDS : Object.keys(S.cards).map(id => CARD[id]))
    .filter(c => (colFilter.role === 'ALL' || c.role === colFilter.role) && (colFilter.tier === 'ALL' || c.tier.id === colFilter.tier));
  list = list.slice().sort(colFilter.sort === 'rating' ? (a, b) => b.rating - a.rating : colFilter.sort === 'year' ? (a, b) => b.year - a.year || b.rating - a.rating : (a, b) => a.name.localeCompare(b.name) || a.year - b.year);
  const dupes = Object.values(S.cards).reduce((s, n) => s + n - 1, 0);
  $('#view-collection').innerHTML = `
  <div class="panel">
    <div class="filters">
      <select id="f-role"><option value="ALL">Mọi vị trí</option>${ROLES.map(r => `<option value="${r}" ${colFilter.role === r ? 'selected' : ''}>${ROLE_INFO[r].vn}</option>`).join('')}</select>
      <select id="f-tier"><option value="ALL">Mọi bậc</option>${TIERS.map(t => `<option value="${t.id}" ${colFilter.tier === t.id ? 'selected' : ''}>${t.id}</option>`).join('')}</select>
      <select id="f-sort"><option value="rating">Chỉ số cao</option><option value="year" ${colFilter.sort === 'year' ? 'selected' : ''}>Năm mới nhất</option><option value="name" ${colFilter.sort === 'name' ? 'selected' : ''}>Tên A-Z</option></select>
      <label class="check"><input type="checkbox" id="f-all" ${colFilter.all ? 'checked' : ''}> Hiện cả thẻ chưa có</label>
      <button class="btn small" id="sell-dupes">💸 Bán ${dupes} thẻ trùng</button>
    </div>
    <div class="tier-legend">${TIERS.map(t => `<span class="tl tier-${t.cls}"><b>${t.id}</b> ${t.min ? '≥' + t.min : '<79'} · ${t.desc}</span>`).join('')}</div>
    <p class="muted">Đã sưu tầm ${Object.keys(S.cards).length}/${CARDS.length} thẻ. Nhấn vào thẻ để xem chi tiết.</p>
    <div class="card-grid">${list.map(c => cardHTML(c, { click: owned(c.id) > 0, locked: !owned(c.id), count: owned(c.id), inLineup: inLineup(c.id) })).join('') || '<p class="muted">Không có thẻ.</p>'}</div>
  </div>`;
  $('#f-role').onchange = e => { colFilter.role = e.target.value; renderCollection(); };
  $('#f-tier').onchange = e => { colFilter.tier = e.target.value; renderCollection(); };
  $('#f-sort').onchange = e => { colFilter.sort = e.target.value; renderCollection(); };
  $('#f-all').onchange = e => { colFilter.all = e.target.checked; renderCollection(); };
  $('#sell-dupes').onclick = sellDupes;
  document.querySelectorAll('#view-collection .card.clickable').forEach(el => el.onclick = () => cardModal(el.dataset.id));
}
function cardModal(id) {
  const c = CARD[id];
  const other = CARDS.filter(x => x.name === c.name).sort((a, b) => a.year - b.year);
  openModal(`<div class="card-detail">${cardHTML(c)}
    <div>
      <h2>${esc(c.name)} <span class="muted">${c.year}</span></h2>
      <div class="kv"><span>Vị trí</span><b>${ROLE_INFO[c.role].icon} ${ROLE_INFO[c.role].vn}</b></div>
      <div class="kv"><span>Đội / Khu vực</span><b class="kv-team"><span class="mini-logo">${teamLogoHTML(c.team)}</span>${esc(TEAM_INFO[c.team]?.name || c.team)} · ${c.region}</b></div>
      <div class="kv"><span>Bậc</span><b class="tier-text tier-${c.tier.cls}">${c.tier.id}</b></div>
      <div class="kv"><span>Đang sở hữu</span><b>${owned(id)}</b></div>
      <div class="kv"><span>Giá bán</span><b>${fmt(c.tier.sell)} 💰</b></div>
      <p class="muted small">Các mùa của ${esc(c.name)}: ${other.map(o => `<span class="tier-text tier-${o.tier.cls}">${o.year} (${o.rating})</span>`).join(' · ')}</p>
    </div></div>
    <div class="actions">
      ${S.lineup[c.role] === id ? '<button class="btn" disabled>Đang trong đội hình</button>' : '<button class="btn primary" id="cd-equip">Đưa vào đội hình</button>'}
      <button class="btn" id="cd-sell">Bán (+${fmt(c.tier.sell)})</button>
      <button class="btn ghost" id="cd-close">Đóng</button>
    </div>`);
  if ($('#cd-equip')) $('#cd-equip').onclick = () => { if (equip(id)) closeModal(); };
  $('#cd-sell').onclick = () => { if (sellCard(id)) { owned(id) ? cardModal(id) : closeModal(); } };
  $('#cd-close').onclick = closeModal;
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
      <div class="odds">${Object.entries(p.odds).map(([t, w]) => `<div class="odd"><span class="tier-text tier-${TIERS.find(x => x.id === t).cls}">${t}</span><div class="obar"><i style="width:${w}%" class="tier-bg-${TIERS.find(x => x.id === t).cls}"></i></div><small>${w}%</small></div>`).join('')}</div>
      <button class="btn primary" data-buy="${p.id}" ${S.money < p.price ? 'disabled' : ''}>Mua ${fmt(p.price)} 💰</button>
    </div>`).join('')}</div>
  </div>`;
  document.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => openPack(b.dataset.buy, false));
  document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openPack(b.dataset.open, true));
}

// ===== Render: bản đồ giải đấu =====
const isUnlocked = i => i === 0 || !!S.won[TOURS[i - 1].id];
const bestOf = tid => (S.best && S.best[tid] != null ? S.best[tid] : -1);
let mapSel = null;

// Thanh mốc của một giải. cur = mốc đang đấu (-1 nếu không), failAt = mốc bị loại
function stageTrack(t, cur = -1, failAt = -1) {
  const best = bestOf(t.id), last = t.rounds.length - 1;
  return `<div class="track">${t.rounds.map((r, i) => {
    const done = i <= best || (cur >= 0 && i < cur);
    const cls = i === failAt ? 'fail' : i === cur ? 'cur' : done ? 'done' : 'todo';
    const icon = cls === 'fail' ? '✕' : done && i === last ? '🏆' : done ? '✓' : r.ic;
    const reward = i === last ? `🏆 ${fmt(t.prize)}` : i > best ? `🎯 +${fmt(t.prize * MILESTONE_BONUS)}` : 'Đã đạt';
    return `${i ? `<i class="ms-line ${done || i <= cur ? 'on' : ''}"></i>` : ''}<div class="ms ${cls}">
      <span class="ms-dot">${icon}</span><b>${r.n}</b><small>BO${r.bo} · ⚡${t.power + r.d}</small><em>${reward}</em>
    </div>`;
  }).join('')}</div>`;
}
function regionState(rg) {
  const idx = TOURS.map((t, i) => i).filter(i => TOURS[i].region === rg);
  if (idx.every(i => S.won[TOURS[i].id])) return 'done';
  return isUnlocked(idx[0]) ? 'open' : 'locked';
}
function currentRegion() {
  if (S.run) return TOUR[S.run.tid].region;
  const i = TOURS.findIndex((t, k) => isUnlocked(k) && !S.won[t.id]);
  return i < 0 ? 'INT' : TOURS[i].region;
}
function renderMap() {
  if (!mapSel) mapSel = currentRegion();
  const states = {}, info = {};
  JOURNEY.forEach(rg => {
    states[rg] = regionState(rg);
    const ts = TOURS.filter(t => t.region === rg);
    info[rg] = `${ts.filter(t => S.won[t.id]).length}/${ts.length}`;
  });
  const wonCount = TOURS.filter(t => S.won[t.id]).length;
  const R = REGIONS[mapSel];
  const regionTours = TOURS.map((t, i) => [t, i]).filter(([t]) => t.region === mapSel);
  const me = myTeam();
  const run = S.run ? TOUR[S.run.tid] : null;

  $('#view-map').innerHTML = `
  ${run ? `<div class="panel run-banner" style="--rc:${REGIONS[run.region].color}">
    <div class="run-head"><div><small>ĐANG THI ĐẤU</small><h3>${run.name}</h3></div>
      <div class="actions left" style="margin:0"><button class="btn primary" id="map-resume">▶ Vào trận: ${run.rounds[S.run.round].n}</button><button class="btn ghost small" id="map-quit">Rút lui</button></div></div>
    ${stageTrack(run, S.run.round)}
  </div>` : ''}
  <div class="panel wm-panel">
    <div class="wm-head">
      <div><h3>🌍 Bản đồ hành trình</h3><p class="muted">Chinh phục từng khu vực theo thứ tự đường bay. Chọn một khu vực để xem các giải.</p></div>
      <div class="journey"><small>Tiến độ hành trình</small><b>${wonCount}/${TOURS.length} giải</b><div class="jbar"><i style="width:${wonCount / TOURS.length * 100}%"></i></div></div>
    </div>
    ${worldMapHTML(states, info, mapSel)}
  </div>
  <div class="panel region-panel" style="--rc:${R.color}">
    <div class="rp-head">
      <span class="rp-code">${mapSel === 'INT' ? '🌍' : mapSel}</span>
      <div><h3>${mapSel === 'INT' ? 'Đấu trường Quốc tế' : 'Khu vực ' + R.name}</h3>
      <p class="muted">${states[mapSel] === 'locked' ? '🔒 Chưa mở khóa – hãy vô địch khu vực trước trên đường hành trình.' : states[mapSel] === 'done' ? '🏆 Đã chinh phục toàn bộ khu vực! Bạn vẫn có thể đánh lại để kiếm thưởng.' : 'Vượt qua từng mốc để nhận thưởng; vô địch để mở giải tiếp theo.'}</p></div>
    </div>
    <div class="tour-list">${regionTours.map(([t, i]) => {
      const un = isUnlocked(i), w = S.won[t.id], active = S.run && S.run.tid === t.id, busy = S.run && !active;
      const label = t.div === 2 ? 'HẠNG 2' : t.div === 1 ? 'HẠNG 1' : t.id === 'msi' ? 'GIẢI GIỮA MÙA' : 'CHUNG KẾT';
      const gap = me ? +(me.power - t.power).toFixed(1) : null;
      return `<div class="tour ${un ? '' : 'locked'} ${w ? 'won' : ''} ${active ? 'active' : ''}">
        <div class="tour-top">
          <div><span class="div-tag">${label}</span><h4>${t.name} ${w ? `<span class="won-tag">🏆 ×${w}</span>` : ''}</h4>
            <div class="tour-meta"><span>⚡ Đối thủ ${t.power - 4}–${t.power + 2}</span><span>💰 ${fmt(w ? t.prize / 2 : t.prize)}${w ? ' (đánh lại)' : ''}</span><span>${PACK[t.pack].icon} ${PACK[t.pack].name}${t.packCount ? ' ×' + t.packCount : ''}</span>
            ${gap != null && un ? `<span class="gap ${gap >= 0 ? 'good' : gap >= -4 ? 'mid' : 'bad'}">${gap >= 0 ? 'Đội bạn mạnh hơn' : gap >= -4 ? 'Cân sức' : 'Đối thủ mạnh hơn'} (${gap > 0 ? '+' : ''}${gap})</span>` : ''}</div>
          </div>
          <div class="tour-cta">${!un ? `<span class="muted small">🔒 Vô địch ${TOURS[i - 1].name} để mở</span>`
            : active ? `<button class="btn primary" data-go="${t.id}">▶ Tiếp tục</button>`
            : `<button class="btn ${w ? '' : 'primary'}" data-go="${t.id}" ${busy || !me ? 'disabled' : ''}>${w ? '↻ Đánh lại' : '⚔️ Tham gia'}</button>${busy ? '<small class="muted">Đang dự giải khác</small>' : ''}`}</div>
        </div>
        ${stageTrack(t, active ? S.run.round : -1)}
      </div>`;
    }).join('')}</div>
  </div>`;

  document.querySelectorAll('.hs').forEach(b => b.onclick = () => { mapSel = b.dataset.rg; renderMap(); document.querySelector('.region-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    const tid = b.dataset.go;
    if (!S.run) { S.run = { tid, round: 0 }; save(); }
    nextRound();
  });
  if (run) {
    $('#map-resume').onclick = nextRound;
    $('#map-quit').onclick = () => {
      if (!confirm(`Rút lui khỏi ${run.name}? Bạn sẽ mất tiến độ ở giải này (các mốc đã đạt vẫn được giữ).`)) return;
      S.run = null; save(); renderAll(); toast(`Đã rút lui khỏi ${run.name}`);
    };
  }
}

// ===== Luồng thi đấu =====
function rosterList(team) {
  return ROLES.map(r => {
    const c = team.players[r];
    return `<div class="ro"><span class="ro-av tier-${c.tier.cls}">${avatarHTML(c)}</span><b>${ROLE_INFO[r].icon} ${esc(c.name)}</b><small><span class="mini-logo">${teamLogoHTML(c.team)}</span>${c.team} ${c.year}</small><span class="tier-text tier-${c.tier.cls}">${c.rating}</span></div>`;
  }).join('');
}
function preMatch({ title, opp, bo, onEnd, allowCancel }) {
  const me = myTeam();
  if (!me) { toast('Đội hình cần đủ 5 vị trí!', 'err'); switchView('team'); return; }
  const p = winProb(me.power, opp.power);
  openModal(`<h2 class="center">${esc(title)}</h2>
    <div class="vs">
      <div class="vs-team blue"><div class="vs-logo">${clubLogoHTML(me.name, true)}</div><h3>${esc(me.name)}</h3><div class="pw">⚡ ${me.power}</div>${rosterList(me)}</div>
      <div class="vs-mid"><b>VS</b><small>BO${bo}</small><div class="wp">Cơ hội thắng mỗi ván<br><b>${Math.round(p * 100)}%</b></div></div>
      <div class="vs-team red"><div class="vs-logo">${clubLogoHTML(opp.name)}</div><h3>${esc(opp.name)}</h3><div class="pw">⚡ ${opp.power}</div>${rosterList(opp)}</div>
    </div>
    <div class="actions">
      <button class="btn primary" id="pm-watch">▶ Xem trận đấu</button>
      <button class="btn" id="pm-fast">⏩ Mô phỏng nhanh</button>
      ${allowCancel ? '<button class="btn ghost" id="pm-cancel">Hủy</button>' : ''}
    </div>`, true);
  const go = fast => { closeModal(); MatchUI.playSeries({ title, teams: [me, opp], bo, pWin: p, fast, onEnd }); };
  $('#pm-watch').onclick = () => go(false);
  $('#pm-fast').onclick = () => go(true);
  if (allowCancel) $('#pm-cancel').onclick = closeModal;
}
function rewardHTML(lines, ups) {
  return `<div class="rewards">${lines.map(l => `<div>${l}</div>`).join('')}
    ${ups.map(u => `<div class="lvup">⭐ LÊN CẤP ${u.level}! Nhận ${PACK[u.pack].icon} ${PACK[u.pack].name}</div>`).join('')}</div>`;
}
function friendly() {
  const me = myTeam();
  if (!me) return toast('Đội hình cần đủ 5 vị trí!', 'err');
  const opp = makeOpponent(pick(Object.keys(TEAM_NAMES)), me.power + rand(-3, 1.5));
  preMatch({
    title: 'Giao hữu', opp, bo: 1, allowCancel: true,
    onEnd: (won, score) => {
      const money = won ? 200 + S.level * 10 : 60, exp = won ? 30 : 10;
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
function nextRound() {
  if (!S.run) return;
  const t = TOUR[S.run.tid], r = t.rounds[S.run.round];
  if (!S.run.opp) { S.run.opp = makeOpponent(t.region, t.power + r.d); save(); }
  const opp = { ...S.run.opp, players: Object.fromEntries(ROLES.map(k => [k, CARD[S.run.opp.players[k].id]])) };
  preMatch({ title: `${t.name} · ${r.n} (mốc ${S.run.round + 1}/${t.rounds.length})`, opp, bo: r.bo, onEnd: (won, score) => tourSeriesEnd(t, won, score) });
}
function tourSeriesEnd(t, won, score) {
  const i = TOURS.indexOf(t);
  const ri = S.run.round;
  const r = t.rounds[ri];
  S.run.opp = null;
  if (!won) {
    const money = Math.round(t.prize * 0.05);
    S.money += money; S.stats.l++;
    const ups = gainExp(10);
    S.run = null; save(); renderAll();
    openModal(`<h2 class="center lose-t">😞 Bị loại ở ${r.n}</h2><p class="center">${t.name} · Tỉ số ${score[0]} - ${score[1]}</p>
      ${stageTrack(t, -1, ri)}
      ${rewardHTML([`Tiền an ủi +${fmt(money)} 💰`, '+10 EXP'], ups)}
      <p class="muted center">Nâng cấp đội hình rồi thử lại nhé!</p>
      <div class="actions"><button class="btn primary" id="r-shop">🛒 Cửa hàng</button><button class="btn ghost" id="r-close">Đóng</button></div>`);
    $('#r-shop').onclick = () => { closeModal(); switchView('shop'); };
    $('#r-close').onclick = closeModal;
    return;
  }
  S.stats.w++;
  const money = Math.round(t.prize * 0.08), exp = 20 + i * 6;
  S.money += money;
  const ups = gainExp(exp);
  const lines = [`Thắng ${r.n}: +${fmt(money)} 💰`, `+${exp} EXP`];
  if (bestOf(t.id) < S.run.round) {
    S.best[t.id] = S.run.round;
    if (S.run.round < t.rounds.length - 1) {
      const bonus = Math.round(t.prize * MILESTONE_BONUS);
      S.money += bonus;
      lines.push(`🎯 Đạt mốc mới "${r.n}": +${fmt(bonus)} 💰`);
    }
  }
  if (S.run.round < t.rounds.length - 1) {
    S.run.round++; save(); renderAll();
    openModal(`<h2 class="center win-t">🎉 Vượt qua ${r.n}!</h2><p class="center">${t.name} · Tỉ số ${score[0]} - ${score[1]}</p>
      ${stageTrack(t, S.run.round)}
      ${rewardHTML(lines, ups)}
      <p class="center">Tiếp theo: <b>${t.rounds[S.run.round].n}</b> (BO${t.rounds[S.run.round].bo} · đối thủ ⚡${t.power + t.rounds[S.run.round].d})</p>
      <div class="actions"><button class="btn primary" id="r-next">Vào trận ▶</button><button class="btn ghost" id="r-close">Để sau</button></div>`);
    $('#r-next').onclick = nextRound;
    $('#r-close').onclick = closeModal;
    return;
  }
  // Vô địch
  const first = !S.won[t.id];
  const prize = first ? t.prize : Math.round(t.prize / 2);
  S.money += prize;
  S.won[t.id] = (S.won[t.id] || 0) + 1;
  S.stats.titles++;
  const nPack = t.packCount || 1;
  for (let k = 0; k < nPack; k++) S.packs.push(t.pack);
  S.run = null; save(); renderAll();
  lines.push(`🏆 Tiền thưởng vô địch +${fmt(prize)} 💰`, `🎁 ${PACK[t.pack].icon} ${PACK[t.pack].name}${nPack > 1 ? ' ×' + nPack : ''}`);
  const nextT = TOURS[i + 1];
  openModal(`<div class="confetti">${Array.from({ length: 50 }, () => `<i style="left:${rand(0, 100)}%;background:hsl(${randi(0, 360)},90%,60%);animation-delay:${rand(0, 1.5)}s;animation-duration:${rand(2, 4)}s"></i>`).join('')}</div>
    <div class="trophy">🏆</div>
    <h2 class="center win-t">${t.id === 'worlds' ? 'VÔ ĐỊCH THẾ GIỚI!' : 'VÔ ĐỊCH ' + t.name.toUpperCase() + '!'}</h2>
    <p class="center">${esc(S.teamName)} đã lên ngôi · Chung kết ${score[0]} - ${score[1]}</p>
    ${stageTrack(t, -1)}
    ${rewardHTML(lines, ups)}
    ${first && nextT ? `<p class="center notice">🔓 Đã mở khóa: <b>${nextT.name}</b></p>` : ''}
    ${t.id === 'worlds' && first ? '<p class="center">Bạn đã hoàn thành Hành Trình CKTG! Tiếp tục sưu tầm thẻ và bảo vệ ngôi vương nhé.</p>' : ''}
    <div class="actions"><button class="btn primary" id="r-shop">🎁 Mở gói thưởng</button><button class="btn ghost" id="r-map">🗺️ Bản đồ</button></div>`);
  $('#r-shop').onclick = () => { closeModal(); switchView('shop'); };
  $('#r-map').onclick = () => { closeModal(); switchView('map'); };
}

// ===== Điều hướng =====
let currentView = 'team';
function switchView(v) {
  currentView = v;
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  document.querySelectorAll('.view').forEach(s => s.classList.toggle('active', s.id === 'view-' + v));
  if (v === 'map') mapSel = null; // mở bản đồ: tự chọn khu vực hiện tại
  renderAll();
  window.scrollTo(0, 0);
}
function renderAll() {
  renderHeader();
  ({ team: renderTeam, map: renderMap, shop: renderShop, collection: renderCollection, friends: renderFriends })[currentView]();
}

// ===== Khởi động =====
function welcome(got) {
  openModal(`<h2 class="center">🎮 Chào mừng tới Hành Trình CKTG!</h2>
    <p class="center">Bạn nhận được ${got.length} thẻ tuyển thủ ngẫu nhiên để bắt đầu sự nghiệp HLV:</p>
    <div class="card-grid center-grid">${got.map(c => cardHTML(c, { small: true })).join('')}</div>
    <ul class="howto">
      <li>⚔️ Đánh <b>giao hữu</b> và các <b>giải đấu</b> để kiếm tiền & kinh nghiệm.</li>
      <li>🛒 Dùng tiền mua <b>gói thẻ</b> – thẻ có bậc B → A → S → S+ → SS → SSS theo thành tích từng năm.</li>
      <li>🚫 Đội hình không được có 2 thẻ của cùng một tuyển thủ (dù khác mùa).</li>
      <li>🔗 <b>Độ ăn ý</b>: ghép tuyển thủ cùng đội, cùng mùa, cặp đôi đường dưới, cùng khu vực, nhà vô địch CKTG… để tăng sức mạnh.</li>
      <li>🗺️ Vô địch giải nhỏ để mở giải lớn: VCS → PCS → LCS → LEC → LPL → LCK → MSI → <b>CKTG</b>!</li>
    </ul>
    <div class="actions"><button class="btn primary" id="w-go">Bắt đầu!</button></div>`, true);
  $('#w-go').onclick = closeModal;
}

document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => switchView(b.dataset.view));
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !$('#modal-box').querySelector('#w-go')) closeModal(); });
$('#credits-btn').onclick = () => {
  const list = typeof IMAGE_CREDITS !== 'undefined' ? IMAGE_CREDITS : [];
  openModal(`<h2>📷 Nguồn ảnh & logo</h2>
    <p class="muted">Ảnh và logo tự do từ Wikimedia Commons, dùng theo giấy phép ghi bên dưới. Tuyển thủ/đội không có ảnh dùng hình tự vẽ. Logo là nhãn hiệu của các đội tương ứng, chỉ dùng để nhận diện trong game fan phi thương mại.</p>
    <ol class="credits">${list.map(c => `<li><b>${esc(c.name)}</b> – ảnh của ${esc(c.artist || 'không rõ')}, giấy phép <a href="${esc(c.licenseUrl || c.page)}" target="_blank" rel="noopener">${esc(c.license)}</a>, <a href="${esc(c.page)}" target="_blank" rel="noopener">nguồn</a>${c.edited ? ' (đã cắt/thu nhỏ)' : ''}</li>`).join('') || '<li>Chưa có ảnh.</li>'}</ol>
    <div class="actions"><button class="btn" id="cr-close">Đóng</button></div>`, true);
  $('#cr-close').onclick = closeModal;
};
$('#reset').onclick = () => {
  if (!confirm('Xóa toàn bộ tiến trình và chơi lại từ đầu?')) return;
  const got = newGame(); switchView('team'); welcome(got);
};

S = load();
if (!S) { const got = newGame(); renderAll(); welcome(got); }
else renderAll();
loadCustomImages(() => { if ($('#modal').classList.contains('hidden')) renderAll(); });
