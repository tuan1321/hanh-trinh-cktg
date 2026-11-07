// ===== Thống kê truy cập =====
// 1) Tài khoản đã đăng nhập: ghi lượt vào game, tổng thời gian chơi, lần hoạt động gần nhất, thiết bị
//    vào Firestore (activity/{uid}) và số liệu theo ngày (daily/{YYYY-MM-DD}). Chủ trang xem ở admin.html.
//    Thời gian chơi chỉ tính khi tab đang mở và có thao tác trong 2 phút gần nhất.
//    Tiết kiệm: 1 lần đọc + 2 lần ghi khi vào game, sau đó tối đa 2 lần ghi / 5 phút chơi.
// 2) Mọi lượt truy cập (cả Khách): Google Analytics, chỉ bật khi điền ANALYTICS_ID trong js/firebase-config.js.
const ACTIVITY = (() => {
  const FLUSH_MS = 5 * 60 * 1000, IDLE_MS = 2 * 60 * 1000, MAX_STEP = 15000;
  let uid = null, pend = 0, lastTick = 0, lastInput = Date.now(), timer = null;
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  function device() {
    const ua = navigator.userAgent;
    const mob = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Khác';
    const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /coc_coc|CocCoc/i.test(ua) ? 'Cốc Cốc' : /SamsungBrowser/i.test(ua) ? 'Samsung' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Khác';
    return `${mob ? 'Điện thoại' : 'Máy tính'} · ${os} · ${br}`;
  }
  const active = () => !document.hidden && Date.now() - lastInput < IDLE_MS;
  function tick() {
    const n = Date.now();
    if (uid && lastTick && active()) pend += Math.min(n - lastTick, MAX_STEP) / 1000;
    lastTick = n;
  }
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(e => addEventListener(e, () => { if (!active()) lastTick = Date.now(); lastInput = Date.now(); }, { passive: true }));
  setInterval(tick, 10000);
  const info = () => ({ name: (S && S.teamName) || '', level: (S && S.level) || 1 });

  async function start(user) {
    if (!user || uid === user.uid || !AUTH.db) return;
    stop();
    uid = user.uid; pend = 0; lastTick = Date.now(); lastInput = Date.now();
    const FV = firebase.firestore.FieldValue, db = AUTH.db, day = today();
    const ref = db.collection('activity').doc(uid);
    let prev = null;
    try { const d = await ref.get(); if (d.exists) prev = d.data(); } catch (e) { console.warn(e); return; }
    if (uid !== user.uid) return;
    const base = { ...info(), device: device(), last: FV.serverTimestamp(), lastDay: day, sessions: FV.increment(1) };
    if (!prev) Object.assign(base, { first: FV.serverTimestamp(), seconds: 0 });
    ref.set(base, { merge: true }).catch(e => console.warn('activity', e));
    const dd = { sessions: FV.increment(1) };
    if (!prev || prev.lastDay !== day) dd.users = FV.increment(1); // lần đầu trong ngày → +1 người chơi
    db.collection('daily').doc(day).set(dd, { merge: true }).catch(e => console.warn('daily', e));
    clearInterval(timer); timer = setInterval(() => flush(), FLUSH_MS);
  }
  function flush(force) {
    tick();
    if (!uid || !AUTH.db || !AUTH.user || AUTH.user.uid !== uid) return;
    if (pend < (force ? 5 : 20)) return;
    const s = Math.min(600, Math.round(pend)); pend = 0;
    const FV = firebase.firestore.FieldValue, day = today();
    AUTH.db.collection('activity').doc(uid).set({ ...info(), seconds: FV.increment(s), last: FV.serverTimestamp(), lastDay: day }, { merge: true }).catch(e => console.warn('activity', e));
    AUTH.db.collection('daily').doc(day).set({ seconds: FV.increment(s) }, { merge: true }).catch(e => console.warn('daily', e));
  }
  function stop() { flush(true); uid = null; clearInterval(timer); timer = null; }
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(true); });
  addEventListener('pagehide', () => flush(true));
  return { start, stop, flush };
})();

// ----- Google Analytics (tùy chọn) -----
(function initAnalytics() {
  if (typeof ANALYTICS_ID === 'undefined' || !ANALYTICS_ID) return;
  const s = document.createElement('script');
  s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ANALYTICS_ID);
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', ANALYTICS_ID, { anonymize_ip: true });
  const n = document.getElementById('analytics-note');
  if (n) n.classList.remove('hidden');
})();
