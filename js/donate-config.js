// Thông tin ủng hộ nhà phát hành (hiện ở nút 💖 Ủng hộ).
// Điền thông tin của bạn rồi tải lại trang. Mục nào để null / trống sẽ không hiện.
const DONATE = {
  // Lời nhắn hiện trong hộp ủng hộ (để trống = dùng lời nhắn mặc định)
  message: '',

  // Chuyển khoản ngân hàng: game tự tạo mã VietQR để quét bằng app ngân hàng.
  // bankId: mã ngân hàng theo VietQR, ví dụ 'vcb' (Vietcombank), 'tcb' (Techcombank), 'mb' (MB Bank), 'acb', 'tpb', 'vpb', 'bidv', 'icb' (VietinBank)
  // Ví dụ: bank: { bankId: 'mb', bankName: 'MB Bank', account: '0123456789', name: 'NGUYEN VAN A', note: 'Ung ho Hanh Trinh CKTG' },
  bank: { bankId: 'tpb', bankName: 'TPBank', account: '00003869826', name: 'PHAN THANH HOANG TUAN', note: 'Ung ho Hanh Trinh CKTG' },

  // Số điện thoại ví MoMo, ví dụ: momo: '0901234567',
  momo: '0382985896',

  // Liên kết ủng hộ trực tuyến (chỉ nhận link https), ví dụ:
  // links: [{ label: '☕ Ko-fi', url: 'https://ko-fi.com/tenban' }, { label: '💛 Buy Me a Coffee', url: 'https://buymeacoffee.com/tenban' }],
  links: [],
};
