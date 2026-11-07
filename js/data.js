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
const TIERS = [
  { id: 'SSS', cls: 'SSS', min: 95, sell: 4000, desc: 'Huyền thoại – mùa vô địch thế giới / MVP' },
  { id: 'SS',  cls: 'SS',  min: 91, sell: 1800, desc: 'Siêu sao – chung kết / vô địch quốc tế' },
  { id: 'S+',  cls: 'Sp',  min: 88, sell: 900,  desc: 'Ngôi sao – bán kết thế giới, vô địch khu vực' },
  { id: 'S',   cls: 'S',   min: 84, sell: 400,  desc: 'Xuất sắc – dự CKTG, top khu vực' },
  { id: 'A',   cls: 'A',   min: 79, sell: 150,  desc: 'Tốt – tuyển thủ chính ổn định' },
  { id: 'B',   cls: 'B',   min: 0,  sell: 50,   desc: 'Khá – mùa giải bình thường' },
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

const CARDS = [];
const CARD = {};
RAW.forEach(([name, role, region, seasons]) => {
  seasons.forEach(([year, team, rating]) => {
    const c = { id: `${name}-${year}`, name, role, region, year, team, rating, tier: tierOf(rating) };
    CARDS.push(c); CARD[c.id] = c;
  });
});

// Đội vô địch thế giới từng năm (mã đội như trong dữ liệu)
const WORLDS_CHAMPS = { 2013: 'SKT', 2014: 'SSW', 2015: 'SKT', 2016: 'SKT', 2017: 'SSG', 2018: 'IG', 2019: 'FPX', 2020: 'DWG', 2021: 'EDG', 2022: 'DRX', 2023: 'T1', 2024: 'T1', 2025: 'T1' };

// ===== Gói thẻ =====
const PACKS = [
  { id: 'bronze',  name: 'Gói Đồng',        price: 400,   count: 3, icon: '🥉', odds: { B: 62, A: 32, S: 5, 'S+': 1 } },
  { id: 'silver',  name: 'Gói Bạc',         price: 1000,  count: 3, icon: '🥈', odds: { B: 25, A: 50, S: 20, 'S+': 5 } },
  { id: 'gold',    name: 'Gói Vàng',        price: 2500,  count: 3, icon: '🥇', odds: { A: 40, S: 36, 'S+': 17, SS: 6, SSS: 1 } },
  { id: 'diamond', name: 'Gói Kim Cương',   price: 6000,  count: 3, icon: '💎', odds: { S: 40, 'S+': 34, SS: 21, SSS: 5 } },
  { id: 'legend',  name: 'Gói Huyền Thoại', price: 15000, count: 3, icon: '👑', odds: { 'S+': 45, SS: 42, SSS: 13 } },
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
  VCS: ['Sài Gòn Phoenix', 'Hà Nội Thunder', 'Đà Nẵng Tide', 'Cần Thơ Mavericks', 'Hải Phòng Krakens', 'Huế Dynasty', 'Mekong Vipers'],
  PCS: ['Taipei Comets', 'Hong Kong Dragons', 'Manila Storm', 'Bangkok Tigers', 'Singapore Lions'],
  LCS: ['Bay Area Titans', 'New York Hawks', 'Texas Outlaws', 'Seattle Ravens', 'Miami Heatwave'],
  LEC: ['Berlin Wolves', 'Paris Monarchs', 'Madrid Toros', 'London Royals', 'Nordic Valkyries'],
  LPL: ['Shanghai Qilin', 'Beijing Jade', 'Chengdu Pandas', 'Hangzhou Lotus', 'Shenzhen Rockets'],
  LCK: ['Seoul Tigers', 'Busan Sharks', 'Incheon Falcons', 'Daegu Blaze', 'Gwangju Spirits'],
};
// Các mốc (vòng đấu) trong mỗi giải. d = độ chênh sức mạnh đối thủ so với giải.
const ST_DIV2 = [
  { n: 'Vòng loại', bo: 1, d: -4, ic: '🎯' },
  { n: 'Tứ kết', bo: 1, d: -2, ic: '⚔️' },
  { n: 'Bán kết', bo: 3, d: 0, ic: '🔥' },
  { n: 'Chung kết', bo: 3, d: 2, ic: '🏆' },
];
const ST_DIV1 = [
  { n: 'Vòng bảng', bo: 1, d: -4, ic: '🎯' },
  { n: 'Playoffs', bo: 1, d: -3, ic: '🛡️' },
  { n: 'Tứ kết', bo: 3, d: -2, ic: '⚔️' },
  { n: 'Bán kết', bo: 3, d: 0, ic: '🔥' },
  { n: 'Chung kết', bo: 3, d: 2, ic: '🏆' },
];
const ST_MSI = [
  { n: 'Vòng khởi động', bo: 1, d: -4, ic: '🎯' },
  { n: 'Vòng bảng', bo: 3, d: -2, ic: '🛡️' },
  { n: 'Bán kết', bo: 3, d: 0, ic: '🔥' },
  { n: 'Chung kết', bo: 5, d: 2, ic: '🏆' },
];
const ST_WORLDS = [
  { n: 'Vòng khởi động', bo: 1, d: -4, ic: '🎯' },
  { n: 'Vòng Thụy Sĩ', bo: 1, d: -3, ic: '🛡️' },
  { n: 'Tứ kết', bo: 3, d: -2, ic: '⚔️' },
  { n: 'Bán kết', bo: 3, d: 0, ic: '🔥' },
  { n: 'Chung kết', bo: 5, d: 2, ic: '🏆' },
];
const TOURS = [
  { id: 'vcs2', region: 'VCS', name: 'VCS Hạng 2', div: 2, power: 73, prize: 800, pack: 'bronze', rounds: ST_DIV2 },
  { id: 'vcs1', region: 'VCS', name: 'VCS Hạng 1', div: 1, power: 76, prize: 1500, pack: 'silver', rounds: ST_DIV1 },
  { id: 'pcs2', region: 'PCS', name: 'PCS Hạng 2', div: 2, power: 78, prize: 2000, pack: 'silver', rounds: ST_DIV2 },
  { id: 'pcs1', region: 'PCS', name: 'PCS Hạng 1', div: 1, power: 80, prize: 3000, pack: 'gold', rounds: ST_DIV1 },
  { id: 'lcs2', region: 'LCS', name: 'LCS Hạng 2', div: 2, power: 81, prize: 3500, pack: 'gold', rounds: ST_DIV2 },
  { id: 'lcs1', region: 'LCS', name: 'LCS Hạng 1', div: 1, power: 83, prize: 5000, pack: 'gold', rounds: ST_DIV1 },
  { id: 'lec2', region: 'LEC', name: 'LEC Hạng 2', div: 2, power: 84, prize: 6000, pack: 'gold', rounds: ST_DIV2 },
  { id: 'lec1', region: 'LEC', name: 'LEC Hạng 1', div: 1, power: 86, prize: 8000, pack: 'diamond', rounds: ST_DIV1 },
  { id: 'lpl2', region: 'LPL', name: 'LPL Hạng 2', div: 2, power: 87, prize: 9000, pack: 'diamond', rounds: ST_DIV2 },
  { id: 'lpl1', region: 'LPL', name: 'LPL Hạng 1', div: 1, power: 89, prize: 13000, pack: 'diamond', rounds: ST_DIV1 },
  { id: 'lck2', region: 'LCK', name: 'LCK Hạng 2', div: 2, power: 89, prize: 13000, pack: 'diamond', rounds: ST_DIV2 },
  { id: 'lck1', region: 'LCK', name: 'LCK Hạng 1', div: 1, power: 91, prize: 18000, pack: 'legend', rounds: ST_DIV1 },
  { id: 'msi', region: 'INT', name: 'MSI', div: 0, power: 93, prize: 28000, pack: 'legend', rounds: ST_MSI },
  { id: 'worlds', region: 'INT', name: 'Chung Kết Thế Giới', div: 0, power: 95, prize: 60000, pack: 'legend', packCount: 2, rounds: ST_WORLDS },
];
// Thưởng lần đầu vượt qua một mốc (tỉ lệ theo tiền thưởng vô địch)
const MILESTONE_BONUS = 0.1;
const TOUR = Object.fromEntries(TOURS.map(t => [t.id, t]));
