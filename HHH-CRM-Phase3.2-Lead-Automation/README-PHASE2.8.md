# HHH CRM - Phase 2.8: Quản lý nhân viên & phân quyền

## Nội dung
- Thêm trang Nhân viên & phân quyền, chỉ hiển thị cho tài khoản admin.
- Xem danh sách hồ sơ nhân viên trong `public.profiles`.
- Admin thay đổi vai trò `admin`, `editor`, `viewer` và trạng thái hoạt động.
- Thao tác thay đổi vai trò/trạng thái đi qua RPC `hhh_admin_update_user_access`, không cho cập nhật trực tiếp cột role/is_active từ trình duyệt.
- Không thay đổi dữ liệu khách hàng hiện có.

## Cập nhật
1. Sao lưu source đang chạy.
2. Giải nén source Phase 2.8 và giữ nguyên `assets/js/supabase-config.js` của dự án nếu đã cấu hình URL/key riêng.
3. Supabase SQL Editor: chạy `sql/phase2_8_staff_permissions.sql`.
4. Trong SQL Editor, thay email và chạy câu lệnh nâng tài khoản quản trị đầu tiên:
   ```sql
   update public.profiles set role='admin' where email='EMAIL_ADMIN_CUA_BAN';
   ```
5. Đăng xuất/đăng nhập lại tài khoản admin, mở mục **Nhân viên & phân quyền**.

## Tạo tài khoản nhân viên mới
Tạo user trong Supabase Dashboard > Authentication > Users > Add user. Hồ sơ tương ứng cần được tạo trong `public.profiles` (nếu dự án chưa có trigger tạo profile). Sau đó admin có thể đổi vai trò trên trang CRM.

## Vai trò
- Admin: quản trị nhân viên; quyền dữ liệu phụ thuộc RLS các bảng nghiệp vụ đã triển khai.
- Editor: xem, thêm, sửa theo policy nghiệp vụ; không được xóa nếu policy đã được áp dụng.
- Viewer: chỉ xem theo policy nghiệp vụ.

## Lưu ý
- SQL này quản lý vai trò và trạng thái profile; nó không tự thay thế toàn bộ RLS policy trên từng bảng CRM. Hãy chạy/kiểm tra migration RLS nghiệp vụ riêng đã dùng trong dự án.
- Khóa `is_active=false` sẽ làm tài khoản không còn được hàm `hhh_current_role()` công nhận; trang CRM cũng chuyển tài khoản không hoạt động về trang đăng nhập khi tải lại.
- Chưa hỗ trợ gửi lời mời/tạo user từ trình duyệt. Việc tạo user phải thực hiện qua Supabase Dashboard hoặc backend an toàn dùng Admin API; tuyệt đối không dùng service_role key trong frontend.
- Tự thay đổi role/trạng thái của tài khoản admin đang đăng nhập bị chặn để tránh tự khóa quyền quản trị.
