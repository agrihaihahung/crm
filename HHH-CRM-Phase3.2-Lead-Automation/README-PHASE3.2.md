# HHH CRM – Phase 3.2: Tự động hóa phát triển khách hàng tiềm năng

## Chức năng
- Khu vực Trợ lý phát triển khách hàng trong trang Khách tiềm năng.
- Danh sách Lead đến hạn/quá hạn chăm sóc dựa trên `next_follow_up_at`.
- Danh sách lịch chăm sóc sắp tới.
- Cảnh báo Lead chưa từng liên hệ hoặc hơn 7 ngày chưa tương tác, dựa trên `last_contacted_at`.
- Chấm điểm Lead theo quy tắc minh bạch: độ đầy đủ liên hệ, thông tin doanh nghiệp/địa bàn, giá trị dự kiến, giai đoạn và tương tác gần đây. Điểm 0–100 là gợi ý hỗ trợ ưu tiên, không phải dự báo AI.
- Admin có thể chấm điểm hàng loạt.
- Admin có thể phân phối Lead chưa có người phụ trách: ưu tiên nhân viên Editor được giao địa bàn trùng tỉnh/xã; nếu không khớp, phân phối cân bằng theo số Lead đang phụ trách.
- Mỗi lần phân phối tự động ghi nhật ký `transfer` vào `lead_interactions`.
- Báo cáo số lượng và tỷ lệ theo giai đoạn; xuất CSV.

## Cài đặt
1. Sao lưu source Phase 3.1.
2. Supabase → SQL Editor → chạy `sql/phase3_2_lead_automation.sql`.
3. Thay source bằng nội dung ZIP Phase 3.2.
4. Giữ nguyên `assets/js/supabase-config.js`.
5. Mở bằng Live Server, đăng nhập lại và vào Khách tiềm năng.

## Phạm vi và giới hạn
- Migration chỉ thêm `lead_score`, `lead_score_updated_at` và index vào `leads`; không xóa/sửa hồ sơ khách hàng hay Lead hiện tại.
- Quyền dữ liệu vẫn dựa trên RLS Phase 3.1. Chỉ Admin được chạy chấm điểm hàng loạt và phân phối tự động trên giao diện.
- Phân phối tự động dùng các địa bàn đang hoạt động trong `market_territories`; nếu không tìm thấy địa bàn phù hợp, hệ thống chọn Editor có số Lead được tải/đếm thấp nhất. Do RLS, thống kê tải công việc của tài khoản không phải Admin có thể không đầy đủ; tính năng chỉ cho Admin chạy.
- Nhắc chăm sóc là nhắc trong CRM khi người dùng mở trang; chưa gửi email, SMS, Zalo, push notification hay chạy tác vụ nền khi trình duyệt đóng.
- Tỷ lệ chuyển đổi được tính trên tập Lead mà tài khoản hiện tại được phép đọc theo RLS, không phải luôn là toàn hệ thống.
- Không thay đổi quy trình chuyển Lead thành customer ở Phase 3.1.

## Kiểm tra
- `node --check app.js`
- `node --check assets/js/data.js`
- Chưa chạy migration trên Supabase thật hoặc kiểm thử E2E bằng tài khoản của khách hàng. Cần kiểm tra Admin/Editor/Viewer sau khi chạy SQL.
