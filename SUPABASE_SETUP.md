# Dựng database UsStory trên Supabase

File [`supabase_schema.sql`](./supabase_schema.sql) là schema đầy đủ theo `prisma/schema.prisma` hiện tại, gồm 14 bảng ứng dụng, enum, index, foreign key, ràng buộc dữ liệu, cấu hình RLS, bucket ảnh và 10 loại hạt mặc định cho thiết kế 3D.

## 1. Tạo database mới

Tạo một Supabase project mới. Mở **SQL Editor → New query**, dán toàn bộ `supabase_schema.sql` và chạy. Script chỉ tạo cấu trúc trên schema rỗng; script không xóa dữ liệu cũ. Không chạy script trên database đang có các bảng ứng dụng.

Không có tài khoản admin mẫu hoặc mật khẩu giả trong script. Sau khi đăng ký tài khoản qua ứng dụng, nâng quyền tài khoản cần quản trị bằng SQL Editor:

```sql
UPDATE public.users
SET role = 'admin'::public.user_role
WHERE phone = 'SỐ_ĐIỆN_THOẠI_TÀI_KHOẢN';
```

## 2. Cấu hình kết nối ứng dụng

Trong Supabase **Project Settings → Database**, sao chép connection string do dự án cung cấp. Cấu hình `DATABASE_URL` bằng URL pooler phù hợp với runtime; cấu hình `DIRECT_URL` bằng URL kết nối trực tiếp để Prisma chạy migration. Không dùng anon key hoặc service role key làm connection string PostgreSQL.

```env
DATABASE_URL="<Supabase transaction-pooler connection string>"
DIRECT_URL="<Supabase direct connection string>"

SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<server-only service role key>"
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<publishable/anon key>"
```

Giữ `SUPABASE_SERVICE_ROLE_KEY` ở server, không đặt tiền tố `NEXT_PUBLIC_` và không commit file môi trường. Database bật RLS và không cấp policy đọc/ghi cho `anon`; ứng dụng truy cập bảng qua Prisma ở server. `NEXT_PUBLIC_SUPABASE_ANON_KEY` không dùng để truy vấn trực tiếp các bảng này.

Script tạo bucket Storage tên `avatars` ở chế độ public, giới hạn ảnh WebP 150 KiB. Ảnh avatar và ảnh sản phẩm đều được ứng dụng upload qua server bằng service role.

## 3. Khởi tạo Prisma trên database đã tạo bằng SQL

Chạy trong thư mục dự án sau khi đã cấu hình `DIRECT_URL`:

```powershell
npx prisma generate
npx prisma migrate resolve --applied 20261014000000_add_orders
npx prisma migrate resolve --applied 20261016000000_add_profile_completion
npx prisma migrate resolve --applied 20261016010000_add_bracelet_catalog_and_reviews
npx prisma migrate resolve --applied 20261016020000_add_product_styles
npx prisma migrate resolve --applied 20261018000000_add_email_to_verification_tokens
npx prisma migrate resolve --applied 20261018010000_add_3d_bead_catalog
npx prisma migrate resolve --applied 20261018020000_financial_metrics
```

Các migration trên được đánh dấu đã áp dụng vì SQL đầy đủ đã tạo cấu trúc và dữ liệu hạt tương ứng. Sau đó, các migration mới có thể chạy bằng `npx prisma migrate deploy`.

## 4. Nhập số tồn và giá vốn thật

10 hạt mặc định được tạo với `stock = 0` và `cost_price = NULL` để tránh ghi nhầm số vốn/tồn kho mẫu thành số liệu thật. Trước khi nhận đơn, vào trang **Admin → Các loại hạt** nhập số tồn và giá vốn thực tế. Checkout cố ý từ chối sản phẩm chưa có giá vốn; điều này giúp báo cáo lợi nhuận không coi giá vốn thiếu là 0.

Schema không tạo dữ liệu khách hàng, đơn hàng, giá vốn, số tồn hoặc tài khoản mẫu. Không thể khôi phục các dữ liệu đó khi tạo project mới; cần nhập lại từ nguồn dữ liệu thật nếu có.

## Ghi chú đối chiếu code và database

- Các luồng đăng nhập, hồ sơ, catalog sản phẩm/hạt, đơn thanh toán PayOS, webhook, kho, đánh giá, thông báo và cài đặt hiện dùng Prisma và được bao phủ trong schema này.
- Các API cũ như `/api/orders`, `/api/auth`, `/api/favorites`, `/api/custom-designs`, `/api/bracelet-templates`, `/api/manager/financials` vẫn đọc/ghi JSON qua `lib/db/fileDb.ts`; chúng không dùng các bảng Supabase trong file này. Không dùng các API cũ làm nguồn dữ liệu sản xuất nếu chưa chuyển chúng sang Prisma.
- Database giữ role `manager` vì enum Prisma đang định nghĩa role đó, nhưng guard hiện tại của ứng dụng dùng `staff` thay vì `manager`. Tạo tài khoản quản trị bằng role `admin`; cần đồng bộ role trước khi sử dụng tài khoản manager.
- Báo cáo lợi nhuận chỉ chính xác từ các đơn có `order_items.unit_cost`. Đơn cũ không có snapshot giá vốn sẽ không thể khôi phục lãi lịch sử nếu không có sổ giá vốn riêng.
