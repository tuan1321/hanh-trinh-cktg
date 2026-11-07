// ===== Tên đội: luật đặt tên + giữ tên duy nhất =====
// - Tên mặc định: "HLV #<mã kết bạn>" – mỗi người một mã nên không bao giờ trùng.
// - Tên riêng: phải đăng nhập. Tên được giữ vĩnh viễn trên máy chủ (Firestore: names/{khóa}),
//   người khác không thể đặt lại, kể cả khi chủ tên đã đổi sang tên khác.
// - Khóa so trùng bỏ dấu, bỏ khoảng trắng & ký hiệu, không phân biệt hoa thường:
//   "Rồng Lửa" = "rong lua" = "RONG-LUA".
const NAME_MIN = 3, NAME_MAX = 20;
const RENAME_COST = 5000;          // lần đổi tên riêng đầu tiên miễn phí, từ lần thứ hai tốn tiền
const DEFAULT_PREFIX = 'HLV #';
const DEFAULT_RE = /^HLV #[A-Z2-9]{8}$/;
const LEGACY_DEFAULT = 'Vietnam Legends';

const NAME_RULES = [
  `Dài ${NAME_MIN}–${NAME_MAX} ký tự, có ít nhất 2 chữ cái.`,
  'Chỉ dùng chữ cái (có dấu tiếng Việt), số, khoảng trắng và . _ - \'',
  'Bắt đầu và kết thúc bằng chữ hoặc số; không có 2 ký hiệu liền nhau, không lặp 1 ký tự quá 3 lần.',
  'Không trùng tên người khác (không phân biệt hoa thường, dấu, khoảng trắng). Tên đã có người đặt sẽ không bao giờ được đặt lại.',
  'Không trùng tên các đội AI trong game, không giả danh quản trị / nhà phát hành, không dùng từ thô tục.',
  `Không dùng ký tự # (dành cho tên mặc định). Lần đổi tên đầu miễn phí, sau đó ${'5.000'} 💰 mỗi lần (quay lại tên cũ của mình thì miễn phí).`,
];

const cleanName = s => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
const nameKey = s => cleanName(s).toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const isDefaultName = s => DEFAULT_RE.test(s || '');
const defaultTeamName = () => DEFAULT_PREFIX + S.profile.id;

const RESERVED_SUB = ['admin', 'moderator', 'quantri', 'hethong', 'system', 'nhaphathanh', 'support', 'official', 'chinhthuc', 'gamemaster', 'hanhtrinhcktg'];
const RESERVED_EXACT = ['mod', 'gm', 'cktg', 'bot', 'ai', 'khach', 'guest', 'hlv'];
// từ có dấu: so nguyên từ (tránh chặn nhầm "đĩa", "lớn"…); cụm từ: so chuỗi con
const BAD_VI_WORD = ['địt', 'lồn', 'cặc', 'buồi', 'đéo', 'đĩ', 'điếm', 'đụ'];
const BAD_VI_PHRASE = ['óc chó', 'mẹ mày', 'má mày', 'chó chết', 'con chó'];
// viết tắt không dấu: so nguyên từ (không chặn "lon", "cac"… vì trùng chữ thường như "lớn", "các")
const BAD_TOKEN = ['dm', 'dmm', 'dcm', 'dcmm', 'vcl', 'vkl', 'clm', 'cmm', 'loz', 'fuck', 'shit', 'bitch', 'dick', 'cunt', 'porn'];
const BAD_SUB = ['fuck', 'shit', 'bitch', 'nigg', 'porn', 'ditme', 'ditcon', 'dume', 'duma', 'dcmm', 'lonme', 'occho'];

// Trả về lời báo lỗi, hoặc '' nếu tên hợp lệ (chưa kiểm tra trùng trên máy chủ)
function nameError(raw) {
  const s = cleanName(raw);
  if (s.length < NAME_MIN) return `Tên cần ít nhất ${NAME_MIN} ký tự.`;
  if (s.length > NAME_MAX) return `Tên tối đa ${NAME_MAX} ký tự.`;
  if (s.includes('#')) return 'Ký tự # dành cho tên mặc định.';
  if (!/^[a-zA-Z0-9À-ỹđĐ ._\-']+$/.test(s)) return 'Chỉ dùng chữ cái, số, khoảng trắng và . _ - \'';
  if (!/^[a-zA-Z0-9À-ỹđĐ]/.test(s) || !/[a-zA-Z0-9À-ỹđĐ]$/.test(s)) return 'Tên phải bắt đầu và kết thúc bằng chữ hoặc số.';
  if (/[ ._\-']{2,}/.test(s)) return 'Không dùng 2 ký hiệu / khoảng trắng liền nhau.';
  if ((s.match(/[a-zA-ZÀ-ỹđĐ]/g) || []).length < 2) return 'Tên cần ít nhất 2 chữ cái.';
  if (/(.)\1{3,}/i.test(s)) return 'Không lặp một ký tự quá 3 lần.';
  const key = nameKey(s);
  if (key.length < NAME_MIN) return 'Tên quá ngắn sau khi bỏ dấu và ký hiệu.';
  if (RESERVED_EXACT.includes(key) || RESERVED_SUB.some(w => key.includes(w))) return 'Tên này được dành riêng, hãy chọn tên khác.';
  const low = s.toLowerCase();
  const words = low.split(/[ ._\-']+/);
  const tokens = words.map(w => w.replace(/đ/g, 'd').normalize('NFD').replace(/[̀-ͯ]/g, ''));
  if (words.some(w => BAD_VI_WORD.includes(w)) || BAD_VI_PHRASE.some(p => low.includes(p))
    || tokens.some(t => BAD_TOKEN.includes(t)) || BAD_SUB.some(w => key.includes(w))) return 'Tên chứa từ không phù hợp.';
  if (typeof allTeamNames === 'function' && allTeamNames().some(n => nameKey(n) === key)) return 'Trùng tên một đội AI trong game.';
  if (typeof TEAM_INFO !== 'undefined' && Object.entries(TEAM_INFO).some(([code, t]) => nameKey(code) === key || nameKey(t.name) === key)) return 'Trùng tên một đội chuyên nghiệp thật.';
  if (nameKey(LEGACY_DEFAULT) === key) return 'Tên này là tên mặc định cũ, hãy chọn tên khác.';
  return '';
}

// Bảo đảm bản lưu có tên hợp lệ. Tên riêng chưa được máy chủ xác nhận của khách
// được cất vào S.wantName (tự giữ khi đăng nhập) và tạm dùng tên mặc định.
function ensureName() {
  if (!S) return;
  S.myNames = Array.isArray(S.myNames) ? S.myNames : [];
  S.nameChanges = S.nameChanges || 0;
  const n = cleanName(S.teamName);
  const loggedIn = typeof AUTH !== 'undefined' && AUTH.user;
  if (!n || n === LEGACY_DEFAULT || (DEFAULT_RE.test(n) && n !== defaultTeamName())) { S.teamName = defaultTeamName(); return; }
  if (isDefaultName(n)) return;
  const verified = S.nameKey && S.nameKey === nameKey(n);
  if (!verified && !loggedIn) { S.wantName = S.wantName || n; S.teamName = defaultTeamName(); S.nameKey = null; }
}

// ----- máy chủ -----
const namesReady = () => typeof AUTH !== 'undefined' && AUTH.ready && AUTH.user && AUTH.boundUid === AUTH.user.uid;
function nameServerErr(e) {
  console.warn(e);
  return e && e.code === 'permission-denied'
    ? 'Máy chủ chưa bật luật giữ tên (chủ trang cần cập nhật firestore.rules).'
    : 'Không kết nối được máy chủ, hãy thử lại.';
}
// Bộ nhớ đệm kiểm tra tên (tiết kiệm lượt đọc Firestore): tên đã có chủ thì giữ mãi,
// tên còn trống thì nhớ 60 giây.
const NAME_CACHE = new Map();
async function nameStatus(name) { // 'free' | 'mine' | 'taken'
  const key = nameKey(name), uid = AUTH.user.uid;
  if (S.myNames && S.myNames.includes(key)) return 'mine';
  const c = NAME_CACHE.get(key);
  if (c && (c.uid || Date.now() - c.at < 60000)) return c.uid ? (c.uid === uid ? 'mine' : 'taken') : 'free';
  const d = await AUTH.db.collection('names').doc(key).get();
  const owner = d.exists ? d.data().uid : null;
  NAME_CACHE.set(key, { uid: owner, at: Date.now() });
  return !owner ? 'free' : owner === uid ? 'mine' : 'taken';
}
async function claimName(name) { // 'new' | 'mine' | 'taken'
  const ref = AUTH.db.collection('names').doc(nameKey(name));
  const uid = AUTH.user.uid;
  return AUTH.db.runTransaction(async tx => {
    const d = await tx.get(ref);
    if (d.exists) return d.data().uid === uid ? 'mine' : 'taken';
    tx.set(ref, { uid, name: cleanName(name), at: firebase.firestore.FieldValue.serverTimestamp() });
    return 'new';
  }).then(r => { NAME_CACHE.set(nameKey(name), { uid: r === 'taken' ? '?' : uid, at: Date.now() }); return r; });
}
function applyName(name) {
  const key = nameKey(name);
  S.teamName = cleanName(name);
  S.nameKey = key;
  if (!S.myNames.includes(key)) S.myNames.push(key);
  S.wantName = null;
}

// Sau khi đăng nhập: giữ tên đang chờ / tên cũ chưa xác nhận trên máy chủ
async function reconcileName() {
  if (!namesReady() || !S) return;
  ensureName();
  const cur = !isDefaultName(S.teamName) && S.nameKey !== nameKey(S.teamName) ? S.teamName : null;
  const want = cur || S.wantName;
  if (!want || nameError(want)) { if (cur) S.teamName = defaultTeamName(); S.wantName = null; save(); renderAll(); return; }
  try {
    const r = await claimName(want);
    if (r === 'taken') {
      if (cur) S.teamName = defaultTeamName();
      S.wantName = null;
      toast(`Tên "${want}" đã có người dùng – đội của bạn dùng tên mặc định, hãy đổi tên khác`, 'err');
    } else {
      applyName(want);
      toast(`Đã giữ tên "${want}" cho tài khoản của bạn`, 'gold');
    }
    save(); renderAll();
  } catch (e) { console.warn(e); /* giữ nguyên, thử lại lần đăng nhập sau */ }
}

// ----- hộp thoại đổi tên -----
function renameModal() {
  const rules = `<details class="name-rules"><summary>📜 Luật đặt tên</summary><ol>${NAME_RULES.map(r => `<li>${esc(r)}</li>`).join('')}</ol></details>`;
  if (!namesReady()) {
    openModal(`<h2>✏️ Đặt tên đội</h2>
      <p>Tên hiện tại: <b id="rn-cur"></b></p>
      <p>Để giữ <b>tên riêng không trùng ai</b>, bạn cần đăng nhập. Ở chế độ Khách, đội dùng tên mặc định theo mã kết bạn nên luôn là duy nhất.</p>
      ${S.wantName ? `<p class="notice">Tên đang chờ giữ: <b id="rn-want"></b> – sẽ tự đăng ký khi bạn đăng nhập (nếu chưa ai dùng).</p>` : ''}
      ${rules}
      <div class="actions"><button class="btn primary" id="rn-login">👤 Đăng nhập</button><button class="btn ghost" id="rn-close">Đóng</button></div>`);
    $('#rn-cur').textContent = S.teamName;
    if ($('#rn-want')) $('#rn-want').textContent = S.wantName;
    $('#rn-login').onclick = () => { closeModal(); openAcct(); };
    $('#rn-close').onclick = closeModal;
    return;
  }
  const custom = !isDefaultName(S.teamName);
  openModal(`<h2>✏️ Đổi tên đội</h2>
    <p class="muted small">Tên hiện tại: <b id="rn-cur"></b></p>
    <div class="rn-field">
      <input id="rn-input" maxlength="${NAME_MAX}" placeholder="Nhập tên đội mới" autocomplete="off" spellcheck="false">
      <span id="rn-count" class="muted small"></span>
    </div>
    <div id="rn-msg" class="rn-msg"></div>
    <div class="kv"><span>Chi phí</span><b id="rn-cost"></b></div>
    ${rules}
    <div class="actions"><button class="btn primary" id="rn-ok" disabled>Đổi tên</button>${custom ? '<button class="btn ghost" id="rn-def">Dùng tên mặc định</button>' : ''}<button class="btn ghost" id="rn-close">Hủy</button></div>`);
  $('#rn-cur').textContent = S.teamName;
  const inp = $('#rn-input'), msg = $('#rn-msg'), ok = $('#rn-ok');
  let seq = 0, timer = null, state = '';
  const costOf = v => (S.myNames.includes(nameKey(v)) || S.nameChanges === 0 ? 0 : RENAME_COST);
  const show = (cls, text) => { msg.className = 'rn-msg ' + cls; msg.textContent = text; };
  const check = () => {
    const v = cleanName(inp.value), my = ++seq;
    $('#rn-count').textContent = `${v.length}/${NAME_MAX}`;
    const c = costOf(v);
    $('#rn-cost').textContent = c ? `${fmt(c)} 💰` : 'Miễn phí';
    ok.disabled = true; state = '';
    clearTimeout(timer);
    if (!v) return show('', '');
    if (v === S.teamName) return show('', 'Đây là tên hiện tại của bạn.');
    const err = nameError(v);
    if (err) return show('bad', '❌ ' + err);
    if (c > S.money) return show('bad', `❌ Cần ${fmt(c)} 💰 để đổi tên.`);
    show('wait', '⏳ Đang kiểm tra tên…');
    timer = setTimeout(async () => {
      try {
        const st = await nameStatus(v);
        if (my !== seq) return;
        if (st === 'taken') return show('bad', '❌ Tên này đã có người đặt.');
        state = st; ok.disabled = false;
        show('good', st === 'mine' ? '✅ Tên cũ của bạn – dùng lại miễn phí.' : '✅ Tên hợp lệ và còn trống!');
      } catch (e) { if (my === seq) show('bad', '⚠️ ' + nameServerErr(e)); }
    }, 650);
  };
  inp.oninput = check;
  inp.onkeydown = e => { if (e.key === 'Enter' && !ok.disabled) ok.click(); };
  check(); inp.focus();
  ok.onclick = async () => {
    const v = cleanName(inp.value);
    if (nameError(v)) return;
    const c = costOf(v);
    if (c > S.money) return;
    ok.disabled = true; show('wait', '⏳ Đang giữ tên…');
    try {
      const r = await claimName(v);
      if (r === 'taken') return show('bad', '❌ Vừa có người đặt tên này, hãy chọn tên khác.');
      if (r === 'new') S.nameChanges++;
      S.money -= c;
      applyName(v);
      save(); closeModal(); renderAll();
      toast(`Đội của bạn giờ tên là "${v}"`, 'gold');
    } catch (e) { show('bad', '⚠️ ' + nameServerErr(e)); ok.disabled = false; }
  };
  if ($('#rn-def')) $('#rn-def').onclick = () => {
    S.teamName = defaultTeamName(); S.nameKey = null;
    save(); closeModal(); renderAll();
    toast('Đã chuyển về tên mặc định (tên riêng cũ vẫn được giữ cho bạn)');
  };
  $('#rn-close').onclick = closeModal;
}
