// ===== Hình ảnh: chân dung & huy hiệu đội tự vẽ (SVG) + ảnh tùy chỉnh =====
// Muốn dùng ảnh riêng: đặt file vào
//   img/players/<Tên tuyển thủ>.png  (hoặc .jpg)   ví dụ: img/players/Faker.png
//   img/teams/<Mã đội>.png           (hoặc .jpg)   ví dụ: img/teams/T1.png
// Game sẽ tự nhận ảnh khi tải lại trang; nếu không có sẽ dùng hình tự vẽ.

const TEAM_INFO = {
  SKT: { name: 'SK Telecom T1', c: ['#c8102e', '#111111'] },
  T1:  { name: 'T1', c: ['#d1102f', '#151515'] },
  SSW: { name: 'Samsung White', c: ['#f1f5f9', '#1d4ed8'] },
  SSB: { name: 'Samsung Blue', c: ['#1d4ed8', '#dbeafe'] },
  SSG: { name: 'Samsung Galaxy', c: ['#1428a0', '#c7d2fe'] },
  ROX: { name: 'ROX Tigers', c: ['#f97316', '#111111'] },
  KT:  { name: 'KT Rolster', c: ['#111111', '#e11d48'] },
  GEN: { name: 'Gen.G', c: ['#aa8a3a', '#111111'] },
  KZ:  { name: 'KingZone DragonX', c: ['#facc15', '#111111'] },
  DWG: { name: 'DAMWON Gaming', c: ['#0ea5e9', '#0f172a'] },
  DK:  { name: 'DWG KIA', c: ['#0f172a', '#22d3ee'] },
  DRX: { name: 'DRX', c: ['#2563eb', '#e0f2fe'] },
  HLE: { name: 'Hanwha Life Esports', c: ['#f97316', '#1c1917'] },
  IG:  { name: 'Invictus Gaming', c: ['#e5e7eb', '#111111'] },
  FPX: { name: 'FunPlus Phoenix', c: ['#dc2626', '#111111'] },
  RNG: { name: 'Royal Never Give Up', c: ['#111111', '#dc2626'] },
  RC:  { name: 'Royal Club', c: ['#facc15', '#111111'] },
  EDG: { name: 'EDward Gaming', c: ['#111827', '#e5e7eb'] },
  JDG: { name: 'JD Gaming', c: ['#dc2626', '#fde68a'] },
  BLG: { name: 'Bilibili Gaming', c: ['#38bdf8', '#ffffff'] },
  TES: { name: 'Top Esports', c: ['#f97316', '#111111'] },
  WBG: { name: 'Weibo Gaming', c: ['#f59e0b', '#111111'] },
  LNG: { name: 'LNG Esports', c: ['#0284c7', '#e0f2fe'] },
  SN:  { name: 'Suning', c: ['#f59e0b', '#7c2d12'] },
  G2:  { name: 'G2 Esports', c: ['#111111', '#e5e7eb'] },
  FNC: { name: 'Fnatic', c: ['#ff5900', '#111111'] },
  C9:  { name: 'Cloud9', c: ['#0ea5e9', '#ffffff'] },
  TL:  { name: 'Team Liquid', c: ['#0a2240', '#7dd3fc'] },
  TSM: { name: 'TSM', c: ['#111111', '#e5e7eb'] },
  FW:  { name: 'Flash Wolves', c: ['#2563eb', '#111111'] },
  GAM: { name: 'GAM Esports', c: ['#facc15', '#111111'] },
  PVB: { name: 'Phong Vũ Buffalo', c: ['#dc2626', '#facc15'] },
};

function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const teamColors = code => (TEAM_INFO[code] ? TEAM_INFO[code].c : null);
const PALETTE = [['#2563eb', '#e0f2fe'], ['#dc2626', '#fde68a'], ['#7c3aed', '#ede9fe'], ['#059669', '#d1fae5'], ['#f59e0b', '#111111'], ['#0f172a', '#38bdf8'], ['#be185d', '#fce7f3'], ['#111111', '#c8aa6e']];

// Màu đội dùng cho CSS: --t1 (màu chính), --t2 (màu phụ), --tt (màu chữ dễ đọc trên --t1)
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function teamStyle(code) {
  const [c1, c2] = teamColors(code) || PALETTE[hashStr(code) % PALETTE.length];
  return `--t1:${c1};--t2:${c2};--tt:${luminance(c1) > 0.45 ? '#0b0920' : '#ffffff'}`;
}

// ----- Ảnh tùy chỉnh (tự dò file trong thư mục img/) -----
const CUSTOM_IMG = {}; // url-key -> đường dẫn ảnh tìm được
function probeImage(key, bases, done) {
  const urls = bases.flatMap(b => [b + '.png', b + '.jpg']);
  let i = 0;
  const tryNext = () => {
    if (i >= urls.length) return done();
    const u = urls[i++], im = new Image();
    im.onload = () => { CUSTOM_IMG[key] = u; done(); };
    im.onerror = tryNext;
    im.src = u;
  };
  tryNext();
}
// Ảnh tự do đã tải sẵn (danh sách trong js/credits.js) được dùng ngay, không cần dò
if (typeof IMAGE_CREDITS !== 'undefined') IMAGE_CREDITS.forEach(c => { CUSTOM_IMG[c.kind === 'team' ? 't:' + c.code : 'p:' + c.name] = c.path; });
function loadCustomImages(onDone) {
  const jobs = [];
  [...new Set(CARDS.map(c => c.name))].filter(n => !CUSTOM_IMG['p:' + n]).forEach(n => jobs.push(['p:' + n, ['img/players/' + encodeURIComponent(n)]]));
  [...new Set(CARDS.map(c => c.team))].filter(t => !CUSTOM_IMG['t:' + t]).forEach(t => jobs.push(['t:' + t, ['img/teams/' + encodeURIComponent(t)]]));
  let left = jobs.length;
  if (!left) return;
  jobs.forEach(([k, b]) => probeImage(k, b, () => { if (--left === 0 && Object.keys(CUSTOM_IMG).length) onDone(); }));
}

// ----- Chân dung tuyển thủ -----
const SKIN = ['#f6d5bb', '#efc8a6', '#e3b48f', '#d19c76', '#b37a55'];
const HAIR = ['#151515', '#1f1a16', '#2b2118', '#3b2a1a', '#5a3a22', '#b98f5a', '#7a2a2a', '#151515'];
const HAIR_STYLES = [
  'M33,44 C32,26 42,21 50,21 C60,21 69,27 67,44 C64,34 58,31 50,31 C42,31 36,34 33,44 Z',
  'M32,47 C29,24 44,19 52,20 C64,21 71,30 68,47 C66,38 62,35 60,34 L56,41 L52,33 L46,41 L42,33 C38,36 34,41 32,47 Z',
  'M34,40 C34,28 42,25 50,25 C58,25 66,28 66,40 C62,33 56,31 50,31 C44,31 38,33 34,40 Z',
  'M31,62 C25,30 40,19 50,19 C62,19 75,30 69,62 L66,62 C66,44 63,36 50,33 C38,36 34,44 34,62 Z',
  'M32,45 L33,28 L40,30 L41,19 L48,26 L52,16 L56,26 L63,19 L63,30 L68,28 L68,45 C64,34 58,32 50,32 C42,32 36,34 32,45 Z',
  'M33,46 C30,30 38,20 52,21 C63,22 70,30 67,46 C63,36 52,36 46,30 C42,36 37,39 33,46 Z',
];
function avatarSVG(card) {
  const h = hashStr(card.name);
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >>> 3) % HAIR.length];
  const style = HAIR_STYLES[(h >>> 6) % HAIR_STYLES.length];
  const glasses = ((h >>> 9) % 4) === 0;
  const smile = ((h >>> 11) % 3) !== 0;
  const [c1, c2] = teamColors(card.team) || PALETTE[h % PALETTE.length];
  return `<svg viewBox="0 0 100 100" class="av-svg" aria-hidden="true">
    <path d="M8,100 C10,78 30,69 50,69 C70,69 90,78 92,100 Z" fill="${c1}" stroke="${c2}" stroke-width="1.5"/>
    <path d="M14,92 L28,76 M86,92 L72,76" stroke="${c2}" stroke-width="3" opacity=".8"/>
    <rect x="43" y="57" width="14" height="14" rx="4" fill="${skin}" style="filter:brightness(.88)"/>
    <path d="M40,70 L50,80 L60,70" stroke="${c2}" stroke-width="4" fill="none"/>
    <ellipse cx="50" cy="46" rx="17" ry="20" fill="${skin}"/>
    <path d="${style}" fill="${hair}"/>
    <path d="M41,41 l5,-1 M54,40 l5,1" stroke="${hair}" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="43.5" cy="47" rx="1.9" ry="2.3" fill="#1b1b1b"/><ellipse cx="56.5" cy="47" rx="1.9" ry="2.3" fill="#1b1b1b"/>
    ${glasses ? '<g fill="none" stroke="#111" stroke-width="1.4"><rect x="38" y="43" width="11" height="8" rx="3"/><rect x="51" y="43" width="11" height="8" rx="3"/><path d="M49,46 L51,46"/></g>' : ''}
    <path d="${smile ? 'M45,56 Q50,60 55,56' : 'M46,57 L54,57'}" stroke="#7a3b2e" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M30,47 C29,16 71,16 70,47" stroke="#1f2937" stroke-width="4" fill="none"/>
    <rect x="26" y="40" width="8" height="14" rx="3.5" fill="#1f2937" stroke="${c1}" stroke-width="1.5"/>
    <rect x="66" y="40" width="8" height="14" rx="3.5" fill="#1f2937" stroke="${c1}" stroke-width="1.5"/>
    <path d="M30,53 C31,62 38,64 44,62" stroke="#1f2937" stroke-width="2" fill="none"/><circle cx="44.5" cy="62" r="1.8" fill="#1f2937"/>
  </svg>`;
}
function avatarHTML(card) {
  const img = CUSTOM_IMG['p:' + card.name];
  return img ? `<img class="av-img" src="${img}" alt="${esc(card.name)}">` : avatarSVG(card);
}

// ----- Huy hiệu đội -----
function badgeSVG(text, c1, c2) {
  const fs = text.length <= 2 ? 15 : text.length === 3 ? 12 : 9;
  return `<svg viewBox="0 0 40 46" class="badge-svg" aria-hidden="true">
    <path d="M20,2 L37,8 L37,24 C37,35 29,42 20,45 C11,42 3,35 3,24 L3,8 Z" fill="${c1}" stroke="${c2}" stroke-width="2.5"/>
    <path d="M20,7 L32,11.5 L32,24 C32,32 26.5,37 20,40 C13.5,37 8,32 8,24 L8,11.5 Z" fill="none" stroke="${c2}" stroke-width="1" opacity=".45"/>
    <text x="20" y="${23 + fs / 3}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${fs}" fill="${c2}">${esc(text)}</text>
  </svg>`;
}
function teamLogoHTML(code) {
  const img = CUSTOM_IMG['t:' + code];
  if (img) return `<img class="badge-img logo-chip" src="${img}" alt="${esc(code)}" loading="lazy">`;
  const c = teamColors(code) || PALETTE[hashStr(code) % PALETTE.length];
  return badgeSVG(code, c[0], c[1]);
}
// Huy hiệu cho đội của bạn / đội hư cấu (theo tên đội)
function clubLogoHTML(name, mine) {
  const init = name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 3) || '?';
  const c = mine ? ['#c8aa6e', '#0b0f1a'] : PALETTE[hashStr(name) % PALETTE.length];
  return badgeSVG(init, c[0], c[1]);
}
