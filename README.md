# Hành Trình CKTG – Esports Manager mini

Game quản lý đội hình tuyển thủ LMHT trên nền web.

**▶ Chơi ngay: https://cktg.online**

Hoặc tải về và **mở `index.html` bằng Chrome/Edge**, không cần cài đặt. Tiến trình được lưu tự động trong trình duyệt.

## Cách chơi
- Bắt đầu với 7 thẻ tuyển thủ ngẫu nhiên (bậc thấp).
- **Giao hữu** hoặc tham gia **giải đấu** để kiếm tiền + EXP. Lên cấp được tặng gói thẻ.
- **Cửa hàng**: gói Đồng 1.500 → Bạc 4.000 → Vàng 10.000 → Kim Cương 25.000 → Huyền Thoại 60.000. Thẻ SS/SSS rất hiếm.
- Bậc thẻ theo chỉ số tổng (OVR 59–100, giãn rộng để các mùa phân tầng rõ): **B < A (66) < S (75) < S+ (82) < SS (88) < SSS (95)**. Giá bán chênh lệch lớn giữa các bậc (30 → 45.000).
- **Chỉ số ẩn "Bản lĩnh"** (1–10, xem trong chi tiết thẻ): dựa trên mùa vô địch, phong độ đỉnh cao, kinh nghiệm… Hai thẻ cùng chỉ số tổng vẫn khác nhau nhờ chỉ số ẩn; cộng thêm vào sức mạnh đội. Mỗi thẻ còn có 5 chỉ số phụ (đi đường, giao tranh, kỹ năng, tư duy, tầm nhìn).
- **Nâng cấp thẻ** (tab ⬆️): ghép 2 thẻ giống hệt → +1, hai thẻ +1 → +2 … tối đa **+10**. Tỉ lệ thành công 90% → 75% → 60% → 45% → 32% → 20% → 12% → 6% → 2,5% → **0,5%**. Thất bại mất thẻ nguyên liệu. Mỗi cấp tăng chỉ số tổng và chỉ số phụ (+10 = +27).
- **Hiệu ứng thẻ theo bậc**: S hào quang tím, S+ khung vàng kim lấp lánh, SS lá ánh ba chiều đỏ + tàn lửa, SSS khung cầu vồng xoay + lăng kính + sao. **Thẻ mùa vô địch** có vòng nguyệt quế và kim tuyến: vàng cho CKTG, xanh bạc cho MSI.
- **Mở gói** từng thẻ một: thẻ nhấp nháy (bậc càng cao càng nhiều lần), hiện ánh sáng màu bậc thẻ rồi mới lật; chạm để mở nhanh hoặc "Mở hết". **Nâng cấp** có nhịp đặt thẻ → nạp năng lượng → đập → kết quả. Âm thanh hiệu ứng tự tổng hợp (`js/sfx.js`, không dùng file).
- **Âm thanh trận đấu**: kèn mở trận, chém/hạ gục, giao tranh, ACE, nổ trụ, vỡ nhà lính, tiếng rồng/Baron gầm, khán giả reo, nhạc thắng/thua. **Nhạc nền** sảnh và trận đấu (`audio/`, Kevin MacLeod – CC BY 4.0). Nút 🔊 mở bảng bật/tắt và âm lượng từng phần.
- Thẻ chưa mở hiện **ảnh ẩn** (bóng đen, dấu ?) trong Bộ sưu tập.
- Đội hình không được có 2 thẻ cùng một tuyển thủ (dù khác năm).
- **Độ ăn ý** (tối đa +9 sức mạnh đội): đồng đội cùng đội cùng mùa, đội hình huyền thoại (đủ 5 người), cùng màu áo khác mùa, cặp đôi đường dưới, song sát giữa–rừng, trục đường trên, cùng khu vực, cùng thế hệ, nhà vô địch CKTG. Thẻ có dải màu đội; trang Đội hình có gợi ý thay người.
- **Bản đồ giải đấu** có 4 chương: **Dễ → Thường → Khó → Địa ngục** (đối thủ mạnh hơn +6/+12/+19, thưởng ×1.4/×1.9/×2.6). Mỗi chương: VCS → PCS → LCS → LEC → LPL → LCK (Hạng 2 rồi Hạng 1) → MSI → **Chung Kết Thế Giới**. Vô địch CKTG để mở chương tiếp theo.
- **Thể thức như giải thật**: vòng bảng vòng tròn (ví dụ LCK 10 đội, 2 lượt, BO3 = 18 loạt trận; LPL 17 đội BO3 = 16 loạt) có bảng xếp hạng, top đội vào playoffs BO5; MSI có vòng khởi động BO3; CKTG có vòng Thụy Sĩ (thắng 3 đi tiếp). Tối đa BO5.
- Mỗi ván đấu có bản đồ thu nhỏ, bảng tỉ số, K/D từng tuyển thủ và bình luận trực tiếp. Tua x1, x2; **x4 mở khi vô địch LCS Hạng 1**; **bỏ qua ván mở ở cấp 10**.
- **Thành tựu** (tab 🏅): sưu tầm 5 tuyển thủ 1 đội, đủ đội hình huyền thoại, số cúp, mốc sức mạnh, thẻ +3/+5/+7/+10, số trận thắng, cấp độ, vô địch CKTG từng chương… mỗi thành tựu thưởng tiền và gói thẻ.
- **💖 Ủng hộ nhà phát hành**: nút trên thanh đầu trang và cuối trang. Chủ trang điền thông tin (ngân hàng → tự tạo mã VietQR, MoMo, link Ko-fi…) trong `js/donate-config.js`.

## Bạn bè & chơi nhiều người (tab 👥 Bạn bè)
- Mỗi người có **mã kết bạn** (8 ký tự) và **mã đội** (chứa đội hình, gửi qua Zalo/Messenger…).
- **Thêm bạn**: nhập mã kết bạn (cả hai đang trực tuyến) hoặc dán mã đội (dùng được khi ngoại tuyến).
- **Đấu đội đã lưu**: giao hữu với đội hình bạn bè bất cứ lúc nào.
- **Trực tuyến**: bật "📡 Trực tuyến" để thấy bạn bè đang mở game và **mời đấu trực tiếp BO1/BO3/BO5**; người mời tạo trận, hai bên xem cùng một trận. Kết nối máy-máy (WebRTC) qua máy chủ trung gian miễn phí PeerJS — cần có mạng; một số mạng công ty/trường học có thể chặn kết nối này.

## Tên đội
- Mặc định mỗi người có tên **`HLV #<mã kết bạn>`**, không bao giờ trùng ai.
- **Tên riêng cần đăng nhập** (bấm tên đội ở tab Đội hình). Tên được giữ trên máy chủ: người khác **không bao giờ đặt lại được**, kể cả khi bạn đã đổi sang tên khác. Bạn được quay lại tên cũ của mình miễn phí.
- Luật đặt tên: 3–20 ký tự, ít nhất 2 chữ cái; chỉ chữ (có dấu), số, khoảng trắng và `. _ - '`; so trùng không phân biệt hoa thường / dấu / khoảng trắng ("Rồng Lửa" = "rong-lua"); không trùng đội AI hay đội chuyên nghiệp thật, không giả danh quản trị, không từ thô tục, không dùng `#`.
- Lần đổi tên riêng đầu miễn phí, sau đó 5.000 💰 mỗi lần.
- Khách đã đặt tên riêng ở bản cũ: tên được cất lại và tự đăng ký khi đăng nhập (nếu chưa ai dùng).

## Đăng nhập & lưu tiến trình theo tài khoản
Bấm nút **👤 Đăng nhập** góc trên: đăng nhập bằng Google hoặc email/mật khẩu, tiến trình tự lưu lên tài khoản và chơi tiếp được trên máy khác. Chưa đăng nhập thì chơi ở chế độ **Khách** (lưu trên trình duyệt); lần đầu đăng nhập có thể chuyển tiến trình Khách vào tài khoản.

**Cài đặt cho chủ trang (một lần, miễn phí):**
1. Vào https://console.firebase.google.com → **Add project** (có thể tắt Google Analytics).
2. **Build → Authentication → Get started** → bật **Google** và **Email/Password**.
3. **Authentication → Settings → Authorized domains** → thêm `cktg.online`, `www.cktg.online` (và `tuan1321.github.io` nếu còn dùng).
4. **Build → Firestore Database → Create database** → chọn vùng gần (ví dụ `asia-southeast1`) → **production mode**.
5. **Firestore → Rules** → dán nội dung file `firestore.rules` → **Publish**. (Mỗi khi file này thay đổi, dán lại và Publish — ví dụ luật giữ tên đội.)
6. **Project settings → Your apps → Web (`</>`)** → đăng ký app → chép đối tượng `firebaseConfig` vào `js/firebase-config.js` (thay `null`).

## Ảnh tuyển thủ & logo đội
56 tuyển thủ dùng ảnh tự do (Creative Commons / public domain) từ Wikimedia Commons và Openverse; 7 đội có logo tự do. Nguồn ghi đầy đủ trong `img/CREDITS.txt` và nút "📷 Nguồn ảnh" trong game (danh sách ở `js/credits.js`). Các tuyển thủ còn lại dùng chân dung tự vẽ (áo đấu theo màu đội); mỗi đội có huy hiệu riêng. Muốn dùng ảnh thật của bạn:
- `img/players/<Tên>.png` (hoặc .jpg), ví dụ `img/players/Faker.png`
- `img/teams/<Mã đội>.png`, ví dụ `img/teams/T1.png`

**Ảnh theo mùa:** `img/players/<Tên>/<Năm>.jpg`, ví dụ thẻ SKT Faker 2015 → `img/players/Faker/2015.jpg`. Game chọn ảnh đúng mùa → ảnh chung → hình tự vẽ.

Sau khi thêm/xóa ảnh, bấm đúp **`tools/scan-photos.bat`**: công cụ cập nhật `js/photo-manifest.js` (game đọc danh sách này, không phải dò từng file) và `img/players/DANH-SACH-ANH.txt` (thẻ nào đã có ảnh, thẻ nào còn thiếu). Chi tiết trong `img/HUONG-DAN.txt`.

## Cấu trúc
- `index.html` – khung trang
- `css/style.css` – giao diện, màu bậc thẻ
- `css/ui.css`, `js/ui.js` – thanh menu, màn hình tải, hiệu ứng chuyển mục / hộp thoại / tiền / thẻ nghiêng 3D
- `js/data.js` – dữ liệu tuyển thủ, bậc thẻ, gói thẻ, giải đấu (sửa chỉ số ở đây)
- `js/art.js` – chân dung, huy hiệu đội, màu đội, nạp ảnh tùy chỉnh
- `js/social.js` – bạn bè, mã đội, kết nối trực tuyến P2P
- `js/auth.js`, `js/firebase-config.js`, `firestore.rules` – đăng nhập & lưu theo tài khoản
- `js/match.js` – mô phỏng trận, minimap, bình luận
- `js/tour.js` – giải đấu: chương độ khó, vòng bảng, Thụy Sĩ, loại trực tiếp
- `js/upgrade.js` – nâng cấp thẻ +1…+10
- `js/achieve.js` – thành tựu
- `js/names.js` – luật đặt tên đội, giữ tên duy nhất
- `js/photo-manifest.js` – danh sách ảnh (tự tạo bởi `tools/scan-photos.bat`, danh sách thẻ ở `tools/cards.txt`)
- `js/donate-config.js` – thông tin ủng hộ nhà phát hành
- `js/main.js` – logic game & giao diện các tab

Chỉ số tuyển thủ là ước lượng fan-made theo thành tích từng năm, không phải số liệu chính thức.
