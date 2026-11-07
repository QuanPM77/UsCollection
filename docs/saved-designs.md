# Thiết kế của tôi

Khách lưu vòng từ màn hình `/customizer` qua popup đặt tên. Mục `/my-designs` và menu chính cho phép xem lại, đổi tên, xóa và mở mẫu trong 3D. Không có chức năng nhân bản. Khi đã sửa cấu hình mẫu, khách có thể lưu thay đổi hoặc lưu thành mẫu mới.

## Cập nhật cơ sở dữ liệu

Tính năng cần bảng `saved_designs`. Cấu hình `DATABASE_URL` và `DIRECT_URL` cho môi trường cần chạy, kiểm tra các migration đang chờ, rồi áp dụng migration bằng quy trình triển khai của dự án:

```sh
node node_modules/prisma/build/index.js migrate status
node node_modules/prisma/build/index.js migrate deploy
node node_modules/prisma/build/index.js generate
```

Migration mới: `prisma/migrations/20261107000000_saved_designs/migration.sql`. Bảng bật RLS, chỉ API phía máy chủ truy cập qua Prisma. Mỗi thao tác kiểm tra tài khoản và chủ sở hữu. Không cấp quyền truy cập bảng trực tiếp từ trình duyệt.

## Kiểm tra thủ công sau khi cấu hình cơ sở dữ liệu

1. Đăng nhập, đặt các hạt khác nhau, lưu và đặt tên qua popup.
2. Mở Thiết kế của tôi, chọn mẫu và kiểm tra kích thước, loại hạt, thứ tự hạt trên mô hình 3D.
3. Sửa mẫu: lưu thay đổi cập nhật mẫu hiện tại; lưu thành mẫu mới tạo mẫu riêng.
4. Kiểm tra đổi tên, xóa, tải lại trang và đăng nhập trên thiết bị khác.
5. Kiểm tra nhắc thay thế bản nháp chưa lưu và quyền truy cập giữa hai tài khoản.
6. Đặt hàng từ màn hình 3D theo luồng thanh toán hiện có; giá và tồn kho được kiểm tra lại khi thanh toán.

Ảnh xem trước trong danh sách được dựng từ cấu hình hạt bằng SVG; khi chọn mẫu, hệ thống mở mô hình 3D tương tác.

## Cập nhật độ ổn định và hiệu năng

Bộ sưu tập tải từng đợt 12 mẫu. Máy chủ dùng giao dịch để không tạo thêm mẫu có cùng chu vi và thứ tự hạt khi gửi lặp; trả lại mẫu đã có. Đổi tên không ghi lại cấu hình. Khi sửa, thời điểm cập nhật được kiểm tra để ngăn tab cũ ghi đè dữ liệu mới. Chi tiết kiểm thử và đánh giá thanh toán xem `performance-payment-review.md`.
