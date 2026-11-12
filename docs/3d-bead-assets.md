# Thêm hạt và chỉnh model 3D

## Luồng thao tác

1. Trong Admin → Các loại hạt, chọn Thêm hạt.
2. Nhập thông tin sản phẩm và chọn GLB ngay trong form. File tối đa 8 MB dùng trực tiếp cho bản gốc và bản web. File gốc lớn hơn cần chọn thêm bản web tối ưu; giới hạn bản gốc 50 MB.
3. Chọn Di chuyển lỗ để kéo mũi tên hoặc mặt phẳng; chọn Xoay hướng lỗ để kéo vòng xoay. Chọn trên bề mặt đặt tâm ban đầu, sau đó chỉnh độ sâu bằng tay nắm.
4. Có góc nhìn Trước/Bên/Trên, chế độ trong suốt, căn bước 0,1 mm / 5°, Hoàn tác, Làm lại và Đặt lại tâm/hướng.
5. Chọn Hạt xỏ dây hoặc Mặt treo. Xem thử trên vòng dùng cùng phép biến đổi với thiết kế của khách.
6. Bấm Lưu hạt một lần. Hạt có model mới chỉ chuyển từ bản nháp sang hoạt động khi model đã được lưu. Nếu upload thất bại, giữ form và bấm Lưu hạt để thử lại; không tạo thêm hạt trong lần thử lại đã nhận được mã bản nháp.

Điểm gắn là vị trí và hướng dây trong phần mềm, không thay đổi hình học hoặc đục lỗ trong GLB. Với mặt treo, đặt tâm tại khoen thực tế.

## Hình đại diện

Ảnh nhỏ được tạo từ model lúc lưu, có thể thay bằng ảnh sản phẩm PNG/JPEG/WebP trong mục Ảnh đại diện. Ảnh được thu về 256 × 256 và lưu cùng phiên bản model. Ảnh sản phẩm đã chọn được giữ khi chỉnh hướng; chọn Dùng ảnh từ model để quay lại ảnh dựng tự động.

Danh sách Admin, bảng chọn hạt, chi tiết vòng và checkout đọc thumbnail từ model của chính hạt đó. Không tự tra model/texture theo SKU trong `lib/beadVisuals.ts` nữa. Những file mẫu cũ vẫn được giữ để người quản lý tự quyết định sử dụng hay xóa; không tự xóa hoặc ẩn dữ liệu sản phẩm.

## Dữ liệu và tương thích

- `model_3d.anchorRotation`: quaternion chuẩn hóa [x, y, z, w] mô tả hệ trục điểm gắn; X theo dây, Z là mặt trước.
- `holeCenter`: tâm điểm gắn so với tâm bounding box, tính bằng mm sau khi đổi kích thước.
- Model cũ thiếu quaternion vẫn dùng `holeAxis` và `rollDegrees`.
- `attachment` quyết định mặt trước hướng lên (hạt) hoặc ra ngoài vòng (mặt treo).
- `thumbnail` là ảnh raster data URL có giới hạn; `thumbnailSource` phân biệt ảnh dựng và ảnh sản phẩm.
- Các trường mới nằm trong JSON hiện có, không cần thay đổi schema cho lần cập nhật này. Database vẫn cần các bảng model asset của tính năng upload trước đó.

## Kiểm tra

- `node node_modules/typescript/bin/tsc --noEmit --incremental false`
- `npm run lint`
- `node --test tests/*.test.cjs`
- `node tests/bead-editor.browser.cjs`: kiểm tra giao diện/WebGL bằng Chrome headless với API giả lập cục bộ; không ghi vào database hay kho lưu trữ thật. Có thể đặt `QA_BROWSER` thành đường dẫn Edge/Chrome và `QA_TEMP` thành thư mục tạm không chứa dấu `!`.
