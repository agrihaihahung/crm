# HHH CRM – Phase 3.1: Quản lý khách hàng tiềm năng nâng cao

## Chức năng
- Tìm kiếm Lead theo tên, công ty, số điện thoại, email và nguồn.
- Lọc theo giai đoạn và nhân viên phụ trách.
- Chỉnh sửa thông tin, loại khách hàng, nguồn, địa bàn, giá trị tiềm năng và ghi chú.
- Điều chuyển người phụ trách (chỉ Admin) và lưu lý do bàn giao vào lịch sử.
- Chuyển giai đoạn: Mới, Đã liên hệ, Đủ điều kiện, Đã chuyển đổi, Không phù hợp.
- Ghi nhật ký cuộc gọi, gặp mặt, tin nhắn, email, thăm khách; đặt lịch nhắc tiếp theo.
- Chuyển Lead thành hồ sơ khách hàng chính thức, lưu liên kết `converted_customer_id`.
- Xem lịch sử tương tác theo từng Lead.

## Cập nhật
1. Sao lưu source Phase 3.0.
2. Chạy `sql/phase3_1_lead_management.sql` trong Supabase SQL Editor.
3. Thay source bằng thư mục trong ZIP.
4. Giữ nguyên `assets/js/supabase-config.js` của dự án đang dùng.
5. Mở Live Server, đăng nhập lại và vào Khách tiềm năng.

## Phạm vi và quyền
- Admin xem, chỉnh sửa, điều chuyển và xóa Lead qua RLS.
- Editor chỉ thao tác Lead mình được giao/tạo; không được điều chuyển sang nhân viên khác.
- Viewer chỉ đọc dữ liệu trong phạm vi RLS hiện có.
- Migration chỉ bổ sung cột và bảng `lead_interactions`; không xóa Lead, không sửa hoặc nhập lại bảng `customers`.
- Chuyển đổi Lead tạo một customer mới rồi cập nhật Lead thành `converted`. Nếu thao tác cập nhật Lead sau khi tạo customer thất bại, cần kiểm tra để tránh hồ sơ khách hàng bị tạo mà Lead chưa đổi trạng thái.

## Kiểm thử
JavaScript được kiểm tra cú pháp tĩnh bằng `node --check`. Chưa chạy migration trên Supabase thật; cần kiểm tra các policy theo tài khoản Admin/Editor/Viewer sau khi chạy SQL.
