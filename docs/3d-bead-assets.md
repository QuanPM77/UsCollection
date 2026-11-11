# Hạt & charm 3D (texture / model GLB)

Hình ảnh 3D riêng của từng hạt được tra theo **mã hạt (SKU)** trong `lib/beadVisuals.ts`.
Không cần sửa database: chỉ cần tạo hạt trong **Admin → Hạt** với đúng "Mã hạt" dưới đây.
Hạt có mã không nằm trong bảng vẫn hiển thị như cũ (khối cầu màu).

## Danh sách hạt đã có file

| Mã hạt | Loại | Đường kính (mm) nhập ở admin | Màu dự phòng | File |
|---|---|---|---|---|
| `crackle-do-den` | Hạt tròn, texture thuỷ tinh rạn đỏ – đen | 8 hoặc 10 | `#C8452E` | `public/textures/beads/crackle-do-den*.webp` |
| `crackle-tim` | Hạt tròn, texture thuỷ tinh rạn tím | 8 hoặc 10 | `#8A4FCC` | `public/textures/beads/crackle-tim*.webp` |
| `ab-xanh-duong` | Hạt tròn, nhựa xanh dương phủ AB | 8 hoặc 10 | `#2E9FD9` | `public/textures/beads/ab-xanh-duong.webp` |
| `trong-xanh-bac-ha` | Hạt tròn, thuỷ tinh trong ánh bạc hà | 8 hoặc 10 | `#CDEBDD` | `public/textures/beads/trong-xanh-bac-ha.webp` |
| `cupcake-hong` | Hạt xỏ ngang hình cupcake (model) | **13** | `#F3B8C6` | `public/models/beads/cupcake-hong.glb` |
| `charm-meo-vang` | Charm treo mèo vàng (model) | **6** | `#F5D88A` | `public/models/charms/charm-meo-vang.glb` |
| `charm-meo-hong` | Charm treo mèo hồng (model) | **6** | `#F29CB4` | `public/models/charms/charm-meo-hong.glb` |

- **Đường kính** quyết định khoảng chiếm trên dây. Hạt tròn: đúng cỡ thật.
  Cupcake rộng 12.5 mm → nhập 13. Charm chỉ chiếm chỗ cái khoen (~4 mm) + khe hở → nhập 6.
- **Màu dự phòng** dùng khi texture/model chưa tải xong và trong các bảng chưa có ảnh (đơn hàng admin).
- **Phát sáng (emissive)**: để trống cho các hạt này, nếu không màu texture sẽ bị phủ mờ.
- Kích thước model đã đúng mm thật trong file GLB, không phụ thuộc ô "đường kính".
- Chất liệu: chọn gần nhất trong danh sách (charm/cupcake resin → `glass`).

## Thêm hạt mới

1. Hạt tròn: thêm preset trong `Desktop/Texture_Bead/bead_texture.py`, chạy Blender, chép
   `<tên>.webp` (+ `_normal.webp` nếu có) vào `public/textures/beads/`.
   Model: dựng bằng script trong `Desktop/3D_Model`, chép `.glb` vào `public/models/...`.
2. Tạo ảnh thu nhỏ ~160 px vào `public/thumbnails/beads/<mã-hạt>.webp`.
3. Thêm một mục vào `BEAD_VISUALS` trong `lib/beadVisuals.ts` (thông số vật liệu lấy từ file `.json` của preset).
4. Tạo hạt trong Admin với đúng mã.

## Quy ước model

- Đơn vị GLB: mét (chuẩn glTF). Scene dùng 1 đơn vị = 10 mm → nhân `GLB_TO_SCENE = 100`.
- Mặt trước hướng +Z; khi đặt lên vòng được xoay quay ra ngoài, trục X chạy dọc dây.
- `mount: "bead"`: gốc toạ độ = tâm lỗ xỏ (lỗ theo trục X).
- `mount: "charm"`: gốc toạ độ = đỉnh khoen móc, thân treo xuống theo −Y.
