// ===== Giải đấu: 4 chương độ khó, thể thức như giải thật =====
const diffOf = d => DIFFS[d] || DIFFS[0];
const tourPow = (t, d) => t.power + diffOf(d).pow;
const tourCash = (t, d) => Math.round(t.prize * diffOf(d).cash);
const wonT = (tid, d) => S.won[tk(tid, d)] || 0;
const bestT = (tid, d) => { const v = S.best[tk(tid, d)]; return v == null ? -1 : v; };
const diffUnlocked = d => d === 0 || !!wonT('worlds', d - 1);
const tourUnlocked = (i, d) => diffUnlocked(d) && (i === 0 || !!wonT(TOURS[i - 1].id, d));
const totalSeries = t => t.stages.reduce((a, s) => a + (s.type === 'league' ? s.rr * (s.size - 1) : s.type === 'swiss' ? 4 : 1), 0);
let mapSel = null, mapDiff = null;

function defaultDiff() {
  if (S.run) return S.run.d;
  let d = 0;
  while (d < DIFFS.length - 1 && wonT('worlds', d)) d++;
  return d;
}
function stageSub(s) {
  return s.type === 'league' ? `${stageGames(s)} trận BO${s.bo} · top ${s.adv}` : s.type === 'swiss' ? 'BO1 / BO3 · thắng 3' : `BO${s.bo}`;
}
function fmtDesc(t) {
  return t.stages.map(s => s.type === 'league' ? `${s.size} đội · vòng tròn ${s.rr} lượt BO${s.bo}` : s.type === 'swiss' ? 'Thụy Sĩ' : `${s.n} BO${s.bo}`).join(' → ');
}

// Thanh mốc của một giải. cur = mốc đang đấu (-1 nếu không), failAt = mốc bị loại
function stageTrack(t, d, cur = -1, failAt = -1) {
  const best = bestT(t.id, d), last = t.stages.length - 1, cash = tourCash(t, d);
  return `<div class="track">${t.stages.map((s, i) => {
    const done = i <= best || (cur >= 0 && i < cur);
    const cls = i === failAt ? 'fail' : i === cur ? 'cur' : done ? 'done' : 'todo';
    const icon = cls === 'fail' ? '✕' : done && i === last ? '🏆' : done ? '✓' : s.ic;
    const reward = i === last ? `🏆 ${fmt(cash)}` : i > best ? `🎯 +${fmt(cash * MILESTONE_BONUS)}` : 'Đã đạt';
    return `${i ? `<i class="ms-line ${done || i <= cur ? 'on' : ''}"></i>` : ''}<div class="ms ${cls}">
      <span class="ms-dot">${icon}</span><b>${s.n}</b><small>${stageSub(s)}</small><em>${reward}</em>
    </div>`;
  }).join('')}</div>`;
}

// ----- Tạo đội đối thủ -----
function teamName(used, region) {
  const pool = shuffle(region === 'INT' ? allTeamNames() : TEAM_NAMES[region]).filter(n => !used.has(n) && n !== S.teamName);
  const n = pool[0] || `${pick(allTeamNames())} ${randi(2, 99)}`;
  used.add(n);
  return n;
}
function genTeam(region, P, used) {
  const o = makeOpponent(region, P, teamName(used, region));
  return { name: o.name, power: +P.toFixed(1), roster: Object.fromEntries(ROLES.map(r => [r, o.players[r].id])), w: 0, l: 0, gw: 0, gl: 0 };
}
function teamObj(f) {
  return { name: f.name, power: f.power, players: Object.fromEntries(ROLES.map(r => [r, CARD[f.roster[r]] || pick(CARDS.filter(c => c.role === r))])) };
}
function simSeries(pa, pb, bo) {
  const need = Math.ceil(bo / 2), sc = [0, 0], p = winProb(pa, pb);
  while (sc[0] < need && sc[1] < need) sc[Math.random() < p ? 0 : 1]++;
  return sc;
}
// Lịch vòng tròn (phương pháp xoay vòng), -1 = đội của bạn, số lẻ đội thì có lượt nghỉ
function roundRobin(ids, rr) {
  const a = ids.slice();
  if (a.length % 2) a.push(null);
  const n = a.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) { const x = a[i], y = a[n - 1 - i]; if (x !== null && y !== null) pairs.push([x, y]); }
    rounds.push(pairs);
    a.splice(1, 0, a.pop());
  }
  let all = rounds;
  for (let k = 1; k < rr; k++) all = all.concat(rounds.map(p => p.map(([x, y]) => [y, x])));
  return all;
}

// ----- Bắt đầu giải & từng vòng -----
function startRun(tid, d) {
  const t = TOUR[tid], base = tourPow(t, d);
  const lg = t.stages.find(s => s.type === 'league');
  const n = lg ? lg.size - 1 : 15;
  const used = new Set(), field = [];
  for (let i = 0; i < n; i++) field.push(genTeam(t.region, base + (n > 1 ? -7 + 10 * i / (n - 1) : 0) + rand(-1, 1), used));
  S.run = { tid, d, stage: 0, field, alive: null, opp: null, st: null, used: [...used] };
  initStage();
  save();
}
function initStage() {
  const R = S.run, s = TOUR[R.tid].stages[R.stage];
  R.opp = null;
  if (s.type === 'league') {
    R.field.forEach(f => Object.assign(f, { w: 0, l: 0, gw: 0, gl: 0 }));
    R.st = { sched: roundRobin([-1, ...R.field.map((_, i) => i)], s.rr), round: 0, me: { w: 0, l: 0, gw: 0, gl: 0 } };
  } else if (s.type === 'swiss') R.st = { w: 0, l: 0 };
  else R.st = {};
  if (!R.alive) R.alive = R.field.map((_, i) => i).sort((a, b) => R.field[b].power - R.field[a].power);
}
function recLeague(i, a, b) {
  const R = S.run, o = i === -1 ? R.st.me : R.field[i];
  o.gw += a; o.gl += b; a > b ? o.w++ : o.l++;
}
function simOthers(round) {
  const R = S.run, s = TOUR[R.tid].stages[R.stage];
  R.st.sched[round].forEach(([x, y]) => {
    if (x === -1 || y === -1) return;
    const sc = simSeries(R.field[x].power, R.field[y].power, s.bo);
    recLeague(x, sc[0], sc[1]); recLeague(y, sc[1], sc[0]);
  });
}
function skipByes() {
  const R = S.run;
  while (R.st.round < R.st.sched.length && !R.st.sched[R.st.round].some(p => p.includes(-1))) { simOthers(R.st.round); R.st.round++; }
}
function standings() {
  const R = S.run, me = myTeam();
  const rows = [{ i: -1, name: S.teamName, power: me ? me.power : 0, ...R.st.me }, ...R.field.map((f, i) => ({ i, name: f.name, power: f.power, w: f.w, l: f.l, gw: f.gw, gl: f.gl }))];
  return rows.sort((a, b) => b.w - a.w || (b.gw - b.gl) - (a.gw - a.gl) || b.power - a.power);
}
function tableHTML() {
  const R = S.run, s = TOUR[R.tid].stages[R.stage];
  if (s.type !== 'league') return '';
  const tab = standings();
  return `<div class="stand">
    <div class="st-row st-h"><span>#</span><span>Đội</span><span>T – B</span><span>Hiệu số</span><span>⚡</span></div>
    ${tab.map((r, k) => `<div class="st-row ${r.i === -1 ? 'me' : ''} ${k < s.adv ? 'q' : ''}"><span>${k + 1}</span><span class="st-n">${esc(r.name)}</span><span>${r.w} – ${r.l}</span><span>${r.gw - r.gl > 0 ? '+' : ''}${r.gw - r.gl}</span><span>${r.power}</span></div>`).join('')}
  </div><p class="muted small">Ô xanh: suất đi tiếp (top ${s.adv}).</p>`;
}
function stageStatus() {
  const R = S.run, t = TOUR[R.tid], s = t.stages[R.stage];
  if (s.type === 'league') {
    const tab = standings(), rank = tab.findIndex(r => r.i === -1) + 1, m = R.st.me;
    return `Trận ${Math.min(m.w + m.l + 1, stageGames(s))}/${stageGames(s)} · ${m.w} thắng – ${m.l} thua · hạng ${rank}/${s.size} (top ${s.adv} đi tiếp)`;
  }
  if (s.type === 'swiss') return `Thành tích ${R.st.w} thắng – ${R.st.l} thua (thắng 3 đi tiếp, thua 3 bị loại)`;
  return `${s.n} · BO${s.bo}`;
}
function currentOpp() {
  const R = S.run, t = TOUR[R.tid], s = t.stages[R.stage];
  if (R.opp) return R.opp;
  if (s.type === 'league') {
    skipByes();
    const p = R.st.sched[R.st.round].find(p => p.includes(-1));
    const fi = p[0] === -1 ? p[1] : p[0];
    R.opp = { fi, ...R.field[fi] };
  } else if (s.type === 'swiss' || s.pi) {
    const used = new Set(R.used);
    const P = tourPow(t, R.d) - 3 + rand(-3, 2) + (s.type === 'swiss' ? (R.st.w - R.st.l) * 1.5 : R.stage * 1.5);
    R.opp = { fi: null, ...genTeam(t.region, P, used) };
    R.used = [...used];
  } else {
    const size = 2 ** (t.stages.length - R.stage);
    R.alive = R.alive.slice(0, size - 1);
    if (!R.alive.length) {
      const used = new Set(R.used);
      R.field.push(genTeam(t.region, tourPow(t, R.d) + 2, used));
      R.used = [...used];
      R.alive = [R.field.length - 1];
    }
    const fi = R.stage === t.stages.length - 1 ? R.alive[0] : pick(R.alive);
    R.opp = { fi, ...R.field[fi] };
  }
  save();
  return R.opp;
}
function nextMatch() {
  if (!S.run) return;
  if (!myTeam()) { toast('Đội hình cần đủ 5 vị trí!', 'err'); switchView('team'); return; }
  const R = S.run, t = TOUR[R.tid], s = t.stages[R.stage], D = diffOf(R.d);
  const o = currentOpp();
  const bo = s.type === 'swiss' && (R.st.w === 2 || R.st.l === 2) ? 3 : s.bo;
  const sub = s.type === 'league' ? ` · Trận ${R.st.me.w + R.st.me.l + 1}/${stageGames(s)}` : s.type === 'swiss' ? ` · ${R.st.w}-${R.st.l}` : '';
  preMatch({
    title: `${t.name} ${D.icon} ${D.name} · ${s.n}${sub}`, opp: teamObj(o), bo, allowCancel: true,
    extra: `<p class="center muted small">${stageStatus()}</p>`,
    onEnd: (won, score) => tourSeriesEnd(won, score),
  });
}

// ----- Kết thúc một loạt trận -----
function tourSeriesEnd(won, score) {
  const R = S.run, t = TOUR[R.tid], s = t.stages[R.stage], D = diffOf(R.d);
  const i = TOURS.indexOf(t), cash = tourCash(t, R.d), key = tk(t.id, R.d), last = t.stages.length - 1;
  const opp = R.opp; R.opp = null;
  won ? S.stats.w++ : S.stats.l++;
  const money = won ? Math.max(20, Math.round(cash * 0.015)) : Math.round(cash * 0.004);
  const exp = won ? 12 + i * 3 + R.d * 4 : 5;
  S.money += money;
  const ups = gainExp(exp);
  const lines = [`${won ? 'Thắng' : 'Thua'} ${opp ? esc(opp.name) : ''} ${score[0]}-${score[1]}: +${fmt(money)} 💰`, `+${exp} EXP`];
  let outcome = 'next', table = '';
  if (s.type === 'league') {
    recLeague(-1, score[0], score[1]); recLeague(opp.fi, score[1], score[0]);
    simOthers(R.st.round); R.st.round++; skipByes();
    table = tableHTML();
    if (R.st.round >= R.st.sched.length) {
      const tab = standings(), rank = tab.findIndex(r => r.i === -1) + 1;
      lines.push(`📋 Kết thúc ${s.n}: hạng ${rank}/${s.size}`);
      if (rank <= s.adv) { R.alive = tab.filter(r => r.i !== -1).slice(0, s.adv - 1).map(r => r.i); outcome = 'advance'; }
      else outcome = 'out';
    }
  } else if (s.type === 'swiss') {
    won ? R.st.w++ : R.st.l++;
    if (R.st.w >= 3) { outcome = 'advance'; R.alive = R.field.map((_, k) => k).sort((a, b) => R.field[b].power + rand(-3, 3) - R.field[a].power).slice(0, 7); }
    else if (R.st.l >= 3) outcome = 'out';
  } else if (!won) outcome = 'out';
  else if (s.pi) outcome = 'advance';
  else {
    // các cặp còn lại trong nhánh đấu
    const others = shuffle(R.alive.filter(x => x !== opp.fi)), nxt = [];
    for (let k = 0; k < others.length; k += 2) {
      if (k + 1 >= others.length) { nxt.push(others[k]); continue; }
      const sc = simSeries(R.field[others[k]].power, R.field[others[k + 1]].power, s.bo);
      nxt.push(sc[0] > sc[1] ? others[k] : others[k + 1]);
    }
    R.alive = nxt.sort((a, b) => R.field[b].power - R.field[a].power);
    outcome = R.stage === last ? 'champ' : 'advance';
  }

  if (outcome === 'advance' || outcome === 'champ') {
    if (bestT(t.id, R.d) < R.stage) {
      S.best[key] = R.stage;
      if (R.stage < last) {
        const bonus = Math.round(cash * MILESTONE_BONUS);
        S.money += bonus;
        lines.push(`🎯 Đạt mốc mới "${s.n}": +${fmt(bonus)} 💰`);
      }
    }
  }
  const head = `<p class="center">${t.name} · ${D.icon} ${D.name} · ${esc(s.n)}</p>`;

  if (outcome === 'next') {
    save(); renderAll();
    openModal(`<h2 class="center ${won ? 'win-t' : 'lose-t'}">${won ? '🎉 Thắng loạt trận!' : '😞 Thua loạt trận'}</h2>${head}
      ${rewardHTML(lines, ups)}
      <p class="center"><b>${stageStatus()}</b></p>${table}
      <div class="actions"><button class="btn primary" id="r-next">Trận tiếp theo ▶</button><button class="btn ghost" id="r-close">Để sau</button></div>`, !!table);
    $('#r-next').onclick = nextMatch;
    $('#r-close').onclick = closeModal;
    return;
  }
  if (outcome === 'out') {
    const cons = Math.round(cash * 0.02 * (R.stage + 1));
    S.money += cons;
    lines.push(`Tiền an ủi +${fmt(cons)} 💰`);
    S.run = null; save(); renderAll();
    openModal(`<h2 class="center lose-t">😞 Bị loại ở ${esc(s.n)}</h2>${head}
      ${stageTrack(t, R.d, -1, R.stage)}
      ${rewardHTML(lines, ups)}${table}
      <p class="muted center">Nâng cấp đội hình rồi thử lại nhé!</p>
      <div class="actions"><button class="btn primary" id="r-shop">🛒 Cửa hàng</button><button class="btn" id="r-up">⬆️ Nâng cấp thẻ</button><button class="btn ghost" id="r-close">Đóng</button></div>`, !!table);
    $('#r-shop').onclick = () => { closeModal(); switchView('shop'); };
    $('#r-up').onclick = () => { closeModal(); switchView('upgrade'); };
    $('#r-close').onclick = closeModal;
    return;
  }
  if (outcome === 'advance') {
    R.stage++; initStage(); save(); renderAll();
    const ns = t.stages[R.stage];
    openModal(`<h2 class="center win-t">🎉 Vượt qua ${esc(s.n)}!</h2>${head}
      ${stageTrack(t, R.d, R.stage)}
      ${rewardHTML(lines, ups)}${table}
      <p class="center">Tiếp theo: <b>${esc(ns.n)}</b> (${stageSub(ns)})</p>
      <div class="actions"><button class="btn primary" id="r-next">Vào trận ▶</button><button class="btn ghost" id="r-close">Để sau</button></div>`, !!table);
    $('#r-next').onclick = nextMatch;
    $('#r-close').onclick = closeModal;
    return;
  }
  // Vô địch
  const first = !S.won[key];
  const prize = first ? cash : Math.round(cash / 2);
  S.money += prize;
  S.won[key] = (S.won[key] || 0) + 1;
  S.stats.titles++;
  const nPack = (t.packCount || 1) + (D.extraPack || 0);
  for (let k = 0; k < nPack; k++) S.packs.push(t.pack);
  const d = R.d;
  S.run = null; save(); renderAll();
  lines.push(`🏆 Tiền thưởng vô địch +${fmt(prize)} 💰${first ? '' : ' (đánh lại: ½)'}`, `🎁 ${PACK[t.pack].icon} ${PACK[t.pack].name}${nPack > 1 ? ' ×' + nPack : ''}`);
  const nextT = TOURS[i + 1];
  const unlockMsg = first && nextT ? `🔓 Đã mở khóa: <b>${nextT.name}</b>`
    : first && t.id === 'worlds' && DIFFS[d + 1] ? `🔓 Đã mở khóa chương mới: <b>${DIFFS[d + 1].icon} ${DIFFS[d + 1].name}</b>` : '';
  if (first && t.id === 'lcs1' && !DIFFS.some(x => x.id !== d && S.won[tk('lcs1', x.id)])) lines.push('⏩ Đã mở khóa tua nhanh x4');
  openModal(`<div class="confetti">${Array.from({ length: 50 }, () => `<i style="left:${rand(0, 100)}%;background:hsl(${randi(0, 360)},90%,60%);animation-delay:${rand(0, 1.5)}s;animation-duration:${rand(2, 4)}s"></i>`).join('')}</div>
    <div class="trophy">🏆</div>
    <h2 class="center win-t">${t.id === 'worlds' ? 'VÔ ĐỊCH THẾ GIỚI!' : 'VÔ ĐỊCH ' + t.name.toUpperCase() + '!'}</h2>
    <p class="center">${esc(S.teamName)} đã lên ngôi · ${D.icon} ${D.name} · Chung kết ${score[0]} - ${score[1]}</p>
    ${stageTrack(t, d, -1)}
    ${rewardHTML(lines, ups)}
    ${unlockMsg ? `<p class="center notice">${unlockMsg}</p>` : ''}
    ${t.id === 'worlds' && first && !DIFFS[d + 1] ? '<p class="center">Bạn đã chinh phục cả chương Địa ngục! Tiếp tục nâng cấp thẻ và bảo vệ ngôi vương nhé.</p>' : ''}
    <div class="actions"><button class="btn primary" id="r-shop">🎁 Mở gói thưởng</button><button class="btn ghost" id="r-map">🗺️ Bản đồ</button></div>`);
  $('#r-shop').onclick = () => { closeModal(); switchView('shop'); };
  $('#r-map').onclick = () => { closeModal(); switchView('map'); };
}

// ----- Bản đồ -----
function regionState(rg, d) {
  const idx = TOURS.map((t, i) => i).filter(i => TOURS[i].region === rg);
  if (idx.every(i => wonT(TOURS[i].id, d))) return 'done';
  return tourUnlocked(idx[0], d) ? 'open' : 'locked';
}
function currentRegion(d) {
  if (S.run && S.run.d === d) return TOUR[S.run.tid].region;
  const i = TOURS.findIndex((t, k) => tourUnlocked(k, d) && !wonT(t.id, d));
  return i < 0 ? (diffUnlocked(d) ? 'INT' : 'VCS') : TOURS[i].region;
}
function renderMap() {
  if (mapDiff == null) mapDiff = defaultDiff();
  const d = mapDiff, D = diffOf(d);
  if (!mapSel) mapSel = currentRegion(d);
  const states = {}, info = {};
  JOURNEY.forEach(rg => {
    states[rg] = regionState(rg, d);
    const ts = TOURS.filter(t => t.region === rg);
    info[rg] = `${ts.filter(t => wonT(t.id, d)).length}/${ts.length}`;
  });
  const wonCount = x => TOURS.filter(t => wonT(t.id, x)).length;
  const R = REGIONS[mapSel];
  const regionTours = TOURS.map((t, i) => [t, i]).filter(([t]) => t.region === mapSel);
  const me = myTeam();
  const run = S.run ? TOUR[S.run.tid] : null;
  const RD = S.run ? diffOf(S.run.d) : null;

  $('#view-map').innerHTML = `
  ${run ? `<div class="panel run-banner" style="--rc:${REGIONS[run.region].color}">
    <div class="run-head"><div><small>ĐANG THI ĐẤU · ${RD.icon} ${RD.name.toUpperCase()}</small><h3>${run.name}</h3><p class="muted small">${stageStatus()}</p></div>
      <div class="actions left" style="margin:0"><button class="btn primary" id="map-resume">▶ Vào trận: ${esc(run.stages[S.run.stage].n)}</button><button class="btn ghost small" id="map-quit">Rút lui</button></div></div>
    ${stageTrack(run, S.run.d, S.run.stage)}
    ${run.stages[S.run.stage].type === 'league' ? `<details class="stand-wrap"><summary>📋 Bảng xếp hạng</summary>${tableHTML()}</details>` : ''}
  </div>` : ''}
  <div class="chapters">${DIFFS.map(x => {
    const un = diffUnlocked(x.id);
    return `<button class="chap ${x.id === d ? 'active' : ''} ${un ? '' : 'locked'}" data-diff="${x.id}" style="--dc:${x.color}">
      <i>${un ? x.icon : '🔒'}</i><span><b>Chương ${x.id + 1} · ${x.name}</b><small>${un ? `${wonCount(x.id)}/${TOURS.length} giải · đối thủ +${x.pow} · thưởng ×${x.cash}` : 'Vô địch CKTG chương trước'}</small></span></button>`;
  }).join('')}</div>
  <div class="panel wm-panel" style="--dc:${D.color}">
    <div class="wm-head">
      <div><h3>🌍 Bản đồ hành trình · <span style="color:${D.color}">${D.icon} ${D.name}</span></h3><p class="muted">Chinh phục từng khu vực theo thứ tự đường bay. Chọn một khu vực để xem các giải.</p></div>
      <div class="journey"><small>Tiến độ chương</small><b>${wonCount(d)}/${TOURS.length} giải</b><div class="jbar"><i style="width:${wonCount(d) / TOURS.length * 100}%"></i></div></div>
    </div>
    ${worldMapHTML(states, info, mapSel)}
  </div>
  <div class="panel region-panel" style="--rc:${R.color}">
    <div class="rp-head">
      <span class="rp-code">${mapSel === 'INT' ? '🌍' : mapSel}</span>
      <div><h3>${mapSel === 'INT' ? 'Đấu trường Quốc tế' : 'Khu vực ' + R.name}</h3>
      <p class="muted">${!diffUnlocked(d) ? `🔒 Chương ${D.name} chưa mở – hãy vô địch CKTG ở chương ${DIFFS[d - 1].name}.` : states[mapSel] === 'locked' ? '🔒 Chưa mở khóa – hãy vô địch khu vực trước trên đường hành trình.' : states[mapSel] === 'done' ? '🏆 Đã chinh phục toàn bộ khu vực! Bạn vẫn có thể đánh lại để kiếm thưởng.' : 'Thi đấu theo thể thức thật: vòng bảng, playoffs. Vượt qua từng mốc để nhận thưởng; vô địch để mở giải tiếp theo.'}</p></div>
    </div>
    <div class="tour-list">${regionTours.map(([t, i]) => {
      const un = tourUnlocked(i, d), w = wonT(t.id, d), active = S.run && S.run.tid === t.id && S.run.d === d, busy = S.run && !active;
      const label = t.div === 2 ? 'HẠNG 2' : t.div === 1 ? 'HẠNG 1' : t.id === 'msi' ? 'GIẢI GIỮA MÙA' : 'CHUNG KẾT';
      const P = tourPow(t, d), cash = tourCash(t, d);
      const gap = me ? +(me.power - P).toFixed(1) : null;
      const nPack = (t.packCount || 1) + (D.extraPack || 0);
      return `<div class="tour ${un ? '' : 'locked'} ${w ? 'won' : ''} ${active ? 'active' : ''}">
        <div class="tour-top">
          <div><span class="div-tag">${label}</span><h4>${t.name} ${w ? `<span class="won-tag">🏆 ×${w}</span>` : ''}</h4>
            <div class="tour-fmt">📅 ${fmtDesc(t)} · ~${totalSeries(t)} loạt trận</div>
            <div class="tour-meta"><span>⚡ Đối thủ ~${(P - 7).toFixed(0)}–${(P + 3).toFixed(0)}</span><span>💰 ${fmt(w ? cash / 2 : cash)}${w ? ' (đánh lại)' : ''}</span><span>${PACK[t.pack].icon} ${PACK[t.pack].name}${nPack > 1 ? ' ×' + nPack : ''}</span>
            ${gap != null && un ? `<span class="gap ${gap >= 0 ? 'good' : gap >= -4 ? 'mid' : 'bad'}">${gap >= 0 ? 'Đội bạn mạnh hơn' : gap >= -4 ? 'Cân sức' : 'Đối thủ mạnh hơn'} (${gap > 0 ? '+' : ''}${gap})</span>` : ''}</div>
          </div>
          <div class="tour-cta">${!un ? `<span class="muted small">🔒 ${i && diffUnlocked(d) ? `Vô địch ${TOURS[i - 1].name} để mở` : 'Chương chưa mở'}</span>`
            : active ? `<button class="btn primary" data-go="${t.id}">▶ Tiếp tục</button>`
            : `<button class="btn ${w ? '' : 'primary'}" data-go="${t.id}" ${busy || !me ? 'disabled' : ''}>${w ? '↻ Đánh lại' : '⚔️ Tham gia'}</button>${busy ? '<small class="muted">Đang dự giải khác</small>' : ''}`}</div>
        </div>
        ${stageTrack(t, d, active ? S.run.stage : -1)}
      </div>`;
    }).join('')}</div>
  </div>`;

  document.querySelectorAll('.chap').forEach(b => b.onclick = () => {
    const x = +b.dataset.diff;
    if (!diffUnlocked(x)) return toast(`Vô địch CKTG ở chương ${DIFFS[x - 1].name} để mở chương ${DIFFS[x].name}`, 'err');
    mapDiff = x; mapSel = null; renderMap();
  });
  document.querySelectorAll('.hs').forEach(b => b.onclick = () => { mapSel = b.dataset.rg; renderMap(); document.querySelector('.region-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    if (!S.run) startRun(b.dataset.go, d);
    nextMatch();
  });
  if (run) {
    $('#map-resume').onclick = nextMatch;
    $('#map-quit').onclick = () => {
      if (!confirm(`Rút lui khỏi ${run.name}? Bạn sẽ mất tiến độ ở giải này (các mốc đã đạt vẫn được giữ).`)) return;
      S.run = null; save(); renderAll(); toast(`Đã rút lui khỏi ${run.name}`);
    };
  }
}
