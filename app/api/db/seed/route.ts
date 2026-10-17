import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  UserRecord,
  UserAddressRecord,
  BeadTypeRecord,
  BraceletTemplateRecord,
  BraceletTemplateSlotRecord,
  CustomDesignRecord,
  CustomDesignSlotRecord,
  FavoriteRecord,
  OrderRecord,
  OrderSlotRecord,
  PaymentLogRecord,
  AdminAuditLogRecord,
} from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");

async function writeCollection<T>(filename: string, data: T) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), "utf-8");
}

export async function POST() {
  return runSeed();
}

export async function GET() {
  return runSeed();
}

async function runSeed() {
  try {
    // 1. Users
    const users: UserRecord[] = [
      {
        id: "usr-admin-01",
        email: "admin@beadstudio.com",
        password_hash: "$2a$10$abcdef1234567890adminhash",
        full_name: "Quản Trị Viên Hệ Thống",
        phone: "0988888888",
        avatar_url: null,
        role: "admin",
        status: "active",
        last_login_at: "2026-09-26T10:00:00.000Z",
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "usr-manager-01",
        email: "manager@beadstudio.com",
        password_hash: "$2a$10$abcdef1234567890managerhash",
        full_name: "Nguyễn Văn Quản Lý",
        phone: "0977777777",
        avatar_url: null,
        role: "manager",
        status: "active",
        last_login_at: "2026-09-26T10:30:00.000Z",
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "usr-customer-01",
        email: "khachhang@gmail.com",
        password_hash: "$2a$10$abcdef1234567890customerhash",
        full_name: "Lê Thị Thảo",
        phone: "0901234567",
        avatar_url: null,
        role: "customer",
        status: "active",
        last_login_at: "2026-09-25T14:00:00.000Z",
        created_at: "2026-05-10T00:00:00.000Z",
        updated_at: "2026-05-10T00:00:00.000Z",
      },
      {
        id: "usr-customer-02",
        email: "tranminh@gmail.com",
        password_hash: "$2a$10$abcdef1234567890customerhash2",
        full_name: "Trần Minh",
        phone: "0912345678",
        avatar_url: null,
        role: "customer",
        status: "active",
        last_login_at: "2026-09-24T09:15:00.000Z",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
      },
    ];

    // 2. User Addresses
    const userAddresses: UserAddressRecord[] = [
      {
        id: "addr-01",
        user_id: "usr-customer-01",
        recipient_name: "Lê Thị Thảo",
        phone: "0901234567",
        address_line: "123 Đường Lê Lợi, Phường Bến Thành, Quận 1",
        province: "TP. Hồ Chí Minh",
        is_default: true,
        created_at: "2026-05-10T00:00:00.000Z",
      },
      {
        id: "addr-02",
        user_id: "usr-customer-02",
        recipient_name: "Trần Minh",
        phone: "0912345678",
        address_line: "456 Đường Nguyễn Huệ, Quận 3",
        province: "TP. Hồ Chí Minh",
        is_default: true,
        created_at: "2026-06-01T00:00:00.000Z",
      },
    ];

    // 3. Bead Types
    const beadTypes: BeadTypeRecord[] = [
      {
        id: "rose-quartz",
        code: "BEAD-RQ-01",
        name: "Rose Quartz",
        material: "crystal",
        color_hex: "#F4A7B9",
        emissive_hex: "#FF8FAB",
        metalness: 0.1,
        roughness: 0.3,
        description: "Pha lê hồng nhạt, biểu tượng của tình yêu và sự chữa lành",
        cost_price: 7000,
        sell_price: 15000,
        stock_quantity: 250,
        is_active: true,
        diameter: 8,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "amethyst",
        code: "BEAD-AM-02",
        name: "Amethyst",
        material: "crystal",
        color_hex: "#9B59B6",
        emissive_hex: "#7D3C98",
        metalness: 0.1,
        roughness: 0.25,
        description: "Tím amethyst, mang lại sự tập trung và bình yên tâm trí",
        cost_price: 8500,
        sell_price: 18000,
        stock_quantity: 180,
        is_active: true,
        diameter: 8,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "pearl-white",
        code: "BEAD-PW-03",
        name: "White Pearl",
        material: "pearl",
        color_hex: "#F8F0E3",
        metalness: 0.3,
        roughness: 0.1,
        description: "Ngọc trai trắng thuần khiết, quý phái",
        cost_price: 10000,
        sell_price: 22000,
        stock_quantity: 120,
        is_active: true,
        diameter: 6,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "moonstone",
        code: "BEAD-MS-04",
        name: "Moonstone",
        material: "stone",
        color_hex: "#E8E8F0",
        emissive_hex: "#C5C5E0",
        metalness: 0.15,
        roughness: 0.2,
        description: "Đá mặt trăng huyền bí, gia tăng trực giác",
        cost_price: 9500,
        sell_price: 20000,
        stock_quantity: 200,
        is_active: true,
        diameter: 8,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "turquoise",
        code: "BEAD-TQ-05",
        name: "Turquoise",
        material: "stone",
        color_hex: "#40E0D0",
        metalness: 0.05,
        roughness: 0.5,
        description: "Ngọc lam xanh biển rực rỡ, mang năng lượng tích cực",
        cost_price: 7500,
        sell_price: 16000,
        stock_quantity: 150,
        is_active: true,
        diameter: 8,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "gold-bead",
        code: "BEAD-GD-06",
        name: "Gold Accent",
        material: "crystal",
        color_hex: "#FFD700",
        emissive_hex: "#B8860B",
        metalness: 0.9,
        roughness: 0.05,
        description: "Hạt mạ vàng điểm nhấn sang trọng",
        cost_price: 14000,
        sell_price: 30000,
        stock_quantity: 90,
        is_active: true,
        diameter: 4,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "obsidian",
        code: "BEAD-OB-07",
        name: "Black Obsidian",
        material: "stone",
        color_hex: "#2C2C2C",
        metalness: 0.4,
        roughness: 0.15,
        description: "Đá hắc diệu xua tan năng lượng tiêu cực",
        cost_price: 6000,
        sell_price: 14000,
        stock_quantity: 300,
        is_active: true,
        diameter: 10,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "sandalwood",
        code: "BEAD-SW-08",
        name: "Sandalwood",
        material: "wood",
        color_hex: "#C19A6B",
        metalness: 0.0,
        roughness: 0.8,
        description: "Gỗ đàn hương tự nhiên thơm nhẹ thư thái",
        cost_price: 4500,
        sell_price: 10000,
        stock_quantity: 400,
        is_active: true,
        diameter: 8,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "cherry-glass",
        code: "BEAD-CG-09",
        name: "Cherry Glass",
        material: "glass",
        color_hex: "#DC143C",
        emissive_hex: "#8B0000",
        metalness: 0.05,
        roughness: 0.05,
        description: "Hạt thủy tinh đỏ anh đào nổi bật",
        cost_price: 5000,
        sell_price: 12000,
        stock_quantity: 220,
        is_active: true,
        diameter: 6,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "lavender-jade",
        code: "BEAD-LJ-10",
        name: "Lavender Jade",
        material: "stone",
        color_hex: "#B57EDC",
        metalness: 0.1,
        roughness: 0.35,
        description: "Ngọc bích oải hương thanh lịch, may mắn",
        cost_price: 11000,
        sell_price: 25000,
        stock_quantity: 110,
        is_active: true,
        diameter: 8,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      },
    ];

    // 4. Bracelet Templates
    const braceletTemplates: BraceletTemplateRecord[] = [
      {
        id: "tmpl-hong-ngoc-01",
        name: "Vòng Phong Thủy Hồng Ngọc",
        description: "Kết hợp giữa Rose Quartz và Ngọc Trai Trắng cho nét tinh tế, dịu dàng.",
        wrist_circumference: 160,
        thumbnail_url: "/templates/rose-quartz.png",
        category: "phong_thuy",
        is_featured: true,
        status: "published",
        created_by: "usr-manager-01",
        created_at: "2026-05-05T00:00:00.000Z",
        updated_at: "2026-05-05T00:00:00.000Z",
      },
      {
        id: "tmpl-dem-trang-02",
        name: "Vòng Tay Đêm Trăng Huyền Bí",
        description: "Đá Mặt Trăng và Hắc Diệu mang lại sự bảo vệ năng lượng vượt trội.",
        wrist_circumference: 170,
        thumbnail_url: "/templates/moonstone.png",
        category: "toi_gian",
        is_featured: true,
        status: "published",
        created_by: "usr-manager-01",
        created_at: "2026-05-05T00:00:00.000Z",
        updated_at: "2026-05-05T00:00:00.000Z",
      },
      {
        id: "tmpl-boho-03",
        name: "Vòng Tay Boho Đàn Hương",
        description: "Mộc mạc nhưng cá tính với gỗ đàn hương và đá Turquoise.",
        wrist_circumference: 165,
        thumbnail_url: "/templates/boho.png",
        category: "dieu_da",
        is_featured: false,
        status: "published",
        created_by: "usr-manager-01",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
      },
    ];


    // 5. Bracelet Template Slots
    const braceletTemplateSlots: BraceletTemplateSlotRecord[] = [
      { id: "tmpl-slot-1", template_id: "tmpl-hong-ngoc-01", slot_index: 0, bead_type_id: "rose-quartz" },
      { id: "tmpl-slot-2", template_id: "tmpl-hong-ngoc-01", slot_index: 1, bead_type_id: "pearl-white" },
      { id: "tmpl-slot-3", template_id: "tmpl-hong-ngoc-01", slot_index: 2, bead_type_id: "gold-bead" },
      { id: "tmpl-slot-4", template_id: "tmpl-hong-ngoc-01", slot_index: 3, bead_type_id: "rose-quartz" },
      { id: "tmpl-slot-5", template_id: "tmpl-dem-trang-02", slot_index: 0, bead_type_id: "obsidian" },
      { id: "tmpl-slot-6", template_id: "tmpl-dem-trang-02", slot_index: 1, bead_type_id: "moonstone" },
      { id: "tmpl-slot-7", template_id: "tmpl-dem-trang-02", slot_index: 2, bead_type_id: "gold-bead" },
      { id: "tmpl-slot-8", template_id: "tmpl-boho-03", slot_index: 0, bead_type_id: "sandalwood" },
      { id: "tmpl-slot-9", template_id: "tmpl-boho-03", slot_index: 1, bead_type_id: "turquoise" },
    ];

    // 6. Custom Designs
    const customDesigns: CustomDesignRecord[] = [
      {
        id: "design-cust-01",
        user_id: "usr-customer-01",
        name: "Vòng Tay Tình Yêu & May Mắn",
        wrist_circumference: 160,
        thumbnail_url: null,
        is_public: true,
        created_at: "2026-05-15T00:00:00.000Z",
        updated_at: "2026-05-15T00:00:00.000Z",
      },
      {
        id: "design-cust-02",
        user_id: "usr-customer-02",
        name: "Vòng Đi Làm Tối Giản",
        wrist_circumference: 170,
        thumbnail_url: null,
        is_public: false,
        created_at: "2026-06-10T00:00:00.000Z",
        updated_at: "2026-06-10T00:00:00.000Z",
      },
    ];

    // 7. Custom Design Slots
    const customDesignSlots: CustomDesignSlotRecord[] = [
      { id: "cd-slot-1", design_id: "design-cust-01", slot_index: 0, bead_type_id: "rose-quartz" },
      { id: "cd-slot-2", design_id: "design-cust-01", slot_index: 1, bead_type_id: "amethyst" },
      { id: "cd-slot-3", design_id: "design-cust-01", slot_index: 2, bead_type_id: "gold-bead" },
      { id: "cd-slot-4", design_id: "design-cust-02", slot_index: 0, bead_type_id: "obsidian" },
      { id: "cd-slot-5", design_id: "design-cust-02", slot_index: 1, bead_type_id: "sandalwood" },
    ];

    // 8. Favorites
    const favorites: FavoriteRecord[] = [
      { id: "fav-01", user_id: "usr-customer-01", template_id: "tmpl-hong-ngoc-01", bead_type_id: null, created_at: "2026-05-12T00:00:00.000Z" },
      { id: "fav-02", user_id: "usr-customer-01", template_id: null, bead_type_id: "rose-quartz", created_at: "2026-05-14T00:00:00.000Z" },
      { id: "fav-03", user_id: "usr-customer-02", template_id: "tmpl-dem-trang-02", bead_type_id: null, created_at: "2026-06-05T00:00:00.000Z" },
    ];

    // 9. Orders (Multi-month history for financial reports!)
    const orders: OrderRecord[] = [
      {
        id: "ord-01",
        order_code: "BS-1725100000000",
        user_id: "usr-customer-01",
        source_design_id: "design-cust-01",
        source_template_id: null,
        customer_name: "Lê Thị Thảo",
        phone: "0901234567",
        address: "123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh",
        wrist_circumference: 160,
        total_price: 63000,
        payment_status: "paid",
        fulfillment_status: "completed",
        created_at: "2026-05-20T10:00:00.000Z",
        updated_at: "2026-05-20T10:05:00.000Z",
      },
      {
        id: "ord-02",
        order_code: "BS-1725200000000",
        user_id: "usr-customer-02",
        source_design_id: null,
        source_template_id: "tmpl-dem-trang-02",
        customer_name: "Trần Minh",
        phone: "0912345678",
        address: "456 Đường Nguyễn Huệ, Quận 3, TP. Hồ Chí Minh",
        wrist_circumference: 170,
        total_price: 64000,
        payment_status: "paid",
        fulfillment_status: "completed",
        created_at: "2026-06-15T14:30:00.000Z",
        updated_at: "2026-06-15T14:35:00.000Z",
      },
      {
        id: "ord-03",
        order_code: "BS-1725300000000",
        user_id: "usr-customer-01",
        source_design_id: null,
        source_template_id: "tmpl-hong-ngoc-01",
        customer_name: "Lê Thị Thảo",
        phone: "0901234567",
        address: "123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh",
        wrist_circumference: 160,
        total_price: 82000,
        payment_status: "paid",
        fulfillment_status: "completed",
        created_at: "2026-07-10T11:00:00.000Z",
        updated_at: "2026-07-10T11:05:00.000Z",
      },
      {
        id: "ord-04",
        order_code: "BS-1725400000000",
        user_id: null,
        source_design_id: null,
        source_template_id: null,
        customer_name: "Phạm Quốc Tuấn",
        phone: "0933445566",
        address: "789 Đường Nam Kỳ Khởi Nghĩa, Quận 3, TP. Hồ Chí Minh",
        wrist_circumference: 165,
        total_price: 52000,
        payment_status: "paid",
        fulfillment_status: "processing",
        created_at: "2026-08-05T16:20:00.000Z",
        updated_at: "2026-08-05T16:25:00.000Z",
      },
      {
        id: "ord-05",
        order_code: "BS-1725500000000",
        user_id: "usr-customer-02",
        source_design_id: "design-cust-02",
        source_template_id: null,
        customer_name: "Trần Minh",
        phone: "0912345678",
        address: "456 Đường Nguyễn Huệ, Quận 3, TP. Hồ Chí Minh",
        wrist_circumference: 170,
        total_price: 49000,
        payment_status: "paid",
        fulfillment_status: "pending",
        created_at: "2026-09-22T09:00:00.000Z",
        updated_at: "2026-09-22T09:05:00.000Z",
      },
    ];

    // 10. Order Slots (with price snapshots!)
    const orderSlots: OrderSlotRecord[] = [
      // ord-01
      { id: "os-101", order_id: "ord-01", slot_index: 0, bead_type_id: "rose-quartz", unit_price: 15000 },
      { id: "os-102", order_id: "ord-01", slot_index: 1, bead_type_id: "amethyst", unit_price: 18000 },
      { id: "os-103", order_id: "ord-01", slot_index: 2, bead_type_id: "gold-bead", unit_price: 30000 },
      // ord-02
      { id: "os-201", order_id: "ord-02", slot_index: 0, bead_type_id: "obsidian", unit_price: 14000 },
      { id: "os-202", order_id: "ord-02", slot_index: 1, bead_type_id: "moonstone", unit_price: 20000 },
      { id: "os-203", order_id: "ord-02", slot_index: 2, bead_type_id: "gold-bead", unit_price: 30000 },
      // ord-03
      { id: "os-301", order_id: "ord-03", slot_index: 0, bead_type_id: "rose-quartz", unit_price: 15000 },
      { id: "os-302", order_id: "ord-03", slot_index: 1, bead_type_id: "pearl-white", unit_price: 22000 },
      { id: "os-303", order_id: "ord-03", slot_index: 2, bead_type_id: "gold-bead", unit_price: 30000 },
      { id: "os-304", order_id: "ord-03", slot_index: 3, bead_type_id: "rose-quartz", unit_price: 15000 },
      // ord-04
      { id: "os-401", order_id: "ord-04", slot_index: 0, bead_type_id: "sandalwood", unit_price: 10000 },
      { id: "os-402", order_id: "ord-04", slot_index: 1, bead_type_id: "turquoise", unit_price: 16000 },
      { id: "os-403", order_id: "ord-04", slot_index: 2, bead_type_id: "lavender-jade", unit_price: 26000 },
      // ord-05
      { id: "os-501", order_id: "ord-05", slot_index: 0, bead_type_id: "obsidian", unit_price: 14000 },
      { id: "os-502", order_id: "ord-05", slot_index: 1, bead_type_id: "sandalwood", unit_price: 10000 },
      { id: "os-503", order_id: "ord-05", slot_index: 2, bead_type_id: "lavender-jade", unit_price: 25000 },
    ];

    // 11. Payment Logs
    const paymentLogs: PaymentLogRecord[] = [
      { id: "paylog-01", order_id: "ord-01", method: "momo", amount: 63000, status: "success", transaction_id: "MOMO1725100000000", raw_response: "{\"resultCode\":0,\"message\":\"Thành công\"}", created_at: "2026-05-20T10:05:00.000Z" },
      { id: "paylog-02", order_id: "ord-02", method: "momo", amount: 64000, status: "success", transaction_id: "MOMO1725200000000", raw_response: "{\"resultCode\":0,\"message\":\"Thành công\"}", created_at: "2026-06-15T14:35:00.000Z" },
      { id: "paylog-03", order_id: "ord-03", method: "momo", amount: 82000, status: "success", transaction_id: "MOMO1725300000000", raw_response: "{\"resultCode\":0,\"message\":\"Thành công\"}", created_at: "2026-07-10T11:05:00.000Z" },
      { id: "paylog-04", order_id: "ord-04", method: "momo", amount: 52000, status: "success", transaction_id: "MOMO1725400000000", raw_response: "{\"resultCode\":0,\"message\":\"Thành công\"}", created_at: "2026-08-05T16:25:00.000Z" },
      { id: "paylog-05", order_id: "ord-05", method: "momo", amount: 49000, status: "success", transaction_id: "MOMO1725500000000", raw_response: "{\"resultCode\":0,\"message\":\"Thành công\"}", created_at: "2026-09-22T09:05:00.000Z" },
    ];

    // 12. Admin Audit Logs
    const adminAuditLogs: AdminAuditLogRecord[] = [
      { id: "audit-01", admin_id: "usr-manager-01", action: "publish_template", target_table: "bracelet_templates", target_id: "tmpl-hong-ngoc-01", detail: "Xuất bản mẫu vòng tay Phong Thủy Hồng Ngọc", created_at: "2026-05-05T00:00:00.000Z" },
      { id: "audit-02", admin_id: "usr-manager-01", action: "update_bead_price", target_table: "bead_types", target_id: "gold-bead", detail: "Cập nhật giá bán Gold Accent từ 28,000đ lên 30,000đ", created_at: "2026-05-10T00:00:00.000Z" },
      { id: "audit-03", admin_id: "usr-admin-01", action: "create_user", target_table: "users", target_id: "usr-manager-01", detail: "Tạo tài khoản Quản lý cho Nguyễn Văn Quản Lý", created_at: "2026-05-01T00:00:00.000Z" },
    ];

    // Write all 12 JSON files
    await writeCollection("users.json", users);
    await writeCollection("user_addresses.json", userAddresses);
    await writeCollection("bead_types.json", beadTypes);
    await writeCollection("bracelet_templates.json", braceletTemplates);
    await writeCollection("bracelet_template_slots.json", braceletTemplateSlots);
    await writeCollection("custom_designs.json", customDesigns);
    await writeCollection("custom_design_slots.json", customDesignSlots);
    await writeCollection("favorites.json", favorites);
    await writeCollection("orders.json", orders);
    await writeCollection("order_slots.json", orderSlots);
    await writeCollection("payment_logs.json", paymentLogs);
    await writeCollection("admin_audit_logs.json", adminAuditLogs);

    return NextResponse.json({
      success: true,
      message: "Khởi tạo thành công dữ liệu mẫu cho toàn bộ 12 CSDL Collections!",
      stats: {
        users: users.length,
        user_addresses: userAddresses.length,
        bead_types: beadTypes.length,
        bracelet_templates: braceletTemplates.length,
        custom_designs: customDesigns.length,
        favorites: favorites.length,
        orders: orders.length,
        order_slots: orderSlots.length,
        payment_logs: paymentLogs.length,
        admin_audit_logs: adminAuditLogs.length,
      },
    });
  } catch (error) {
    console.error("[Seeder Error]", error);
    return NextResponse.json({ success: false, error: "Lỗi khởi tạo dữ liệu CSDL" }, { status: 500 });
  }
}
