ALTER TABLE "bead_product_details"
ADD COLUMN "emissive_color" TEXT,
ADD COLUMN "diameter" INTEGER NOT NULL DEFAULT 8;

WITH seed("sku", "name", "description", "price", "material", "color", "emissive", "metalness", "roughness", "diameter") AS (
  VALUES
    ('rose-quartz', 'Rose Quartz', 'Pha lê hồng nhạt, biểu tượng của tình yêu', 15000, 'crystal', '#F4A7B9', '#FF8FAB', 0.1, 0.3, 8),
    ('amethyst', 'Amethyst', 'Tím amethyst, mang lại bình yên', 18000, 'crystal', '#9B59B6', '#7D3C98', 0.1, 0.25, 8),
    ('pearl-white', 'White Pearl', 'Ngọc trai trắng thuần khiết', 22000, 'pearl', '#F8F0E3', NULL, 0.3, 0.1, 6),
    ('moonstone', 'Moonstone', 'Đá mặt trăng huyền bí', 20000, 'stone', '#E8E8F0', '#C5C5E0', 0.15, 0.2, 8),
    ('turquoise', 'Turquoise', 'Ngọc lam xanh biển rực rỡ', 16000, 'stone', '#40E0D0', NULL, 0.05, 0.5, 8),
    ('gold-bead', 'Gold Accent', 'Hạt vàng sang trọng', 30000, 'crystal', '#FFD700', '#B8860B', 0.9, 0.05, 4),
    ('obsidian', 'Black Obsidian', 'Đá hắc diệu, bảo vệ năng lượng', 14000, 'stone', '#2C2C2C', NULL, 0.4, 0.15, 10),
    ('sandalwood', 'Sandalwood', 'Gỗ đàn hương thơm nhẹ', 10000, 'wood', '#C19A6B', NULL, 0.0, 0.8, 8),
    ('cherry-glass', 'Cherry Glass', 'Hạt thủy tinh đỏ anh đào', 12000, 'glass', '#DC143C', '#8B0000', 0.05, 0.05, 6),
    ('lavender-jade', 'Lavender Jade', 'Ngọc bích oải hương thanh lịch', 25000, 'stone', '#B57EDC', NULL, 0.1, 0.35, 8)
)
INSERT INTO "products" ("id", "sku", "type", "name", "description", "price", "stock", "status")
SELECT gen_random_uuid(), seed."sku", 'bead'::"product_type", seed."name", seed."description", seed."price", 1000, 'active'::"product_status"
FROM seed
ON CONFLICT ("sku") DO NOTHING;

WITH seed("sku", "material", "color", "emissive", "metalness", "roughness", "diameter") AS (
  VALUES
    ('rose-quartz', 'crystal', '#F4A7B9', '#FF8FAB', 0.1, 0.3, 8),
    ('amethyst', 'crystal', '#9B59B6', '#7D3C98', 0.1, 0.25, 8),
    ('pearl-white', 'pearl', '#F8F0E3', NULL, 0.3, 0.1, 6),
    ('moonstone', 'stone', '#E8E8F0', '#C5C5E0', 0.15, 0.2, 8),
    ('turquoise', 'stone', '#40E0D0', NULL, 0.05, 0.5, 8),
    ('gold-bead', 'crystal', '#FFD700', '#B8860B', 0.9, 0.05, 4),
    ('obsidian', 'stone', '#2C2C2C', NULL, 0.4, 0.15, 10),
    ('sandalwood', 'wood', '#C19A6B', NULL, 0.0, 0.8, 8),
    ('cherry-glass', 'glass', '#DC143C', '#8B0000', 0.05, 0.05, 6),
    ('lavender-jade', 'stone', '#B57EDC', NULL, 0.1, 0.35, 8)
)
INSERT INTO "bead_product_details" ("product_id", "material", "color", "emissive_color", "diameter", "metalness", "roughness")
SELECT p."id", seed."material"::"bead_material", seed."color", seed."emissive", seed."diameter", seed."metalness", seed."roughness"
FROM seed JOIN "products" p ON p."sku" = seed."sku" AND p."type" = 'bead'::"product_type"
ON CONFLICT ("product_id") DO NOTHING;
