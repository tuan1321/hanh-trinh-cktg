// ===== Đăng nhập & lưu tiến trình theo tài khoản (Firebase Auth + Firestore) =====
// - Đăng nhập bằng Google hoặc email/mật khẩu
// - Tiến trình lưu ở saves/{uid} trên Firestore (chỉ chủ tài khoản đọc/ghi được, xem firestore.rules)
// - Mỗi tài khoản có bản sao trên máy (khóa riêng); khi đăng xuất quay về bản lưu Khách
const FB_VER = '10.12.2';
const AUTH = { ready: false, user: null, boundUid: null, db: null, auth: null, sync: 'off', lastSync: null, timer: null };

function authConfigured() { return typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey; }

function loadScript(src) {
  return new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => fail(new Error('Không tải được ' + src));
    document.head.appendChild(s);
  });
}
async function initAuth() {
  renderAcct();
  if (!authConfigured()) return;
  try {
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    await loadScript(base + 'firebase-app-compat.js');
    await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-firestore-compat.js')]);
    firebase.initializeApp(FIREBASE_CONFIG);
    AUTH.auth = firebase.auth();
    AUTH.db = firebase.firestore();
    AUTH.ready = true;
    AUTH.auth.onAuthStateChanged(onAuthChange);
  } catch (e) {
    console.warn(e);
    toast('Không kết nối được máy chủ đăng nhập – đang chơi ở chế độ Khách', 'err');
  }
  renderAcct();
}

// ----- đổi bản lưu đang dùng -----
function switchSave(newS) {
  const wasOnline = typeof NET !== 'undefined' && NET.status !== 'off';
  if (wasOnline) goOffline(true);
  S = newS;
  ensureSocial();
  currentView = 'team';
  switchView('team');
  refreshSocialUI();
  if (S.online) goOnline();
}
const userKey = uid => 'hanhtrinh_cktg_u_' + uid;
function readKey(k) { try { const s = JSON.parse(localStorage.getItem(k)); return s && s.v === 2 ? s : null; } catch (e) { return null; } }

async function onAuthChange(user) {
  AUTH.user = user;
  if (!user) {
    // đăng xuất (hoặc chưa đăng nhập)
    if (AUTH.boundUid) {
      AUTH.boundUid = null; setSync('off');
      SAVE_KEY = GUEST_KEY;
      const g = readKey(GUEST_KEY);
      if (g) switchSave(g); else { S = null; const got = newGame(); switchSave(S); welcome(got); }
      toast('Đã đăng xuất – quay về chế độ Khách');
    }
    renderAcct();
    return;
  }
  if (AUTH.boundUid === user.uid) { renderAcct(); return; }
  setSync('loading');
  let cloud = null, failed = false;
  try {
    const d = await AUTH.db.collection('saves').doc(user.uid).get();
    if (d.exists) { const s = JSON.parse(d.data().data); if (s && s.v === 2) cloud = s; }
  } catch (e) { failed = true; console.warn(e); }
  if (failed) {
    // không đọc được máy chủ: dùng bản sao trên máy nếu có, không ghi đè máy chủ
    const cached = readKey(userKey(user.uid));
    toast('Không tải được dữ liệu tài khoản (lỗi mạng hoặc luật Firestore)', 'err');
    setSync('err');
    if (cached) { SAVE_KEY = userKey(user.uid); AUTH.boundUid = user.uid; switchSave(cached); }
    renderAcct();
    return;
  }
  SAVE_KEY = userKey(user.uid);
  AUTH.boundUid = user.uid;
  if (cloud) {
    switchSave(cloud);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { }
    setSync('ok');
    toast(`Chào mừng trở lại, ${displayName(user)}!`, 'gold');
  } else {
    // tài khoản mới: hỏi có chuyển tiến trình Khách vào không
    const g = readKey(GUEST_KEY);
    const hasProgress = g && (g.stats.w + g.stats.l > 0 || Object.keys(g.cards).length > 7 || g.level > 1);
    if (hasProgress) {
      openModal(`<h2 class="center">🎉 Tài khoản mới!</h2>
        <p class="center">Bạn có tiến trình chơi ở chế độ Khách trên máy này:<br><b>Cấp ${g.level}</b> · ${Object.keys(g.cards).length} thẻ · 🏆 ${g.stats.titles} danh hiệu · 💰 ${fmt(g.money)}</p>
        <p class="center muted">Chuyển tiến trình này vào tài khoản để chơi tiếp trên mọi thiết bị?</p>
        <div class="actions"><button class="btn primary" id="mv-yes">Chuyển vào tài khoản</button><button class="btn ghost" id="mv-no">Bắt đầu mới</button></div>`);
      $('#mv-yes').onclick = () => { closeModal(); switchSave(JSON.parse(JSON.stringify(g))); save(); toast('Đã chuyển tiến trình vào tài khoản', 'gold'); };
      $('#mv-no').onclick = () => { closeModal(); S = null; const got = newGame(); switchSave(S); save(); welcome(got); };
    } else {
      S = null; const got = newGame(); switchSave(S); save(); welcome(got);
    }
  }
  renderAcct();
}

// ----- đồng bộ lên máy chủ (gom thay đổi, ghi sau 1.5 giây) -----
function cloudSave(now) {
  if (!AUTH.ready || !AUTH.user || AUTH.boundUid !== AUTH.user.uid || !S) return;
  clearTimeout(AUTH.timer);
  const run = () => {
    const uid = AUTH.user && AUTH.user.uid;
    if (!uid || uid !== AUTH.boundUid) return;
    setSync('saving');
    AUTH.db.collection('saves').doc(uid).set({
      data: JSON.stringify(S),
      name: String(S.teamName).slice(0, 24),
      level: S.level,
      updated: firebase.firestore.FieldValue.serverTimestamp(),
    }).then(() => { AUTH.lastSync = new Date(); setSync('ok'); })
      .catch(e => { console.warn(e); setSync('err'); });
  };
  if (now) run(); else AUTH.timer = setTimeout(run, 1500);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && AUTH.timer) { clearTimeout(AUTH.timer); AUTH.timer = null; cloudSave(true); } });
function setSync(s) { AUTH.sync = s; renderAcct(); }

// ----- giao diện -----
const displayName = u => (u.displayName || (u.email || 'Người chơi').split('@')[0]).slice(0, 24);
function renderAcct() {
  const b = document.getElementById('acct-btn');
  if (!b) return;
  const u = AUTH.user;
  const syncIcon = { ok: '☁️', saving: '⏳', loading: '⏳', err: '⚠️', off: '' }[AUTH.sync] || '';
  b.className = 'acct ' + (u ? 'in' : '');
  b.innerHTML = u
    ? `<span class="acct-av">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc(displayName(u)[0].toUpperCase())}</span><span class="acct-name"></span><span class="acct-sync" title="Trạng thái đồng bộ">${syncIcon}</span>`
    : `<span class="acct-av">👤</span><span class="acct-name">Đăng nhập</span>`;
  if (u) b.querySelector('.acct-name').textContent = displayName(u);
}
const AUTH_ERR = {
  'auth/invalid-email': 'Email không hợp lệ.',
  'auth/user-not-found': 'Sai email hoặc mật khẩu.',
  'auth/wrong-password': 'Sai email hoặc mật khẩu.',
  'auth/invalid-credential': 'Sai email hoặc mật khẩu.',
  'auth/invalid-login-credentials': 'Sai email hoặc mật khẩu.',
  'auth/email-already-in-use': 'Email này đã có tài khoản – hãy đăng nhập.',
  'auth/weak-password': 'Mật khẩu cần ít nhất 6 ký tự.',
  'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập.',
  'auth/cancelled-popup-request': 'Bạn đã đóng cửa sổ đăng nhập.',
  'auth/popup-blocked': 'Trình duyệt chặn cửa sổ đăng nhập – hãy cho phép popup.',
  'auth/unauthorized-domain': 'Trang này chưa được phép đăng nhập (cần thêm tên miền vào Firebase).',
  'auth/network-request-failed': 'Lỗi mạng, hãy thử lại.',
  'auth/too-many-requests': 'Thử quá nhiều lần, hãy đợi một lát.',
  'auth/operation-not-allowed': 'Cách đăng nhập này chưa được bật trong Firebase.',
};
const authMsg = e => AUTH_ERR[e && e.code] || ('Lỗi: ' + ((e && e.message) || e));

function openAcct() {
  if (!authConfigured()) {
    openModal(`<h2>👤 Tài khoản</h2>
      <p>Chức năng đăng nhập chưa được bật cho trang này. Bạn đang chơi ở <b>chế độ Khách</b> – tiến trình lưu trên trình duyệt này.</p>
      <p class="muted small">Chủ trang: điền cấu hình Firebase vào <code>js/firebase-config.js</code> để bật đăng nhập (xem README).</p>
      <div class="actions"><button class="btn" id="ac-close">Đóng</button></div>`);
    $('#ac-close').onclick = closeModal; return;
  }
  if (!AUTH.ready) { toast('Đang kết nối máy chủ đăng nhập…'); return; }
  const u = AUTH.user;
  if (u) {
    const prov = (u.providerData[0] && u.providerData[0].providerId) === 'google.com' ? 'Google' : 'Email';
    openModal(`<h2>👤 Tài khoản của bạn</h2>
      <div class="ac-me"><span class="acct-av big">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc(displayName(u)[0].toUpperCase())}</span>
        <div><b id="ac-name"></b><small id="ac-mail"></small><small>Đăng nhập bằng ${prov}</small></div></div>
      <div class="kv"><span>Đồng bộ tiến trình</span><b>${{ ok: '☁️ Đã lưu lên tài khoản', saving: '⏳ Đang lưu…', loading: '⏳ Đang tải…', err: '⚠️ Lỗi đồng bộ', off: '—' }[AUTH.sync]}</b></div>
      <div class="kv"><span>Lần lưu gần nhất</span><b>${AUTH.lastSync ? AUTH.lastSync.toLocaleTimeString('vi-VN') : '—'}</b></div>
      <p class="muted small">Tiến trình tự lưu lên tài khoản sau mỗi thay đổi. Đăng nhập cùng tài khoản trên máy khác để chơi tiếp.</p>
      <div class="actions"><button class="btn" id="ac-sync">☁️ Lưu ngay</button><button class="btn ghost" id="ac-out">Đăng xuất</button><button class="btn ghost" id="ac-close">Đóng</button></div>`);
    $('#ac-name').textContent = displayName(u);
    $('#ac-mail').textContent = u.email || '';
    $('#ac-sync').onclick = () => { cloudSave(true); toast('Đang lưu lên tài khoản…'); };
    $('#ac-out').onclick = () => { cloudSave(true); closeModal(); AUTH.auth.signOut(); };
    $('#ac-close').onclick = closeModal;
    return;
  }
  let mode = 'login';
  const draw = () => {
    openModal(`<h2 class="center">👤 ${mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
      <p class="center muted small">Lưu tiến trình lên tài khoản và chơi tiếp trên mọi thiết bị.</p>
      <button class="btn google" id="ac-google"><span class="g-logo">G</span> Tiếp tục với Google</button>
      <div class="or"><span>hoặc dùng email</span></div>
      <form id="ac-form" class="ac-form" autocomplete="on">
        <input type="email" id="ac-email" placeholder="Email" required autocomplete="email">
        <input type="password" id="ac-pass" placeholder="Mật khẩu (ít nhất 6 ký tự)" required minlength="6" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}">
        ${mode === 'reg' ? '<input type="password" id="ac-pass2" placeholder="Nhập lại mật khẩu" required minlength="6" autocomplete="new-password">' : ''}
        <div class="ac-err" id="ac-err"></div>
        <button class="btn primary" type="submit" id="ac-submit">${mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
      </form>
      <div class="ac-links">
        ${mode === 'login' ? '<a href="#" id="ac-forgot">Quên mật khẩu?</a><a href="#" id="ac-mode">Chưa có tài khoản? <b>Đăng ký</b></a>' : '<a href="#" id="ac-mode">Đã có tài khoản? <b>Đăng nhập</b></a>'}
      </div>`);
    const err = m => { $('#ac-err').textContent = m || ''; };
    const busy = on => { $('#ac-submit').disabled = on; $('#ac-google').disabled = on; };
    $('#ac-google').onclick = async () => {
      busy(true); err('');
      try { await AUTH.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); closeModal(); }
      catch (e) { err(authMsg(e)); busy(false); }
    };
    $('#ac-form').onsubmit = async ev => {
      ev.preventDefault();
      const email = $('#ac-email').value.trim(), pass = $('#ac-pass').value;
      if (mode === 'reg' && pass !== $('#ac-pass2').value) return err('Hai mật khẩu không khớp.');
      busy(true); err('');
      try {
        if (mode === 'login') await AUTH.auth.signInWithEmailAndPassword(email, pass);
        else await AUTH.auth.createUserWithEmailAndPassword(email, pass);
        closeModal();
      } catch (e) { err(authMsg(e)); busy(false); }
    };
    $('#ac-mode').onclick = e => { e.preventDefault(); mode = mode === 'login' ? 'reg' : 'login'; draw(); };
    if ($('#ac-forgot')) $('#ac-forgot').onclick = async e => {
      e.preventDefault();
      const email = $('#ac-email').value.trim();
      if (!email) return err('Nhập email trước rồi bấm "Quên mật khẩu".');
      try { await AUTH.auth.sendPasswordResetEmail(email); toast('Đã gửi email đặt lại mật khẩu (kiểm tra cả hộp thư rác)'); }
      catch (er) { err(authMsg(er)); }
    };
  };
  draw();
}

document.getElementById('acct-btn').onclick = openAcct;
window.addEventListener('load', initAuth);
