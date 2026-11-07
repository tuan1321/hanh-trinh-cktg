// Cấu hình Firebase cho chức năng đăng nhập & lưu tiến trình theo tài khoản.
// Lấy ở: Firebase Console → Project settings → Your apps → Web app → SDK setup and configuration → Config.
// Đây là cấu hình công khai (không phải mật khẩu); dữ liệu được bảo vệ bằng luật trong firestore.rules.
// Để null = tắt đăng nhập, game chạy ở chế độ Khách (lưu trên trình duyệt).
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD6RGoLPFZqY5pZlRhJcTS3ZG8LjxbfVL8",
  authDomain: "hanh-trinh-cktg.firebaseapp.com",
  projectId: "hanh-trinh-cktg",
  storageBucket: "hanh-trinh-cktg.firebasestorage.app",
  messagingSenderId: "463436938386",
  appId: "1:463436938386:web:6212165ecb5ea6ceb5ba4b",
};
// Google Analytics đếm mọi lượt truy cập (kể cả Khách): Firebase Console → Project settings → Integrations
// → Google Analytics → Enable; rồi lấy "Measurement ID" (dạng G-XXXXXXXXXX) ở Project settings → Your apps.
// Để null = không dùng Google Analytics.
const ANALYTICS_ID = null;
/* Ví dụ:
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "ten-du-an.firebaseapp.com",
  projectId: "ten-du-an",
  storageBucket: "ten-du-an.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
*/
