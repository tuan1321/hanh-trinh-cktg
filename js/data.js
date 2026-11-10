// ===== Tiện ích chung =====
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ===== Vị trí =====
const ROLES = ['TOP', 'JNG', 'MID', 'ADC', 'SUP'];
const ROLE_INFO = {
  TOP: { vn: 'Đường trên', icon: '🛡️' },
  JNG: { vn: 'Đi rừng', icon: '🌲' },
  MID: { vn: 'Đường giữa', icon: '🔮' },
  ADC: { vn: 'Xạ thủ', icon: '🏹' },
  SUP: { vn: 'Hỗ trợ', icon: '💠' },
};

// ===== Bậc thẻ (dựa trên chỉ số mùa giải) =====
// Chỉ số tổng (OVR) giãn từ thang gốc để các mùa giải phân tầng rõ hơn: OVR = 50 + (gốc − 70) × 1.8
const ovrOf = raw => Math.round(50 + (raw - 70) * 1.8);
const TIERS = [
  { id: 'SSS', cls: 'SSS', min: 95, sell: 45000, desc: 'Huyền thoại – mùa vô địch thế giới / MVP' },
  { id: 'SS',  cls: 'SS',  min: 88, sell: 12000, desc: 'Siêu sao – chung kết / vô địch quốc tế' },
  { id: 'S+',  cls: 'Sp',  min: 82, sell: 3000,  desc: 'Ngôi sao – bán kết thế giới, vô địch khu vực' },
  { id: 'S',   cls: 'S',   min: 75, sell: 700,   desc: 'Xuất sắc – dự CKTG, top khu vực' },
  { id: 'A',   cls: 'A',   min: 66, sell: 150,   desc: 'Tốt – tuyển thủ chính ổn định' },
  { id: 'B',   cls: 'B',   min: 0,  sell: 30,    desc: 'Khá – mùa giải bình thường' },
];
const tierOf = r => TIERS.find(t => r >= t.min);

// ===== Dữ liệu tuyển thủ: [tên, vị trí, khu vực, [[năm, đội, chỉ số], ...]] =====
// Chỉ số là ước lượng theo thành tích của từng năm (fan-made, không chính thức).
const RAW = [
  // TOP
  ['Impact', 'TOP', 'LCK', [[2013, 'SKT', 89], [2019, 'TL', 80]]],
  ['Looper', 'TOP', 'LCK', [[2014, 'SSW', 90]]],
  ['MaRin', 'TOP', 'LCK', [[2014, 'SKT', 80], [2015, 'SKT', 95]]],
  ['Duke', 'TOP', 'LCK', [[2016, 'SKT', 88]]],
  ['Smeb', 'TOP', 'LCK', [[2016, 'ROX', 91], [2017, 'KT', 86], [2018, 'KT', 82]]],
  ['CuVee', 'TOP', 'LCK', [[2017, 'SSG', 89], [2018, 'GEN', 77]]],
  ['Huni', 'TOP', 'LCK', [[2017, 'SKT', 84]]],
  ['TheShy', 'TOP', 'LPL', [[2018, 'IG', 95], [2019, 'IG', 88], [2020, 'IG', 83], [2023, 'WBG', 86]]],
  ['Bwipo', 'TOP', 'LEC', [[2018, 'FNC', 85], [2019, 'FNC', 82]]],
  ['Licorice', 'TOP', 'LCS', [[2018, 'C9', 80]]],
  ['Zeros', 'TOP', 'VCS', [[2018, 'PVB', 78]]],
  ['GimGoon', 'TOP', 'LPL', [[2019, 'FPX', 90], [2020, 'FPX', 77]]],
  ['Wunder', 'TOP', 'LEC', [[2019, 'G2', 87], [2020, 'G2', 80]]],
  ['Khan', 'TOP', 'LCK', [[2019, 'T1', 86], [2021, 'DK', 88]]],
  ['Nuguri', 'TOP', 'LCK', [[2019, 'DWG', 84], [2020, 'DWG', 94]]],
  ['Bin', 'TOP', 'LPL', [[2020, 'SN', 87], [2023, 'BLG', 86], [2024, 'BLG', 92]]],
  ['Flandre', 'TOP', 'LPL', [[2021, 'EDG', 89]]],
  ['Kingen', 'TOP', 'LCK', [[2022, 'DRX', 92], [2023, 'DK', 81]]],
  ['Zeus', 'TOP', 'LCK', [[2021, 'T1', 84], [2022, 'T1', 90], [2023, 'T1', 94], [2024, 'T1', 92], [2025, 'HLE', 88]]],
  ['Doran', 'TOP', 'LCK', [[2022, 'GEN', 84], [2023, 'GEN', 84], [2024, 'HLE', 85], [2025, 'T1', 90]]],
  ['369', 'TOP', 'LPL', [[2023, 'JDG', 92], [2024, 'TES', 87]]],
  ['Kiin', 'TOP', 'LCK', [[2024, 'GEN', 89], [2025, 'GEN', 90]]],
  ['BrokenBlade', 'TOP', 'LEC', [[2024, 'G2', 85], [2025, 'G2', 84]]],
  ['Fudge', 'TOP', 'LCS', [[2023, 'C9', 77]]],
  ['MMD', 'TOP', 'PCS', [[2017, 'FW', 78]]],
  ['Kiaya', 'TOP', 'VCS', [[2023, 'GAM', 76], [2024, 'GAM', 77]]],
  ['PerfecT', 'TOP', 'LCK', [[2025, 'KT', 84]]],
  // JUNGLE
  ['Bengi', 'JNG', 'LCK', [[2013, 'SKT', 90], [2015, 'SKT', 92], [2016, 'SKT', 91]]],
  ['Dandy', 'JNG', 'LCK', [[2014, 'SSW', 93]]],
  ['Peanut', 'JNG', 'LCK', [[2016, 'ROX', 89], [2017, 'SKT', 85], [2018, 'KZ', 81], [2022, 'GEN', 87], [2023, 'GEN', 86], [2024, 'HLE', 85]]],
  ['Ambition', 'JNG', 'LCK', [[2017, 'SSG', 88], [2018, 'GEN', 76]]],
  ['Score', 'JNG', 'LCK', [[2018, 'KT', 88]]],
  ['Ning', 'JNG', 'LPL', [[2018, 'IG', 93], [2019, 'IG', 84]]],
  ['Broxah', 'JNG', 'LEC', [[2018, 'FNC', 84], [2019, 'FNC', 81]]],
  ['Svenskeren', 'JNG', 'LCS', [[2018, 'C9', 81]]],
  ['Karsa', 'JNG', 'PCS', [[2017, 'FW', 83], [2018, 'RNG', 85]]],
  ['Levi', 'JNG', 'VCS', [[2017, 'GAM', 80], [2019, 'GAM', 81], [2023, 'GAM', 77], [2024, 'GAM', 76]]],
  ['Tian', 'JNG', 'LPL', [[2019, 'FPX', 94]]],
  ['Jankos', 'JNG', 'LEC', [[2019, 'G2', 87], [2020, 'G2', 84]]],
  ['Clid', 'JNG', 'LCK', [[2019, 'T1', 85]]],
  ['Canyon', 'JNG', 'LCK', [[2019, 'DWG', 85], [2020, 'DWG', 96], [2021, 'DK', 93], [2024, 'GEN', 92], [2025, 'GEN', 92]]],
  ['SofM', 'JNG', 'LPL', [[2020, 'SN', 90], [2021, 'LNG', 84]]],
  ['Jiejie', 'JNG', 'LPL', [[2021, 'EDG', 90]]],
  ['Pyosik', 'JNG', 'LCK', [[2022, 'DRX', 89]]],
  ['Oner', 'JNG', 'LCK', [[2021, 'T1', 84], [2022, 'T1', 89], [2023, 'T1', 94], [2024, 'T1', 93], [2025, 'T1', 93]]],
  ['Kanavi', 'JNG', 'LPL', [[2023, 'JDG', 92], [2025, 'HLE', 88]]],
  ['Tarzan', 'JNG', 'LPL', [[2023, 'WBG', 86]]],
  ['Xun', 'JNG', 'LPL', [[2023, 'BLG', 85], [2024, 'BLG', 89]]],
  ['Yike', 'JNG', 'LEC', [[2024, 'G2', 82]]],
  ['Blaber', 'JNG', 'LCS', [[2023, 'C9', 78]]],
  ['Cuzz', 'JNG', 'LCK', [[2025, 'KT', 86]]],
  // MID
  ['Faker', 'MID', 'LCK', [[2013, 'SKT', 96], [2014, 'SKT', 82], [2015, 'SKT', 97], [2016, 'SKT', 98], [2017, 'SKT', 93], [2018, 'SKT', 78], [2019, 'T1', 88], [2020, 'T1', 80], [2021, 'T1', 86], [2022, 'T1', 92], [2023, 'T1', 95], [2024, 'T1', 96], [2025, 'T1', 95]]],
  ['PawN', 'MID', 'LCK', [[2014, 'SSW', 91]]],
  ['Kuro', 'MID', 'LCK', [[2016, 'ROX', 88]]],
  ['Crown', 'MID', 'LCK', [[2017, 'SSG', 92], [2018, 'GEN', 76]]],
  ['Ucal', 'MID', 'LCK', [[2018, 'KT', 82]]],
  ['Rookie', 'MID', 'LPL', [[2018, 'IG', 94], [2019, 'IG', 86]]],
  ['Caps', 'MID', 'LEC', [[2018, 'FNC', 90], [2019, 'G2', 92], [2020, 'G2', 86], [2024, 'G2', 87]]],
  ['Jensen', 'MID', 'LCS', [[2018, 'C9', 82], [2019, 'TL', 81]]],
  ['Xiaohu', 'MID', 'LPL', [[2018, 'RNG', 88], [2021, 'RNG', 87], [2023, 'WBG', 86]]],
  ['Maple', 'MID', 'PCS', [[2017, 'FW', 82]]],
  ['Optimus', 'MID', 'VCS', [[2017, 'GAM', 77]]],
  ['Doinb', 'MID', 'LPL', [[2019, 'FPX', 94], [2020, 'FPX', 82]]],
  ['Nemesis', 'MID', 'LEC', [[2019, 'FNC', 80]]],
  ['ShowMaker', 'MID', 'LCK', [[2019, 'DWG', 85], [2020, 'DWG', 96], [2021, 'DK', 92]]],
  ['Angel', 'MID', 'LPL', [[2020, 'SN', 85]]],
  ['Scout', 'MID', 'LPL', [[2021, 'EDG', 93]]],
  ['Chovy', 'MID', 'LCK', [[2022, 'GEN', 90], [2023, 'GEN', 90], [2024, 'GEN', 92], [2025, 'GEN', 93]]],
  ['Zeka', 'MID', 'LCK', [[2022, 'DRX', 93], [2024, 'HLE', 88], [2025, 'HLE', 87]]],
  ['Knight', 'MID', 'LPL', [[2020, 'TES', 90], [2023, 'JDG', 93], [2024, 'BLG', 92]]],
  ['EMENES', 'MID', 'LCS', [[2023, 'C9', 77]]],
  ['Emo', 'MID', 'VCS', [[2023, 'GAM', 75], [2024, 'GAM', 76]]],
  ['Bdd', 'MID', 'LCK', [[2025, 'KT', 89]]],
  // ADC
  ['Piglet', 'ADC', 'LCK', [[2013, 'SKT', 88]]],
  ['Imp', 'ADC', 'LCK', [[2014, 'SSW', 95]]],
  ['Bang', 'ADC', 'LCK', [[2015, 'SKT', 93], [2016, 'SKT', 92], [2017, 'SKT', 88], [2018, 'SKT', 78]]],
  ['PraY', 'ADC', 'LCK', [[2016, 'ROX', 86]]],
  ['Ruler', 'ADC', 'LCK', [[2017, 'SSG', 95], [2018, 'GEN', 78], [2022, 'GEN', 88], [2023, 'JDG', 93], [2025, 'GEN', 91]]],
  ['Deft', 'ADC', 'LCK', [[2014, 'SSB', 85], [2018, 'KT', 86], [2020, 'DRX', 82], [2022, 'DRX', 95]]],
  ['Uzi', 'ADC', 'LPL', [[2013, 'RC', 88], [2018, 'RNG', 90]]],
  ['JackeyLove', 'ADC', 'LPL', [[2018, 'IG', 92], [2020, 'TES', 88]]],
  ['Rekkles', 'ADC', 'LEC', [[2018, 'FNC', 88], [2019, 'FNC', 83]]],
  ['Sneaky', 'ADC', 'LCS', [[2018, 'C9', 82]]],
  ['Doublelift', 'ADC', 'LCS', [[2016, 'TSM', 82], [2019, 'TL', 79]]],
  ['Betty', 'ADC', 'PCS', [[2017, 'FW', 80]]],
  ['EasyLove', 'ADC', 'VCS', [[2019, 'GAM', 76]]],
  ['Lwx', 'ADC', 'LPL', [[2019, 'FPX', 89]]],
  ['Perkz', 'ADC', 'LEC', [[2019, 'G2', 88]]],
  ['Teddy', 'ADC', 'LCK', [[2019, 'T1', 85]]],
  ['Ghost', 'ADC', 'LCK', [[2020, 'DWG', 88], [2021, 'DK', 86]]],
  ['Huanfeng', 'ADC', 'LPL', [[2020, 'SN', 86]]],
  ['Viper', 'ADC', 'LCK', [[2021, 'EDG', 96], [2024, 'HLE', 89], [2025, 'HLE', 89]]],
  ['Gumayusi', 'ADC', 'LCK', [[2021, 'T1', 84], [2022, 'T1', 89], [2023, 'T1', 94], [2024, 'T1', 93], [2025, 'T1', 95]]],
  ['Light', 'ADC', 'LPL', [[2023, 'WBG', 85]]],
  ['Elk', 'ADC', 'LPL', [[2023, 'BLG', 88], [2024, 'BLG', 92]]],
  ['Peyz', 'ADC', 'LCK', [[2023, 'GEN', 86], [2024, 'GEN', 89]]],
  ['Hans Sama', 'ADC', 'LEC', [[2024, 'G2', 87]]],
  ['Berserker', 'ADC', 'LCS', [[2023, 'C9', 79]]],
  ['Deokdam', 'ADC', 'LCK', [[2025, 'KT', 85]]],
  // SUPPORT
  ['PoohManDu', 'SUP', 'LCK', [[2013, 'SKT', 87]]],
  ['Mata', 'SUP', 'LCK', [[2014, 'SSW', 96], [2018, 'KT', 85]]],
  ['Wolf', 'SUP', 'LCK', [[2015, 'SKT', 89], [2016, 'SKT', 90], [2017, 'SKT', 85]]],
  ['GorillA', 'SUP', 'LCK', [[2016, 'ROX', 85]]],
  ['CoreJJ', 'SUP', 'LCK', [[2017, 'SSG', 91], [2018, 'GEN', 78], [2019, 'TL', 82]]],
  ['Baolan', 'SUP', 'LPL', [[2018, 'IG', 85]]],
  ['Ming', 'SUP', 'LPL', [[2018, 'RNG', 86], [2021, 'RNG', 88]]],
  ['Hylissang', 'SUP', 'LEC', [[2018, 'FNC', 84], [2019, 'FNC', 80]]],
  ['Zeyzal', 'SUP', 'LCS', [[2018, 'C9', 80]]],
  ['SwordArt', 'SUP', 'PCS', [[2017, 'FW', 81], [2020, 'SN', 85]]],
  ['Palette', 'SUP', 'VCS', [[2019, 'GAM', 76]]],
  ['Crisp', 'SUP', 'LPL', [[2019, 'FPX', 91], [2023, 'WBG', 84]]],
  ['Mikyx', 'SUP', 'LEC', [[2019, 'G2', 86], [2024, 'G2', 84]]],
  ['Effort', 'SUP', 'LCK', [[2019, 'T1', 83]]],
  ['BeryL', 'SUP', 'LCK', [[2019, 'DWG', 86], [2020, 'DWG', 93], [2021, 'DK', 89], [2022, 'DRX', 92]]],
  ['Meiko', 'SUP', 'LPL', [[2021, 'EDG', 92]]],
  ['Keria', 'SUP', 'LCK', [[2021, 'T1', 85], [2022, 'T1', 90], [2023, 'T1', 95], [2024, 'T1', 94], [2025, 'T1', 94]]],
  ['Lehends', 'SUP', 'LCK', [[2022, 'GEN', 86], [2024, 'GEN', 88]]],
  ['Delight', 'SUP', 'LCK', [[2023, 'GEN', 85], [2024, 'HLE', 86], [2025, 'HLE', 87]]],
  ['Missing', 'SUP', 'LPL', [[2023, 'JDG', 90]]],
  ['ON', 'SUP', 'LPL', [[2023, 'BLG', 85], [2024, 'BLG', 90]]],
  ['Vulcan', 'SUP', 'LCS', [[2023, 'C9', 78]]],
  ['Duro', 'SUP', 'LCK', [[2025, 'GEN', 86]]],
  ['Peter', 'SUP', 'LCK', [[2025, 'KT', 84]]],
];

// Đội vô địch thế giới từng năm (mã đội như trong dữ liệu)
const WORLDS_CHAMPS = { 2013: 'SKT', 2014: 'SSW', 2015: 'SKT', 2016: 'SKT', 2017: 'SSG', 2018: 'IG', 2019: 'FPX', 2020: 'DWG', 2021: 'EDG', 2022: 'DRX', 2023: 'T1', 2024: 'T1', 2025: 'T1' };
// Vô địch MSI (2020 không tổ chức) – dùng cho hiệu ứng thẻ mùa vô địch
const MSI_CHAMPS = { 2015: 'EDG', 2016: 'SKT', 2017: 'SKT', 2018: 'RNG', 2019: 'G2', 2021: 'RNG', 2022: 'RNG', 2023: 'JDG', 2024: 'GEN', 2025: 'GEN' };

// ===== Chỉ số phụ & chỉ số ẩn =====
const h32 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const STAT_NAMES = [['LAN', 'Đi đường'], ['TF', 'Giao tranh'], ['MEC', 'Kỹ năng'], ['IQ', 'Tư duy'], ['VIS', 'Tầm nhìn']];
const ROLE_BIAS = { TOP: [3, 1, 1, -1, -4], JNG: [-4, 1, -1, 3, 3], MID: [2, 1, 3, 1, -4], ADC: [1, 3, 3, -3, -4], SUP: [-2, 1, -4, 3, 5] };
// Chỉ số ẩn "Bản lĩnh" (1–10): không hiện trên mặt thẻ, cộng thêm vào sức mạnh đội.
// Hai thẻ cùng chỉ số tổng vẫn khác nhau nhờ chỉ số ẩn.
const HIDDEN_W = 0.15; // mỗi điểm bản lĩnh trung bình = +0.15 sức mạnh đội

const CARDS = [];
const CARD = {};
RAW.forEach(([name, role, region, seasons]) => {
  seasons.forEach(([year, team, raw], k) => {
    const rating = ovrOf(raw);
    const h = h32(name + year);
    const traits = [];
    let hid = 3 + (h % 31) / 10;
    if (WORLDS_CHAMPS[year] === team) { hid += 2.5; traits.push('🏆 Bản lĩnh nhà vô địch'); }
    if (raw >= 93) { hid += 1; traits.push('⭐ Phong độ đỉnh cao'); }
    if (k >= 3) { hid += 1; traits.push('📚 Dày dạn kinh nghiệm'); }
    if (k === 0 && seasons.length > 1) { hid += 0.5; traits.push('🌱 Tân binh khát khao'); }
    if (h % 7 === 0) { hid += 1; traits.push('🔥 Tay to thời khắc quyết định'); }
    if (h % 11 === 3) { hid += 0.6; traits.push('🧊 Tâm lý thép'); }
    if (h % 13 === 5) { hid -= 1; traits.push('😰 Dễ dao động'); }
    const hidden = Math.max(1, Math.min(10, +hid.toFixed(1)));
    const stats = ROLE_BIAS[role].map((b, i) => Math.max(35, rating + b + ((h >>> (i * 3)) % 5) - 2));
    const c = { id: `${name}-${year}`, baseId: `${name}-${year}`, lv: 0, name, role, region, year, team, raw, rating, tier: tierOf(rating), hidden, traits, stats };
    CARDS.push(c); CARD[c.id] = c;
  });
});

// ===== Nâng cấp thẻ (+1 … +10) =====
// 2 thẻ giống hệt (cùng tuyển thủ, cùng mùa, cùng cấp) → thử lên 1 cấp.
const MAX_UP = 10;
const UPG_BONUS = [0, 1, 2, 4, 6, 8, 11, 14, 18, 22, 27];          // OVR cộng thêm ở mỗi cấp
// % thành công để lên cấp i: +1…+7 dễ (giảm 5% mỗi cấp), từ +8 giảm mạnh
const UPG_RATE = [100, 100, 95, 90, 85, 80, 75, 70, 45, 25, 10];
const keyOf = (id, lv) => (lv ? `${id}+${lv}` : id);
function parseKey(k) {
  const m = /^(.+)\+([1-9]\d?)$/.exec(k);
  return m ? { id: m[1], lv: +m[2] } : { id: k, lv: 0 };
}
const _CK = {};
// Lấy thẻ theo khóa ("Faker-2016" hoặc "Faker-2016+3"); null nếu không hợp lệ
function cardOf(k) {
  if (typeof k !== 'string') return null;
  if (_CK[k]) return _CK[k];
  const { id, lv } = parseKey(k);
  const b = CARD[id];
  if (!b || lv > MAX_UP) return null;
  const c = lv ? { ...b, id: k, lv, rating: b.rating + UPG_BONUS[lv], stats: b.stats.map(s => s + UPG_BONUS[lv]) } : b;
  return (_CK[k] = c);
}
// Giá bán thẻ đã nâng cấp: luôn thấp hơn giá trị nguyên liệu bỏ ra (không thể nâng rồi bán để lời)
const sellPrice = c => Math.round(c.tier.sell * (1 + c.lv * c.lv * 0.5));

// ===== Gói thẻ =====
const PACKS = [
  { id: 'bronze',  name: 'Gói Đồng',        price: 1500,  count: 3, icon: '🥉', odds: { B: 75, A: 22, S: 2.7, 'S+': 0.3 } },
  { id: 'silver',  name: 'Gói Bạc',         price: 4000,  count: 3, icon: '🥈', odds: { B: 40, A: 45, S: 12, 'S+': 2.7, SS: 0.3 } },
  { id: 'gold',    name: 'Gói Vàng',        price: 10000, count: 3, icon: '🥇', odds: { A: 50, S: 35, 'S+': 12, SS: 2.7, SSS: 0.3 } },
  { id: 'diamond', name: 'Gói Kim Cương',   price: 25000, count: 3, icon: '💎', odds: { S: 55, 'S+': 33, SS: 10, SSS: 2 } },
  { id: 'legend',  name: 'Gói Huyền Thoại', price: 60000, count: 3, icon: '👑', odds: { 'S+': 60, SS: 33, SSS: 7 } },
];
const PACK = Object.fromEntries(PACKS.map(p => [p.id, p]));

// ===== Khu vực & giải đấu =====
const REGIONS = {
  VCS: { name: 'Việt Nam', flag: '🇻🇳', color: '#e63946' },
  PCS: { name: 'Châu Á - TBD', flag: '🌏', color: '#2ec4b6' },
  LCS: { name: 'Bắc Mỹ', flag: '🇺🇸', color: '#3a86ff' },
  LEC: { name: 'Châu Âu', flag: '🇪🇺', color: '#00b4d8' },
  LPL: { name: 'Trung Quốc', flag: '🇨🇳', color: '#ff006e' },
  LCK: { name: 'Hàn Quốc', flag: '🇰🇷', color: '#ffbe0b' },
  INT: { name: 'Quốc tế', flag: '🌍', color: '#c8aa6e' },
};
const TEAM_NAMES = {
  VCS: ['Sài Gòn Phoenix', 'Hà Nội Thunder', 'Đà Nẵng Tide', 'Cần Thơ Mavericks', 'Hải Phòng Krakens', 'Huế Dynasty', 'Mekong Vipers', 'Nha Trang Corals', 'Vũng Tàu Mariners', 'Quy Nhơn Falcons', 'Đà Lạt Pines'],
  PCS: ['Taipei Comets', 'Hong Kong Dragons', 'Manila Storm', 'Bangkok Tigers', 'Singapore Lions', 'Kaohsiung Waves', 'Kuala Lumpur Kings', 'Jakarta Garudas', 'Macau Aces', 'Cebu Sharks', 'Taichung Spark'],
  LCS: ['Bay Area Titans', 'New York Hawks', 'Texas Outlaws', 'Seattle Ravens', 'Miami Heatwave', 'Chicago Blizzard', 'Boston Rebels', 'Denver Peaks', 'Toronto Frost', 'Vegas Jackpot', 'Atlanta Embers'],
  LEC: ['Berlin Wolves', 'Paris Monarchs', 'Madrid Toros', 'London Royals', 'Nordic Valkyries', 'Milano Lupi', 'Warsaw Hussars', 'Lisbon Navigators', 'Prague Golems', 'Vienna Waltz', 'Istanbul Crescents'],
  LPL: ['Shanghai Qilin', 'Beijing Jade', 'Chengdu Pandas', 'Hangzhou Lotus', 'Shenzhen Rockets', 'Guangzhou Phoenix', 'Wuhan Cranes', 'Xi\'an Terracotta', 'Chongqing Fire', 'Suzhou Silk', 'Nanjing Plums', 'Tianjin Ports', 'Qingdao Seagulls', 'Harbin Ice', 'Kunming Spring', 'Xiamen Egrets', 'Changsha Stars', 'Dalian Tides'],
  LCK: ['Seoul Tigers', 'Busan Sharks', 'Incheon Falcons', 'Daegu Blaze', 'Gwangju Spirits', 'Daejeon Comets', 'Ulsan Whales', 'Suwon Knights', 'Jeju Winds', 'Pohang Steel', 'Gangnam Neon'],
};
const allTeamNames = () => Object.values(TEAM_NAMES).flat();

// ===== Độ khó (mỗi độ khó là một chương hành trình riêng) =====
const DIFFS = [
  { id: 0, name: 'Dễ',       icon: '🌱', pow: 0,  cash: 1,   color: '#a3ff47' },
  { id: 1, name: 'Thường',   icon: '⚔️', pow: 6,  cash: 1.4, color: '#22d3ee' },
  { id: 2, name: 'Khó',      icon: '🔥', pow: 12, cash: 1.9, color: '#ffb81f', extraPack: 1 },
  { id: 3, name: 'Địa ngục', icon: '💀', pow: 19, cash: 2.6, color: '#ff4d6d', extraPack: 1 },
];
const tk = (tid, d) => (d ? `${tid}@${d}` : tid); // khóa tiến độ của giải theo độ khó

// ===== Thể thức giải (mô phỏng theo thể thức thực tế, tối đa BO5) =====
// league: vòng tròn size đội, rr lượt, mỗi trận BOx, top adv đi tiếp
// ko: loại trực tiếp; pi = vòng khởi động (đối thủ từ vòng loại)
// swiss: thắng 3 đi tiếp, thua 3 bị loại; trận quyết định đánh BO3
const LG = (n, size, rr, bo, adv) => ({ type: 'league', n, ic: '📋', size, rr, bo, adv });
const KO = (n, bo, ic = '⚔️', pi = false) => ({ type: 'ko', n, ic, bo, pi });
const SW = () => ({ type: 'swiss', n: 'Vòng Thụy Sĩ', ic: '🛡️', bo: 1 });
const BK = bo => KO('Bán kết', bo, '🔥');
const CK = () => KO('Chung kết', 5, '🏆');
const TK = () => KO('Tứ kết', 5, '⚔️');
const TOURS = [
  { id: 'vcs2', region: 'VCS', name: 'VCS Hạng 2', div: 2, power: 56, prize: 1500, pack: 'bronze', stages: [LG('Vòng bảng', 8, 2, 1, 4), BK(3), CK()] },
  { id: 'vcs1', region: 'VCS', name: 'VCS Hạng 1', div: 1, power: 61, prize: 2500, pack: 'silver', stages: [LG('Vòng bảng', 8, 2, 3, 4), BK(5), CK()] },
  { id: 'pcs2', region: 'PCS', name: 'PCS Hạng 2', div: 2, power: 64, prize: 3500, pack: 'silver', stages: [LG('Vòng bảng', 8, 1, 1, 4), BK(3), CK()] },
  { id: 'pcs1', region: 'PCS', name: 'PCS Hạng 1', div: 1, power: 68, prize: 5000, pack: 'gold', stages: [LG('Vòng bảng', 10, 2, 1, 6), TK(), BK(5), CK()] },
  { id: 'lcs2', region: 'LCS', name: 'LCS Hạng 2', div: 2, power: 70, prize: 6000, pack: 'gold', stages: [LG('Vòng bảng', 10, 1, 1, 4), BK(3), CK()] },
  { id: 'lcs1', region: 'LCS', name: 'LCS Hạng 1', div: 1, power: 73, prize: 8000, pack: 'gold', stages: [LG('Vòng bảng', 8, 2, 1, 6), TK(), BK(5), CK()] },
  { id: 'lec2', region: 'LEC', name: 'LEC Hạng 2', div: 2, power: 75, prize: 9000, pack: 'gold', stages: [LG('Vòng bảng', 10, 1, 1, 4), BK(3), CK()] },
  { id: 'lec1', region: 'LEC', name: 'LEC Hạng 1', div: 1, power: 78, prize: 12000, pack: 'diamond', stages: [LG('Mùa giải thường', 10, 1, 1, 8), KO('Vòng nhóm', 3, '🛡️'), BK(5), CK()] },
  { id: 'lpl2', region: 'LPL', name: 'LPL Hạng 2', div: 2, power: 80, prize: 14000, pack: 'diamond', stages: [LG('Vòng bảng', 12, 1, 3, 4), BK(5), CK()] },
  { id: 'lpl1', region: 'LPL', name: 'LPL Hạng 1', div: 1, power: 84, prize: 20000, pack: 'diamond', stages: [LG('Vòng bảng', 17, 1, 3, 8), TK(), BK(5), CK()] },
  { id: 'lck2', region: 'LCK', name: 'LCK Hạng 2', div: 2, power: 84, prize: 20000, pack: 'diamond', stages: [LG('Vòng bảng', 10, 2, 3, 6), TK(), BK(5), CK()] },
  { id: 'lck1', region: 'LCK', name: 'LCK Hạng 1', div: 1, power: 88, prize: 28000, pack: 'legend', stages: [LG('Vòng bảng', 10, 2, 3, 6), TK(), BK(5), CK()] },
  { id: 'msi', region: 'INT', name: 'MSI', div: 0, power: 91, prize: 40000, pack: 'legend', stages: [KO('Vòng khởi động', 3, '🎯', true), KO('Khởi động – quyết định', 3, '🎯', true), TK(), BK(5), CK()] },
  { id: 'worlds', region: 'INT', name: 'Chung Kết Thế Giới', div: 0, power: 95, prize: 80000, pack: 'legend', packCount: 2, stages: [SW(), TK(), BK(5), CK()] },
];
// Thưởng lần đầu vượt qua một mốc (tỉ lệ theo tiền thưởng vô địch)
const MILESTONE_BONUS = 0.08;
const TOUR = Object.fromEntries(TOURS.map(t => [t.id, t]));
const stageGames = s => (s.type === 'league' ? s.rr * (s.size - 1) : s.type === 'swiss' ? '3–5' : 1);
