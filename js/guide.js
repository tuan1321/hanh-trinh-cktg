// ===== Hướng dẫn người mới =====
// Tự chạy 1 lần cho người chơi mới (lần đầu vào game hoặc lần đầu đăng nhập tài khoản mới), khi không có hộp thoại nào mở.
// Người chơi cũ (đã đánh vài trận / cấp > 2) được đánh dấu đã xem, không bị làm phiền.
// Xem lại bất cứ lúc nào bằng nút "📖 Hướng dẫn" ở cuối trang. Đánh dấu đã xem lưu trong bản lưu (S.tut).
const GUIDE = (() => {
  const loggedIn = () => typeof AUTH !== 'undefined' && !!AUTH.user;
  const STEPS = [
    { view: 'team', title: '👋 Chào HLV mới!', text: 'Mình dẫn bạn đi một vòng khoảng 1 phút để biết chơi thế nào. Bấm <b>Tiếp</b> để bắt đầu, hoặc <b>Bỏ qua</b> nếu đã biết chơi.' },
    { view: 'team', t: '#view-team .lineup', title: '⚔️ Đội hình 5 vị trí', text: 'Bấm vào từng ô để chọn tuyển thủ cho <b>Đường trên, Đi rừng, Đường giữa, Xạ thủ, Hỗ trợ</b>. Không được xếp 2 thẻ của cùng một tuyển thủ (dù khác mùa).' },
    { view: 'team', t: '#view-team .power-ring', title: '⚡ Sức mạnh đội', text: 'Gồm điểm trung bình, <b>chỉ số ẩn</b> và <b>độ ăn ý</b> (cùng đội, cùng năm, cùng khu vực). Sức mạnh càng cao, cơ hội thắng mỗi ván càng lớn.' },
    { view: 'team', t: '#btn-friendly', title: '🎮 Giao hữu', text: 'Cách nhanh nhất để kiếm <b>tiền</b> và <b>EXP</b>. Mỗi lần lên cấp được tặng một gói thẻ.' },
    { view: 'map', t: '.tabs [data-view="map"]', title: '🗺️ Giải đấu', text: 'Vô địch giải nhỏ để mở giải lớn: VCS → PCS → LCS → LEC → LPL → LCK → MSI → <b>CKTG</b>. Có 4 chương từ Dễ tới Địa ngục, thưởng tăng dần.' },
    { view: 'rank', t: '.tabs [data-view="rank"]', title: '🏆 Xếp hạng', text: 'Đấu với đội hình của <b>người chơi thật</b>, leo bậc từ Đồng tới Huyền Thoại và có tên trên bảng xếp hạng. Cần đăng nhập, 10 lượt mỗi ngày.' },
    { view: 'shop', t: '.tabs [data-view="shop"]', title: '🛍️ Cửa hàng', text: 'Dùng tiền mua <b>gói thẻ</b>. Thẻ có bậc B → A → S → S+ → SS → SSS theo thành tích từng năm. Thẻ xịn rất hiếm!' },
    { view: 'collection', t: '.tabs [data-view="collection"]', title: '🃏 Bộ sưu tập', text: 'Xem mọi thẻ bạn có. Bấm vào thẻ để xem chỉ số, đưa vào đội hình hoặc bán bớt thẻ trùng lấy tiền.' },
    { view: 'upgrade', t: '.tabs [data-view="upgrade"]', title: '⬆️ Nâng cấp', text: 'Ghép <b>2 thẻ giống nhau</b> để lên +1 … +10. Cấp càng cao tỉ lệ thành công càng thấp – hồi hộp lắm đấy!' },
    { view: 'achieve', t: '.tabs [data-view="achieve"]', title: '🏅 Thành tựu', text: 'Hoàn thành các mục tiêu để nhận thêm tiền và gói thẻ.' },
    { view: 'friends', t: '.tabs [data-view="friends"]', title: '👥 Bạn bè', text: 'Kết bạn bằng mã, mời đấu trực tiếp hoặc đấu với đội hình bạn bè đã lưu.' },
    { view: 'team', t: '.stats .money', title: '💰 Tiền & cấp độ', text: 'Tiền dùng để mua gói thẻ. Thanh EXP bên cạnh đầy thì lên cấp và nhận gói thẻ miễn phí.' },
    { view: 'team', t: '#acct-btn', title: '👤 Tài khoản', text: () => (loggedIn() ? 'Tiến trình của bạn <b>tự lưu lên tài khoản</b> – chơi tiếp trên mọi thiết bị.' : '<b>Đăng nhập</b> để lưu tiến trình lên mạng, giữ tên đội riêng và đấu xếp hạng.') },
    { view: 'team', title: '🚀 Sẵn sàng chưa?', text: 'Hãy thử ngay một trận giao hữu! Muốn xem lại hướng dẫn, bấm <b>📖 Hướng dẫn</b> ở cuối trang.', last: true },
  ];
  let i = 0, el = null, waitTimer = null, rePlace = null;

  const isNewPlayer = () => S && S.level <= 2 && S.stats.w + S.stats.l < 3 && !S.stats.titles;
  const busy = () => !document.getElementById('modal').classList.contains('hidden')
    || !document.getElementById('match').classList.contains('hidden') || document.getElementById('splash');

  // Chờ tới khi không còn hộp thoại nào rồi mới chạy (tối đa 2 phút)
  function maybe() {
    clearInterval(waitTimer);
    const t0 = Date.now();
    waitTimer = setInterval(() => {
      if (Date.now() - t0 > 120000) return clearInterval(waitTimer);
      if (!S || el) return;
      if (S.tut) return clearInterval(waitTimer);
      if (!isNewPlayer()) { S.tut = 1; save(); return clearInterval(waitTimer); }
      if (busy()) return;
      clearInterval(waitTimer);
      setTimeout(() => { if (!busy() && S && !S.tut) start(); }, 500);
    }, 700);
  }

  function start() {
    if (el) return;
    closeModal();
    i = 0;
    el = document.createElement('div');
    el.id = 'guide';
    el.innerHTML = `<div class="gd-hole"></div><div class="gd-tip" role="dialog" aria-live="polite"></div>`;
    document.body.appendChild(el);
    addEventListener('resize', place); addEventListener('scroll', place, true);
    document.addEventListener('keydown', onKey);
    clearInterval(rePlace); rePlace = setInterval(place, 300); // bám theo khi bố cục còn đang chuyển động
    show();
  }
  function end(goPlay) {
    if (!el) return;
    el.classList.add('out');
    const old = el; el = null;
    setTimeout(() => old.remove(), 250);
    removeEventListener('resize', place); removeEventListener('scroll', place, true);
    document.removeEventListener('keydown', onKey);
    clearInterval(rePlace);
    if (S) { S.tut = 1; save(); }
    switchView('team');
    if (goPlay) setTimeout(() => friendly(), 300);
  }
  function onKey(e) {
    if (e.key === 'Escape') end();
    else if (e.key === 'ArrowRight' || e.key === 'Enter') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
  }
  function go(d) {
    const n = i + d;
    if (n < 0) return;
    if (n >= STEPS.length) return end();
    i = n; show();
  }

  function show() {
    const s = STEPS[i];
    if (currentView !== s.view) switchView(s.view);
    const tip = el.querySelector('.gd-tip');
    const text = typeof s.text === 'function' ? s.text() : s.text;
    tip.innerHTML = `<div class="gd-head"><b>${s.title}</b><span>${i + 1}/${STEPS.length}</span></div>
      <p>${text}</p>
      <div class="gd-dots">${STEPS.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'done' : ''}"></i>`).join('')}</div>
      <div class="gd-btns">
        ${s.last ? '' : '<button class="btn ghost small" data-g="skip">Bỏ qua</button>'}
        ${i > 0 ? '<button class="btn small" data-g="prev">← Trước</button>' : ''}
        ${s.last ? '<button class="btn ghost small" data-g="done">Tự khám phá</button><button class="btn primary small" data-g="play">⚔️ Đánh giao hữu</button>'
        : `<button class="btn primary small" data-g="next">${i === 0 ? 'Bắt đầu →' : 'Tiếp →'}</button>`}
      </div>`;
    tip.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
      const g = b.dataset.g;
      if (g === 'next') go(1); else if (g === 'prev') go(-1); else if (g === 'skip' || g === 'done') end(); else if (g === 'play') end(true);
    });
    tip.classList.remove('pop'); void tip.offsetWidth; tip.classList.add('pop');
    if (typeof SFX !== 'undefined' && i > 0) SFX.tick(1);
    const t = target();
    if (t && !t.closest('.tabs') && !t.closest('.topbar')) t.scrollIntoView({ block: 'center', behavior: UI_REDUCED ? 'auto' : 'smooth' });
    place();
    setTimeout(place, 380); // sau khi cuộn / chuyển tab xong
    const btn = tip.querySelector('.btn.primary'); if (btn) btn.focus({ preventScroll: true });
  }
  function target() {
    const s = STEPS[i];
    if (!s || !s.t) return null;
    const t = document.querySelector(s.t);
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return r.width && r.height ? t : null;
  }
  function place() {
    if (!el) return;
    const hole = el.querySelector('.gd-hole'), tip = el.querySelector('.gd-tip');
    const t = target();
    const W = innerWidth, H = innerHeight, tw = tip.offsetWidth, th = tip.offsetHeight, gap = 14;
    if (!t) {
      hole.classList.add('none');
      hole.style.cssText = `left:${W / 2}px;top:${H / 2}px;width:0;height:0`;
      tip.style.left = Math.max(16, (W - tw) / 2) + 'px';
      tip.style.top = Math.max(16, (H - th) / 2) + 'px';
      return;
    }
    hole.classList.remove('none');
    const r = t.getBoundingClientRect(), pad = 6;
    const x = Math.max(4, r.left - pad), y = Math.max(4, r.top - pad);
    const w = Math.min(W - 8, r.right + pad) - x, h = Math.min(H - 8, r.bottom + pad) - y;
    hole.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
    let top = y + h + gap;
    if (top + th > H - 12) top = y - gap - th;           // không đủ chỗ bên dưới → đặt lên trên
    if (top < 12) top = Math.max(12, Math.min(H - th - 12, (H - th) / 2)); // vật quá cao → giữa màn hình
    const left = Math.max(16, Math.min(W - tw - 16, x + w / 2 - tw / 2));
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }

  const btn = document.getElementById('guide-btn');
  if (btn) btn.onclick = () => start();
  maybe();
  return { start, maybe, end };
})();
