# HHH CRM Phase 2.9 – Phân công, KPI và đăng xuất

## Tính năng
- Nút Đăng xuất ở sidebar và thanh trên; gọi `supabase.auth.signOut()` và điều hướng về `login.html`.
- Gán nhân viên phụ trách khi tạo và chỉnh sửa khách hàng. Khách hàng cũ chưa có người phụ trách được gán về người tạo nếu có.
- Trang Phân công & KPI: bộ lọc 7 ngày / tháng / năm và nhân viên; tổng hợp khách đang phụ trách, tương tác, cuộc gọi, gặp khách, công việc và tỷ lệ hoàn thành.
- Phân quyền dữ liệu theo nhân viên ở các bảng customers, activities, care_tasks qua RLS. Admin xem toàn bộ; editor/viewer giới hạn theo khách được phân công hoặc tự tạo.

## Cập nhật
1. Sao lưu source đang chạy.
2. Giải nén source Phase 2.9, giữ nguyên `assets/js/supabase-config.js` hiện tại.
3. Chạy `sql/phase2_9_assignment_kpi.sql` sau migration Phase 2.8.
4. Deploy source lên Cloudflare Pages hoặc chạy Live Server.
5. Đăng nhập lại để tải hồ sơ vai trò và kiểm tra nút Đăng xuất.

## Định nghĩa KPI
- Khách phụ trách: tổng khách hàng có `assigned_to` bằng nhân viên.
- Tương tác/cuộc gọi/gặp khách: bảng `activities`, lọc theo `created_by` và `occurred_at` trong kỳ.
- Công việc/hoàn thành: bảng `care_tasks`, lọc theo `assigned_to` và `created_at` trong kỳ.
- Tỷ lệ hoàn thành = công việc completed / tổng công việc được tạo trong kỳ.

## Lưu ý quan trọng
- SQL thay thế RLS policies trên `customers`, `activities`, `care_tasks`; cần kiểm tra với dữ liệu thực tế trước khi mở rộng cho toàn bộ nhân viên.
- Các bảng nghiệp vụ khác (leads, opportunities, orders, complaints, notes, Storage) vẫn dùng policies hiện hữu; Phase 2.9 chưa áp dụng phân vùng theo nhân viên cho các bảng đó.
- `viewer` chỉ được đọc; `editor` được thêm/sửa dữ liệu trong phạm vi policy; xóa chỉ admin.
- Đây là code và migration đã kiểm tra cú pháp tĩnh; chưa thể xác nhận trên Supabase production của bạn.
