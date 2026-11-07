# Hành Trình CKTG – Esports Manager mini

Game quản lý đội hình tuyển thủ LMHT trên nền web.

**▶ Chơi ngay: https://tuan1321.github.io/hanh-trinh-cktg/**

Hoặc tải về và **mở `index.html` bằng Chrome/Edge**, không cần cài đặt. Tiến trình được lưu tự động trong trình duyệt.

## Cách chơi
- Bắt đầu với 7 thẻ tuyển thủ ngẫu nhiên (bậc thấp).
- **Giao hữu** hoặc tham gia **giải đấu** để kiếm tiền + EXP. Lên cấp được tặng gói thẻ.
- **Cửa hàng**: mua gói Đồng → Bạc → Vàng → Kim Cương → Huyền Thoại.
- Bậc thẻ theo chỉ số mùa giải: **B < A < S < S+ < SS < SSS** (mỗi bậc một màu).
- Đội hình không được có 2 thẻ cùng một tuyển thủ (dù khác năm).
- **Độ ăn ý** (tối đa +6 sức mạnh đội): đồng đội cùng đội cùng mùa, đội hình huyền thoại (đủ 5 người), cùng màu áo khác mùa, cặp đôi đường dưới, song sát giữa–rừng, trục đường trên, cùng khu vực, cùng thế hệ, nhà vô địch CKTG. Thẻ có dải màu đội; trang Đội hình có gợi ý thay người.
- **Bản đồ giải đấu**: VCS → PCS → LCS → LEC → LPL → LCK (mỗi khu vực Hạng 2 rồi Hạng 1) → MSI → **Chung Kết Thế Giới**. Phải vô địch giải trước mới mở giải sau.
- Mỗi ván đấu có bản đồ thu nhỏ, bảng tỉ số, K/D từng tuyển thủ và bình luận trực tiếp. Có thể tua x1–x8, bỏ qua ván hoặc mô phỏng nhanh.

## Bạn bè & chơi nhiều người (tab 👥 Bạn bè)
- Mỗi người có **mã kết bạn** (8 ký tự) và **mã đội** (chứa đội hình, gửi qua Zalo/Messenger…).
- **Thêm bạn**: nhập mã kết bạn (cả hai đang trực tuyến) hoặc dán mã đội (dùng được khi ngoại tuyến).
- **Đấu đội đã lưu**: giao hữu với đội hình bạn bè bất cứ lúc nào.
- **Trực tuyến**: bật "📡 Trực tuyến" để thấy bạn bè đang mở game và **mời đấu trực tiếp BO1/BO3**; người mời tạo trận, hai bên xem cùng một trận. Kết nối máy-máy (WebRTC) qua máy chủ trung gian miễn phí PeerJS — cần có mạng; một số mạng công ty/trường học có thể chặn kết nối này.

## Đăng nhập & lưu tiến trình theo tài khoản
Bấm nút **👤 Đăng nhập** góc trên: đăng nhập bằng Google hoặc email/mật khẩu, tiến trình tự lưu lên tài khoản và chơi tiếp được trên máy khác. Chưa đăng nhập thì chơi ở chế độ **Khách** (lưu trên trình duyệt); lần đầu đăng nhập có thể chuyển tiến trình Khách vào tài khoản.

**Cài đặt cho chủ trang (một lần, miễn phí):**
1. Vào https://console.firebase.google.com → **Add project** (có thể tắt Google Analytics).
2. **Build → Authentication → Get started** → bật **Google** và **Email/Password**.
3. **Authentication → Settings → Authorized domains** → thêm `tuan1321.github.io`.
4. **Build → Firestore Database → Create database** → chọn vùng gần (ví dụ `asia-southeast1`) → **production mode**.
5. **Firestore → Rules** → dán nội dung file `firestore.rules` → **Publish**.
6. **Project settings → Your apps → Web (`</>`)** → đăng ký app → chép đối tượng `firebaseConfig` vào `js/firebase-config.js` (thay `null`).

## Ảnh tuyển thủ & logo đội
56 tuyển thủ dùng ảnh tự do (Creative Commons / public domain) từ Wikimedia Commons và Openverse; 7 đội có logo tự do. Nguồn ghi đầy đủ trong `img/CREDITS.txt` và nút "📷 Nguồn ảnh" trong game (danh sách ở `js/credits.js`). Các tuyển thủ còn lại dùng chân dung tự vẽ (áo đấu theo màu đội); mỗi đội có huy hiệu riêng. Muốn dùng ảnh thật của bạn:
- `img/players/<Tên>.png` (hoặc .jpg), ví dụ `img/players/Faker.png`
- `img/teams/<Mã đội>.png`, ví dụ `img/teams/T1.png`

Tải lại trang là game tự nhận. Chi tiết trong `img/HUONG-DAN.txt`.

## Cấu trúc
- `index.html` – khung trang
- `css/style.css` – giao diện, màu bậc thẻ
- `js/data.js` – dữ liệu tuyển thủ, bậc thẻ, gói thẻ, giải đấu (sửa chỉ số ở đây)
- `js/art.js` – chân dung, huy hiệu đội, màu đội, nạp ảnh tùy chỉnh
- `js/social.js` – bạn bè, mã đội, kết nối trực tuyến P2P
- `js/auth.js`, `js/firebase-config.js`, `firestore.rules` – đăng nhập & lưu theo tài khoản
- `js/match.js` – mô phỏng trận, minimap, bình luận
- `js/main.js` – logic game & giao diện các tab

Chỉ số tuyển thủ là ước lượng fan-made theo thành tích từng năm, không phải số liệu chính thức.
