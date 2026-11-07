# Kiểm tra hiệu năng và thanh toán — 07/11/2026

## Phạm vi và kết quả

Đã chạy bản dựng production toàn dự án (60 trang được xử lý), TypeScript, ESLint, 36 kiểm thử tự động; kiểm tra HTTP các trang chính và kiểm thử lưu thiết kế trên cơ sở dữ liệu thật với tài khoản tạm được xóa sau khi hoàn thành. Không tạo giao dịch PayOS hoặc thu tiền thật. Đây không phải kiểm thử mọi tương tác trình duyệt hoặc kiểm toán bảo mật đầy đủ.

Next.js cài đặt là 15.5.28; thư mục hướng dẫn `node_modules/next/dist/docs` không có trong bản cài này. Các thay đổi bám theo cấu trúc đang dùng và được xác nhận bằng bản dựng.

## Các tối ưu đã thực hiện

- Thiết kế: giới hạn 12 mẫu mỗi đợt, tải thêm theo con trỏ; kết quả tải cũ không ghi đè kết quả mới; đổi tên cập nhật tại chỗ, không tải lại toàn bộ danh sách.
- Chống lưu lặp: khóa giao dịch theo tài khoản, đối chiếu chu vi và thứ tự hạt. Yêu cầu tạo mẫu giống hệt trả lại mẫu đã có kể cả khi khác tên. Không tự xóa mẫu trùng cũ. Sửa thành cấu hình đã tồn tại sẽ báo xung đột.
- Chống ghi đè: kiểm tra thời điểm cập nhật mẫu; tab cũ không ghi đè mẫu vừa được sửa. Đổi tên chỉ cập nhật tên. Yêu cầu quá 20 giây hiện thông báo để thử lại; máy chủ vẫn chống tạo trùng khi yêu cầu trước đã hoàn thành.
- 3D: các hạt không đăng ký theo dõi toàn bộ trạng thái ứng dụng; ghi nhớ tính toán vị trí hạt; tải trước mã 3D lúc rảnh khi đang xem bộ sưu tập, có xét mạng chậm và chế độ tiết kiệm dữ liệu.
- Chat: không gọi đồng thời cả tóm tắt và hội thoại khi đã mở; không gọi chồng khi mạng chậm; tạm dừng cập nhật nền khi tab ẩn/offline; hủy yêu cầu khi rời thành phần.
- Ảnh sản phẩm: dùng kích thước ảnh đáp ứng cho trang mua hàng, chi tiết, yêu thích và trang chủ. Ảnh chính chi tiết được ưu tiên. Giữ tương thích với URL ảnh bên ngoài chưa nằm trong nguồn tối ưu.
- Dữ liệu: truy vấn sản phẩm và đánh giá chạy đồng thời; danh mục hạt và số lượng đang giữ chỗ chạy đồng thời. Không cache giá hay số lượng tồn kho lâu dài.

## Đo thực tế

Máy Windows hiện tại, Next.js production cổng 3107, cơ sở dữ liệu Supabase thật. Không có phiên đăng nhập trong các phép đo HTTP; thời gian tính đến khi tải xong phản hồi. Mỗi đường dẫn đo 3 lần, bảng dưới ghi hai lượt sau lượt đầu. Đây là mẫu đo nhỏ, có biến động mạng; không phải LCP, FPS hoặc cam kết tốc độ ở production.

| Đường dẫn | Trước tối ưu truy vấn | Sau tối ưu truy vấn |
|---|---|---|
| `/buy` | 1070 / 1072 ms | 521 / 519 ms |
| `/api/bead-types` | 1910 / 1582 ms | 712 / 671 ms |

Ở lượt kiểm tra trước tối ưu truy vấn, phần HTML `/customizer` mất 17–22 ms, `/my-designs` 13–16 ms; các số này không bao gồm tải mô hình, HDRI và dữ liệu sau khi trang mở. API bộ sưu tập với xác thực giả lập trong kiểm thử DB: 1126 ms cho trang đầu 12 mẫu. Ảnh sản phẩm được kiểm tra qua bộ tối ưu trả HTTP 200, 41.327 byte. Chưa đo giảm dung lượng so với ảnh gốc.

Mã tải đầu theo build: `/` khoảng 118 kB, `/buy` 117 kB, `/customizer` 125 kB, `/my-designs` 120 kB, `/checkout` 143 kB. Các gói 3D tải động không được tính là toàn bộ chi phí tải cảnh 3D trong số liệu này.

## Kiểm thử lưu thiết kế

`node --test tests/*.test.cjs`: 36/36 đạt.

`node --env-file=.env tests/saved-designs.integration.cjs`: sáu POST đồng thời chỉ tạo một bản ghi; đổi tên giữ nguyên cấu hình; bản sửa cũ nhận 409; 15 mẫu phân thành 12 và 3, không lặp mẫu. Tài khoản và mẫu thử được dọn trong finally. Bài kiểm thử tích hợp này ghi dữ liệu tạm vào DB, chỉ chạy khi có quyền kiểm thử môi trường đó.

## Thanh toán: điểm phù hợp

- Tính giá bằng dữ liệu máy chủ, kiểm tra hạt/sản phẩm còn bán, kích thước và số lượng.
- Khóa tài khoản/sản phẩm khi tạo đơn; trừ số lượng đang giữ chỗ trong cửa sổ 15 phút để hạn chế bán vượt tồn.
- Giữ bản cấu hình và chi tiết giá tại thời điểm đặt trong đơn hàng.
- Webhook kiểm tra chữ ký qua SDK; đối chiếu mã đơn/số tiền trước xử lý.
- Khi ghi nhận tiền, khóa đơn và kiểm tra trạng thái paid để tránh trừ kho hai lần; có cờ cần xử lý tồn kho khi nhận tiền nhưng thiếu hàng.
- Kiểm tra chủ sở hữu khi đọc/hủy đơn; hủy có kiểm tra PayOS đã thanh toán hay chưa.

## Thanh toán: đề xuất theo ưu tiên (chưa thay đổi hành vi)

1. **Cao — Không âm thầm dùng lại đơn khác nội dung.** `app/api/payment/create/route.ts` trả đơn pending đầu tiên của khách mà không so sánh vòng, số lượng hoặc địa chỉ với yêu cầu mới. Nếu khách thay mẫu/sản phẩm ở tab khác, liên kết cũ có thể không khớp màn hình hiện tại. Đề xuất chỉ tái sử dụng đơn cùng nội dung; nếu khác, hiển thị đơn đang chờ và lựa chọn tiếp tục hoặc hủy trước khi tạo mới. Có thể giữ quy tắc một đơn pending mỗi khách.

2. **Cao — Giữ hồ sơ đơn hủy/thất bại và đối soát trường hợp tạo link chưa rõ kết quả.** `lib/payment-settlement.ts` xóa vật lý đơn pending khi hủy/thất bại. Nhánh catch tạo link trong `app/api/payment/create/route.ts` vẫn xóa đơn khi việc hủy PayOS lỗi hoặc chưa chắc link đã được tạo. Thông báo tiền đến muộn có thể không tìm được đơn. Đề xuất lưu trạng thái cancelled/failed và lịch sử lần thanh toán, kiểm tra lại PayOS trước khi kết thúc; có trạng thái cần đối soát cho lỗi mạng. Không đánh đồng không nhận được phản hồi với chưa tạo link.

3. **Cao — Không tự hủy chỉ vì khách đóng tab PayOS.** Hai form checkout xem `popup.closed` là tín hiệu gọi hủy. Khách có thể đóng tab để chuyển sang ứng dụng ngân hàng. Đề xuất chỉ hủy khi khách bấm nút hủy rõ ràng hoặc PayOS xác nhận hết hạn; giữ nút mở lại trang thanh toán và thông tin đơn.

4. **Cao — Tránh trang kết quả chờ vô hạn.** `app/(shop)/checkout/result/page.tsx` bỏ qua phản hồi không thành công và tiếp tục hỏi mỗi 2,5 giây; đơn bị xóa trả 404 vẫn có thể hiện đang chờ. Trang thành công chỉ đọc DB, không chủ động đối soát PayOS nếu webhook đến muộn/mất. Đề xuất hiển thị lỗi 401/403/404 riêng, nút kiểm tra lại và đối soát có giới hạn tần suất; không báo thất bại chỉ vì mất mạng. Trường hợp cancel thất bại cũng cần cho thử lại.

5. **Vừa — Tách lỗi webhook.** `app/api/payment/notify/route.ts` trả 400 cho cả chữ ký sai và lỗi xử lý/DB. Đề xuất phân biệt yêu cầu sai với lỗi tạm thời, ghi nhận sự kiện và xử lý lặp an toàn; xác nhận chính sách retry của PayOS trước khi quyết định chiến lược phản hồi.

6. **Vừa — Thử lại đúng loại sản phẩm.** Nút thử lại ở trang kết quả luôn trỏ `/checkout` của vòng tự thiết kế, kể cả khách mua vòng có sẵn. Đề xuất khôi phục đúng đơn/sản phẩm, số lượng, địa chỉ và hiển thị tóm tắt trước khi mở thanh toán.

7. **Vừa — Giảm truy vấn khi chờ tạo link.** Hàm waitForPaymentCheckoutUrl có thể hỏi DB 20 lần, cách 250 ms. Đề xuất trả trạng thái đang tạo kèm mã đơn, polling có giãn nhịp và giới hạn, thay vì nhiều truy vấn trong một request; thêm giới hạn tần suất các API tạo/đối soát.

## Hạn chế và việc nên làm tiếp

- Ba cảnh báo ảnh còn ở giao diện quản trị (ảnh xem trước biểu mẫu, danh sách quản trị, avatar sidebar); không phải lỗi build.
- Danh sách sản phẩm và một số thống kê quản trị vẫn tải nhiều bản ghi; nên phân trang/lọc phía máy chủ khi dữ liệu tăng. Chưa thay đổi để tránh phá bộ lọc phía khách hiện tại.
- Chưa đo Web Vitals và trải nghiệm 3D trên điện thoại yếu/mạng 4G, chưa thử luồng PayOS thật, webhook đến trễ hoặc mất mạng giữa lúc chuyển khoản. Cần chạy trên môi trường thử nghiệm thanh toán trước khi đưa các thay đổi nghiệp vụ thanh toán vào sử dụng.
- Không có phép kiểm tra nào chứng minh toàn dự án không còn lỗi. Các đề xuất thanh toán ở trên là kết quả đọc mã và bài kiểm thử trạng thái hiện có, chưa phải kiểm chứng end-to-end với cổng thanh toán.

## Bổ sung tối ưu điều hướng — 07/11/2026

- Menu tắt tải trước đồng loạt các liên kết; chuẩn bị trang theo ý định (rê chuột, focus bàn phím hoặc chạm), bỏ qua trang cần đăng nhập đối với khách và mạng chậm/tiết kiệm dữ liệu. Không thay kiểm tra quyền phía máy chủ.
- Thêm khung tải theo trang cho mua hàng, chi tiết vòng, yêu thích, lịch sử giao dịch và tài khoản; giữ tiêu đề/menu để người dùng nhận biết trang đang mở.
- Chi tiết vòng và trang đặt sản phẩm lấy dữ liệu sản phẩm đồng thời với phiên đăng nhập, thay vì xếp hàng phía sau truy vấn tài khoản. Kiểm thử dùng phiên đăng nhập chưa hoàn thành để xác nhận truy vấn sản phẩm đã bắt đầu.
- Bật tối ưu kích thước ảnh hero trang chủ (ảnh gốc 161.266 byte).
- Vòng tua sản phẩm nổi bật trang chủ: 8 giây theo yêu cầu.
- Tổng kiểm thử tự động sau đợt bổ sung: 38/38 đạt.

Đo xác nhận sau bản dựng bổ sung (không đăng nhập): trang chủ 520 ms, mua vòng 508 ms, yêu thích 501 ms ở lượt sau khởi động; phần HTML thiết kế của tôi 17 ms, customizer 14 ms. Các số liệu không bao gồm dữ liệu tải sau trang, WebGL hay đăng nhập. Lịch sử giao dịch của khách chưa đăng nhập trả vỏ trang/luồng chuyển hướng, nên không dùng thời gian đó để đại diện cho việc tải lịch sử thật. Ảnh hero qua bộ tối ưu trả 200, 26.694 byte WebP so với ảnh nguồn 161.266 byte (giảm khoảng 83% trong phép thử này). Build và 38 kiểm thử đều đạt. Máy chủ thử cổng 3107 đã được dừng sau phép đo.
