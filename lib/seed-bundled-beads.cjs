const fs = require('node:fs');
const path = require('node:path');

const bundledBeads = [
  { sku: 'crackle-do-den', name: 'Hạt thủy tinh rạn đỏ đen', color: '#C8452E', diameter: 8, roughness: .05, files: ['textures/beads/crackle-do-den.webp', 'textures/beads/crackle-do-den-cracks.webp'] },
  { sku: 'crackle-tim', name: 'Hạt thủy tinh rạn tím', color: '#8A4FCC', diameter: 8, roughness: .05, files: ['textures/beads/crackle-tim.webp', 'textures/beads/crackle-tim-cracks.webp'] },
  { sku: 'ab-xanh-duong', name: 'Hạt AB xanh dương', color: '#2E9FD9', diameter: 8, roughness: .18, files: ['textures/beads/ab-xanh-duong.webp'] },
  { sku: 'trong-xanh-bac-ha', name: 'Hạt trong xanh bạc hà', color: '#CDEBDD', diameter: 8, roughness: .03, files: ['textures/beads/trong-xanh-bac-ha.webp'] },
  { sku: 'cupcake-hong', name: 'Hạt cupcake hồng', color: '#F3B8C6', diameter: 13, roughness: .3, files: ['models/beads/cupcake-hong.glb'] },
  // These GLBs are roughly 14.6 mm wide; use their true footprint for layout.
  { sku: 'charm-meo-vang', name: 'Charm mèo vàng', color: '#F5D88A', diameter: 15, roughness: .3, files: ['models/charms/charm-meo-vang.glb'] },
  { sku: 'charm-meo-hong', name: 'Charm mèo hồng', color: '#F29CB4', diameter: 15, roughness: .3, files: ['models/charms/charm-meo-hong.glb'] },
];

function verifyFiles(root) {
  for (const bead of bundledBeads) for (const file of [...bead.files, `thumbnails/beads/${bead.sku}.webp`]) {
    if (!fs.existsSync(path.join(root, 'public', file))) throw Error(`Thiếu tài nguyên: ${file}`);
  }
}

async function seedBundledBeads(db, root) {
  verifyFiles(root);
  return db.$transaction(async tx => {
    const results = [];
    for (const bead of bundledBeads) {
      const existing = await tx.products.findUnique({ where: { sku: bead.sku }, select: { id: true, type: true } });
      if (existing && existing.type !== 'bead') throw Error(`Mã ${bead.sku} đã thuộc sản phẩm khác; không ghi đè.`);
      const product = await tx.products.upsert({
        where: { sku: bead.sku }, update: {},
        create: { sku: bead.sku, name: bead.name, type: 'bead', price: 0, cost_price: null, stock: 0, status: 'active',
          description: 'Mẫu có sẵn từ tài nguyên 3D. Cần cập nhật giá bán, giá vốn và tồn kho thực tế trước khi bán.' },
      });
      await tx.bead_product_details.upsert({
        where: { product_id: product.id }, update: {},
        create: { product_id: product.id, material: 'glass', color: bead.color, emissive_color: null,
          diameter: bead.diameter, metalness: 0, roughness: bead.roughness },
      });
      results.push({ sku: bead.sku, name: bead.name, result: existing ? 'Giữ hạt đã có' : 'Đã tạo' });
    }
    return results;
  }, { maxWait: 10_000, timeout: 30_000 });
}

module.exports = { bundledBeads, verifyFiles, seedBundledBeads };
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  require('@next/env').loadEnvConfig(root);
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  seedBundledBeads(db, root).then(rows => {
    console.table(rows);
    console.log('Hạt mới có giá 0, tồn kho 0 và chưa có giá vốn. Hãy cập nhật trong Admin trước khi bán.');
  }).catch(error => {
    console.error(error.name === 'PrismaClientInitializationError'
      ? 'Không kết nối được database. Chưa xác nhận nhập hạt; kiểm tra kết nối và chạy lại npm run beads:import.'
      : String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g, '[database URL]'));
    process.exitCode = 1;
  }).finally(() => db.$disconnect());
}
