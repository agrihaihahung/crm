# HHH CRM Phase 3.0 – Quản lý thị trường theo địa bàn

## Mục tiêu
Mở rộng Phase 2.9.4 bằng các nghiệp vụ quản lý địa bàn, giao nhân viên phụ trách, lập kế hoạch đi thị trường và ghi nhận kết quả khảo sát. Giữ nguyên các module hiện có và bản đồ Leaflet/OpenStreetMap.

## Chức năng
- Menu mới **Quản lý thị trường**.
- Dashboard số địa bàn đang khai thác, khách hàng đã phân công, lượt đi thị trường và kế hoạch chưa hoàn thành.
- Thống kê khách hàng theo tỉnh/thành từ `public.customers` hiện có.
- Admin giao địa bàn theo khu vực, tỉnh/thành và tùy chọn xã/phường; gán một nhân viên phụ trách chính và mục tiêu khách hàng.
- Admin/Editor lập kế hoạch đi thị trường; Editor chỉ được lập kế hoạch cho chính mình.
- Ghi nhật ký thăm khách, tìm khách mới, khảo sát địa bàn hoặc gặp đối tác.
- Theo dõi trạng thái kế hoạch và lọc nhật ký theo 7 ngày, tháng, năm.
- Admin tải mẫu CSV và import CSV/XLSX để cập nhật khu vực, tỉnh/thành, xã/phường, địa chỉ và link Google Maps cho hồ sơ khách hàng.

## Import địa lý an toàn
- Chỉ Admin thấy chức năng import.
- Đối chiếu khách hàng bằng số điện thoại đã chuẩn hóa; chỉ cập nhật khi tìm được đúng một hồ sơ.
- Dòng không khớp hoặc có số điện thoại trùng sẽ được bỏ qua.
- Có hộp xác nhận trước khi cập nhật.
- Không tạo/xóa khách hàng; không thay đổi mã, tên, đơn hàng hay hoạt động.
- Thư viện SheetJS đọc `.xlsx/.xls` tải từ CDN; CSV được đọc trực tiếp.

## Phân quyền
- `admin`: xem và quản lý toàn bộ địa bàn, kế hoạch, nhật ký; giao địa bàn và import địa lý.
- `editor`: xem địa bàn được giao; lập kế hoạch/ghi nhật ký của chính mình và cập nhật trạng thái kế hoạch do mình tạo.
- `viewer`: chỉ xem địa bàn/kế hoạch/nhật ký thuộc phạm vi được RLS cho phép.
- RLS là lớp bảo vệ thật tại Supabase; giao diện chỉ ẩn các nút không được phép.

## Cập nhật
1. Sao lưu source Phase 2.9.4.
2. Chạy `sql/phase3_0_market_management.sql` trong Supabase SQL Editor.
3. Giải nén Phase 3.0 và thay source ứng dụng.
4. Giữ nguyên `assets/js/supabase-config.js` đang dùng.
5. Mở Live Server, đăng nhập Admin và vào **Quản lý thị trường**.

## Lưu ý
- Migration chỉ tạo 3 bảng mới: `market_territories`, `market_plans`, `market_visits`; không xóa/sửa hàng loạt dữ liệu khách hàng hiện có.
- Thống kê thị trường phụ thuộc mức độ đầy đủ của `region`, `province`, `ward` trong hồ sơ khách hàng.
- Import chạy từng hồ sơ theo thứ tự; nếu kết nối bị gián đoạn giữa chừng, một phần hồ sơ có thể đã cập nhật. Có thể chạy lại file vì chỉ cập nhật các hồ sơ khớp duy nhất.
- Chưa có định tuyến GPS trực tiếp, theo dõi vị trí nhân viên, tối ưu tuyến đường tự động hoặc gửi thông báo nền.
- Đã kiểm tra cú pháp JavaScript bằng `node --check`; chưa chạy migration trên Supabase thật và chưa xác nhận RLS/runtime trên tài khoản của người dùng.
