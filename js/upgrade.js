// ===== Nâng cấp thẻ (+1 … +10) – giao diện lấy cảm hứng từ màn hình nâng cấp của các game quản lý bóng đá =====
// Ghép 2 thẻ giống hệt (cùng tuyển thủ, cùng mùa, cùng cấp) → thử lên 1 cấp.
// Thành công: 2 thẻ thành 1 thẻ cấp mới. Thất bại: mất thẻ nguyên liệu, thẻ chính giữ nguyên.
let upgSel = null, upgOnlyReady = false, upgBusy = false;

const upgReady = c => owned(c.id) >= 2 && c.lv < MAX_UP;
// nhóm theo thẻ (cùng tuyển thủ, cùng mùa); nhóm có thẻ đủ nguyên liệu lên đầu; trong nhóm cấp cao trước
function upgCandidates() {
  return groupSort(ownedKeys().map(cardOf), (a, b) => b.rating - a.rating, upgReady);
}
// thanh chọn nhanh các cấp + đang có của cùng một thẻ
function levelBar(c) {
  const lvs = ownedKeys().map(cardOf).filter(x => x.baseId === c.baseId).sort((a, b) => a.lv - b.lv);
  if (lvs.length < 2) return '';
  return `<div class="ug-levels"><span class="muted small">Các cấp ${esc(c.name)} ${c.year} đang có <i>(khác cấp không ghép được với nhau)</i>:</span>
    <div>${lvs.map(x => `<button class="ugl ${x.id === c.id ? 'cur' : ''} ${upgReady(x) ? 'ok' : ''}" data-k="${x.id}"><b class="${x.lv ? lvClass(x.lv) : ''}">${x.lv ? '+' + x.lv : 'Gốc'}</b><small>${owned(x.id)} thẻ</small></button>`).join('')}</div></div>`;
}
function rateGauge(rate, lv) {
  return `<div class="ug-gauge" style="--pct:${Math.max(rate, 0.8)}">
    <div class="ug-gauge-in"><small>Tỉ lệ thành công</small><b>${rate}%</b><span>+${lv - 1} → +${lv}</span></div>
  </div>`;
}
function renderUpgrade() {
  const list = upgCandidates();
  if (!upgSel || !owned(upgSel)) upgSel = (list.find(upgReady) || list[0] || {}).id || null;
  const c = upgSel ? cardOf(upgSel) : null;
  const maxed = c && c.lv >= MAX_UP;
  const ready = c && !maxed && owned(c.id) >= 2;
  const next = c && !maxed ? cardOf(keyOf(c.baseId, c.lv + 1)) : null;
  const rate = next ? UPG_RATE[next.lv] : 0;
  const shown = upgOnlyReady ? list.filter(upgReady) : list;

  $('#view-upgrade').innerHTML = `
  <div class="panel upg-panel">
    <div class="upg-head"><h3>⬆️ Nâng cấp thẻ</h3><p class="muted small">Ghép 2 thẻ giống hệt nhau (cùng tuyển thủ, cùng mùa, cùng cấp +) để lên 1 cấp. Thẻ +1 + thẻ +1 → +2 … tối đa +10. Thất bại sẽ mất thẻ nguyên liệu.</p></div>
    ${c ? `<div class="upg-stage ${ready ? 'ready' : ''}">
      <div class="ug-slot main"><div class="ug-label">THẺ CHÍNH</div>${cardHTML(c)}</div>
      <div class="ug-core">
        ${maxed ? '<div class="ug-max">👑<b>ĐÃ ĐẠT +10</b><small>Cấp tối đa</small></div>' : rateGauge(rate, next.lv)}
        <div class="ug-arrows"><i></i><i></i><i></i></div>
      </div>
      <div class="ug-slot mat ${ready ? '' : 'empty'}"><div class="ug-label">NGUYÊN LIỆU</div>${ready ? cardHTML(c) : `<div class="card empty"><span>?</span><small>${maxed ? 'Không cần' : 'Cần thêm 1 thẻ<br>' + esc(c.name) + ' ' + c.year + (c.lv ? ' +' + c.lv : '')}</small></div>`}</div>
    </div>
    ${levelBar(c)}
    <div class="upg-info">
      <div class="ug-compare">
        <div class="ugc-ovr"><span>Chỉ số tổng</span><b>${c.rating}</b>${next ? `<i>➜</i><b class="up">${next.rating}</b><em>+${next.rating - c.rating}</em>` : ''}</div>
        ${statBars(c, next)}
      </div>
      <div class="ug-side">
        <div class="ug-rates">${UPG_RATE.slice(1).map((r, i) => `<div class="${next && next.lv === i + 1 ? 'cur' : ''} ${c.lv >= i + 1 ? 'got' : ''}"><b class="${lvClass(i + 1)}">+${i + 1}</b><small>${r}%</small><em>+${UPG_BONUS[i + 1]}</em></div>`).join('')}</div>
        <p class="muted small">Hàng trên: cấp · tỉ lệ thành công · chỉ số tổng cộng thêm so với thẻ gốc.</p>
        <div class="kv"><span>Đang có</span><b>${owned(c.id)} thẻ ${esc(c.name)} ${c.year}${c.lv ? ' +' + c.lv : ''}</b></div>
        <button class="btn primary ug-go" id="ug-go" ${ready ? '' : 'disabled'}>⚡ NÂNG CẤP ${next ? '+' + next.lv : ''}</button>
      </div>
    </div>` : '<p class="muted center">Bạn chưa có thẻ nào.</p>'}
  </div>
  <div class="panel">
    <div class="filters"><h3 style="margin:0 auto 0 0">🃏 Chọn thẻ để nâng cấp</h3>
      <label class="check"><input type="checkbox" id="ug-ready" ${upgOnlyReady ? 'checked' : ''}> Chỉ thẻ đủ nguyên liệu</label></div>
    <div class="card-grid">${shown.map(x => `<div class="ug-pick ${x.id === upgSel ? 'sel' : ''} ${upgReady(x) ? 'ok' : ''}">${cardHTML(x, { click: true, count: owned(x.id), inLineup: inLineup(x.id) })}</div>`).join('') || '<p class="muted">Chưa có thẻ nào đủ 2 bản để nâng cấp. Mở thêm gói thẻ nhé!</p>'}</div>
  </div>`;
  document.querySelectorAll('#view-upgrade .ug-pick .card').forEach(el => el.onclick = () => { upgSel = el.dataset.id; renderUpgrade(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.querySelectorAll('#view-upgrade .ugl').forEach(b => b.onclick = () => { upgSel = b.dataset.k; renderUpgrade(); });
  $('#ug-ready').onchange = e => { upgOnlyReady = e.target.checked; renderUpgrade(); };
  if (ready) $('#ug-go').onclick = () => doUpgrade(c.id);
}

function doUpgrade(k) {
  if (upgBusy) return;
  const c = cardOf(k);
  if (!c || c.lv >= MAX_UP || owned(k) < 2) return;
  const next = cardOf(keyOf(c.baseId, c.lv + 1));
  const rate = UPG_RATE[next.lv];
  const ok = Math.random() * 100 < rate;
  // trừ thẻ & lưu ngay để không thể tải lại trang mà "chơi lại" kết quả
  removeCard(k);
  upgSel = k;
  if (ok) {
    removeCard(k);
    addCard(next.id);
    if (S.lineup[c.role] === k) S.lineup[c.role] = next.id;
    S.stats.maxUp = Math.max(S.stats.maxUp || 0, next.lv);
    upgSel = next.id;
  }
  S.stats.ups = (S.stats.ups || 0) + 1;
  save();
  upgBusy = true;

  openModal(`<div class="upg-anim ${next.lv >= 7 ? 'hi' : ''}">
    <div class="ua-rays"></div>
    <div class="ua-cards"><div class="ua-main">${cardHTML(c)}</div><div class="ua-mat">${cardHTML(c)}</div></div>
    <div class="ua-orb"><b>${rate}%</b></div>
    <div class="ua-text">ĐANG NÂNG CẤP…</div>
    <div class="ua-sparks">${Array.from({ length: 24 }, (_, i) => `<i style="--a:${i * 15}deg;--d:${rand(0, 0.8).toFixed(2)}s"></i>`).join('')}</div>
  </div>`);
  const box = $('#modal-box .upg-anim');
  setTimeout(() => {
    if (!box.isConnected) { upgBusy = false; renderAll(); return; }
    box.classList.add(ok ? 'success' : 'fail');
    box.querySelector('.ua-main').innerHTML = cardHTML(ok ? next : c);
    box.querySelector('.ua-text').innerHTML = ok
      ? `<b>THÀNH CÔNG!</b><small>${esc(c.name)} ${c.year} đã lên <span class="${lvClass(next.lv)}">+${next.lv}</span> · chỉ số tổng ${c.rating} → ${next.rating}</small>`
      : `<b>THẤT BẠI</b><small>Mất 1 thẻ nguyên liệu. ${esc(c.name)} ${c.year}${c.lv ? ' +' + c.lv : ''} được giữ nguyên.</small>`;
    if (ok && next.lv >= 5) toast(`🔥 ${c.name} ${c.year} +${next.lv}!`, 'gold');
    const act = document.createElement('div');
    act.className = 'actions';
    act.innerHTML = '<button class="btn primary" id="ua-ok">Tiếp tục</button>';
    box.appendChild(act);
    act.querySelector('button').onclick = () => { upgBusy = false; closeModal(); renderAll(); };
  }, 2600);
}
