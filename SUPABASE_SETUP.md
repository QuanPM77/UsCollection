# 🚀 HƯỚNG DẪN DỰNG SUPABASE POSTGRESQL DATABASE (3 BƯỚC)

Tài liệu hướng dẫn dựng CSDL Cloud **Supabase** 12 Bảng cho dự án **UsCollection**.

---

## 📌 BƯỚC 1: Tạo Dự Án Mới Trên Supabase

1. Truy cập [Supabase Dashboard](https://supabase.com/dashboard) và đăng nhập.
2. Nút **"New Project"**.
3. Điền thông tin:
   - **Name**: `UsCollection`
   - **Database Password**: Đặt mật khẩu bất kỳ (nhớ lưu lại).
   - **Region**: Chọn `Singapore (ap-southeast-1)` (gần Việt Nam nhất).
4. Bấm **"Create new project"** (chờ khoảng 1 phút để Supabase khởi tạo CSDL PostgreSQL).

---

## 📌 BƯỚC 2: Chạy Script Tạo 12 Bảng CSDL (SQL Editor)

1. Ở menu bên trái Supabase, chọn mục **`SQL Editor`** (biểu tượng `>_`).
2. Bấm nút **`New query`**.
3. Mở file **[supabase_schema.sql](file:///d:/EXE101/UsCollection-main/UsCollection/supabase_schema.sql)** trong dự án code của bạn, **copy toàn bộ nội dung** và **paste** vào ô soạn thảo SQL.
4. Bấm nút **`Run`** màu xanh (hoặc ấn `Ctrl + Enter`).
5. Kết quả báo **`Success. No rows returned`** là thành công!
6. Bấm thử vào mục **`Table Editor`** ở menu bên trái: Bạn sẽ thấy **đầy đủ 12 Bảng** cùng dữ liệu mẫu đã tự động xuất hiện!

---

## 📌 BƯỚC 3: Lấy API Keys & Dán Vào Project

1. Ở menu bên trái, bấm **`Project Settings`** (biểu tượng bánh răng ⚙️ ở góc dưới).
2. Chọn mục **`API`**.
3. Copy 2 thông tin:
   - **Project URL**: Ví dụ `https://xyzcompany.supabase.co`
   - **anon public key**: Ví dụ `eyJhY...`
4. Mở file **[.env.local](file:///d:/EXE101/UsCollection-main/UsCollection/.env.local)** trong mã nguồn dự án `UsCollection`, dán vào 2 dòng sau:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhY...
```

---

🎉 **HOÀN THÀNH!** Giờ đây dự án `UsCollection` của bạn đã được kết nối trực tiếp với **Supabase Cloud PostgreSQL Database** 12 bảng thực sự!
