// ===== Bản đồ thế giới (SVG tự vẽ, kiểu chấm neon) =====
// Phép chiếu đơn giản: kinh độ -180..180 -> x 0..1000, vĩ độ 80..-60 -> y 0..420
const WM_W = 1000, WM_H = 420;
const proj = ([lon, lat]) => [((lon + 180) / 360) * WM_W, (80 - lat) * 3];

// Đường viền lục địa giản lược [kinh độ, vĩ độ]
const LAND = [
  // Bắc Mỹ
  [[-168, 66], [-160, 70], [-140, 70], [-120, 72], [-95, 74], [-80, 72], [-62, 60], [-55, 52], [-66, 45], [-75, 38], [-81, 30], [-80, 25], [-90, 29], [-97, 26], [-97, 20], [-90, 15], [-83, 9], [-78, 8], [-85, 14], [-95, 16], [-105, 20], [-112, 30], [-118, 34], [-124, 40], [-125, 49], [-135, 58], [-150, 60], [-165, 60]],
  // Greenland
  [[-55, 60], [-45, 60], [-20, 70], [-20, 80], [-60, 82], [-72, 78], [-58, 70]],
  // Nam Mỹ
  [[-78, 8], [-72, 12], [-60, 10], [-50, 0], [-35, -6], [-40, -22], [-48, -28], [-58, -38], [-65, -45], [-68, -55], [-73, -50], [-72, -30], [-70, -18], [-80, -5], [-80, 2]],
  // Châu Âu
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [0, 50], [5, 53], [8, 57], [5, 62], [15, 69], [25, 71], [40, 68], [45, 60], [40, 45], [28, 41], [26, 38], [20, 40], [15, 38], [12, 44], [8, 44], [3, 42], [-5, 36]],
  // Anh
  [[-6, 50], [2, 51], [0, 55], [-3, 59], [-6, 57], [-5, 54]],
  // Châu Phi
  [[-17, 21], [-10, 30], [-5, 36], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [40, -2], [40, -15], [35, -25], [28, -34], [18, -34], [12, -17], [9, -2], [9, 4], [-5, 5], [-15, 10]],
  // Madagascar
  [[44, -16], [50, -14], [48, -25], [44, -24]],
  // Châu Á
  [[28, 41], [40, 45], [45, 60], [40, 68], [60, 70], [80, 73], [100, 77], [120, 73], [140, 72], [160, 70], [180, 67], [180, 62], [160, 58], [155, 52], [140, 48], [135, 43], [129, 42], [125, 40], [122, 40], [121, 31], [118, 24], [110, 20], [108, 16], [109, 11], [105, 9], [100, 13], [98, 8], [100, 3], [103, 1], [98, 10], [95, 16], [90, 22], [85, 20], [80, 15], [77, 8], [72, 20], [66, 25], [57, 25], [52, 17], [45, 13], [43, 15], [35, 28], [36, 36]],
  // Bán đảo Triều Tiên
  [[125, 40], [129, 42], [130, 38], [129, 35], [126, 34], [125, 37]],
  // Nhật Bản
  [[130, 31], [132, 34], [135, 34], [140, 35], [142, 40], [140, 42], [145, 44], [141, 45], [139, 40], [136, 36], [131, 34]],
  // Đài Loan
  [[120, 22], [122, 25], [121.5, 25.5], [120, 23.5]],
  // Philippines
  [[120, 18], [122, 18], [126, 8], [124, 6], [121, 12]],
  // Indonesia
  [[95, 5], [106, -6], [115, -8], [120, -9], [125, -8], [130, -3], [140, -3], [141, -9], [130, -7], [118, -4], [110, -3], [103, -1]],
  // Úc
  [[114, -22], [122, -17], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [141, -38], [130, -32], [115, -34]],
  // New Zealand
  [[172, -35], [178, -38], [174, -42], [168, -46], [171, -42]],
];

// Vị trí thật (geo) và vị trí nhãn (badge) của mỗi khu vực
const REGION_GEO = {
  VCS: { geo: [106, 16], badge: [90, 0] },
  PCS: { geo: [121, 24], badge: [150, 6] },
  LCS: { geo: [-98, 40], badge: [-104, 46] },
  LEC: { geo: [10, 50], badge: [12, 58] },
  LPL: { geo: [113, 33], badge: [88, 50] },
  LCK: { geo: [127, 37], badge: [152, 52] },
  INT: { geo: [-30, 28], badge: [-30, 28] },
};
const JOURNEY = ['VCS', 'PCS', 'LCS', 'LEC', 'LPL', 'LCK', 'INT'];

// states: { VCS: 'done' | 'open' | 'locked' } ; info: { VCS: '1/2' }
function worldMapHTML(states, info, sel) {
  const pt = p => proj(p).map(v => v.toFixed(1)).join(',');
  const land = LAND.map(poly => `<path d="M${poly.map(pt).join(' L')} Z"/>`).join('');
  let grid = '';
  for (let lon = -150; lon <= 180; lon += 30) { const x = proj([lon, 0])[0]; grid += `<line x1="${x}" y1="0" x2="${x}" y2="${WM_H}"/>`; }
  for (let lat = -40; lat <= 60; lat += 20) { const y = proj([0, lat])[1]; grid += `<line x1="0" y1="${y}" x2="${WM_W}" y2="${y}"/>`; }
  const eq = proj([0, 0])[1];

  // Đường hành trình giữa các khu vực
  let arcs = '';
  for (let k = 0; k < JOURNEY.length - 1; k++) {
    const a = proj(REGION_GEO[JOURNEY[k]].badge), b = proj(REGION_GEO[JOURNEY[k + 1]].badge);
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.22;
    const st = states[JOURNEY[k]] === 'done' ? (states[JOURNEY[k + 1]] === 'done' ? 'done' : 'next') : 'todo';
    arcs += `<path class="wm-arc ${st}" d="M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}"/>`;
  }

  // Quầng sáng, đường chỉ dẫn và ghim
  let glows = '', pins = '';
  JOURNEY.forEach(rg => {
    const R = REGIONS[rg], g = proj(REGION_GEO[rg].geo), b = proj(REGION_GEO[rg].badge);
    const s = states[rg];
    glows += `<circle cx="${g[0]}" cy="${g[1]}" r="${s === 'locked' ? 26 : 46}" fill="${R.color}" opacity="${s === 'locked' ? 0.12 : 0.32}" filter="url(#wm-blur)"/>`;
    if (rg !== 'INT') {
      pins += `<line class="wm-leader" x1="${g[0]}" y1="${g[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${R.color}"/>`;
      pins += `<circle cx="${g[0]}" cy="${g[1]}" r="4" fill="${R.color}"/>`;
      if (s === 'open') pins += `<circle cx="${g[0]}" cy="${g[1]}" r="4" fill="none" stroke="${R.color}" stroke-width="2"><animate attributeName="r" values="4;16" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1.6s" repeatCount="indefinite"/></circle>`;
    }
  });

  const spots = JOURNEY.map((rg, k) => {
    const R = REGIONS[rg], b = proj(REGION_GEO[rg].badge), s = states[rg];
    const icon = s === 'locked' ? '🔒' : s === 'done' ? '🏆' : rg === 'INT' ? '🌍' : '⚔️';
    return `<button class="hs ${s} ${sel === rg ? 'sel' : ''} ${rg === 'INT' ? 'intl' : ''}" data-rg="${rg}" style="left:${(b[0] / WM_W * 100).toFixed(2)}%;top:${(b[1] / WM_H * 100).toFixed(2)}%;--rc:${R.color}">
      <span class="hs-dot">${icon}<i class="hs-step">${k + 1}</i></span>
      <span class="hs-label"><b>${rg === 'INT' ? 'QUỐC TẾ' : rg}</b><small>${R.name} · ${info[rg]}</small></span>
    </button>`;
  }).join('');

  return `<div class="wmap">
    <svg class="wm-svg" viewBox="0 0 ${WM_W} ${WM_H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <pattern id="wm-dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.5" fill="#a78bfa"/></pattern>
        <filter id="wm-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
        <radialGradient id="wm-vignette" cx="50%" cy="50%" r="70%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#05031a" stop-opacity=".85"/></radialGradient>
      </defs>
      <g class="wm-grid">${grid}<line class="wm-eq" x1="0" y1="${eq}" x2="${WM_W}" y2="${eq}"/></g>
      ${glows}
      <g class="wm-land-fill">${land}</g>
      <g class="wm-land" fill="url(#wm-dots)">${land}</g>
      <g class="wm-arcs">${arcs}</g>
      <g>${pins}</g>
      <rect width="${WM_W}" height="${WM_H}" fill="url(#wm-vignette)" pointer-events="none"/>
    </svg>
    ${spots}
  </div>`;
}
