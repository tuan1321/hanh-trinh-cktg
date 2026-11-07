// ===== Hiệu ứng giao diện: màn hình tải, chuyển mục, hộp thoại, đếm tiền, gợn nút, nghiêng thẻ =====
const UI_REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const VIEW_ORDER = ['team', 'map', 'shop', 'collection', 'upgrade', 'achieve', 'friends'];

// --- Màn hình tải: hiện tối thiểu 0,7s, tối đa 1,8s ---
(function splash() {
  const el = document.getElementById('splash');
  if (!el) return;
  const t0 = performance.now();
  let done = false;
  const hide = () => {
    if (done) return; done = true;
    const wait = Math.max(0, 700 - (performance.now() - t0));
    setTimeout(() => { el.classList.add('sp-out'); setTimeout(() => el.remove(), 650); }, UI_REDUCED ? 0 : wait);
  };
  window.addEventListener('load', hide);
  setTimeout(hide, 1800);
})();

// --- Vạch sáng dưới tab đang chọn ---
function moveInk(instant) {
  const nav = document.querySelector('.tabs'), ink = nav && nav.querySelector('.tab-ink');
  const b = nav && nav.querySelector('button.active');
  if (!ink || !b) return;
  if (instant) ink.style.transition = 'none';
  ink.style.width = b.offsetWidth + 'px';
  ink.style.transform = `translateX(${b.offsetLeft}px)`;
  if (instant) { void ink.offsetWidth; ink.style.transition = ''; }
  // tab bị khuất trên màn hình hẹp: cuộn cho thấy
  if (nav.scrollWidth > nav.clientWidth) {
    const target = b.offsetLeft - (nav.clientWidth - b.offsetWidth) / 2;
    nav.scrollTo({ left: target, behavior: instant ? 'auto' : 'smooth' });
  }
}
window.addEventListener('resize', () => moveInk(true));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moveInk(true));

// --- Chuyển mục: mục cũ mờ dần, mục mới trượt vào theo hướng tab ---
let viewAnimTimer = null;
function animateViewSwap(fromId, toId) {
  const from = document.getElementById('view-' + fromId), to = document.getElementById('view-' + toId);
  document.querySelectorAll('.view.v-out, .view.v-in').forEach(v => v.classList.remove('v-out', 'v-in', 'back'));
  if (!to || UI_REDUCED || fromId === toId) return;
  const back = VIEW_ORDER.indexOf(toId) < VIEW_ORDER.indexOf(fromId);
  if (from) {
    from.classList.add('v-out');
    from.classList.toggle('back', back);
  }
  [...to.children].forEach((c, i) => c.style.setProperty('--i', i));
  to.classList.remove('v-in', 'back');
  void to.offsetWidth;
  to.classList.add('v-in');
  to.classList.toggle('back', back);
  clearTimeout(viewAnimTimer);
  viewAnimTimer = setTimeout(() => {
    document.querySelectorAll('.view.v-out').forEach(v => v.classList.remove('v-out', 'back'));
    to.classList.remove('v-in', 'back');
  }, 900);
}

// --- Hộp thoại: bản sao mờ dần khi đóng, để logic game vẫn thấy hộp thoại đã đóng ngay ---
function modalGhostOut() {
  const m = document.getElementById('modal');
  if (UI_REDUCED || !m || m.classList.contains('hidden')) return;
  const g = m.cloneNode(true);
  g.removeAttribute('id');
  g.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
  g.classList.add('ghost');
  document.body.appendChild(g);
  setTimeout(() => g.remove(), 260);
}
function modalOpenFx(wasOpen) {
  const m = document.getElementById('modal'), box = document.getElementById('modal-box');
  const swapping = document.querySelector('.overlay.ghost');
  document.querySelectorAll('.overlay.ghost').forEach(g => g.remove());
  m.classList.toggle('swap', !!(wasOpen || swapping)); // đổi hộp thoại liền nhau: không nháy nền tối
  box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
  box.scrollTop = 0;
}

// --- Tiền chạy số + hiện số cộng/trừ ---
let moneyShown = null, moneyRaf = 0;
function animMoney(val) {
  const el = document.getElementById('money');
  if (!el) return;
  if (moneyShown === null || UI_REDUCED) { moneyShown = val; el.textContent = fmt(val); return; }
  const from = moneyShown, diff = val - from;
  if (!diff) { el.textContent = fmt(val); return; }
  moneyShown = val;
  const pill = el.closest('.stat');
  const d = document.createElement('span');
  d.className = 'money-delta ' + (diff > 0 ? 'up' : 'down');
  d.textContent = (diff > 0 ? '+' : '−') + fmt(Math.abs(diff));
  pill.appendChild(d);
  setTimeout(() => d.remove(), 1400);
  pill.classList.remove('bump', 'up', 'down'); void pill.offsetWidth;
  pill.classList.add('bump', diff > 0 ? 'up' : 'down');
  cancelAnimationFrame(moneyRaf);
  const t0 = performance.now(), dur = Math.min(900, 350 + Math.log10(Math.abs(diff) + 1) * 120);
  const step = t => {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + diff * e);
    if (p < 1) moneyRaf = requestAnimationFrame(step);
  };
  moneyRaf = requestAnimationFrame(step);
}
let levelShown = null;
function animLevel(lv) {
  const pill = document.querySelector('.stat.level');
  if (levelShown !== null && lv > levelShown && pill) { pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }
  levelShown = lv;
}

// --- Gợn sóng khi bấm nút ---
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.btn, .acct, .stat.donate-top');
  if (!b || b.disabled || UI_REDUCED) return;
  const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2;
  const w = document.createElement('span');
  w.className = 'ripple';
  w.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
  b.appendChild(w);
  setTimeout(() => w.remove(), 650);
});

// --- Thẻ nghiêng 3D theo chuột ---
if (!UI_REDUCED && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let cur = null;
  const reset = c => { c.classList.remove('tilting'); c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); };
  document.addEventListener('pointermove', e => {
    const c = e.target.closest && e.target.closest('.card.clickable');
    if (cur && cur !== c) { reset(cur); cur = null; }
    if (!c) return;
    cur = c;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.classList.add('tilting');
    c.style.setProperty('--rx', ((0.5 - y) * 14).toFixed(2) + 'deg');
    c.style.setProperty('--ry', ((x - 0.5) * 16).toFixed(2) + 'deg');
    c.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
  }, { passive: true });
  document.addEventListener('pointerleave', () => { if (cur) { reset(cur); cur = null; } });
}
