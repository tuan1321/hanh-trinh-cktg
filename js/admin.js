// Trang thống kê cho quản trị viên (admin.html).
// Dữ liệu activity/{uid} do chính người chơi ghi lên → coi là dữ liệu lạ: ép kiểu + esc() trước khi hiển thị.
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const SRI = {
  'firebase-app-compat.js': 'sha384-AQ3POAMqIhwS81FrUH95ekxqBZHeP5tG2JfEL3+7GuTtfRLWnrRh32UxwzM+//A9',
  'firebase-auth-compat.js': 'sha384-TnlRYaR4JYz/lpaGuaiU61PjNberSA4vjLjtF+oRC/IkohkJqnWxw5EmDSOt1vA1',
  'firebase-firestore-compat.js': 'sha384-qn4Jh88HhJA8dplNQyGjOh9OGI4izVhrfj/qIFgaKcdgOE06pXqIKGlsCILZcLAC',
};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = src => new Promise((ok, no) => {
  const s = document.createElement('script');
  const sri = SRI[src.split('/').pop()];
  if (sri) { s.integrity = sri; s.crossOrigin = 'anonymous'; }
  s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s);
});
const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDur = s => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h} giờ ${m} phút` : m ? `${m} phút` : `${s} giây`; };
const fmtDate = d => d ? d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const int = (v, hi) => { v = Math.floor(Number(v)); return Number.isFinite(v) ? Math.max(0, Math.min(hi, v)) : 0; };
const str = (v, n) => (typeof v === 'string' ? v : '').replace(/[\u0000-\u001f]/g, '').slice(0, n);
const date = v => (v && typeof v.toDate === 'function' ? v.toDate() : null);
function ago(d) {
  if (!d) return '—';
  const s = (Date.now() - d) / 1000;
  if (s < 60) return 'vừa xong'; if (s < 3600) return Math.floor(s / 60) + ' phút trước';
  if (s < 86400) return Math.floor(s / 3600) + ' giờ trước'; if (s < 86400 * 30) return Math.floor(s / 86400) + ' ngày trước';
  return d.toLocaleDateString('vi-VN');
}
let db, auth, ACC = [], DAILY = {}, sortKey = 'last', metric = 'users';

(async () => {
  if (typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG) { $('#who').textContent = 'Chưa cấu hình Firebase'; return; }
  await load(FB + 'firebase-app-compat.js');
  await Promise.all([load(FB + 'firebase-auth-compat.js'), load(FB + 'firebase-firestore-compat.js')]);
  firebase.initializeApp(FIREBASE_CONFIG);
  auth = firebase.auth(); db = firebase.firestore();
  if (typeof ANALYTICS_ID !== 'undefined' && ANALYTICS_ID) $('#ga-link').innerHTML = `Lượt truy cập của mọi người (kể cả Khách), quốc gia, nguồn truy cập, thời gian thực: <a href="https://analytics.google.com/" target="_blank" rel="noopener">mở Google Analytics</a> (${esc(ANALYTICS_ID)}).`;
  else $('#ga-link').textContent = 'Google Analytics chưa bật (ANALYTICS_ID trong js/firebase-config.js) – bảng trên chỉ gồm tài khoản đã đăng nhập.';
  $('#google').onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => alert(e.message));
  $('#logout').onclick = () => auth.signOut();
  $('#reload').onclick = refresh;
  auth.onAuthStateChanged(async u => {
    ['#login', '#denied', '#dash'].forEach(s => $(s).classList.add('hidden'));
    $('#logout').classList.toggle('hidden', !u); $('#reload').classList.toggle('hidden', !u);
    if (!u) { $('#who').textContent = 'Chưa đăng nhập'; $('#login').classList.remove('hidden'); return; }
    $('#who').textContent = u.email || u.displayName || u.uid;
    let ok = false;
    try { ok = (await db.collection('admins').doc(u.uid).get()).exists; } catch (e) { ok = false; }
    if (!ok) { $('#my-uid').textContent = u.uid; $('#denied').classList.remove('hidden'); return; }
    $('#dash').classList.remove('hidden');
    refresh();
  });
})();

async function refresh() {
  $('#reload').disabled = true;
  try {
    const from = new Date(); from.setDate(from.getDate() - 29);
    const [acc, daily] = await Promise.all([
      db.collection('activity').orderBy('last', 'desc').limit(1000).get(),
      db.collection('daily').where(firebase.firestore.FieldPath.documentId(), '>=', dayKey(from)).get(),
    ]);
    ACC = acc.docs.map(d => {
      const x = d.data();
      return { uid: d.id, name: str(x.name, 24), level: int(x.level, 99999) || 1, first: date(x.first), last: date(x.last), sessions: int(x.sessions, 1e9), seconds: int(x.seconds, 1e12), device: str(x.device, 80) };
    });
    ACC.forEach(a => a.avg = a.sessions ? a.seconds / a.sessions : 0);
    DAILY = {};
    daily.docs.forEach(d => { const x = d.data(); DAILY[d.id] = { users: int(x.users, 1e9), sessions: int(x.sessions, 1e9), seconds: int(x.seconds, 1e12) }; });
    render();
  } catch (e) {
    alert('Không đọc được dữ liệu: ' + e.message + '\nKiểm tra đã Publish firestore.rules mới chưa.');
  }
  $('#reload').disabled = false;
}

function render() {
  const now = Date.now(), H = 3600e3;
  const within = ms => ACC.filter(a => a.last && now - a.last < ms).length;
  const today = DAILY[dayKey(new Date())] || {};
  const tot = ACC.reduce((s, a) => s + a.seconds, 0), ses = ACC.reduce((s, a) => s + a.sessions, 0);
  const newWeek = ACC.filter(a => a.first && now - a.first < 7 * 24 * H).length;
  const k = (l, v, e) => `<div class="kpi"><small>${l}</small><b>${esc(v)}</b>${e ? `<em>${esc(e)}</em>` : ''}</div>`;
  $('#kpis').innerHTML = [
    k('Tổng tài khoản', ACC.length, `+${newWeek} trong 7 ngày`),
    k('Đang chơi', within(6 * 60e3), 'trong 6 phút gần nhất'),
    k('Hoạt động hôm nay', today.users || 0, `${today.sessions || 0} lượt vào · ${fmtDur(today.seconds)}`),
    k('Hoạt động 7 ngày', within(7 * 24 * H)),
    k('Hoạt động 30 ngày', within(30 * 24 * H)),
    k('Tổng thời gian chơi', tot >= 3600 ? (tot / 3600).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' giờ' : fmtDur(tot), `${ses} lượt vào game`),
    k('TB mỗi lượt', fmtDur(ses ? tot / ses : 0)),
  ].join('');
  // biểu đồ 30 ngày
  const days = []; for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  const val = d => { const x = DAILY[dayKey(d)] || {}; return metric === 'seconds' ? (x.seconds || 0) / 3600 : x[metric] || 0; };
  const max = Math.max(1, ...days.map(val));
  $('#chart').innerHTML = days.map((d, i) => { const v = val(d), lbl = metric === 'seconds' ? v.toFixed(1) + ' giờ' : v; return `<div class="bar ${i === 29 ? 'today' : ''}" title="${d.toLocaleDateString('vi-VN')}: ${lbl}"><i style="height:${v / max * 100}%"></i>${v ? `<span style="bottom:calc(${v / max * 100}% + 2px)">${metric === 'seconds' ? v.toFixed(1) : v}</span>` : ''}</div>`; }).join('');
  $('#xlab').innerHTML = days.map((d, i) => `<span>${(29 - i) % 5 === 0 ? `<b>${i === 29 ? 'Hôm nay' : pad(d.getDate()) + '/' + pad(d.getMonth() + 1)}</b>` : ''}</span>`).join('');
  // thiết bị
  const cnt = {}; ACC.forEach(a => { const p = a.device.split(' · '); const key = p.length >= 2 ? p[0] + ' · ' + p[1] : (a.device || 'Không rõ'); cnt[key] = (cnt[key] || 0) + 1; });
  const br = {}; ACC.forEach(a => { const b = a.device.split(' · ')[2] || 'Không rõ'; br[b] = (br[b] || 0) + 1; });
  const dist = (o, title) => `<p class="dtitle">${title}</p>` + Object.entries(o).sort((a, b) => b[1] - a[1]).map(([n, c]) => `<div class="drow"><p title="${esc(n)}">${esc(n)}</p><b>${c}</b><span class="track"><i style="width:${c / ACC.length * 100}%"></i></span></div>`).join('');
  $('#devices').innerHTML = ACC.length ? dist(cnt, 'Loại máy · hệ điều hành') + dist(br, 'Trình duyệt') : '<p class="muted">Chưa có dữ liệu.</p>';
  renderRows();
}

function renderRows() {
  const q = $('#q').value.trim().toLowerCase(), now = Date.now();
  let list = ACC.filter(a => !q || a.name.toLowerCase().includes(q) || a.uid.toLowerCase().includes(q));
  const dir = ['name', 'device'].includes(sortKey) ? 1 : -1;
  list.sort((a, b) => { const x = a[sortKey], y = b[sortKey]; return (typeof x === 'string' ? x.localeCompare(y) : (x || 0) - (y || 0)) * dir; });
  $('#n-acc').textContent = list.length;
  $('#rows').innerHTML = list.map(a => {
    const st = a.last && now - a.last < 6 * 60e3 ? 'on' : a.last && now - a.last < 24 * 3600e3 ? 'recent' : '';
    return `<tr><td><span class="dot ${st}"></span>${esc(a.name || '(chưa đặt tên)')}</td><td>${a.level}</td><td title="${fmtDate(a.last)}">${ago(a.last)}</td>
      <td title="${fmtDate(a.first)}">${a.first ? a.first.toLocaleDateString('vi-VN') : '—'}</td><td>${a.sessions}</td><td>${fmtDur(a.seconds)}</td><td>${fmtDur(a.avg)}</td>
      <td>${esc(a.device)}</td><td class="uid">${esc(a.uid.slice(0, 10))}…</td></tr>`;
  }).join('') || '<tr><td colspan="9" class="muted">Chưa có tài khoản nào.</td></tr>';
}
$('#q').oninput = renderRows;
$('#metric').onchange = e => { metric = e.target.value; render(); };
document.querySelectorAll('th[data-s]').forEach(th => th.onclick = () => {
  sortKey = th.dataset.s; document.querySelectorAll('th').forEach(x => x.classList.toggle('on', x === th)); renderRows();
});
