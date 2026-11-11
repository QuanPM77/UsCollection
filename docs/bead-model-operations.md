# Sử dụng mô hình GLB trong web

## Quản trị

1. Mở `/admin/beads` (Các loại hạt).
2. Tạo/lưu hạt nếu chưa có, sau đó chọn **Sửa**.
3. Trong **Mô hình 3D**, chọn bản gốc và bản web. Có thể chọn cùng file cho cả hai nếu file đã nhẹ.
4. Xoay xem mẫu trên dây, chỉnh chiều rộng và chiều chiếm chỗ theo dây. Chọn hướng lỗ trong hệ trục GLB: X trái–phải, Y trên–dưới, Z trước–sau.
5. Với mặt quạt, chọn **Mặt treo**, đặt tâm khoen bằng tọa độ lệch so với tâm mô hình và chỉnh góc xoay quanh dây. Dây xám trong xem trước giúp kiểm tra vị trí.
6. Chọn **Áp dụng mô hình mới**. Nút này lưu riêng mô hình; **Lưu thông tin hạt** lưu tên/giá/tồn kho.
7. Có thể chỉ **Lưu hướng và kích thước** mà không tải lại GLB. Mỗi lần lưu tạo phiên bản mới.
8. Dùng **Khôi phục** trong lịch sử hoặc **Dùng lại hạt cầu mặc định** nếu cần.

Bản gốc riêng tư ở `bead-model-originals`; bản phát hành ở `bead-models`. Không đưa service-role key vào frontend. File công khai dùng URL có phiên bản, không ghi đè. Bản upload chờ kiểm tra không thay bản đang sử dụng.

## Giới hạn của phiên bản này

- File gốc tối đa 50 MB, file web tối đa 8 MB; cảnh báo từ 1 MB hoặc 20.000 tam giác. Bộ kiểm tra hiện chấp nhận tối đa 250.000 tam giác kể cả bản gốc.
- Chỉ nhận GLB 2.0 tĩnh, tài nguyên nhúng, geometry chưa nén; không animation, skin, Draco/Meshopt trong bản đầu. Tối ưu giảm số mặt ngoại tuyến trước khi tải. Đây không phải dịch vụ tự giảm dung lượng.
- File trên 6 MB dùng TUS với tối đa ba lần thử lại, tiếp tục tại vị trí server đã nhận trong phiên hiện tại. Chưa khôi phục phiên tải sau khi đóng tab.
- Giữ vật liệu GLB. Chất liệu trong suốt phụ thuộc ánh sáng và thiết bị; cần thử trên điện thoại trước khi phát hành nhiều mẫu.
- Lỗ thẳng được xoay theo tiếp tuyến vòng; dây vòng vẫn là đường cong. Lỗ quá sát dây có thể cần tăng đường kính hoặc chỉnh tâm để không chạm thành lỗ.
- Chưa có tác vụ tự xóa upload bỏ dở. Không tự xóa các phiên bản đã phát hành vì thiết kế/đơn hàng có thể còn sử dụng.
- Thiết kế lưu mới và đơn hàng lưu tham chiếu phiên bản mô hình; giá và tồn kho vẫn được xác minh theo dữ liệu hiện hành.
- Chưa đo FPS trên thiết bị di động thực tế; không coi mức 30 FPS trong thiết kế là kết quả đã đo.

## Triển khai

Đã thêm migration `20261111000000_bead_models`. Các môi trường khác cần áp dụng migration và tạo lại Prisma Client trước khi chạy code mới:

```text
node node_modules/prisma/build/index.js migrate deploy
node node_modules/prisma/build/index.js generate
node node_modules/next/dist/bin/next build
```

Ứng dụng dùng `SUPABASE_URL` (hoặc `NEXT_PUBLIC_SUPABASE_URL`) và `SUPABASE_SERVICE_ROLE_KEY` trên server. Khi tải lần đầu, server tạo hai bucket nếu chưa có; nếu bucket tồn tại nhưng quyền không đúng, báo lỗi thay vì tự đổi quyền. Kho gốc private, kho web public.

Khởi động lại tiến trình web sau khi tạo lại Prisma Client. Build và thay đổi mã nguồn không tự triển khai lên hosting; dùng quy trình phát hành hiện có của dự án.

## Kiểm tra

```text
node --test tests/*.test.cjs
node tests/bead-models.storage.cjs
node tests/bead-models.integration.cjs
```

Hai kiểm tra cuối cần kết nối Supabase thật. Chúng tạo dữ liệu tạm có tên riêng và dọn dữ liệu do chính chúng tạo. Kiểm tra tích hợp dùng sản phẩm nháp, không sửa sản phẩm bán hàng.

Tài liệu Next.js trong `node_modules/next/dist/docs` không có trong bản cài hiện tại (Next 15.5.28). Đã đối chiếu Route Handlers của Next 15 tại https://nextjs.org/docs/15/app/api-reference/file-conventions/route.
