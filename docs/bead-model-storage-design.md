# Thiết kế quản lý mô hình hạt GLB

Ngày: 11/11/2026. Trạng thái: đề xuất thiết kế, chưa triển khai hoặc thay đổi dữ liệu đang chạy.

## Quyết định đề xuất

Dùng Supabase Storage hiện có. Giữ file gốc riêng tư và phân phối bản đã tối ưu cho web. Thêm mục “Mô hình 3D” trong màn hình sửa sản phẩm hiện tại; chưa cần tạo một hệ thống quản lý độc lập.

Không lưu dữ liệu nhị phân GLB trong Postgres. Không đưa thư viện GLB nặng vào Git. Cơ sở dữ liệu chỉ giữ đường dẫn đối tượng, phiên bản và thông số hiển thị.

## Luồng quản trị

1. Mở sản phẩm → Mô hình 3D → Tải bản gốc.
2. Hiển thị tiến độ, cho phép thử lại khi mạng ngắt; bản đang bán vẫn hoạt động.
3. Tải thêm bản tối ưu dùng trên web. Giai đoạn đầu tối ưu ngoại tuyến; giao diện không giả báo đang tự động tối ưu.
4. Kiểm tra file và xem trước với cùng ánh sáng, chất liệu, đơn vị và bộ đọc mô hình của trang thiết kế vòng.
5. Nhập kích thước rộng/cao/dày bằng mm, chọn hướng lỗ xỏ, điều chỉnh tâm lỗ, thử đặt lên một đoạn dây.
6. So sánh bản mới với bản đang dùng → Áp dụng. Có thể quay về phiên bản trước.

Trong thẻ “Mô hình 3D” có vùng kéo thả file, ảnh xem trước có thể xoay, thông tin dung lượng, kích thước, lựa chọn “Hạt xỏ dây / Mặt treo”, nút “Thử trên dây”, “Lưu bản nháp”, “Áp dụng”. Trạng thái hiển thị: Chưa có / Đang tải / Đang kiểm tra / Sẵn sàng / Đang sử dụng / Cần sửa. Lỗi phải chỉ ra file hoặc bước cần sửa; không thay mô hình đang hoạt động bằng bản lỗi.

## Lưu trữ và quyền truy cập

| Kho | Nội dung | Quyền đọc |
|---|---|---|
| bead-model-originals | GLB gốc, bản tải dở/chờ kiểm tra | Riêng tư; quản trị truy cập có thời hạn |
| bead-models | GLB đã kiểm tra và được phát hành | Công khai để web khách tải |
| product-images hiện có | Ảnh xem trước WebP | Theo cơ chế ảnh hiện có |

Đường dẫn đề xuất: `{productId}/{assetId}/{version}/model.glb`. Mỗi lần cập nhật tạo đường dẫn mới, không ghi đè file có cache dài hạn. Chỉ công bố bản web khi đã xác minh file; bản nháp chưa xuất bản ở kho riêng tư.

Server xác thực phiên quản trị của ứng dụng trước khi cấp quyền tải lên một đường dẫn cụ thể. Trình duyệt tải trực tiếp vào Storage, tránh chuyển toàn bộ file qua API Next.js. Không đưa service-role key ra trình duyệt. Ứng dụng hiện có phiên đăng nhập riêng, không mặc định phiên đó tương đương Supabase Auth.

File lớn dùng upload có thể tiếp tục khi mạng ngắt; Supabase khuyến nghị cách này cho file trên 6 MB. Giới hạn đầu vào đề xuất của ứng dụng: 50 MB, vẫn phải kiểm tra giới hạn thực tế của bucket và gói đang dùng.

GLB công khai có thể được khách tải về; chỉ file gốc riêng tư được giữ kín. Không coi URL có thời hạn là biện pháp chống sao chép mô hình đã hiển thị trên trình duyệt.

## Dữ liệu đề xuất

Bảng `product_model_assets`:

- `id`, `product_id`, `version`, `status`, `created_by`, `created_at`.
- `original_path`, `web_path`, `preview_path`, `checksum`.
- `original_bytes`, `web_bytes`, `triangle_count`, `validation_report`.
- `width_mm`, `height_mm`, `depth_mm`, `spacing_mm`.
- `attachment_type`: bead hoặc pendant.
- `hole_center`: tọa độ tâm lỗ; `hole_axis`: vector hướng lỗ; `hole_diameter_mm`.
- `rotation`: hướng hiệu chỉnh; `scale`: hệ số thống nhất; `material_mode`: giữ vật liệu gốc hoặc tùy chỉnh có chủ ý.

`bead_product_details.active_model_asset_id` trỏ tới phiên bản đang sử dụng, có thể rỗng để dùng hình cầu cũ. Dữ liệu thiết kế đã lưu cần giữ asset ID/phiên bản cùng cấu hình biến đổi để không đổi diện mạo ngoài ý muốn khi catalog cập nhật. Đơn hàng giữ thông tin tham chiếu phiên bản trong dữ liệu chi tiết.

Chỉ đổi con trỏ phiên bản hiện hành sau khi upload và kiểm tra thành công. Không xóa file đang được sản phẩm, thiết kế hoặc đơn hàng tham chiếu. Tác vụ dọn rác chỉ xóa upload bỏ dở/bản chưa tham chiếu sau thời gian lưu đã cấu hình.

## Tối ưu và hiển thị

Mục tiêu ban đầu, không phải cam kết mọi mẫu đều đạt:

| Loại | Mục tiêu dung lượng web | Mức chi tiết tham khảo |
|---|---|---|
| Hạt đơn giản | 100–300 KB | 2.000–8.000 tam giác |
| Mèo, quạt, mặt treo chi tiết | 300–800 KB | 8.000–20.000 tam giác |
| Trên 1 MB | Cảnh báo để xem xét | Kiểm tra trên điện thoại trước khi phát hành |

Giảm số mặt trước, giữ đường biên, cạnh pha lê và mặt trong lỗ. Thử nén Meshopt sau đó, chỉ xuất khi bộ đọc web đã hỗ trợ decoder tương ứng. Không kỳ vọng nén file tự giảm chi phí vẽ GPU. Nếu có texture, đánh giá giảm kích thước/nén riêng; các mô hình chỉ dùng màu vật liệu không cần bổ sung texture.

Kiểm tra GLB header, dung lượng, cấu trúc, tài nguyên nhúng, độ hữu hạn của tọa độ và giới hạn mesh/material/texture. Không chấp nhận đường dẫn tài nguyên ngoài tùy ý. Mô hình hạt đặc có lỗ cần kiểm tra hướng mặt, hình học kín và tiết diện lỗ sau tối ưu. Lỗi parser/decoder phải cô lập, không làm hỏng trang quản trị hay cả vòng.

Danh sách sản phẩm hiển thị ảnh; chỉ tải mô hình của mẫu đang xem hoặc đã chọn lên vòng. Nhiều hạt cùng mẫu dùng chung dữ liệu hình học và vật liệu; mỗi hạt có biến đổi riêng. Không tải lại GLB theo từng hạt, không dùng chung một đối tượng scene có một parent. Có cache giới hạn và cơ chế giải phóng tài nguyên khi không còn sử dụng.

Giữ vật liệu GLB, đặc biệt transmission của pha lê và metallic của kim loại; không ghi đè toàn bộ bằng vật liệu hình cầu cũ. Xem trước dưới môi trường sáng trung tính, rồi kiểm tra cả theme tối. Chất liệu trong suốt cần kiểm tra trực tiếp trên điện thoại, không hứa khớp tuyệt đối ảnh render Blender.

Chuẩn file: đơn vị mét, +Y hướng lên, mặt chính +Z. Với hạt xỏ dây, chuẩn hóa lỗ theo +X hoặc lưu phép hiệu chỉnh từ file gốc. Đặt tâm lỗ lên dây, xoay trục lỗ theo tiếp tuyến vòng. `spacing_mm` là chiều chiếm chỗ theo dây, không lấy đường kính cầu hoặc chiều cao tai mèo. Với mặt quạt treo, điểm gắn là khoen treo, không phải tâm hình học. Dây vòng cong qua lỗ thẳng có thể cần chỉnh đường dây cục bộ hoặc tăng khe hở để tránh xuyên thành lỗ.

## Điểm tích hợp trong dự án

- `lib/supabase-storage.ts`: mở rộng cơ chế kho file, đường dẫn có phiên bản và quyền upload quản trị.
- `prisma/schema.prisma`: thêm bảng asset và tham chiếu phiên bản hiện hành; migration cần giữ chính sách truy cập hiện có.
- Màn hình sản phẩm đang sử dụng: thêm thẻ mô hình, không tách catalog thứ hai. Dự án có nhiều đường quản trị sản phẩm, cần xác nhận luồng đang dùng khi thực hiện.
- API quản trị: cấp upload → xác nhận/kiểm tra → phát hành. Mỗi bước ràng buộc đúng sản phẩm và asset của phiên tải.
- `types`, `lib/store` và API catalog: truyền thông tin mô hình xuống giao diện.
- `components/3d/BeadMesh.tsx`: render GLB khi có, dùng hình cầu khi chưa có hoặc tải lỗi; giữ tương tác chọn/xóa hiện tại.
- `components/3d/BraceletCanvas.tsx`, `lib/braceletMath`: bổ sung hướng đặt hạt, kích thước theo dây và điểm treo charm.

## Triển khai theo giai đoạn

**Giai đoạn 1 — ba mẫu thử:** mèo đỏ, pha lê hồng, quạt. Tối ưu ngoại tuyến; upload bản gốc và bản web; chỉnh hướng/kích thước; xem trước trên dây; kiểm tra trên điện thoại. Chưa xây máy chủ tự động tối ưu.

**Giai đoạn 2 — vận hành catalog:** phiên bản, quay lại bản trước, lưu tham chiếu trong thiết kế, thống kê dung lượng, dọn file không dùng.

**Giai đoạn 3 — khi số mẫu và lượt tải tăng:** hàng đợi tối ưu tự động, mức chi tiết thấp cho điện thoại, so sánh chi phí lưu trữ và băng thông thực tế trước khi chuyển nhà cung cấp.

Điều kiện nghiệm thu giai đoạn 1: upload lỗi không thay bản cũ; tài khoản thường không được tải lên/phát hành; file lỗi không phá trang; 20–30 hạt gồm mẫu lặp chỉ tải một bản cho mỗi mẫu; lỗ hướng theo dây; vật liệu pha lê và kim loại giữ khác biệt; không làm mất chức năng hạt cầu cũ. Mục tiêu thử nghiệm: ít nhất 30 FPS trên điện thoại thử đã ghi rõ cấu hình, đo với cả cảnh nhiều hạt trong suốt.

## Ước lượng dung lượng minh họa

200 mẫu × 5 MB gốc = khoảng 1 GB. 200 mẫu × 0,5 MB web = khoảng 100 MB. Tổng khoảng 1,1 GB, chưa gồm ảnh và phiên bản cũ.

10.000 lượt dùng × 10 mẫu khác nhau × 0,5 MB ≈ 50 GB dữ liệu tải trước khi tính cache, chưa gồm phần khác của web. Đây là giả định để lập kế hoạch, không phải số đo hoặc báo giá. Theo dõi cả dung lượng lưu, dữ liệu tải ra và tốc độ khung hình.

## Nguồn chính thức

- Supabase resumable uploads: https://supabase.com/docs/guides/storage/uploads/resumable-uploads
- Quyền public/private của bucket: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Phân quyền Storage: https://supabase.com/docs/guides/storage/security/access-control

Đề xuất chốt: dùng Supabase hiện có, giữ bản gốc riêng tư, phục vụ bản web tối ưu và thực hiện giai đoạn 1 trước. Chưa cần thêm nhà cung cấp hoặc hệ thống tự động xử lý file khi chưa có số liệu tải thực tế.
