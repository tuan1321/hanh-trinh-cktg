// ===== Đấu xếp hạng & Bảng xếp hạng =====
// - Mỗi tài khoản có 1 hồ sơ xếp hạng ở Firestore: ranked/{uid} (đội hình phòng thủ, điểm hạng, thắng/thua, vé trong ngày).
// - "Tìm trận" ghép với đội hình đã lưu của người chơi có điểm gần mình (không cần online cùng lúc).
// - Kết quả được tính và GHI LÊN MÁY CHỦ TRƯỚC khi phát trận → thoát giữa chừng không né được trận thua.
// - Luật Firestore giới hạn: mỗi trận chỉ ±40 điểm (±60 ở 5 trận định vị), 10 trận/ngày, cách nhau ≥10 giây.
const RANKED = (() => {
  const START = 1000, DAILY = 10, SEASON = 1, DAY_OFFSET = 7 * 3600 * 1000; // ngày mới lúc 0:00 giờ Việt Nam
  const PLACEMENT = 5, LB_TTL = 60 * 1000, PROFILE_EVERY = 3 * 60 * 1000;
  const TIERS = [
    { n: 'Đồng', i: '🥉', c: '#d08a4e' },
    { n: 'Bạc', i: '🥈', c: '#c3cad8' },
    { n: 'Vàng', i: '🥇', c: '#f5c542' },
    { n: 'Bạch Kim', i: '💠', c: '#3fd8c4' },
    { n: 'Kim Cương', i: '💎', c: '#6aa8ff' },
    { n: 'Huyền Thoại', i: '👑', c: '#f472b6' },
  ];
  const LEGEND = 2200;
  const st = { me: null, loaded: null, lastProfile: 0, profileSig: '', busy: false, board: 'rp', scope: 'all', cache: {}, myPos: null };

  // ----- bậc hạng -----
  const tierIdx = rp => (rp >= LEGEND ? 5 : rp < 1000 ? 0 : Math.min(4, 1 + Math.floor((rp - 1000) / 300)));
  function rankOf(rp) {
    const t = tierIdx(rp), T = TIERS[t];
    if (t === 5) return { t, ...T, div: '', label: T.n, pct: 1, next: null };
    const start = t === 0 ? 700 : 1000 + (t - 1) * 300;
    const d = Math.max(0, Math.min(2, Math.floor((rp - start) / 100)));
    const lo = start + d * 100;
    const pct = Math.max(0, Math.min(1, (rp - lo) / 100));
    return { t, ...T, div: ['III', 'II', 'I'][d], label: `${T.n} ${['III', 'II', 'I'][d]}`, pct, next: lo + 100 };
  }
  const badge = (rp, big) => { const r = rankOf(rp); return `<span class="rk-badge${big ? ' big' : ''}" style="--rk:${r.c}" title="${r.label}">${r.i}</span>`; };

  // ----- tiện ích -----
  const signedIn = () => typeof AUTH !== 'undefined' && AUTH.user && AUTH.boundUid === AUTH.user.uid && AUTH.db;
  const dayKey = () => Math.floor((Date.now() + DAY_OFFSET) / 86400000);
  const ticketsLeft = d => (!d ? DAILY : d.dk === dayKey() ? Math.max(0, DAILY - d.dayN) : DAILY);
  const games = d => (d ? d.w + d.l : 0);
  function hist() { if (!S.ranked) S.ranked = { hist: [], recent: [] }; return S.ranked; }
  function ensureDb() {
    if (typeof AUTH === 'undefined' || !authConfigured()) return Promise.reject(new Error('Chưa cấu hình Firebase'));
    return AUTH.db ? Promise.resolve(AUTH.db) : startFirebase().then(() => AUTH.db);
  }
  // Thông tin hồ sơ lấy từ bản lưu (ghi kèm mỗi lần cập nhật)
  function profile() {
    const t = myTeam();
    if (!t) return null;
    return {
      name: String(S.teamName || 'Đội của tôi').slice(0, 24), fid: S.profile ? S.profile.id : '',
      lineup: { ...S.lineup }, power: t.power, level: Math.min(9999, S.level | 0), titles: Math.min(99999, S.stats.titles | 0),
    };
  }
  // Đội từ hồ sơ của người khác: chỉ nhận thẻ có thật, đúng vị trí, tự tính lại sức mạnh (không tin số ghi sẵn)
  function teamFromDoc(d) {
    if (!d || !d.lineup) return null;
    const cards = ROLES.map(r => { const c = cardOf(d.lineup[r]); return c && c.role === r ? c : null; });
    if (cards.some(c => !c) || new Set(cards.map(c => c.name)).size < 5) return null;
    return { name: String(d.name || 'Đội ẩn danh').replace(/[\u0000-\u001f]/g, '').slice(0, 24) || 'Đội ẩn danh', players: Object.fromEntries(ROLES.map((r, i) => [r, cards[i]])), power: powerOf(cards) };
  }

  // ----- đọc / tạo / cập nhật hồ sơ của mình -----
  async function loadMe(force) {
    if (!signedIn()) return null;
    const uid = AUTH.user.uid;
    if (!force && st.me && st.loaded === uid) return st.me;
    const ref = AUTH.db.collection('ranked').doc(uid);
    const snap = await ref.get();
    if (AUTH.user.uid !== uid) return null;
    st.loaded = uid;
    if (snap.exists) { st.me = snap.data(); return st.me; }
    const p = profile();
    if (!p) { st.me = null; return null; } // chưa đủ đội hình → chưa tạo hồ sơ
    const TS = firebase.firestore.FieldValue.serverTimestamp();
    const doc = { ...p, rp: START, peak: START, w: 0, l: 0, streak: 0, dk: 0, dayN: 0, season: SEASON, at: TS, upd: TS };
    await ref.set(doc);
    st.me = { ...doc, at: null, upd: null };
    st.profileSig = JSON.stringify(p); st.lastProfile = Date.now();
    return st.me;
  }
  // Cập nhật đội hình phòng thủ / tên / cấp khi có thay đổi (tối đa 1 lần mỗi 3 phút)
  async function syncProfile(force) {
    if (!signedIn() || !st.me || st.loaded !== AUTH.user.uid || st.busy) return;
    const p = profile();
    if (!p) return;
    const sig = JSON.stringify(p);
    if (sig === st.profileSig || (!force && Date.now() - st.lastProfile < PROFILE_EVERY)) return;
    // cần đúng mốc "at" trên máy chủ (luật yêu cầu giữ nguyên) → đọc lại nếu chưa có
    if (!(st.me.at && typeof st.me.at.toMillis === 'function')) {
      st.lastProfile = Date.now();
      return loadMe(true).then(() => syncProfile(true)).catch(e => console.warn('ranked', e));
    }
    st.profileSig = sig; st.lastProfile = Date.now();
    const keep = { rp: st.me.rp, peak: st.me.peak, w: st.me.w, l: st.me.l, streak: st.me.streak, dk: st.me.dk, dayN: st.me.dayN, season: st.me.season, at: st.me.at };
    try {
      await AUTH.db.collection('ranked').doc(AUTH.user.uid).set({ ...p, ...keep, upd: firebase.firestore.FieldValue.serverTimestamp() });
      Object.assign(st.me, p);
    } catch (e) { console.warn('ranked profile', e); }
  }
  setInterval(() => {
    if (!signedIn()) { st.me = null; st.loaded = null; return; }
    if (st.loaded !== AUTH.user.uid) loadMe().then(() => { if (currentView === 'rank') render(); }).catch(e => console.warn('ranked', e));
    else syncProfile();
  }, 20000);

  // ----- điểm hạng -----
  function deltas(myRp, oppRp, n, bot) {
    const E = 1 / (1 + Math.pow(10, (oppRp - myRp) / 400));
    const K = (n < PLACEMENT ? 48 : 32) * (bot ? 0.6 : 1);
    const cap = n < PLACEMENT ? 60 : 40;
    const win = Math.max(5, Math.min(cap, Math.round(K * (1 - E))));
    const lose = Math.max(3, Math.min(cap, Math.round(K * E)));
    return { win, lose: Math.min(lose, myRp) };
  }

  // ----- ghép trận -----
  async function findOpponent(me) {
    const uid = AUTH.user.uid, recent = new Set(hist().recent);
    const col = AUTH.db.collection('ranked');
    for (const w of [150, 400, 1200]) {
      const q = await col.where('rp', '>=', me.rp - w).where('rp', '<=', me.rp + w).orderBy('rp').limit(40).get();
      let list = q.docs.filter(d => d.id !== uid).map(d => ({ uid: d.id, d: d.data() })).map(o => ({ ...o, team: teamFromDoc(o.d) })).filter(o => o.team);
      const fresh = list.filter(o => !recent.has(o.uid));
      if (fresh.length) list = fresh;
      if (list.length) {
        // ưu tiên người có điểm gần mình
        list.sort((a, b) => Math.abs(a.d.rp - me.rp) - Math.abs(b.d.rp - me.rp));
        const o = pick(list.slice(0, Math.min(8, list.length)));
        return { uid: o.uid, name: o.team.name, rp: o.d.rp | 0, team: o.team, bot: false };
      }
    }
    // không có ai phù hợp → đội máy có sức mạnh gần mình
    const mt = myTeam();
    const o = makeOpponent(pick(Object.keys(TEAM_NAMES)), mt.power + rand(-3, 2));
    o.name = o.name + ' (Máy)';
    return { uid: null, name: o.name, rp: me.rp, team: o, bot: true };
  }

  async function play() {
    if (st.busy) return;
    if (!signedIn()) { toast('Cần đăng nhập để đấu xếp hạng', 'err'); return openAcct(); }
    const mt = myTeam();
    if (!mt) { toast('Đội hình cần đủ 5 vị trí!', 'err'); return switchView('team'); }
    st.busy = true;
    openModal(`<h2 class="center">🔎 Đang tìm đối thủ…</h2><p class="center muted">Ghép với đội hình của người chơi có điểm hạng gần bạn</p><div class="spinner"></div>`);
    try {
      // luật máy chủ: 2 trận cách nhau ≥ 10 giây → tự chờ trong lúc "tìm đối thủ"
      const wait = (st.lastMatch || 0) + 11000 - Date.now();
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      let me = await loadMe(true);
      if (!me) throw new Error('Không tạo được hồ sơ xếp hạng');
      if (ticketsLeft(me) <= 0) { closeModal(); toast('Hết lượt đấu hôm nay – quay lại sau 0:00 nhé!', 'err'); return; }
      const opp = await findOpponent(me);
      const n = games(me);
      const dl = deltas(me.rp, opp.rp, n, opp.bot);
      const promo = !opp.bot && tierIdx(me.rp + dl.win) > tierIdx(me.rp);
      const bo = promo ? 3 : 1;
      const teams = [mt, opp.team];
      const pWin = winProb(mt.power, opp.team.power);
      const series = MatchUI.genSeries(teams, bo, pWin);
      const sc = [0, 0]; series.forEach(g => sc[g.winner]++);
      const won = sc[0] > sc[1];
      // ghi kết quả lên máy chủ trước
      const p = profile(), dk = dayKey(), TS = firebase.firestore.FieldValue.serverTimestamp();
      const rp = Math.max(0, me.rp + (won ? dl.win : -dl.lose));
      const doc = {
        ...p, rp, peak: Math.max(me.peak || START, rp),
        w: me.w + (won ? 1 : 0), l: me.l + (won ? 0 : 1),
        streak: won ? Math.max(0, me.streak) + 1 : Math.min(0, me.streak) - 1,
        dk, dayN: me.dk === dk ? me.dayN + 1 : 1, season: SEASON, at: TS, upd: TS,
      };
      await AUTH.db.collection('ranked').doc(AUTH.user.uid).set(doc);
      const before = me.rp;
      st.lastMatch = Date.now();
      st.me ={ ...doc, at: null, upd: null }; st.profileSig = JSON.stringify(p); st.lastProfile = Date.now();
      st.cache = {}; st.myPos = null;
      // phần thưởng & lịch sử (lưu trong bản lưu)
      const money = won ? 150 + S.level * 5 : 40, exp = won ? 25 : 10;
      S.money += money; won ? S.stats.w++ : S.stats.l++;
      S.stats.rw = (S.stats.rw || 0) + (won ? 1 : 0);
      const H = hist();
      H.hist.unshift({ t: Date.now(), opp: opp.name, orp: opp.rp, won, d: rp - before, sc, bo, bot: opp.bot });
      H.hist = H.hist.slice(0, 10);
      if (opp.uid) H.recent = [opp.uid, ...H.recent.filter(x => x !== opp.uid)].slice(0, 5);
      const ups = gainExp(exp);
      save();
      const result = { won, sc, before, after: rp, money, exp, ups, opp, bo };
      showVs(opp, teams, series, bo, dl, promo, result);
    } catch (e) {
      console.warn('ranked', e);
      closeModal();
      const code = e && e.code;
      toast(code === 'permission-denied' ? 'Máy chủ từ chối (luật Firestore chưa cập nhật hoặc đấu quá nhanh)' : 'Không kết nối được máy chủ xếp hạng', 'err');
    } finally { st.busy = false; }
  }

  function showVs(opp, teams, series, bo, dl, promo, R) {
    const [me, them] = teams;
    const p = winProb(me.power, them.power);
    openModal(`<h2 class="center">🏆 Đấu xếp hạng${promo ? ' · <span class="rk-promo">TRẬN THĂNG BẬC</span>' : ''}</h2>
      <p class="center muted small">Thắng <b class="up">+${dl.win}</b> · Thua <b class="down">−${dl.lose}</b> điểm hạng · Kết quả đã được ghi nhận</p>
      <div class="vs">
        <div class="vs-team blue"><div class="vs-logo">${clubLogoHTML(me.name, true)}</div><h3>${esc(me.name)}</h3><div class="rk-mini">${badge(R.before)} ${rankOf(R.before).label} · ${R.before}</div><div class="pw">⚡ ${me.power}</div>${rosterList(me)}</div>
        <div class="vs-mid"><b>VS</b><small>BO${bo}</small><div class="wp">Cơ hội thắng mỗi ván<br><b>${Math.round(p * 100)}%</b></div></div>
        <div class="vs-team red"><div class="vs-logo">${clubLogoHTML(them.name)}</div><h3>${esc(them.name)}</h3><div class="rk-mini">${opp.bot ? '🤖 Đội máy' : `${badge(opp.rp)} ${rankOf(opp.rp).label} · ${opp.rp}`}</div><div class="pw">⚡ ${them.power}</div>${rosterList(them)}</div>
      </div>
      <div class="actions"><button class="btn primary" id="rk-watch">▶ Vào trận</button><button class="btn ghost" id="rk-result">Xem kết quả ngay</button></div>`, true);
    $('#rk-watch').onclick = () => {
      closeModal();
      MatchUI.playSeries({ title: 'Đấu xếp hạng', teams, bo, games: series, pWin: p, onEnd: () => showResult(R) });
    };
    $('#rk-result').onclick = () => showResult(R);
  }

  function showResult(R) {
    const a = rankOf(R.before), b = rankOf(R.after);
    const up = b.t > a.t || (b.t === a.t && b.div !== a.div && R.after > R.before);
    const down = b.t < a.t || (b.t === a.t && b.div !== a.div && R.after < R.before);
    const d = R.after - R.before;
    openModal(`<h2 class="center ${R.won ? 'win-t' : 'lose-t'}">${R.won ? '🎉 Chiến thắng!' : '😞 Thất bại'}</h2>
      <p class="center">Đối thủ <b id="rk-on"></b> · Tỉ số ${R.sc[0]} - ${R.sc[1]}</p>
      <div class="rk-res">
        ${badge(R.after, true)}
        <div class="rk-res-main">
          <b class="rk-res-tier" style="color:${b.c}">${b.label}</b>
          <div class="rk-bar"><i style="width:${Math.round(a.pct * 100)}%;background:${b.c}"></i></div>
          <span class="rk-res-rp"><b id="rk-rp">${R.before}</b> điểm <span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : '−'}${Math.abs(d)}</span></span>
        </div>
      </div>
      ${up ? `<div class="rk-flash up">⬆ THĂNG HẠNG: ${b.label.toUpperCase()}!</div>` : down ? `<div class="rk-flash down">⬇ Rớt xuống ${b.label}</div>` : ''}
      ${rewardHTML([`+${fmt(R.money)} 💰`, `+${R.exp} EXP`], R.ups)}
      <div class="actions"><button class="btn primary" id="rk-again" ${ticketsLeft(st.me) ? '' : 'disabled'}>⚔️ Đấu tiếp (${ticketsLeft(st.me)} lượt)</button><button class="btn ghost" id="rk-close">Đóng</button></div>`);
    $('#rk-on').textContent = R.opp.name;
    // đếm điểm & chạy thanh
    const rpEl = $('#rk-rp'), bar = document.querySelector('.rk-res .rk-bar i');
    const t0 = performance.now(), dur = 1100;
    const stepFn = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      if (rpEl) rpEl.textContent = Math.round(R.before + d * e);
      if (k < 1) requestAnimationFrame(stepFn);
    };
    requestAnimationFrame(stepFn);
    setTimeout(() => { if (bar) bar.style.width = Math.round(b.pct * 100) + '%'; }, 60);
    if (typeof SFX !== 'undefined') { if (up) SFX.success(3); else if (down) SFX.fail(); }
    $('#rk-again').onclick = () => play();
    $('#rk-close').onclick = closeModal;
    renderAll();
  }

  // ----- bảng xếp hạng -----
  const BOARDS = {
    rp: { n: 'Điểm hạng', f: 'rp', v: d => `${badge(d.rp)} <b>${d.rp | 0}</b>` },
    level: { n: 'Cấp độ', f: 'level', v: d => `<b>Cấp ${d.level | 0}</b>` },
    titles: { n: 'Danh hiệu', f: 'titles', v: d => `<b>🏆 ${d.titles | 0}</b>` },
    power: { n: 'Lực chiến', f: 'power', v: d => `<b>⚡ ${(+d.power || 0).toFixed(1)}</b>` },
  };
  async function fetchBoard(board, scope) {
    const key = board + ':' + scope, c = st.cache[key];
    if (c && Date.now() - c.t < LB_TTL) return c.rows;
    const db = await ensureDb(), f = BOARDS[board].f;
    let rows;
    if (scope === 'friends') {
      const ids = [...new Set([...(S.friends || []).map(x => x.id), S.profile && S.profile.id].filter(Boolean))];
      const chunks = []; for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
      const snaps = await Promise.all(chunks.map(ch => db.collection('ranked').where('fid', 'in', ch).get()));
      rows = snaps.flatMap(s => s.docs.map(d => ({ uid: d.id, ...d.data() })));
      rows.sort((a, b) => (+b[f] || 0) - (+a[f] || 0) || (+b.rp || 0) - (+a.rp || 0));
    } else {
      const s = await db.collection('ranked').orderBy(f, 'desc').limit(100).get();
      rows = s.docs.map(d => ({ uid: d.id, ...d.data() }));
    }
    st.cache[key] = { t: Date.now(), rows };
    return rows;
  }
  async function myPosition(rows) {
    if (!signedIn() || !st.me) return null;
    const uid = AUTH.user.uid, i = rows.findIndex(r => r.uid === uid);
    if (i >= 0) return i + 1;
    if (st.board !== 'rp' || st.scope !== 'all') return null;
    if (st.myPos != null) return st.myPos;
    try {
      const q = AUTH.db.collection('ranked').where('rp', '>', st.me.rp);
      if (typeof q.count !== 'function') return null;
      const s = await q.count().get();
      st.myPos = s.data().count + 1;
      return st.myPos;
    } catch (e) { return null; }
  }
  function rowHTML(r, i, mine) {
    const B = BOARDS[st.board];
    const name = String(r.name || 'Đội ẩn danh').replace(/[\u0000-\u001f]/g, '').slice(0, 24);
    const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1;
    return `<div class="lb-row${mine ? ' me' : ''}${i < 3 ? ' top' + (i + 1) : ''}" data-uid="${esc(r.uid)}">
      <span class="lb-pos">${medal}</span>
      <span class="lb-logo">${clubLogoHTML(name)}</span>
      <span class="lb-name"><b>${esc(name)}</b><small>${rankOf(r.rp | 0).label} · ${r.w | 0}T ${r.l | 0}B</small></span>
      <span class="lb-val">${B.v(r)}</span>
    </div>`;
  }
  async function renderBoard() {
    const box = document.getElementById('lb-list');
    if (!box) return;
    box.innerHTML = '<div class="spinner"></div>';
    try {
      const rows = await fetchBoard(st.board, st.scope);
      if (!document.getElementById('lb-list')) return;
      const uid = signedIn() ? AUTH.user.uid : null;
      box.innerHTML = rows.length ? rows.map((r, i) => rowHTML(r, i, r.uid === uid)).join('')
        : `<p class="muted center">${st.scope === 'friends' ? 'Chưa có bạn bè nào tham gia xếp hạng.' : 'Chưa có ai trên bảng xếp hạng. Hãy là người đầu tiên!'}</p>`;
      box.querySelectorAll('.lb-row').forEach(el => el.onclick = () => showTeam(rows.find(r => r.uid === el.dataset.uid)));
      const pos = await myPosition(rows);
      const pin = document.getElementById('lb-me');
      if (pin) pin.innerHTML = st.me ? `Vị trí của bạn: <b>${pos ? '#' + pos : (st.scope === 'all' ? 'ngoài top 100' : '—')}</b> · ${badge(st.me.rp)} ${rankOf(st.me.rp).label} · ${st.me.rp} điểm` : '';
    } catch (e) {
      console.warn('leaderboard', e);
      box.innerHTML = `<p class="muted center">Không tải được bảng xếp hạng${e && e.code === 'permission-denied' ? ' (luật Firestore chưa cập nhật)' : ''}.</p>`;
    }
  }
  function showTeam(r) {
    if (!r) return;
    const t = teamFromDoc(r);
    const name = t ? t.name : String(r.name || 'Đội ẩn danh').slice(0, 24);
    openModal(`<h2 class="center">${clubLogoHTML(name)} <span id="lt-name"></span></h2>
      <p class="center">${badge(r.rp | 0)} <b>${rankOf(r.rp | 0).label}</b> · ${r.rp | 0} điểm · cao nhất ${r.peak | 0}</p>
      <p class="center muted small">Cấp ${r.level | 0} · 🏆 ${r.titles | 0} danh hiệu · ${r.w | 0} thắng ${r.l | 0} thua${games(r) ? ` (${Math.round(r.w / games(r) * 100)}%)` : ''}${t ? ` · ⚡ ${t.power}` : ''}</p>
      ${t ? `<div class="lt-roster">${rosterList(t)}</div>` : '<p class="center muted">Đội hình không hợp lệ</p>'}
      <div class="actions"><button class="btn" id="lt-close">Đóng</button></div>`);
    $('#lt-name').textContent = name;
    $('#lt-close').onclick = closeModal;
  }

  // ----- giao diện tab -----
  function myPanel() {
    if (!authConfigured()) return '<p class="muted">Máy chủ chưa được cấu hình.</p>';
    if (!signedIn()) return `<div class="rk-guest"><div class="rk-guest-i">🔒</div><p>Đăng nhập để đấu xếp hạng, lưu điểm hạng và có tên trên bảng xếp hạng.</p><button class="btn primary" id="rk-login">Đăng nhập</button></div>`;
    if (!myTeam()) return `<p class="notice">Đội hình cần đủ 5 vị trí để tham gia xếp hạng.</p><div class="actions left"><button class="btn primary" id="rk-team">⚔️ Xếp đội hình</button></div>`;
    const me = st.me;
    if (!me) return '<div class="spinner"></div>';
    const r = rankOf(me.rp), n = games(me), left = ticketsLeft(me);
    const H = hist().hist;
    return `<div class="rk-me">
        ${badge(me.rp, true)}
        <div class="rk-me-main">
          <b class="rk-tier" style="color:${r.c}">${r.label}</b>
          <div class="rk-bar"><i style="width:${Math.round(r.pct * 100)}%;background:${r.c}"></i></div>
          <small>${me.rp} điểm${r.next ? ` · còn ${r.next - me.rp} lên bậc kế` : ''} · cao nhất ${me.peak || me.rp}</small>
        </div>
      </div>
      <div class="rk-stats">
        <div><small>Trận</small><b>${n}</b></div>
        <div><small>Thắng</small><b>${me.w}</b></div>
        <div><small>Tỉ lệ</small><b>${n ? Math.round(me.w / n * 100) + '%' : '—'}</b></div>
        <div><small>Chuỗi</small><b class="${me.streak > 0 ? 'up' : me.streak < 0 ? 'down' : ''}">${me.streak > 0 ? '🔥' + me.streak : me.streak < 0 ? me.streak : '0'}</b></div>
      </div>
      ${n < PLACEMENT ? `<p class="muted small">🎯 Trận định vị: còn ${PLACEMENT - n} trận (điểm thay đổi nhiều hơn)</p>` : ''}
      <button class="btn primary rk-play" id="rk-play" ${left ? '' : 'disabled'}>⚔️ Tìm trận xếp hạng</button>
      <div class="rk-tix">${Array.from({ length: DAILY }, (_, i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('')}<span>${left}/${DAILY} lượt hôm nay · làm mới lúc 0:00</span></div>
      <p class="muted small">Đội hình hiện tại của bạn là đội phòng thủ – người khác sẽ đấu với đội này.</p>
      <h4 class="sub-h">📜 Lịch sử gần đây</h4>
      <div class="rk-hist">${H.length ? H.map(h => `<div class="rk-h ${h.won ? 'w' : 'l'}"><b>${h.won ? 'THẮNG' : 'THUA'}</b><span class="rk-h-opp"></span><small>${h.sc[0]}-${h.sc[1]}${h.bo > 1 ? ' · BO' + h.bo : ''}</small><em class="${h.d >= 0 ? 'up' : 'down'}">${h.d >= 0 ? '+' : '−'}${Math.abs(h.d)}</em></div>`).join('') : '<p class="muted small">Chưa có trận nào.</p>'}</div>`;
  }
  function render() {
    const el = document.getElementById('view-rank');
    if (!el || !S) return;
    if (signedIn() && st.loaded !== AUTH.user.uid) loadMe().then(() => { if (currentView === 'rank') render(); }).catch(e => { console.warn('ranked', e); st.loaded = AUTH.user.uid; });
    else syncProfile(true);
    el.innerHTML = `<div class="rk-wrap">
      <div class="panel rk-panel"><h3>🏆 Đấu xếp hạng <span class="muted small">Mùa ${SEASON}</span></h3>${myPanel()}
        <details class="rk-help"><summary>Bậc hạng & luật</summary>
          <div class="rk-tiers">${TIERS.map((T, i) => `<span><span class="rk-badge" style="--rk:${T.c}">${T.i}</span>${T.n}<small>${i === 0 ? '< 1000' : i === 5 ? LEGEND + '+' : (1000 + (i - 1) * 300) + '+'}</small></span>`).join('')}</div>
          <ul class="muted small"><li>Mỗi bậc có 3 phân hạng III → I (100 điểm mỗi phân hạng); Huyền Thoại xếp theo điểm.</li>
          <li>Thắng người hạng cao hơn được nhiều điểm hơn. 5 trận đầu là trận định vị.</li>
          <li>Trận có thể đưa bạn lên bậc mới là <b>trận thăng bậc BO3</b>.</li>
          <li>Kết quả được ghi ngay khi tìm thấy đối thủ – thoát giữa trận không tránh được trận thua.</li></ul>
        </details>
      </div>
      <div class="panel lb-panel">
        <h3>📊 Bảng xếp hạng</h3>
        <div class="lb-tabs">${Object.entries(BOARDS).map(([k, B]) => `<button class="${k === st.board ? 'on' : ''}" data-b="${k}">${B.n}</button>`).join('')}</div>
        <div class="lb-scope"><button class="${st.scope === 'all' ? 'on' : ''}" data-s="all">🌐 Toàn server</button><button class="${st.scope === 'friends' ? 'on' : ''}" data-s="friends">👥 Bạn bè</button><button class="lb-ref" id="lb-ref" title="Làm mới">↻</button></div>
        <div class="lb-me" id="lb-me"></div>
        <div class="lb-list" id="lb-list"></div>
      </div>
    </div>`;
    const H = hist().hist;
    el.querySelectorAll('.rk-h-opp').forEach((s, i) => { s.textContent = H[i].opp; });
    const on = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = fn; };
    on('rk-login', () => openAcct());
    on('rk-team', () => switchView('team'));
    on('rk-play', () => play());
    on('lb-ref', () => { st.cache = {}; st.myPos = null; renderBoard(); });
    el.querySelectorAll('.lb-tabs button').forEach(b => b.onclick = () => { st.board = b.dataset.b; el.querySelectorAll('.lb-tabs button').forEach(x => x.classList.toggle('on', x === b)); renderBoard(); });
    el.querySelectorAll('.lb-scope [data-s]').forEach(b => b.onclick = () => { st.scope = b.dataset.s; el.querySelectorAll('.lb-scope [data-s]').forEach(x => x.classList.toggle('on', x === b)); renderBoard(); });
    renderBoard();
  }

  return { render, play, rankOf, _st: st };
})();
