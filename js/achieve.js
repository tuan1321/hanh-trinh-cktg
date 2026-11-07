// ===== Thành tựu =====
// Mỗi thành tựu có tiến độ (prog) và mục tiêu (goal); đạt thì bấm nhận thưởng (tiền và/hoặc gói thẻ).
function bestTeamCount() {
  // số tuyển thủ khác nhau của cùng một đội (bất kể mùa)
  const g = {};
  ownedKeys().forEach(k => { const c = cardOf(k); (g[c.team] = g[c.team] || new Set()).add(c.name); });
  return Math.max(0, ...Object.values(g).map(s => s.size));
}
function legendLineupOwned() {
  // sở hữu đủ 5 vị trí của cùng một đội cùng mùa
  const g = {};
  ownedKeys().forEach(k => { const c = cardOf(k); (g[c.team + c.year] = g[c.team + c.year] || new Set()).add(c.role); });
  return Object.values(g).some(s => s.size === 5) ? 1 : 0;
}
const baseCount = () => new Set(ownedKeys().map(k => cardOf(k).baseId)).size;
const hasTier = id => ownedKeys().some(k => cardOf(k).tier.id === id) ? 1 : 0;
const curMaxUp = () => Math.max(S.stats.maxUp || 0, ...ownedKeys().map(k => cardOf(k).lv));
const curPower = () => { const m = myTeam(); return Math.max(S.stats.maxPow || 0, m ? m.power : 0); };

const ACH_GROUPS = [
  { name: '🃏 Sưu tầm', list: [
    { id: 'team3', icon: '🤝', name: 'Tình đồng đội', desc: 'Sở hữu 3 tuyển thủ khác nhau của cùng 1 đội', goal: 3, prog: bestTeamCount, money: 1000 },
    { id: 'team5', icon: '🎽', name: 'Cả đội về chung nhà', desc: 'Sở hữu 5 tuyển thủ khác nhau của cùng 1 đội', goal: 5, prog: bestTeamCount, money: 4000, pack: 'silver' },
    { id: 'legend5', icon: '👑', name: 'Đội hình huyền thoại', desc: 'Sở hữu đủ 5 vị trí của cùng 1 đội cùng 1 mùa', goal: 1, prog: legendLineupOwned, money: 15000, pack: 'gold' },
    { id: 'col25', icon: '📚', name: 'Nhà sưu tầm', desc: 'Sưu tầm 25 thẻ khác nhau', goal: 25, prog: baseCount, money: 2000 },
    { id: 'col60', icon: '📚', name: 'Bảo tàng LMHT', desc: 'Sưu tầm 60 thẻ khác nhau', goal: 60, prog: baseCount, money: 6000, pack: 'silver' },
    { id: 'col120', icon: '🏛️', name: 'Thư viện tuyển thủ', desc: 'Sưu tầm 120 thẻ khác nhau', goal: 120, prog: baseCount, money: 15000, pack: 'gold' },
    { id: 'colall', icon: '🌌', name: 'Toàn tri', desc: `Sưu tầm đủ ${CARDS.length} thẻ`, goal: CARDS.length, prog: baseCount, money: 100000, pack: 'legend' },
    { id: 'ss', icon: '💎', name: 'Siêu sao đầu tiên', desc: 'Sở hữu một thẻ SS', goal: 1, prog: () => hasTier('SS'), money: 5000 },
    { id: 'sss', icon: '🌈', name: 'Chạm tới huyền thoại', desc: 'Sở hữu một thẻ SSS', goal: 1, prog: () => hasTier('SSS'), money: 15000 },
  ] },
  { name: '🏆 Danh hiệu', list: [
    { id: 'cup1', icon: '🥇', name: 'Chiếc cúp đầu tiên', desc: 'Vô địch 1 giải đấu', goal: 1, prog: () => S.stats.titles, money: 1500 },
    { id: 'cup5', icon: '🏆', name: 'Ngũ quán', desc: 'Đạt 5 cúp vô địch', goal: 5, prog: () => S.stats.titles, money: 6000, pack: 'silver' },
    { id: 'cup15', icon: '🏆', name: 'Triều đại', desc: 'Đạt 15 cúp vô địch', goal: 15, prog: () => S.stats.titles, money: 20000, pack: 'gold' },
    { id: 'cup40', icon: '👑', name: 'Bất tử', desc: 'Đạt 40 cúp vô địch', goal: 40, prog: () => S.stats.titles, money: 60000, pack: 'diamond' },
    ...DIFFS.map(d => ({ id: 'worlds' + d.id, icon: d.icon, name: `Vua thế giới · ${d.name}`, desc: `Vô địch CKTG ở chương ${d.name}`, goal: 1, prog: () => (S.won[tk('worlds', d.id)] ? 1 : 0), money: [20000, 40000, 80000, 160000][d.id], pack: ['diamond', 'legend', 'legend', 'legend'][d.id] })),
  ] },
  { name: '⚡ Sức mạnh', list: [70, 80, 90, 100, 110].map((p, i) => ({ id: 'pow' + p, icon: '⚡', name: `Sức mạnh ${p}`, desc: `Đạt sức mạnh đội hình ${p}`, goal: p, prog: curPower, money: [1500, 5000, 15000, 40000, 100000][i], pack: [null, 'silver', 'gold', 'diamond', 'legend'][i] })) },
  { name: '⬆️ Nâng cấp', list: [
    { id: 'up1', icon: '🔧', name: 'Thợ rèn tập sự', desc: 'Nâng cấp thẻ lần đầu (thành công hay thất bại)', goal: 1, prog: () => S.stats.ups || 0, money: 500 },
    ...[3, 5, 7, 10].map((l, i) => ({ id: 'lv' + l, icon: ['🥉', '🥈', '🥇', '🌈'][i], name: `Thẻ +${l}`, desc: `Sở hữu một thẻ +${l}`, goal: l, prog: curMaxUp, money: [3000, 12000, 50000, 300000][i], pack: [null, 'gold', 'diamond', 'legend'][i] })),
  ] },
  { name: '🎮 Thi đấu', list: [
    ...[10, 50, 200, 500].map((n, i) => ({ id: 'win' + n, icon: '⚔️', name: `${n} chiến thắng`, desc: `Thắng ${n} loạt trận`, goal: n, prog: () => S.stats.w, money: [1000, 5000, 20000, 60000][i] })),
    ...[10, 20, 30].map((n, i) => ({ id: 'lvl' + n, icon: '⭐', name: `Cấp ${n}`, desc: `Đạt cấp độ ${n}`, goal: n, prog: () => S.level, money: [3000, 10000, 30000][i], pack: [null, 'gold', 'diamond'][i] })),
    { id: 'friend1', icon: '👥', name: 'Kết nối', desc: 'Kết bạn với 1 người chơi', goal: 1, prog: () => (S.friends || []).length, money: 1000 },
    { id: 'fwin5', icon: '🤜', name: 'Vua giao hữu', desc: 'Thắng 5 trận giao hữu với bạn bè', goal: 5, prog: () => S.stats.fw || 0, money: 5000 },
  ] },
];
const ACHS = ACH_GROUPS.flatMap(g => g.list);
const achDone = a => Math.min(a.goal, a.prog()) >= a.goal;
const achClaimable = () => S && ACHS.some(a => !S.ach[a.id] && achDone(a));

function claimAch(id) {
  const a = ACHS.find(x => x.id === id);
  if (!a || S.ach[id] || !achDone(a)) return;
  S.ach[id] = Date.now();
  S.money += a.money || 0;
  if (a.pack) S.packs.push(a.pack);
  save(); renderAll();
  toast(`🏅 ${a.name}: +${fmt(a.money || 0)} 💰${a.pack ? ' + ' + PACK[a.pack].name : ''}`, 'gold');
}
function claimAll() {
  ACHS.filter(a => !S.ach[a.id] && achDone(a)).forEach(a => claimAch(a.id));
}
function renderAch() {
  const done = ACHS.filter(a => S.ach[a.id]).length;
  const ready = ACHS.filter(a => !S.ach[a.id] && achDone(a)).length;
  $('#view-achieve').innerHTML = `
  <div class="panel ach-top">
    <div><h3>🏅 Thành tựu</h3><p class="muted">Hoàn thành mục tiêu để nhận tiền và gói thẻ.</p></div>
    <div class="journey"><small>Đã nhận</small><b>${done}/${ACHS.length}</b><div class="jbar"><i style="width:${done / ACHS.length * 100}%"></i></div></div>
    ${ready ? `<button class="btn primary" id="ach-all">🎁 Nhận tất cả (${ready})</button>` : ''}
  </div>
  ${ACH_GROUPS.map(g => `<div class="panel"><h3>${g.name}</h3><div class="ach-list">${g.list.map(a => {
    const p = Math.min(a.goal, Math.floor(a.prog() * 10) / 10), claimed = !!S.ach[a.id], ok = p >= a.goal;
    return `<div class="ach ${claimed ? 'claimed' : ok ? 'ready' : ''}">
      <span class="ach-ic">${a.icon}</span>
      <div class="ach-main"><b>${esc(a.name)}</b><small>${esc(a.desc)}</small>
        <div class="ach-bar"><i style="width:${p / a.goal * 100}%"></i></div><em>${fmt(p)}/${fmt(a.goal)}</em></div>
      <div class="ach-rw"><small>${a.money ? '💰 ' + fmt(a.money) : ''}${a.pack ? `<br>${PACK[a.pack].icon} ${PACK[a.pack].name}` : ''}</small>
        ${claimed ? '<span class="ach-done">✓ Đã nhận</span>' : `<button class="btn small ${ok ? 'primary' : ''}" data-ach="${a.id}" ${ok ? '' : 'disabled'}>Nhận</button>`}</div>
    </div>`;
  }).join('')}</div></div>`).join('')}`;
  document.querySelectorAll('[data-ach]').forEach(b => b.onclick = () => claimAch(b.dataset.ach));
  if (ready) $('#ach-all').onclick = claimAll;
}
