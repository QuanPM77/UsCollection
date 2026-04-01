# BeadStudio — Vòng tay thủ công 3D

Ứng dụng e-commerce cho phép khách hàng **thiết kế vòng tay hạt cá nhân hóa trong 3D**, xem trực tiếp trước khi đặt hàng, và thanh toán qua MoMo.

---

## Demo flow

```
Trang chủ (Landing) → Thiết kế 3D (Customizer) → Đặt hàng (Checkout) → Thanh toán (MoMo)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TailwindCSS |
| 3D Engine | Three.js + React Three Fiber v9 + Drei v10 |
| State | Zustand v5 + localStorage persist |
| Backend (stub) | Next.js API Routes (Node.js) |
| Payment | MoMo Strategy Pattern (HMAC-SHA256) |
| Database (Phase 2) | AWS DynamoDB (One-table design) |
| Infra (Phase 2) | AWS Lambda + S3 + API Gateway |

---

## Cài đặt

### Yêu cầu
- Node.js v20+
- pnpm v10+

```bash
# Cài pnpm nếu chưa có
npm install -g pnpm

# Clone repo
git clone https://github.com/QuanPM77/UsCollection.git
cd UsCollection/bead-bracelet

# Cài dependencies
pnpm install

# Chạy dev server
pnpm dev
```

Mở trình duyệt tại `http://localhost:3000`

---

## Cấu trúc project

```
bead-bracelet/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── customizer/page.tsx         # 3D Customizer (client component)
│   ├── checkout/
│   │   ├── page.tsx                # Guest checkout form
│   │   └── result/page.tsx         # Payment result
│   └── api/payment/
│       ├── momo/route.ts           # POST /api/payment/momo
│       └── notify/route.ts         # MoMo IPN webhook
│
├── components/
│   ├── 3d/
│   │   ├── BraceletCanvas.tsx      # Three.js scene root
│   │   ├── BeadMesh.tsx            # Bead sphere + interactions
│   │   └── BraceletCord.tsx        # Elastic cord (Torus geometry)
│   └── ui/
│       ├── CustomizerPanel.tsx     # Right sidebar
│       ├── BeadSelector.tsx        # Bead catalog grid
│       ├── BeadCard.tsx            # Single bead card
│       ├── WristInput.tsx          # Size presets + mm input
│       └── BraceletControls.tsx    # Actions + checkout CTA
│
├── lib/
│   ├── braceletMath.ts             # R = C/(2π), bead positions
│   ├── beadData.ts                 # 10 mock bead types
│   ├── store.ts                    # Zustand global store
│   └── payment/
│       ├── PaymentStrategy.ts      # Strategy pattern context
│       ├── MoMoStrategy.ts         # MoMo + Mock strategy
│       └── index.ts
│
└── types/index.ts                  # TypeScript types
```

---

## Tính năng chính

### 3D Customizer
- Vòng tay render bằng **Three.js spheres** sắp xếp theo công thức `R = C / (2π)`
- Kéo chuột để **xoay 3D** (OrbitControls)
- **Click** hạt để đặt bead đã chọn
- **Chuột phải** để xóa hạt
- Hover animation (scale lerp)
- Auto-rotate toggle

### Wrist Size
- 4 preset nhanh: S / M / L / XL
- Nhập tay chu vi (mm)
- Tự động tính số hạt: `count = floor(circumference / 8mm)`

### Guest Checkout
- Không cần tài khoản
- Form: Họ tên, SĐT, Địa chỉ với validation
- Draft tự lưu vào `localStorage`

### Payment (Strategy Pattern)
```
PaymentContext
├── MoMoStrategy        — production (HMAC-SHA256 signed)
└── MoMoMockStrategy    — development mock
```
Thêm VNPay / ZaloPay chỉ cần implement interface `PaymentStrategy`.

---

## Cấu hình MoMo

Tạo file `.env.local` từ template:

```bash
cp .env.local.example .env.local
```

Điền thông tin từ [MoMo Developer Portal](https://developers.momo.vn):

```env
MOMO_PARTNER_CODE=your_partner_code
MOMO_ACCESS_KEY=your_access_key
MOMO_SECRET_KEY=your_secret_key
MOMO_API_URL=https://test-payment.momo.vn/v2/gateway/api/create
```

---

## Data Model

### Bead Type
```typescript
{
  id: string
  name: string
  material: "glass" | "crystal" | "wood" | "stone" | "pearl"
  color: string        // hex
  metalness: number    // 0–1
  roughness: number    // 0–1
  price: number        // VND
}
```

### Guest Order
```typescript
{
  id: string
  name: string
  phone: string
  address: string
  braceletConfig: {
    wristCircumference: number   // mm
    slots: Array<{ index: number; beadTypeId: string | null }>
  }
  totalPrice: number
  paymentStatus: "pending" | "paid" | "failed"
  createdAt: string
}
```

---

## Roadmap

- [ ] Backend NestJS + AWS Lambda
- [ ] DynamoDB order storage
- [ ] Admin dashboard (order management)
- [ ] Bead catalog từ database (S3 images)
- [ ] VNPay / ZaloPay strategy
- [ ] Email xác nhận đơn hàng

---

## Màu sắc chủ đạo

| Token | Hex | Dùng cho |
|---|---|---|
| `pink-blush` | `#FFD1DC` | Background chính |
| `pink-light` | `#FFE4EC` | Surface, cards |
| `pink-mid` | `#FFB6C8` | Border, hover |
| `pink-deep` | `#E8829A` | CTA, accent |
| `pink-text` | `#7D2E46` | Text chính |
