# HHH CRM Phase 2.9.3 – Bản đồ phân vùng khách hàng

## Chức năng
- Bộ lọc phân cấp: Khu vực → Tỉnh/Thành phố → Xã/Phường.
- Thống kê số khách hàng ở từng cấp; số lượng được tính trên toàn bộ hồ sơ khách hàng, kể cả hồ sơ chưa có tọa độ.
- Bản đồ Leaflet chỉ hiển thị marker của khách hàng đã có `location_lat` và `location_lng` theo khu vực đang lọc.
- Danh sách khách hàng trong khu vực cho biết hồ sơ nào đã/chưa có định vị.
- Có thể nhấn vào từng dòng thống kê để lọc nhanh.
- Form thêm/sửa khách hàng có các trường Khu vực, Tỉnh/Thành phố, Xã/Phường.

## Cập nhật database
Chạy `sql/phase2_9_3_customer_geography.sql` trong Supabase SQL Editor. Migration chỉ thêm 2 cột `region`, `ward` và index; không xóa hoặc sửa dữ liệu khách hàng hiện có.

## Cách sử dụng
1. Chạy SQL migration.
2. Thay source bằng bản Phase 2.9.3, giữ nguyên `assets/js/supabase-config.js`.
3. Mở Phân tích khách hàng → Bản đồ khách hàng nhôm kính.
4. Cập nhật hồ sơ khách hàng cũ để điền Khu vực, Tỉnh/Thành phố, Xã/Phường. Dữ liệu cũ chưa có cột xã/phường nên sẽ hiển thị ở nhóm "Chưa có xã/phường" cho đến khi được bổ sung.
5. Để có marker trên bản đồ, hồ sơ cần có link Google Maps được parse ra tọa độ.

## Quy ước
- Khu vực hiện dùng 3 lựa chọn: Miền Bắc, Miền Trung, Miền Nam; đây là vùng kinh doanh để phân tích, không phải đơn vị hành chính.
- Tỉnh/Thành phố và Xã/Phường là trường nhập liệu, không tự suy đoán từ địa chỉ cũ.
- Thống kê số lượng tính cả khách hàng chưa có tọa độ; marker chỉ có với hồ sơ có tọa độ.
- Không thay đổi schema phân quyền hoặc RLS hiện tại.
