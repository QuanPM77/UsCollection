# UsStory — Vòng tay thủ công 3D

UsStory là ứng dụng thương mại điện tử cho phép khách thiết kế vòng tay hạt trong không gian 3D, xem cấu hình trước khi đặt hàng và thanh toán qua PayOS. Khách có thể checkout không cần tài khoản. Ứng dụng hiện dùng Next.js App Router, Prisma và PostgreSQL.

## Luồng mua hàng

```text
Trang chủ → Thiết kế vòng 3D → Checkout → Tạo đơn và liên kết PayOS
                                           ↓
                         PayOS webhook → Cập nhật trạng thái đơn
                                           ↓
                              Trang kết quả thanh toán
```

## Công nghệ

| Phần | Công nghệ hiện dùng |
|---|---|
| Giao diện và routing | Next.js 15 App Router, React 19, Tailwind CSS |
| 3D | Three.js, React Three Fiber, Drei |
| Trạng thái giao diện | Zustand; bản thiết kế được lưu phía trình duyệt |
| Xác thực | NextAuth v5, bcryptjs, luồng xác minh email và đặt lại mật khẩu |
| Backend | Next.js Route Handlers và Server Actions |
| Database | PostgreSQL qua Prisma 6 |
| Thanh toán | PayOS payment link và webhook đã xác minh |
| Email | Nodemailer |

## Cài đặt và chạy

Yêu cầu Node.js 20 trở lên. Repository có npm và pnpm lockfile; dùng trình quản lý package phù hợp với môi trường của bạn.

```bash
npm install
npm run dev
```

Ứng dụng chạy tại `http://localhost:3000`. Có thể dùng `pnpm install` và `pnpm dev` nếu đã cài pnpm. Clone trên mỗi máy không mang theo các file `.env`; cần tự tạo cấu hình môi trường trước khi chạy các chức năng dùng database.

### Cấu hình database và biến môi trường

Tạo một PostgreSQL database (ví dụ trên Supabase hoặc Neon), sao chép `.env.local.example` thành `.env.local`, rồi thay `DATABASE_URL` và `DIRECT_URL` bằng connection string của database đó. `DATABASE_URL` được Prisma dùng cho kết nối ứng dụng; `DIRECT_URL` dùng khi chạy migration. Nếu nhà cung cấp chỉ cấp một URL, có thể dùng cùng URL cho cả hai. Không chia sẻ hoặc commit `.env.local` vì file chứa thông tin bí mật.

Trên máy mới, cài dependencies rồi áp dụng migrations và tạo Prisma Client trước khi khởi động ứng dụng:

```bash
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Đăng ký tài khoản gọi database ngay lập tức nên thiếu `DATABASE_URL` sẽ làm request `/register` lỗi 500. Nếu deploy trên Vercel hoặc nền tảng khác, thêm các biến từ `.env.local` vào phần Environment Variables của nền tảng và chạy migrations trong bước deploy phù hợp.

### Lưu ảnh đại diện trên Supabase Storage

Tạo bucket public tên `avatars` trong Supabase Storage, giới hạn kích thước 150 KB và chỉ cho phép MIME `image/webp`. Ứng dụng tải ảnh lên từ server; thêm `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` vào `.env.local`. Khóa service role chỉ được dùng phía server, không đặt trong biến `NEXT_PUBLIC_*` hoặc mã frontend. Avatar dùng đường dẫn `<user-id>/<uuid>.webp`; ảnh sản phẩm dùng `products/<admin-id>/<uuid>.webp`. Biểu mẫu sản phẩm nén ảnh về WebP dưới 140 KB trước khi upload. Cột `users.avatar_url` lưu đường dẫn avatar, còn `products.images` lưu URL công khai của ảnh sản phẩm. Ảnh Base64 cũ vẫn hiển thị cho tới khi người dùng đổi ảnh.

Điền thêm các biến NextAuth, PayOS, SMTP và Supabase trong `.env.local` tùy theo tính năng cần dùng. Không đưa khóa bí mật vào repository. Để cập nhật database theo Prisma migration:

```bash
npx prisma migrate deploy
npx prisma generate
```

Trong môi trường phát triển, `npx prisma migrate dev` có thể dùng để tạo migration mới. Cấu hình webhook PayOS trỏ đến `https://<APP_URL>/api/payment/notify`.

## Cấu trúc project

```text
app/
├── page.tsx                              # Trang chủ
├── layout.tsx, globals.css               # Layout và style toàn ứng dụng
├── post-login/page.tsx                   # Điều hướng sau đăng nhập
├── (auth)/                               # Nhóm trang xác thực; không nằm trong URL
│   ├── login/                             # Đăng nhập
│   ├── register/                          # Đăng ký
│   ├── forgot-password/                   # Yêu cầu đặt lại mật khẩu
│   ├── reset-password/                    # Đặt mật khẩu mới
│   └── verify-email/                      # Xác minh email
├── (shop)/                               # Nhóm luồng mua hàng
│   ├── customizer/page.tsx                # Thiết kế vòng 3D
│   └── checkout/
│       ├── page.tsx                       # Thông tin giao hàng và thanh toán
│       └── result/page.tsx                # Kết quả thanh toán
├── (dashboard)/                           # Nhóm khu vực tài khoản và quản trị
│   ├── customer/                          # Trang khách hàng
│   ├── staff/                             # Trang nhân viên
│   └── admin/                             # Dashboard, đơn hàng, sản phẩm, user, cài đặt
└── api/
    ├── auth/[...nextauth]/route.ts        # Endpoint NextAuth
    └── payment/{create,notify,status}/     # Tạo link, webhook, truy vấn trạng thái PayOS

components/
├── 3d/                                    # Canvas, hạt và dây vòng 3D
├── ui/                                    # Thành phần giao diện customizer
├── admin/                                 # Layout, biểu mẫu và UI quản trị
└── AuthShell.tsx                          # Khung dùng chung cho trang xác thực

lib/
├── admin/services/                        # Service quản trị (hiện phần lớn là mock/in-memory)
├── admin/mock-data/                       # Dữ liệu mẫu admin
├── payment/                               # Payment strategy và PayOS strategy
├── store/                                 # Zustand store và dữ liệu hạt cho customizer
├── admin/types/                           # Kiểu dữ liệu quản trị
├── prisma.ts                              # Prisma client dùng chung
├── beadData.ts                            # Danh mục hạt phía server
├── braceletMath.ts                        # Tính toán hình học vòng
├── guard.ts, verify.ts, token.ts          # Bảo vệ route và tiện ích token/xác minh
└── mail.ts, ratelimit.ts, form.ts          # Email, giới hạn request, xử lý form

prisma/
├── schema.prisma                          # Schema PostgreSQL
└── migrations/                            # Các migration database
```

## Các page và mục đích

Các segment trong ngoặc đơn, ví dụ `(auth)`, chỉ dùng nhóm file và **không** xuất hiện trong URL.

### Trang khách và mua hàng

| URL | Page | Mục đích |
|---|---|---|
| `/` | `app/page.tsx` | Landing page giới thiệu sản phẩm, tính năng và đường dẫn thiết kế. Nội dung testimonial/giới thiệu hiện được khai báo tĩnh. |
| `/customizer` | `app/(shop)/customizer/page.tsx` | Chọn hạt, chỉnh chu vi và xem vòng tay 3D; trạng thái thiết kế quản lý bằng Zustand ở phía trình duyệt. |
| `/checkout` | `app/(shop)/checkout/page.tsx` | Nhập tên, số điện thoại, địa chỉ; xem cấu hình/tổng tiền và yêu cầu server tạo đơn cùng PayOS link. |
| `/checkout/result` | `app/(shop)/checkout/result/page.tsx` | Hiển thị trạng thái thanh toán; khi còn pending, truy vấn `/api/payment/status` định kỳ. |

### Tài khoản và xác thực

| URL | Page | Mục đích |
|---|---|---|
| `/login` | `app/(auth)/login/page.tsx` | Đăng nhập. |
| `/register` | `app/(auth)/register/page.tsx` | Tạo tài khoản. |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx` | Yêu cầu gửi email đặt lại mật khẩu. |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` | Đặt mật khẩu mới bằng token. |
| `/verify-email` | `app/(auth)/verify-email/page.tsx` | Xác minh địa chỉ email bằng token. |
| `/post-login` | `app/post-login/page.tsx` | Kiểm tra session và chuyển người dùng đến khu vực phù hợp sau đăng nhập. |
| `/customer` | `app/(dashboard)/customer/page.tsx` | Trang tài khoản khách hiện hiển thị lời chào và nút đăng xuất. |
| `/staff` | `app/(dashboard)/staff/page.tsx` | Trang nhân viên hiện hiển thị lời chào và nút đăng xuất. |

### Quản trị

| URL | Page | Mục đích |
|---|---|---|
| `/admin` | `app/(dashboard)/admin/page.tsx` | Dashboard KPI, doanh thu, đơn gần đây và cảnh báo tồn kho. Dữ liệu hiện lấy từ service mock. |
| `/admin/analytics` | `app/(dashboard)/admin/analytics/page.tsx` | Biểu đồ và thống kê quản trị; hiện dùng dữ liệu mock. |
| `/admin/orders` | `app/(dashboard)/admin/orders/page.tsx` | Tìm kiếm, lọc và phân trang danh sách đơn; hiện dùng dữ liệu mock. |
| `/admin/orders/[id]` | `app/(dashboard)/admin/orders/[id]/page.tsx` | Xem chi tiết và cập nhật trạng thái xử lý đơn trong mock service. |
| `/admin/products` | `app/(dashboard)/admin/products/page.tsx` | Danh sách và lọc sản phẩm; hiện dùng dữ liệu mock. |
| `/admin/products/new` | `app/(dashboard)/admin/products/new/page.tsx` | Form tạo sản phẩm; hiện chỉ cập nhật state trong bộ nhớ. |
| `/admin/products/[id]` | `app/(dashboard)/admin/products/[id]/page.tsx` | Xem/chỉnh sửa sản phẩm; hiện chỉ cập nhật state trong bộ nhớ. |
| `/admin/users` | `app/(dashboard)/admin/users/page.tsx` | Xem, khóa và mở khóa tài khoản người dùng trong database. |
| `/admin/settings` | `app/(dashboard)/admin/settings/page.tsx` | Cài đặt cửa hàng; hiện dùng state mock, chưa lưu database. |

## API routes

| Method và URL | Chức năng |
|---|---|
| NextAuth `/api/auth/[...nextauth]` | Xử lý các endpoint xác thực NextAuth. |
| `POST /api/payment/create` | Validate thông tin và cấu hình; tính giá từ danh mục phía server; tạo đơn PostgreSQL và PayOS payment link. |
| `POST /api/payment/notify` | Xác minh webhook PayOS, đối chiếu mã đơn và số tiền, cập nhật trạng thái thanh toán. |
| `GET /api/payment/status?orderId=...` | Trả trạng thái thanh toán của đơn để trang kết quả hiển thị. |

## Database hiện tại

Nguồn schema: `prisma/schema.prisma`. PostgreSQL dùng tên bảng/cột dạng snake_case qua `@@map` và `@map`. Kiểu `String @db.Uuid` là UUID; các trường thời gian dùng `TIMESTAMPTZ`. `@default(now())` tự đặt thời điểm tạo, còn `@updatedAt` được Prisma cập nhật khi bản ghi thay đổi.

### `users`

| Cột | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|
| `id` | UUID, khóa chính, mặc định UUID | Định danh tài khoản. |
| `email` | TEXT, unique | Email đăng nhập; không trùng. |
| `password_hash` | TEXT, nullable | Mật khẩu đã hash; null nếu tài khoản không dùng mật khẩu. |
| `email_verified_at` | TIMESTAMPTZ, nullable | Thời điểm email được xác minh. |
| `full_name` | TEXT, nullable | Họ tên người dùng. |
| `phone` | TEXT, nullable | Số điện thoại. |
| `avatar_url` | TEXT, nullable | URL ảnh đại diện. |
| `role` | `user_role`, mặc định `customer` | Vai trò: `admin`, `staff` hoặc `customer`. |
| `status` | `user_status`, mặc định `active` | Trạng thái: `active` hoặc `blocked`. |
| `last_login_at` | TIMESTAMPTZ, nullable | Lần đăng nhập gần nhất. |
| `created_at` | TIMESTAMPTZ, mặc định hiện tại | Thời điểm tạo tài khoản. |
| `updated_at` | TIMESTAMPTZ, Prisma tự cập nhật | Thời điểm cập nhật gần nhất. |

Quan hệ: một user có nhiều `user_addresses`, `password_reset_tokens` và `email_verification_tokens`. Xóa user sẽ cascade xóa các bản ghi liên quan.

### `user_addresses`

| Cột | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|
| `id` | UUID, khóa chính | Định danh địa chỉ. |
| `user_id` | UUID, khóa ngoại → `users.id` | Chủ sở hữu địa chỉ. |
| `recipient_name` | TEXT | Tên người nhận. |
| `phone` | TEXT | Số điện thoại nhận hàng. |
| `address_line` | TEXT | Địa chỉ chi tiết. |
| `province` | TEXT, nullable | Tỉnh/thành. |
| `is_default` | BOOLEAN, mặc định `false` | Địa chỉ mặc định của người dùng. |
| `created_at` | TIMESTAMPTZ, mặc định hiện tại | Thời điểm lưu địa chỉ. |

### `password_reset_tokens`

| Cột | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|
| `id` | UUID, khóa chính | Định danh token. |
| `user_id` | UUID, khóa ngoại → `users.id` | Tài khoản yêu cầu đặt lại mật khẩu. |
| `token_hash` | TEXT, unique | Hash token; giá trị duy nhất, không lưu token thô. |
| `expires_at` | TIMESTAMPTZ | Thời điểm token hết hạn. |
| `created_at` | TIMESTAMPTZ, mặc định hiện tại | Thời điểm tạo token. |

Xóa user sẽ xóa token đặt lại mật khẩu tương ứng.

### `email_verification_tokens`

| Cột | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|
| `id` | UUID, khóa chính | Định danh token. |
| `user_id` | UUID, khóa ngoại → `users.id` | Tài khoản cần xác minh email. |
| `token_hash` | TEXT, unique | Hash token xác minh; giá trị duy nhất. |
| `expires_at` | TIMESTAMPTZ | Thời điểm token hết hạn. |
| `created_at` | TIMESTAMPTZ, mặc định hiện tại | Thời điểm tạo token. |

Xóa user sẽ xóa token xác minh tương ứng.

### `rate_limits`

| Cột | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|
| `key` | TEXT, khóa chính | Khóa định danh nhóm request cần giới hạn. |
| `count` | INTEGER | Số request đã ghi nhận trong cửa sổ giới hạn. |
| `reset_at` | TIMESTAMPTZ | Thời điểm bộ đếm được làm mới. |

Bảng này không có khóa ngoại. Cách sử dụng và thời lượng giới hạn phụ thuộc vào logic trong `lib/ratelimit.ts`.

### `orders`

| Cột | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|
| `id` | UUID, khóa chính | ID nội bộ của đơn; dùng để tra trạng thái đơn. |
| `order_code` | BIGINT, unique | Mã đơn gửi cho PayOS và dùng đối chiếu webhook. |
| `customer_name` | TEXT | Tên người đặt/nhận hàng. |
| `customer_phone` | TEXT | Số điện thoại liên hệ. |
| `customer_address` | TEXT | Địa chỉ giao hàng dạng chuỗi. |
| `bracelet_config` | JSONB | Cấu hình vòng, gồm `wristCircumference` và các `slots` với `index`, `beadTypeId`. |
| `total_price` | INTEGER | Tổng tiền bằng VND, được server tính từ danh mục hạt. |
| `payment_status` | TEXT, mặc định `pending` | Trạng thái thanh toán; code hiện dùng `pending`, `paid`, `failed`. |
| `payment_link_id` | TEXT, nullable | ID payment link do PayOS trả về. |
| `created_at` | TIMESTAMPTZ, mặc định hiện tại | Thời điểm tạo đơn. |
| `updated_at` | TIMESTAMPTZ, Prisma tự cập nhật | Thời điểm cập nhật đơn gần nhất. |

Đơn checkout hiện không gắn với `users`; thông tin khách được chụp trực tiếp trên đơn để hỗ trợ guest checkout. Cấu hình hạt được lưu trong JSONB, không có bảng dòng đơn hoặc khóa ngoại tới bảng sản phẩm.

### Enum PostgreSQL

| Enum | Giá trị | Dùng tại |
|---|---|---|
| `user_role` (`Role`) | `admin`, `staff`, `customer` | `users.role` |
| `user_status` (`Status`) | `active`, `blocked` | `users.status` |

## Những phần admin chưa nối database

`lib/admin/services/product.service.ts`, `order.service.ts`, `analytics.service.ts` và `settings.service.ts` hiện là mock/in-memory. Vì thế dữ liệu sản phẩm, trạng thái xử lý đơn, thống kê và cài đặt thay đổi qua các trang admin chưa được lưu bền vững. PostgreSQL hiện có bảng `orders` cho luồng thanh toán thật, nhưng trang quản trị đơn hàng chưa đọc bảng này. Danh mục hạt dùng khi thiết kế và tính tiền hiện nằm trong code (`lib/store/bead-data.ts` và `lib/beadData.ts`), chưa có bảng sản phẩm.

Các trạng thái `new`, `confirmed`, `processing`, `shipping`, `completed`, `cancelled` thuộc mô hình đơn mock ở admin; chúng không phải các giá trị của `orders.payment_status` trong database.

## Database đề xuất để lưu dữ liệu admin

Phần dưới đây là thiết kế mở rộng dựa trên các kiểu dữ liệu trong `lib/admin/types/`. **Đây là đề xuất, chưa có trong `schema.prisma` và chưa được migration vào PostgreSQL.** Giữ lại bảng `orders` hiện tại để tương thích luồng PayOS, sau đó bổ sung cột và bảng liên quan như dưới đây.

### `products`

Một bảng chung cho hạt và vòng tay bán sẵn. Thông tin chung, giá và tồn kho ở đây; thuộc tính riêng của từng loại được đặt trong bảng chi tiết tương ứng.

| Cột đề xuất | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | UUID, khóa chính | Định danh sản phẩm. |
| `sku` | TEXT, unique | Mã SKU dùng tìm kiếm/quản lý. |
| `type` | ENUM `bead`, `bracelet` | Loại sản phẩm. |
| `name` | TEXT | Tên sản phẩm. |
| `description` | TEXT, nullable | Mô tả. |
| `price` | INTEGER | Giá bán VND. |
| `stock` | INTEGER, mặc định `0` | Số lượng tồn kho. |
| `status` | ENUM `active`, `inactive`, `draft` | Trạng thái hiển thị/bán hàng. |
| `created_at`, `updated_at` | TIMESTAMPTZ | Thời điểm tạo và cập nhật. |

### `bead_product_details`

Các thuộc tính vật liệu và hiển thị 3D riêng cho sản phẩm hạt. `product_id` vừa là khóa chính vừa là khóa ngoại tới `products.id` (quan hệ 1–1).

| Cột đề xuất | Kiểu | Ý nghĩa |
|---|---|---|
| `product_id` | UUID, PK/FK → `products.id` | Sản phẩm hạt tương ứng. |
| `material` | ENUM `glass`, `crystal`, `wood`, `stone`, `pearl` | Chất liệu hạt. |
| `color` | TEXT | Mã màu, thường là HEX. |
| `metalness` | DOUBLE PRECISION | Tham số vật liệu Three.js, khoảng 0–1. |
| `roughness` | DOUBLE PRECISION | Độ nhám vật liệu Three.js, khoảng 0–1. |

### `bracelet_product_details`

Thông tin bổ sung cho vòng tay bán sẵn. `product_id` là khóa chính và khóa ngoại tới `products.id`.

| Cột đề xuất | Kiểu | Ý nghĩa |
|---|---|---|
| `product_id` | UUID, PK/FK → `products.id` | Sản phẩm vòng tay tương ứng. |
| `wrist_circumference` | INTEGER | Chu vi cổ tay thiết kế, đơn vị mm. |
| `image_url` | TEXT, nullable | Ảnh đại diện sản phẩm. |

### `bracelet_product_beads`

Bảng nối vòng tay bán sẵn với các loại hạt cấu thành; thay cho lưu `beadTypeIds` thành mảng không quan hệ.

| Cột đề xuất | Kiểu | Ý nghĩa |
|---|---|---|
| `bracelet_product_id` | UUID, FK → `bracelet_product_details.product_id` | Vòng tay bán sẵn. |
| `bead_product_id` | UUID, FK → `bead_product_details.product_id` | Loại hạt cấu thành. |
| `quantity` | INTEGER | Số hạt loại này trong vòng. |
| `(bracelet_product_id, bead_product_id)` | Khóa chính kép | Mỗi loại hạt chỉ có một dòng cho mỗi vòng. |

### Mở rộng bảng `orders` cho admin

Giữ các cột hiện có; bổ sung các trường quản lý tài khoản và vòng đời xử lý đơn. Thông tin người nhận hiện có vẫn được giữ trên đơn như snapshot, để đơn không đổi nếu hồ sơ hoặc địa chỉ khách hàng thay đổi.

| Cột bổ sung | Kiểu | Ý nghĩa |
|---|---|---|
| `user_id` | UUID, nullable, FK → `users.id` | Tài khoản đặt đơn nếu khách đã đăng nhập; null cho guest checkout. Nên dùng `ON DELETE SET NULL`. |
| `order_status` | ENUM `new`, `confirmed`, `processing`, `shipping`, `completed`, `cancelled` | Trạng thái xử lý/giao hàng độc lập với trạng thái thanh toán. Mặc định `new`. |
| `payment_method` | ENUM `payos`, `bank_transfer`, `cod` | Phương thức thanh toán. Hiện luồng triển khai thực tế là PayOS. |
| `note` | TEXT, nullable | Ghi chú đơn hàng. |

`payment_status` tiếp tục giữ các giá trị `pending`, `paid`, `failed`; không gộp với `order_status`, vì thanh toán và xử lý giao hàng là hai trạng thái khác nhau.

### `order_items`

Lưu snapshot các dòng sản phẩm tại thời điểm mua để báo cáo doanh thu/top product chính xác kể cả khi sản phẩm đổi tên hoặc giá. Với đơn thiết kế riêng hiện tại, có thể tạo dòng theo từng loại hạt và số lượng hạt tương ứng; cấu hình vị trí chính xác vẫn giữ trong `orders.bracelet_config`.

| Cột đề xuất | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | UUID, khóa chính | Định danh dòng hàng. |
| `order_id` | UUID, FK → `orders.id` | Đơn hàng chứa dòng này. |
| `product_id` | UUID, nullable, FK → `products.id` | Sản phẩm gốc; nullable để giữ lịch sử nếu sản phẩm bị xóa. |
| `product_name` | TEXT | Tên sản phẩm tại thời điểm đặt. |
| `sku` | TEXT, nullable | SKU tại thời điểm đặt. |
| `product_type` | TEXT hoặc enum | `bead` hoặc `bracelet`. |
| `quantity` | INTEGER | Số lượng. |
| `unit_price` | INTEGER | Giá mỗi đơn vị tại thời điểm đặt, VND. |
| `line_total` | INTEGER | Thành tiền của dòng, VND. |
| `details` | JSONB, nullable | Snapshot thuộc tính cần thiết như vị trí hạt hoặc chu vi vòng. |

### `inventory_movements`

Lịch sử tăng/giảm kho để admin truy nguyên lý do thay đổi tồn kho. Số lượng hiện tại vẫn lưu ở `products.stock` để truy vấn nhanh; mỗi cập nhật kho nên ghi thêm một movement trong cùng transaction.

| Cột đề xuất | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | UUID, khóa chính | Định danh biến động kho. |
| `product_id` | UUID, FK → `products.id` | Sản phẩm thay đổi tồn. |
| `changed_by` | UUID, nullable, FK → `users.id` | Admin/staff thực hiện; null nếu do hệ thống. |
| `quantity_delta` | INTEGER | Số lượng thay đổi: dương là nhập, âm là xuất. |
| `reason` | TEXT | Lý do, ví dụ nhập hàng, điều chỉnh hoặc đơn hàng. |
| `order_id` | UUID, nullable, FK → `orders.id` | Đơn liên quan nếu xuất kho do bán hàng. |
| `created_at` | TIMESTAMPTZ | Thời điểm ghi nhận. |

### `store_settings`

Lưu cấu hình đang là `StoreSettings` trong `lib/admin/types/settings.ts`. Dùng một bản ghi cấu hình cửa hàng; có thể ràng buộc singleton bằng một khóa cố định hoặc chỉ cho phép một row.

| Cột đề xuất | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | SMALLINT, khóa chính, luôn là `1` | Đảm bảo chỉ có một bộ cài đặt cửa hàng. |
| `store_name` | TEXT | Tên cửa hàng. |
| `store_description` | TEXT | Mô tả cửa hàng. |
| `contact_phone` | TEXT | Số điện thoại liên hệ. |
| `contact_email` | TEXT | Email liên hệ. |
| `address` | TEXT | Địa chỉ cửa hàng. |
| `low_stock_threshold` | INTEGER | Ngưỡng cảnh báo sắp hết hàng. |
| `currency` | TEXT | Đơn vị tiền tệ, hiện là `VND`. |
| `order_auto_confirm` | BOOLEAN | Có tự động xác nhận đơn hay không. |
| `updated_at` | TIMESTAMPTZ | Thời điểm cập nhật cấu hình. |

### Quan hệ admin đề xuất

```text
products ──1:1── bead_product_details
    │       └──1:1── bracelet_product_details ──1:N── bracelet_product_beads ──N:1── bead_product_details
    ├──1:N── inventory_movements
    └──1:N── order_items ──N:1── orders ──N:1 (nullable)── users

users ──1:N── inventory_movements (changed_by)
store_settings (một bản ghi cấu hình)
```

Analytics không cần bảng riêng cho các KPI và biểu đồ đang có thể tổng hợp từ `orders`, `order_items` và `products`. Chỉ nên tạo bảng tổng hợp/cache nếu dữ liệu lớn khiến truy vấn trực tiếp chậm.

## Ghi chú về cấu hình

Các biến môi trường cụ thể được liệt kê trong `.env.local.example`. Tối thiểu luồng thanh toán cần cấu hình kết nối PostgreSQL và `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`; URL ứng dụng công khai đặt trong `APP_URL` để tạo đường dẫn trả về phù hợp. NextAuth và email cần các biến tương ứng theo cấu hình trong `auth.ts` và `lib/mail.ts`.

## Bảng màu

| Token | Hex | Công dụng |
|---|---|---|
| `pink-blush` | `#FFD1DC` | Nền chính |
| `pink-light` | `#FFE4EC` | Surface, thẻ |
| `pink-mid` | `#FFB6C8` | Viền, hover |
| `pink-deep` | `#E8829A` | Nút chính, điểm nhấn |
| `pink-text` | `#7D2E46` | Văn bản chính |
