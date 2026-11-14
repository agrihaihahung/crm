# HHH CRM Phase 2.9.4 – Sửa bản đồ khách hàng

## Nội dung sửa
- Thêm CDN dự phòng cho thư viện Leaflet: nếu unpkg không tải được, trình duyệt thử jsDelivr.
- Bổ sung CSS Leaflet dự phòng từ cdnjs.
- Đặt chiều cao bản đồ rõ ràng 290px, gọi `invalidateSize()` sau khi render để tránh khung bản đồ trắng/xám.
- Nếu không tải được thư viện, hiển thị thông báo lỗi thay vì khung trống.
- Nếu tile OpenStreetMap lỗi, tự thử lớp nền CARTO.
- Giữ nguyên bộ lọc khu vực/tỉnh/xã, dữ liệu Supabase, logo, sidebar và các module khác.

## Cập nhật
1. Sao lưu source đang dùng.
2. Giải nén source Phase 2.9.4 và giữ nguyên `assets/js/supabase-config.js` của dự án.
3. Không cần chạy SQL mới.
4. Mở lại trang bằng Live Server và nhấn Ctrl+F5.

## Lưu ý
Bản đồ cần kết nối Internet để tải thư viện Leaflet và các tile bản đồ. Bản sửa có CDN/tile dự phòng nhưng không thể bảo đảm hiển thị nếu mạng hoặc chính sách mạng chặn tất cả các nhà cung cấp bản đồ.
