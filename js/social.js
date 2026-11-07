// ===== Bạn bè & chơi nhiều người =====
// - Mã kết bạn (8 ký tự) + mã đội (chứa đội hình, gửi qua Zalo/Messenger…)
// - Giao hữu với đội đã lưu của bạn bè (không cần mạng)
// - Trực tuyến: kết nối máy-máy (WebRTC) qua máy chủ trung gian miễn phí PeerJS
//   để thấy bạn bè online và mời đấu trực tiếp; chủ phòng tạo trận, hai bên xem giống hệt nhau.
// Mọi dữ liệu nhận từ người khác đều được kiểm tra trước khi dùng.

const PEER_PREFIX = 'cktg-ht-';
const CODE_PREFIX = 'CKTG1:';
const ID_RE = /^[A-Z2-9]{8}$/;
const MAX_FRIENDS = 50;
const NET = { peer: null, status: 'off', conns: {}, online: new Set(), pendingAdd: null, invite: null, awaiting: null, timer: null };

function ensureSocial() {
  if (!S.profile || !ID_RE.test(S.profile.id)) S.profile = { id: genFriendId() };
  if (!Array.isArray(S.friends)) S.friends = [];
}
function genFriendId() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const buf = new Uint32Array(8); crypto.getRandomValues(buf);
  buf.forEach(v => s += a[v % a.length]);
  return s;
}
const isFriend = id => S.friends.some(f => f.id === id);
const friendById = id => S.friends.find(f => f.id === id);

// ----- Mã đội -----
function mySnapshot() {
  return { v: 1, id: S.profile.id, name: S.teamName, lineup: { ...S.lineup }, level: S.level, titles: S.stats.titles };
}
function encodeTeam(o) { return CODE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }
function decodeTeam(code) {
  code = String(code || '').trim();
  if (!code.startsWith(CODE_PREFIX) || code.length > 4000) return null;
  try { return cleanSnap(JSON.parse(decodeURIComponent(escape(atob(code.slice(CODE_PREFIX.length)))))); } catch (e) { return null; }
}
// Làm sạch hồ sơ đội nhận từ người khác: chỉ chấp nhận thẻ có thật, đúng vị trí, không trùng tuyển thủ
function cleanSnap(o) {
  if (!o || typeof o !== 'object') return null;
  const id = String(o.id || '').toUpperCase();
  if (!ID_RE.test(id)) return null;
  const lineup = {};
  for (const r of ROLES) {
    const cid = o.lineup && o.lineup[r];
    if (typeof cid !== 'string' || !CARD[cid] || CARD[cid].role !== r) return null;
    lineup[r] = cid;
  }
  if (new Set(ROLES.map(r => CARD[lineup[r]].name)).size < 5) return null;
  return {
    id, lineup,
    name: String(o.name || 'Đội bạn').replace(/[\u0000-\u001f]/g, '').slice(0, 24) || 'Đội bạn',
    level: Math.max(1, Math.min(999, parseInt(o.level, 10) || 1)),
    titles: Math.max(0, Math.min(9999, parseInt(o.titles, 10) || 0)),
  };
}
function teamFromSnap(s) {
  const cards = ROLES.map(r => CARD[s.lineup[r]]);
  return { name: s.name, players: Object.fromEntries(ROLES.map((r, i) => [r, cards[i]])), power: powerOf(cards) };
}
function addFriendSnap(snap, quiet) {
  if (snap.id === S.profile.id) { toast('Đây là mã của chính bạn!', 'err'); return false; }
  const f = friendById(snap.id);
  if (f) { Object.assign(f, snap, { updated: Date.now() }); if (!quiet) toast(`Đã cập nhật đội hình của ${snap.name}`); }
  else {
    if (S.friends.length >= MAX_FRIENDS) { toast(`Tối đa ${MAX_FRIENDS} bạn bè`, 'err'); return false; }
    S.friends.push({ ...snap, rec: { w: 0, l: 0 }, added: Date.now(), updated: Date.now() });
    if (!quiet) toast(`🤝 Đã kết bạn với ${snap.name}!`, 'gold');
  }
  save(); refreshSocialUI();
  return true;
}

// ----- Kết nối trực tuyến (PeerJS) -----
function loadPeerJS() {
  return new Promise((ok, fail) => {
    if (window.Peer) return ok();
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    s.onload = ok;
    s.onerror = () => fail(new Error('Không tải được thư viện kết nối (cần có mạng).'));
    document.head.appendChild(s);
  });
}
async function goOnline() {
  if (NET.peer) return;
  NET.status = 'connecting'; refreshSocialUI();
  try { await loadPeerJS(); } catch (e) { NET.status = 'off'; toast(e.message, 'err'); refreshSocialUI(); return; }
  const peer = new Peer(PEER_PREFIX + S.profile.id.toLowerCase(), { debug: 0 });
  NET.peer = peer;
  peer.on('open', () => { NET.status = 'on'; S.online = true; save(); refreshSocialUI(); pingFriends(); });
  peer.on('connection', conn => setupConn(conn));
  peer.on('disconnected', () => { if (NET.peer === peer && !peer.destroyed) peer.reconnect(); });
  peer.on('error', err => {
    if (err.type === 'peer-unavailable') {
      const m = String(err.message || '').match(/cktg-ht-([a-z0-9]{8})/i);
      if (m) {
        const id = m[1].toUpperCase();
        NET.online.delete(id);
        if (NET.pendingAdd === id) { NET.pendingAdd = null; toast('Không tìm thấy người chơi này đang trực tuyến. Hãy thử dán mã đội của họ.', 'err'); }
        refreshSocialUI();
      }
      return;
    }
    if (err.type === 'unavailable-id') toast('Mã của bạn đang trực tuyến ở một cửa sổ khác.', 'err');
    else toast('Lỗi kết nối trực tuyến (' + err.type + ')', 'err');
    goOffline(true);
  });
  clearInterval(NET.timer);
  NET.timer = setInterval(pingFriends, 30000);
}
function goOffline(keepPref) {
  if (NET.peer) { const p = NET.peer; NET.peer = null; try { p.destroy(); } catch (e) { } }
  NET.conns = {}; NET.online.clear(); NET.status = 'off'; NET.invite = NET.awaiting = NET.pendingAdd = null;
  clearInterval(NET.timer);
  if (!keepPref) { S.online = false; save(); }
  refreshSocialUI();
}
function connectTo(id) {
  if (!NET.peer || NET.status !== 'on') return null;
  const c = NET.conns[id];
  if (c && c.open) return c;
  const conn = NET.peer.connect(PEER_PREFIX + id.toLowerCase(), { reliable: true });
  setupConn(conn);
  return conn;
}
function pingFriends() {
  if (NET.status !== 'on') return;
  S.friends.forEach(f => { const c = NET.conns[f.id]; if (c && c.open) send(c, { t: 'hello', snap: mySnapshot() }); else connectTo(f.id); });
}
function send(conn, msg) { try { conn.send(msg); } catch (e) { } }
function setupConn(conn) {
  const id = String(conn.peer || '').replace(PEER_PREFIX, '').toUpperCase();
  if (!ID_RE.test(id)) { try { conn.close(); } catch (e) { } return; }
  conn.on('open', () => {
    NET.conns[id] = conn; NET.online.add(id);
    send(conn, { t: 'hello', snap: mySnapshot(), req: !isFriend(id) });
    refreshSocialUI();
  });
  conn.on('data', d => { try { onMsg(id, conn, d); } catch (e) { console.warn('Bỏ qua tin nhắn lỗi', e); } });
  conn.on('close', () => { if (NET.conns[id] === conn) { delete NET.conns[id]; NET.online.delete(id); refreshSocialUI(); } });
  conn.on('error', () => { });
}
const matchBusy = () => !$('#match').classList.contains('hidden');

function onMsg(id, conn, d) {
  if (!d || typeof d !== 'object' || typeof d.t !== 'string') return;
  switch (d.t) {
    case 'hello': {
      const snap = cleanSnap(d.snap);
      if (!snap || snap.id !== id) return;
      if (isFriend(id)) addFriendSnap(snap, true);
      else if (NET.pendingAdd === id) { NET.pendingAdd = null; addFriendSnap(snap); }
      else if (d.req) friendRequest(snap, conn);
      break;
    }
    case 'accepted': {
      const snap = cleanSnap(d.snap);
      if (snap && snap.id === id && !isFriend(id)) addFriendSnap(snap);
      break;
    }
    case 'invite': {
      const bo = d.bo === 3 ? 3 : 1;
      const f = friendById(id);
      if (!f) return;
      if (matchBusy() || NET.invite || NET.awaiting) return send(conn, { t: 'decline', why: 'busy' });
      if (!myTeam()) return send(conn, { t: 'decline', why: 'noteam' });
      showInvite(f, bo, conn);
      break;
    }
    case 'cancel':
      if (NET.awaiting === id) { NET.awaiting = null; closeModal(); toast(`${friendById(id)?.name || 'Bạn'} đã hủy lời mời`); }
      if (NET.invitePending === id) { NET.invitePending = null; closeModal(); toast(`${friendById(id)?.name || 'Bạn'} đã hủy lời mời`); }
      break;
    case 'decline':
      if (NET.invite && NET.invite.id === id) {
        clearTimeout(NET.invite.timer); NET.invite = null; closeModal();
        toast(`${friendById(id)?.name || 'Bạn'} ${d.why === 'busy' ? 'đang bận' : d.why === 'noteam' ? 'chưa đủ đội hình' : 'đã từ chối lời mời'}`, 'err');
      }
      break;
    case 'accept': {
      if (!NET.invite || NET.invite.id !== id) return;
      const snap = cleanSnap(d.snap);
      const me = myTeam();
      clearTimeout(NET.invite.timer);
      const bo = NET.invite.bo;
      NET.invite = null;
      if (!snap || snap.id !== id || !me) { closeModal(); return; }
      addFriendSnap(snap, true);
      const host = mySnapshot();
      const teams = [teamFromSnap(host), teamFromSnap(snap)];
      const games = MatchUI.genSeries(teams, bo, winProb(teams[0].power, teams[1].power));
      send(conn, { t: 'match', bo, host, guest: snap, games });
      closeModal();
      startLive(id, teams, bo, games, 0);
      break;
    }
    case 'match': {
      if (NET.awaiting !== id) return;
      NET.awaiting = null;
      const host = cleanSnap(d.host), guest = cleanSnap(d.guest);
      const bo = d.bo === 3 ? 3 : 1;
      const games = sanitizeGames(d.games, bo);
      if (!host || host.id !== id || !guest || guest.id !== S.profile.id || !games) { closeModal(); toast('Dữ liệu trận đấu không hợp lệ', 'err'); return; }
      closeModal();
      startLive(id, [teamFromSnap(host), teamFromSnap(guest)], bo, games, 1);
      break;
    }
  }
}

// ----- Làm sạch dữ liệu trận đấu nhận từ chủ phòng -----
const num = (v, lo, hi) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo; };
const side = v => (v === 0 || v === 1 ? v : -1);
const pairs = a => (Array.isArray(a) ? a.slice(0, 10).filter(p => Array.isArray(p) && (p[0] === 0 || p[0] === 1) && ROLES.includes(p[1])).map(p => [p[0], p[1]]) : []);
const two = (a, hi) => [num(a && a[0], 0, hi), num(a && a[1], 0, hi)];
const EV_TYPES = ['kill', 'fight', 'ace', 'tower', 'obj', 'end', 'info'];
const OBJS = ['dragon', 'soul', 'herald', 'baron', 'elder'];
const BANNERS = ['FIRST BLOOD', 'ACE', 'TRỤ ĐẦU TIÊN', 'PHÁ NHÀ LÍNH', 'LINH HỒN RỒNG', 'CƯỚP BARON!', 'BARON NASHOR', 'RỒNG NGÀN TUỔI'];
function sanitizeSnapM(s) {
  s = s || {};
  const kd = [0, 1].map(i => Object.fromEntries(ROLES.map(r => [r, two(s.kd && s.kd[i] && s.kd[i][r], 999)])));
  return {
    kills: two(s.kills, 999), gold: two(s.gold, 999999), towers: two(s.towers, 11), drag: two(s.drag, 9), baron: two(s.baron, 9), kd,
    lanes: [0, 1].map(i => [0, 1, 2].map(j => num(s.lanes && s.lanes[i] && s.lanes[i][j], 0, 3))),
    inhib: [0, 1].map(i => [0, 1, 2].map(j => (s.inhib && s.inhib[i] && s.inhib[i][j] ? 1 : 0))),
    nt: two(s.nt, 2), nexus: [s.nexus && s.nexus[0] ? 1 : 0, s.nexus && s.nexus[1] ? 1 : 0],
  };
}
function sanitizeGames(games, bo) {
  if (!Array.isArray(games) || !games.length || games.length > bo) return null;
  const out = [];
  for (const g of games) {
    if (!g || !Array.isArray(g.events) || !g.events.length || g.events.length > 500 || (g.winner !== 0 && g.winner !== 1)) return null;
    const events = g.events.map(e => ({
      t: num(e.t, 0, 7200),
      type: EV_TYPES.includes(e.type) ? e.type : 'info',
      obj: OBJS.includes(e.obj) ? e.obj : undefined,
      side: side(e.side),
      text: String(e.text || '').slice(0, 240),
      big: !!e.big,
      banner: BANNERS.includes(e.banner) ? e.banner : null,
      loc: Array.isArray(e.loc) ? [num(e.loc[0], 0, 100), num(e.loc[1], 0, 100)] : null,
      inv: pairs(e.inv), dead: pairs(e.dead),
      kills: Array.isArray(e.kills) ? e.kills.slice(0, 10).filter(k => k && (k.s === 0 || k.s === 1) && ROLES.includes(k.k) && ROLES.includes(k.v)).map(k => ({ s: k.s, k: k.k, v: k.v })) : [],
      snap: sanitizeSnapM(e.snap),
    }));
    for (let i = 1; i < events.length; i++) if (events[i].t < events[i - 1].t) events[i].t = events[i - 1].t;
    out.push({ winner: g.winner, events, duration: events[events.length - 1].t });
  }
  const need = Math.ceil(bo / 2), sc = [0, 0];
  out.forEach(g => sc[g.winner]++);
  return Math.max(sc[0], sc[1]) === need ? out : null;
}

// ----- Lời mời & trận trực tuyến -----
function friendRequest(snap, conn) {
  if (matchBusy()) return;
  openModal(`<h2 class="center">🤝 Lời mời kết bạn</h2>
    <div class="fr-req"><span class="fr-logo">${clubLogoHTML(snap.name)}</span><div><b></b><small>Mã ${snap.id} · Cấp ${snap.level} · 🏆 ${snap.titles}</small></div></div>
    <div class="actions"><button class="btn primary" id="fr-ok">Đồng ý</button><button class="btn ghost" id="fr-no">Bỏ qua</button></div>`);
  $('#modal-box .fr-req b').textContent = snap.name;
  $('#fr-ok').onclick = () => { closeModal(); if (addFriendSnap(snap)) send(conn, { t: 'accepted', snap: mySnapshot() }); };
  $('#fr-no').onclick = closeModal;
}
function inviteFriend(id, bo) {
  const f = friendById(id), conn = NET.conns[id];
  if (!f || !conn || !conn.open) return toast('Bạn này hiện không trực tuyến', 'err');
  if (!myTeam()) return toast('Đội hình cần đủ 5 vị trí!', 'err');
  NET.invite = { id, bo, timer: setTimeout(() => { if (NET.invite && NET.invite.id === id) { NET.invite = null; closeModal(); toast(`${f.name} không phản hồi`, 'err'); } }, 30000) };
  send(conn, { t: 'invite', bo });
  openModal(`<h2 class="center">📡 Đang mời đấu…</h2><p class="center">Chờ <b></b> chấp nhận lời mời giao hữu BO${bo}.</p>
    <div class="spinner"></div><div class="actions"><button class="btn ghost" id="inv-cancel">Hủy lời mời</button></div>`);
  $('#modal-box p b').textContent = f.name;
  $('#inv-cancel').onclick = () => { clearTimeout(NET.invite && NET.invite.timer); NET.invite = null; send(conn, { t: 'cancel' }); closeModal(); };
}
function showInvite(f, bo, conn) {
  NET.invitePending = f.id;
  const them = teamFromSnap(f);
  openModal(`<h2 class="center">⚔️ Lời mời giao hữu</h2>
    <p class="center"><b></b> mời bạn đấu trực tiếp <b>BO${bo}</b></p>
    <p class="center muted">Sức mạnh đối thủ ⚡ ${them.power} · đội bạn ⚡ ${myTeam().power}</p>
    <div class="actions"><button class="btn primary" id="iv-ok">Chấp nhận</button><button class="btn ghost" id="iv-no">Từ chối</button></div>`);
  $('#modal-box p b').textContent = f.name;
  $('#iv-ok').onclick = () => {
    NET.invitePending = null;
    NET.awaiting = f.id;
    send(conn, { t: 'accept', snap: mySnapshot() });
    openModal(`<h2 class="center">⏳ Đang chuẩn bị trận đấu…</h2><div class="spinner"></div>`);
    setTimeout(() => { if (NET.awaiting === f.id) { NET.awaiting = null; closeModal(); toast('Không nhận được trận đấu từ chủ phòng', 'err'); } }, 20000);
  };
  $('#iv-no').onclick = () => { NET.invitePending = null; send(conn, { t: 'decline' }); closeModal(); };
}
function startLive(id, teams, bo, games, me) {
  const f = friendById(id);
  MatchUI.playSeries({
    title: `Giao hữu trực tuyến · ${f ? f.name : 'Bạn bè'}`, teams, bo, games, me, pWin: 0.5,
    onEnd: (won, score) => friendMatchEnd(id, won, me ? [score[1], score[0]] : score, true), // tỉ số của mình đứng trước
  });
}
function friendMatchEnd(id, won, score, live) {
  const f = friendById(id);
  const money = live ? (won ? 250 : 80) : (won ? 150 : 50);
  const exp = live ? (won ? 40 : 15) : (won ? 25 : 10);
  S.money += money;
  won ? S.stats.w++ : S.stats.l++;
  if (f) won ? f.rec.w++ : f.rec.l++;
  const ups = gainExp(exp); save(); renderAll();
  const sc = score;
  openModal(`<h2 class="center ${won ? 'win-t' : 'lose-t'}">${won ? '🎉 Bạn đã thắng!' : '😞 Bạn đã thua'}</h2>
    <p class="center"><span id="fm-name"></span> · Tỉ số ${sc[0]} - ${sc[1]}</p>
    ${rewardHTML([`+${fmt(money)} 💰`, `+${exp} EXP`, f ? `Thành tích đối đầu: ${f.rec.w} - ${f.rec.l}` : ''].filter(Boolean), ups)}
    <div class="actions"><button class="btn primary" id="fm-close">Đóng</button></div>`);
  $('#fm-name').textContent = (live ? 'Trực tuyến với ' : 'Đấu đội đã lưu của ') + (f ? f.name : 'bạn bè');
  $('#fm-close').onclick = closeModal;
}
function ghostMatch(id) {
  const f = friendById(id);
  if (!f) return;
  const opp = teamFromSnap(f);
  preMatch({ title: `Giao hữu với ${f.name}`, opp, bo: 1, allowCancel: true, onEnd: (won, score) => friendMatchEnd(id, won, score, false) });
}

// ----- Giao diện tab Bạn bè -----
function copyText(t) {
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => toast('Đã sao chép!'), () => fallbackCopy(t));
  else fallbackCopy(t);
}
function fallbackCopy(t) {
  const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select();
  try { document.execCommand('copy'); toast('Đã sao chép!'); } catch (e) { toast('Hãy tự chọn và sao chép mã', 'err'); }
  a.remove();
}
function refreshSocialUI() {
  const n = NET.online.size;
  const dot = document.getElementById('friends-dot');
  if (dot) { dot.textContent = n; dot.classList.toggle('hidden', !n); }
  if (typeof currentView !== 'undefined' && currentView === 'friends' && S) renderFriends();
}
function friendCardHTML(f) {
  const on = NET.online.has(f.id);
  const t = teamFromSnap(f);
  return `<div class="friend ${on ? 'on' : ''}" data-fid="${f.id}">
    <span class="fr-logo">${clubLogoHTML(f.name)}</span>
    <div class="fr-main">
      <div><b class="fr-name"></b> <span class="fr-st">${on ? '● Trực tuyến' : '○ Ngoại tuyến'}</span></div>
      <small>Mã ${f.id} · Cấp ${f.level} · 🏆 ${f.titles} · ⚡ ${t.power}</small>
      <div class="fr-lineup">${ROLES.map(r => { const c = CARD[f.lineup[r]]; return `<span class="fr-av tier-${c.tier.cls}" title="${esc(c.name)} ${c.year}">${avatarHTML(c)}</span>`; }).join('')}</div>
    </div>
    <div class="fr-rec"><small>Đối đầu</small><b>${f.rec.w} - ${f.rec.l}</b></div>
    <div class="fr-act">
      <button class="btn small primary" data-act="live1" ${on ? '' : 'disabled'} title="${on ? '' : 'Bạn này đang ngoại tuyến'}">📡 Mời BO1</button>
      <button class="btn small" data-act="live3" ${on ? '' : 'disabled'}>📡 BO3</button>
      <button class="btn small" data-act="ghost">⚔️ Đấu đội đã lưu</button>
      <button class="btn small ghost" data-act="del" title="Xóa bạn">🗑</button>
    </div>
  </div>`;
}
function renderFriends() {
  ensureSocial();
  const st = NET.status;
  const me = myTeam();
  const code = me ? encodeTeam(mySnapshot()) : '';
  const friends = S.friends.slice().sort((a, b) => NET.online.has(b.id) - NET.online.has(a.id) || b.updated - a.updated);
  $('#view-friends').innerHTML = `
  <div class="grid2">
    <div class="panel profile-card">
      <h3>🪪 Hồ sơ của bạn</h3>
      <div class="pc-row"><span class="pc-logo">${clubLogoHTML(S.teamName, true)}</span>
        <div><b>${esc(S.teamName)}</b><small>Cấp ${S.level} · 🏆 ${S.stats.titles} danh hiệu · ⚡ ${me ? me.power : '—'}</small></div></div>
      <div class="pc-id"><div><small>Mã kết bạn</small><code>${S.profile.id}</code></div><button class="btn small" id="copy-id">📋 Sao chép</button></div>
      <div class="net ${st}"><span class="net-dot"></span><b>${st === 'on' ? 'Đang trực tuyến' : st === 'connecting' ? 'Đang kết nối…' : 'Ngoại tuyến'}</b>
        <button class="btn small ${st === 'off' ? 'primary' : 'ghost'}" id="net-toggle" ${st === 'connecting' ? 'disabled' : ''}>${st === 'off' ? '📡 Bật trực tuyến' : 'Tắt'}</button></div>
      <p class="muted small">Khi trực tuyến, bạn bè đang mở game sẽ thấy bạn và có thể mời đấu trực tiếp. Kết nối máy-máy qua máy chủ trung gian miễn phí PeerJS; không gửi dữ liệu nào ngoài tên đội và đội hình.</p>
    </div>
    <div class="panel">
      <h3>➕ Thêm bạn</h3>
      <p class="muted small">Nhập <b>mã kết bạn</b> (8 ký tự, cả hai đang trực tuyến) hoặc dán <b>mã đội</b> bạn bè gửi (dùng được cả khi ngoại tuyến).</p>
      <div class="add-row"><input type="text" id="add-input" placeholder="VD: 7K2P9QXA hoặc CKTG1:…" maxlength="4000" autocomplete="off"><button class="btn primary" id="add-btn">Thêm</button></div>
      <h4 class="sub-h">📤 Mã đội của bạn</h4>
      <textarea id="my-code" readonly rows="3">${code || 'Cần đủ 5 vị trí trong đội hình để tạo mã đội'}</textarea>
      <div class="actions left"><button class="btn small" id="copy-code" ${code ? '' : 'disabled'}>📋 Sao chép mã đội</button></div>
    </div>
  </div>
  <div class="panel">
    <h3>👥 Bạn bè <span class="muted small">(${S.friends.length} · ${NET.online.size} trực tuyến)</span></h3>
    <div class="friend-list">${friends.length ? friends.map(friendCardHTML).join('') : '<p class="muted">Chưa có bạn bè. Gửi mã kết bạn hoặc mã đội của bạn cho bạn bè nhé!</p>'}</div>
  </div>`;
  document.querySelectorAll('.friend').forEach(el => {
    const f = friendById(el.dataset.fid);
    el.querySelector('.fr-name').textContent = f.name;
    el.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
      const a = b.dataset.act;
      if (a === 'live1') inviteFriend(f.id, 1);
      if (a === 'live3') inviteFriend(f.id, 3);
      if (a === 'ghost') ghostMatch(f.id);
      if (a === 'del' && confirm(`Xóa ${f.name} khỏi danh sách bạn bè?`)) { S.friends = S.friends.filter(x => x.id !== f.id); save(); renderFriends(); }
    });
  });
  $('#copy-id').onclick = () => copyText(S.profile.id);
  if (code) $('#copy-code').onclick = () => copyText(code);
  $('#net-toggle').onclick = () => (NET.status === 'off' ? goOnline() : goOffline());
  const add = () => {
    const v = $('#add-input').value.trim();
    if (!v) return;
    if (v.startsWith(CODE_PREFIX)) {
      const snap = decodeTeam(v);
      if (!snap) return toast('Mã đội không hợp lệ', 'err');
      if (addFriendSnap(snap) && NET.status === 'on') connectTo(snap.id);
      return;
    }
    const id = v.toUpperCase().replace(/\s/g, '');
    if (!ID_RE.test(id)) return toast('Mã kết bạn gồm 8 ký tự (chữ và số)', 'err');
    if (id === S.profile.id) return toast('Đây là mã của chính bạn!', 'err');
    if (isFriend(id)) return toast('Người này đã là bạn bè');
    if (NET.status !== 'on') return toast('Hãy bật trực tuyến trước, hoặc dán mã đội của bạn bè', 'err');
    NET.pendingAdd = id;
    connectTo(id);
    toast('Đang tìm người chơi…');
    setTimeout(() => { if (NET.pendingAdd === id) { NET.pendingAdd = null; toast('Không có phản hồi. Bạn bè cần đang mở game và bật trực tuyến.', 'err'); } }, 12000);
  };
  $('#add-btn').onclick = add;
  $('#add-input').onkeydown = e => { if (e.key === 'Enter') add(); };
}

// Khởi động: tạo hồ sơ, tự bật lại trực tuyến nếu lần trước đang bật
window.addEventListener('load', () => {
  if (!S) return;
  ensureSocial(); save();
  refreshSocialUI();
  if (S.online) goOnline();
});
