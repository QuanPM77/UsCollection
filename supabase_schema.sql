-- ============================================================================
-- USCOLLECTION — SUPABASE POSTGRESQL SCHEMA & SEED SCRIPT (12 ERD TABLES)
-- Paste this entire file into Supabase SQL Editor and click "RUN"
-- ============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if re-running (Clean slate)
DROP TABLE IF EXISTS admin_audit_logs CASCADE;
DROP TABLE IF EXISTS payment_logs CASCADE;
DROP TABLE IF EXISTS order_slots CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS custom_design_slots CASCADE;
DROP TABLE IF EXISTS custom_designs CASCADE;
DROP TABLE IF EXISTS bracelet_template_slots CASCADE;
DROP TABLE IF EXISTS bracelet_templates CASCADE;
DROP TABLE IF EXISTS bead_types CASCADE;
DROP TABLE IF EXISTS user_addresses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY DEFAULT CONCAT('usr-', uuid_generate_v4()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'manager', 'admin')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked')),
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USER ADDRESSES TABLE
CREATE TABLE user_addresses (
    id VARCHAR(50) PRIMARY KEY DEFAULT CONCAT('addr-', uuid_generate_v4()),
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address_line TEXT NOT NULL,
    province VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. BEAD TYPES (CATALOG & INVENTORY) TABLE
CREATE TABLE bead_types (
    id VARCHAR(100) PRIMARY KEY, -- slug e.g. 'rose-quartz'
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    material VARCHAR(50) NOT NULL CHECK (material IN ('glass', 'crystal', 'wood', 'stone', 'pearl')),
    color_hex VARCHAR(20) NOT NULL,
    emissive_hex VARCHAR(20),
    metalness FLOAT NOT NULL DEFAULT 0.1,
    roughness FLOAT NOT NULL DEFAULT 0.3,
    description TEXT,
    cost_price INT NOT NULL DEFAULT 0,  -- Giá vốn
    sell_price INT NOT NULL DEFAULT 0,  -- Giá bán
    stock_quantity INT NOT NULL DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    diameter INT NOT NULL DEFAULT 8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. BRACELET TEMPLATES TABLE
CREATE TABLE bracelet_templates (
    id VARCHAR(50) PRIMARY KEY DEFAULT CONCAT('tmpl-', uuid_generate_v4()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    wrist_circumference INT NOT NULL DEFAULT 160,
    thumbnail_url TEXT,
    category VARCHAR(50) DEFAULT 'phong_thuy',
    is_featured BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. BRACELET TEMPLATE SLOTS TABLE
CREATE TABLE bracelet_template_slots (
    id VARCHAR(50) PRIMARY KEY DEFAULT CONCAT('tslot-', uuid_generate_v4()),
    template_id VARCHAR(50) NOT NULL REFERENCES bracelet_templates(id) ON DELETE CASCADE,
    slot_index INT NOT NULL,
    bead_type_id VARCHAR(100) NOT NULL REFERENCES bead_types(id) ON DELETE CASCADE
);

-- 6. CUSTOM DESIGNS TABLE (THIẾT KẾ CỦA TÔI)
CREATE TABLE custom_designs (
    id VARCHAR(50) PRIMARY KEY DEFAULT CONCAT('design-', uuid_generate_v4()),
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    wrist_circumference INT NOT NULL DEFAULT 160,
    thumbnail_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. CUSTOM DESIGN SLOTS TABLE
CREATE TABLE custom_design_slots (
    id VARCHAR(50) PRIMARY KEY DEFAULT CONCAT('cslot-', uuid_generate_v4()),
    design_id VARCHAR(50) NOT NULL REFERENCES custom_designs(id) ON DELETE CASCADE,
    slot_index INT NOT NULL,
    bead_type_id VARCHAR(100) NOT NULL REFERENCES bead_types(id) ON DELETE CASCADE
);

-- 8. FAVORITES TABLE
CREATE TABLE favorites (
    id VARCHAR(50) PRIMARY KEY DEFAULT CONCAT('fav-', uuid_generate_v4()),
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id VARCHAR(50) REFERENCES bracelet_templates(id) ON DELETE CASCADE,
    bead_type_id VARCHAR(100) REFERENCES bead_types(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. ORDERS TABLE
CREATE TABLE orders (
    id VARCHAR(50) PRIMARY KEY DEFAULT CONCAT('ord-', uuid_generate_v4()),
    order_code VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    source_design_id VARCHAR(50) REFERENCES custom_designs(id) ON DELETE SET NULL,
    source_template_id VARCHAR(50) REFERENCES bracelet_templates(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    wrist_circumference INT NOT NULL DEFAULT 160,
    total_price INT NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    fulfillment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (fulfillment_status IN ('pending', 'processing', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. ORDER SLOTS TABLE (WITH PRICE SNAPSHOT)
CREATE TABLE order_slots (
    id VARCHAR(50) PRIMARY KEY DEFAULT CONCAT('oslot-', uuid_generate_v4()),
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    slot_index INT NOT NULL,
    bead_type_id VARCHAR(100) NOT NULL REFERENCES bead_types(id) ON DELETE RESTRICT,
    unit_price INT NOT NULL DEFAULT 0 -- Price snapshot at purchase time
);

-- 11. PAYMENT LOGS TABLE
CREATE TABLE payment_logs (
    id VARCHAR(50) PRIMARY KEY DEFAULT CONCAT('paylog-', uuid_generate_v4()),
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL DEFAULT 'momo',
    amount INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'success', 'failed')),
    transaction_id VARCHAR(100),
    raw_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. ADMIN AUDIT LOGS TABLE
CREATE TABLE admin_audit_logs (
    id VARCHAR(50) PRIMARY KEY DEFAULT CONCAT('audit-', uuid_generate_v4()),
    admin_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    detail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INITIAL SEED DATA FOR SUPABASE
-- ============================================================================

-- Seed Users
INSERT INTO users (id, email, password_hash, full_name, phone, role, status) VALUES
('usr-admin-01', 'admin@beadstudio.com', '$2a$10$abcdef1234567890adminhash', 'Quản Trị Viên Hệ Thống', '0988888888', 'admin', 'active'),
('usr-manager-01', 'manager@beadstudio.com', '$2a$10$abcdef1234567890managerhash', 'Nguyễn Văn Quản Lý', '0977777777', 'manager', 'active'),
('usr-customer-01', 'khachhang@gmail.com', '$2a$10$abcdef1234567890customerhash', 'Lê Thị Thảo', '0901234567', 'customer', 'active'),
('usr-customer-02', 'tranminh@gmail.com', '$2a$10$abcdef1234567890customerhash2', 'Trần Minh', '0912345678', 'customer', 'active');

-- Seed User Addresses
INSERT INTO user_addresses (id, user_id, recipient_name, phone, address_line, province, is_default) VALUES
('addr-01', 'usr-customer-01', 'Lê Thị Thảo', '0901234567', '123 Đường Lê Lợi, Phường Bến Thành, Quận 1', 'TP. Hồ Chí Minh', TRUE),
('addr-02', 'usr-customer-02', 'Trần Minh', '0912345678', '456 Đường Nguyễn Huệ, Quận 3', 'TP. Hồ Chí Minh', TRUE);

-- Seed Bead Types
INSERT INTO bead_types (id, code, name, material, color_hex, emissive_hex, metalness, roughness, description, cost_price, sell_price, stock_quantity, diameter) VALUES
('rose-quartz', 'BEAD-RQ-01', 'Rose Quartz', 'crystal', '#F4A7B9', '#FF8FAB', 0.1, 0.3, 'Pha lê hồng nhạt, biểu tượng của tình yêu và sự chữa lành', 7000, 15000, 250, 8),
('amethyst', 'BEAD-AM-02', 'Amethyst', 'crystal', '#9B59B6', '#7D3C98', 0.1, 0.25, 'Tím amethyst, mang lại sự tập trung và bình yên tâm trí', 8500, 18000, 180, 8),
('pearl-white', 'BEAD-PW-03', 'White Pearl', 'pearl', '#F8F0E3', NULL, 0.3, 0.1, 'Ngọc trai trắng thuần khiết, quý phái', 10000, 22000, 120, 6),
('moonstone', 'BEAD-MS-04', 'Moonstone', 'stone', '#E8E8F0', '#C5C5E0', 0.15, 0.2, 'Đá mặt trăng huyền bí, gia tăng trực giác', 9500, 20000, 200, 8),
('turquoise', 'BEAD-TQ-05', 'Turquoise', 'stone', '#40E0D0', NULL, 0.05, 0.5, 'Ngọc lam xanh biển rực rỡ, mang năng lượng tích cực', 7500, 16000, 150, 8),
('gold-bead', 'BEAD-GD-06', 'Gold Accent', 'crystal', '#FFD700', '#B8860B', 0.9, 0.05, 'Hạt mạ vàng điểm nhấn sang trọng', 14000, 30000, 90, 4),
('obsidian', 'BEAD-OB-07', 'Black Obsidian', 'stone', '#2C2C2C', NULL, 0.4, 0.15, 'Đá hắc diệu xua tan năng lượng tiêu cực', 6000, 14000, 300, 10),
('sandalwood', 'BEAD-SW-08', 'Sandalwood', 'wood', '#C19A6B', NULL, 0.0, 0.8, 'Gỗ đàn hương tự nhiên thơm nhẹ thư thái', 4500, 10000, 400, 8),
('cherry-glass', 'BEAD-CG-09', 'Cherry Glass', 'glass', '#DC143C', '#8B0000', 0.05, 0.05, 'Hạt thủy tinh đỏ anh đào nổi bật', 5000, 12000, 220, 6),
('lavender-jade', 'BEAD-LJ-10', 'Lavender Jade', 'stone', '#B57EDC', NULL, 0.1, 0.35, 'Ngọc bích oải hương thanh lịch, may mắn', 11000, 25000, 110, 8);

-- Seed Bracelet Templates
INSERT INTO bracelet_templates (id, name, description, wrist_circumference, thumbnail_url, category, is_featured, status, created_by) VALUES
('tmpl-hong-ngoc-01', 'Vòng Phong Thủy Hồng Ngọc', 'Kết hợp giữa Rose Quartz và Ngọc Trai Trắng cho nét tinh tế, dịu dàng.', 160, '/templates/rose-quartz.png', 'phong_thuy', TRUE, 'published', 'usr-manager-01'),
('tmpl-dem-trang-02', 'Vòng Tay Đêm Trăng Huyền Bí', 'Đá Mặt Trăng và Hắc Diệu mang lại sự bảo vệ năng lượng vượt trội.', 170, '/templates/moonstone.png', 'toi_gian', TRUE, 'published', 'usr-manager-01'),
('tmpl-boho-03', 'Vòng Tay Boho Đàn Hương', 'Mộc mạc nhưng cá tính với gỗ đàn hương và đá Turquoise.', 165, '/templates/boho.png', 'dieu_da', FALSE, 'published', 'usr-manager-01');

-- Seed Template Slots
INSERT INTO bracelet_template_slots (id, template_id, slot_index, bead_type_id) VALUES
('tmpl-slot-1', 'tmpl-hong-ngoc-01', 0, 'rose-quartz'),
('tmpl-slot-2', 'tmpl-hong-ngoc-01', 1, 'pearl-white'),
('tmpl-slot-3', 'tmpl-hong-ngoc-01', 2, 'gold-bead'),
('tmpl-slot-4', 'tmpl-hong-ngoc-01', 3, 'rose-quartz'),
('tmpl-slot-5', 'tmpl-dem-trang-02', 0, 'obsidian'),
('tmpl-slot-6', 'tmpl-dem-trang-02', 1, 'moonstone'),
('tmpl-slot-7', 'tmpl-dem-trang-02', 2, 'gold-bead');

-- Seed Custom Designs
INSERT INTO custom_designs (id, user_id, name, wrist_circumference, is_public) VALUES
('design-cust-01', 'usr-customer-01', 'Vòng Tay Tình Yêu & May Mắn', 160, TRUE),
('design-cust-02', 'usr-customer-02', 'Vòng Đi Làm Tối Giản', 170, FALSE);

-- Seed Custom Design Slots
INSERT INTO custom_design_slots (id, design_id, slot_index, bead_type_id) VALUES
('cd-slot-1', 'design-cust-01', 0, 'rose-quartz'),
('cd-slot-2', 'design-cust-01', 1, 'amethyst'),
('cd-slot-3', 'design-cust-01', 2, 'gold-bead'),
('cd-slot-4', 'design-cust-02', 0, 'obsidian'),
('cd-slot-5', 'design-cust-02', 1, 'sandalwood');

-- Seed Favorites
INSERT INTO favorites (id, user_id, template_id, bead_type_id) VALUES
('fav-01', 'usr-customer-01', 'tmpl-hong-ngoc-01', NULL),
('fav-02', 'usr-customer-01', NULL, 'rose-quartz');

-- Seed Orders
INSERT INTO orders (id, order_code, user_id, source_design_id, customer_name, phone, address, wrist_circumference, total_price, payment_status, fulfillment_status, created_at) VALUES
('ord-01', 'BS-1725100000000', 'usr-customer-01', 'design-cust-01', 'Lê Thị Thảo', '0901234567', '123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh', 160, 63000, 'paid', 'completed', '2026-05-20 10:00:00+07'),
('ord-02', 'BS-1725200000000', 'usr-customer-02', NULL, 'Trần Minh', '0912345678', '456 Đường Nguyễn Huệ, Quận 3, TP. Hồ Chí Minh', 170, 64000, 'paid', 'completed', '2026-06-15 14:30:00+07'),
('ord-03', 'BS-1725300000000', 'usr-customer-01', NULL, 'Lê Thị Thảo', '0901234567', '123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh', 160, 82000, 'paid', 'completed', '2026-07-10 11:00:00+07'),
('ord-04', 'BS-1725400000000', NULL, NULL, 'Phạm Quốc Tuấn', '0933445566', '789 Đường Nam Kỳ Khởi Nghĩa, Quận 3, TP. Hồ Chí Minh', 165, 52000, 'paid', 'processing', '2026-08-05 16:20:00+07'),
('ord-05', 'BS-1725500000000', 'usr-customer-02', 'design-cust-02', 'Trần Minh', '0912345678', '456 Đường Nguyễn Huệ, Quận 3, TP. Hồ Chí Minh', 170, 49000, 'paid', 'pending', '2026-09-22 09:00:00+07');

-- Seed Order Slots
INSERT INTO order_slots (id, order_id, slot_index, bead_type_id, unit_price) VALUES
('os-101', 'ord-01', 0, 'rose-quartz', 15000),
('os-102', 'ord-01', 1, 'amethyst', 18000),
('os-103', 'ord-01', 2, 'gold-bead', 30000),
('os-201', 'ord-02', 0, 'obsidian', 14000),
('os-202', 'ord-02', 1, 'moonstone', 20000),
('os-203', 'ord-02', 2, 'gold-bead', 30000),
('os-301', 'ord-03', 0, 'rose-quartz', 15000),
('os-302', 'ord-03', 1, 'pearl-white', 22000),
('os-303', 'ord-03', 2, 'gold-bead', 30000),
('os-304', 'ord-03', 3, 'rose-quartz', 15000),
('os-401', 'ord-04', 0, 'sandalwood', 10000),
('os-402', 'ord-04', 1, 'turquoise', 16000),
('os-403', 'ord-04', 2, 'lavender-jade', 26000),
('os-501', 'ord-05', 0, 'obsidian', 14000),
('os-502', 'ord-05', 1, 'sandalwood', 10000),
('os-503', 'ord-05', 2, 'lavender-jade', 25000);

-- Seed Payment Logs
INSERT INTO payment_logs (id, order_id, method, amount, status, transaction_id, raw_response) VALUES
('paylog-01', 'ord-01', 'momo', 63000, 'success', 'MOMO1725100000000', '{"resultCode":0,"message":"Thành công"}'),
('paylog-02', 'ord-02', 'momo', 64000, 'success', 'MOMO1725200000000', '{"resultCode":0,"message":"Thành công"}'),
('paylog-03', 'ord-03', 'momo', 82000, 'success', 'MOMO1725300000000', '{"resultCode":0,"message":"Thành công"}'),
('paylog-04', 'ord-04', 'momo', 52000, 'success', 'MOMO1725400000000', '{"resultCode":0,"message":"Thành công"}'),
('paylog-05', 'ord-05', 'momo', 49000, 'success', 'MOMO1725500000000', '{"resultCode":0,"message":"Thành công"}');

-- Seed Admin Audit Logs
INSERT INTO admin_audit_logs (id, admin_id, action, target_table, target_id, detail) VALUES
('audit-01', 'usr-manager-01', 'publish_template', 'bracelet_templates', 'tmpl-hong-ngoc-01', 'Xuất bản mẫu vòng tay Phong Thủy Hồng Ngọc'),
('audit-02', 'usr-manager-01', 'update_bead_price', 'bead_types', 'gold-bead', 'Cập nhật giá bán Gold Accent từ 28,000đ lên 30,000đ'),
('audit-03', 'usr-admin-01', 'create_user', 'users', 'usr-manager-01', 'Tạo tài khoản Quản lý cho Nguyễn Văn Quản Lý');
