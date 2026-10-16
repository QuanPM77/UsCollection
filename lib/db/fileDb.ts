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
  CharmRecord,
  VongTayMauRecord,
  KhachHangRecord,
} from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function readJsonFile<T>(filename: string, defaultValue: T): Promise<T> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as T;
  } catch (error) {
    await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), "utf-8");
    return defaultValue;
  }
}

async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ─── 1. Users ────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<UserRecord[]> {
  return readJsonFile<UserRecord[]>("users.json", []);
}

export async function getUserByEmail(email: string): Promise<UserRecord | undefined> {
  const users = await getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function getUserById(id: string): Promise<UserRecord | undefined> {
  const users = await getUsers();
  return users.find((u) => u.id === id);
}

export async function createUser(user: Omit<UserRecord, "id" | "created_at" | "updated_at"> & { id?: string }): Promise<UserRecord> {
  const users = await getUsers();
  const now = new Date().toISOString();
  const newRecord: UserRecord = {
    ...user,
    id: user.id || `usr-${Date.now()}`,
    created_at: now,
    updated_at: now,
  };
  users.push(newRecord);
  await writeJsonFile("users.json", users);
  return newRecord;
}

// ─── 2. User Addresses ───────────────────────────────────────────────────────

export async function getUserAddresses(userId: string): Promise<UserAddressRecord[]> {
  const addresses = await readJsonFile<UserAddressRecord[]>("user_addresses.json", []);
  return addresses.filter((a) => a.user_id === userId);
}

export async function addUserAddress(addr: Omit<UserAddressRecord, "id" | "created_at"> & { id?: string }): Promise<UserAddressRecord> {
  const addresses = await readJsonFile<UserAddressRecord[]>("user_addresses.json", []);
  const newRecord: UserAddressRecord = {
    ...addr,
    id: addr.id || `addr-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  addresses.push(newRecord);
  await writeJsonFile("user_addresses.json", addresses);
  return newRecord;
}

// ─── 3. Bead Types (Catalog) ────────────────────────────────────────────────

export async function getBeadTypes(): Promise<BeadTypeRecord[]> {
  return readJsonFile<BeadTypeRecord[]>("bead_types.json", []);
}

export async function getBeadTypeById(id: string): Promise<BeadTypeRecord | undefined> {
  const beads = await getBeadTypes();
  return beads.find((b) => b.id === id);
}

export async function saveBeadType(bead: BeadTypeRecord): Promise<BeadTypeRecord> {
  const beads = await getBeadTypes();
  const idx = beads.findIndex((b) => b.id === bead.id);
  if (idx >= 0) {
    beads[idx] = { ...beads[idx], ...bead, updated_at: new Date().toISOString() };
  } else {
    beads.push(bead);
  }
  await writeJsonFile("bead_types.json", beads);
  return bead;
}

// Backward compatibility alias for charms
export async function getCharms(): Promise<CharmRecord[]> {
  return getBeadTypes();
}

// ─── 4. Bracelet Templates & Template Slots ──────────────────────────────────

export async function getBraceletTemplates(): Promise<BraceletTemplateRecord[]> {
  return readJsonFile<BraceletTemplateRecord[]>("bracelet_templates.json", []);
}

export async function getBraceletTemplateSlots(templateId: string): Promise<BraceletTemplateSlotRecord[]> {
  const slots = await readJsonFile<BraceletTemplateSlotRecord[]>("bracelet_template_slots.json", []);
  return slots.filter((s) => s.template_id === templateId);
}

export async function createBraceletTemplate(
  template: Omit<BraceletTemplateRecord, "id" | "created_at" | "updated_at"> & { id?: string },
  slots: { slot_index: number; bead_type_id: string }[]
): Promise<BraceletTemplateRecord> {
  const templates = await getBraceletTemplates();
  const now = new Date().toISOString();
  const newTemplate: BraceletTemplateRecord = {
    ...template,
    id: template.id || `tmpl-${Date.now()}`,
    created_at: now,
    updated_at: now,
  };
  templates.push(newTemplate);
  await writeJsonFile("bracelet_templates.json", templates);

  const allSlots = await readJsonFile<BraceletTemplateSlotRecord[]>("bracelet_template_slots.json", []);
  const newSlots = slots.map((s, idx) => ({
    id: `tmpl-slot-${Date.now()}-${idx}`,
    template_id: newTemplate.id,
    slot_index: s.slot_index,
    bead_type_id: s.bead_type_id,
  }));
  await writeJsonFile("bracelet_template_slots.json", [...allSlots, ...newSlots]);

  return newTemplate;
}

// Backward compatibility alias
export async function getVongTayMau(): Promise<VongTayMauRecord[]> {
  const templates = await getBraceletTemplates();
  const allSlots = await readJsonFile<BraceletTemplateSlotRecord[]>("bracelet_template_slots.json", []);
  const beads = await getBeadTypes();

  return templates.map((t) => {
    const tSlots = allSlots.filter((s) => s.template_id === t.id).sort((a, b) => a.slot_index - b.slot_index);
    const beadIds = tSlots.map((s) => s.bead_type_id);
    const totalPrice = beadIds.reduce((sum, id) => {
      const b = beads.find((x) => x.id === id);
      return sum + (b ? b.sell_price : 0);
    }, 0);

    return {
      id: t.id,
      ten: t.name,
      moTa: t.description,
      chuViCoTay: t.wrist_circumference,
      danhSachCharm: beadIds,
      tongTien: totalPrice,
    };
  });
}

// ─── 5. Custom Designs & Custom Design Slots ─────────────────────────────────

export async function getCustomDesigns(userId: string): Promise<CustomDesignRecord[]> {
  const designs = await readJsonFile<CustomDesignRecord[]>("custom_designs.json", []);
  return designs.filter((d) => d.user_id === userId);
}

export async function getCustomDesignSlots(designId: string): Promise<CustomDesignSlotRecord[]> {
  const slots = await readJsonFile<CustomDesignSlotRecord[]>("custom_design_slots.json", []);
  return slots.filter((s) => s.design_id === designId);
}

export async function createCustomDesign(
  design: Omit<CustomDesignRecord, "id" | "created_at" | "updated_at"> & { id?: string },
  slots: { slot_index: number; bead_type_id: string }[]
): Promise<CustomDesignRecord> {
  const designs = await readJsonFile<CustomDesignRecord[]>("custom_designs.json", []);
  const now = new Date().toISOString();
  const newDesign: CustomDesignRecord = {
    ...design,
    id: design.id || `design-${Date.now()}`,
    created_at: now,
    updated_at: now,
  };
  designs.push(newDesign);
  await writeJsonFile("custom_designs.json", designs);

  const allSlots = await readJsonFile<CustomDesignSlotRecord[]>("custom_design_slots.json", []);
  const newSlots = slots.map((s, idx) => ({
    id: `cd-slot-${Date.now()}-${idx}`,
    design_id: newDesign.id,
    slot_index: s.slot_index,
    bead_type_id: s.bead_type_id,
  }));
  await writeJsonFile("custom_design_slots.json", [...allSlots, ...newSlots]);

  return newDesign;
}

// ─── 6. Favorites ─────────────────────────────────────────────────────────────

export async function getFavorites(userId: string): Promise<FavoriteRecord[]> {
  const favorites = await readJsonFile<FavoriteRecord[]>("favorites.json", []);
  return favorites.filter((f) => f.user_id === userId);
}

export async function toggleFavorite(
  userId: string,
  target: { template_id?: string | null; bead_type_id?: string | null }
): Promise<{ action: "added" | "removed" }> {
  const favorites = await readJsonFile<FavoriteRecord[]>("favorites.json", []);
  const existingIdx = favorites.findIndex(
    (f) =>
      f.user_id === userId &&
      ((target.template_id && f.template_id === target.template_id) ||
        (target.bead_type_id && f.bead_type_id === target.bead_type_id))
  );

  if (existingIdx >= 0) {
    favorites.splice(existingIdx, 1);
    await writeJsonFile("favorites.json", favorites);
    return { action: "removed" };
  } else {
    favorites.push({
      id: `fav-${Date.now()}`,
      user_id: userId,
      template_id: target.template_id || null,
      bead_type_id: target.bead_type_id || null,
      created_at: new Date().toISOString(),
    });
    await writeJsonFile("favorites.json", favorites);
    return { action: "added" };
  }
}

// ─── 7. Orders & Order Slots ─────────────────────────────────────────────────

export async function getOrders(): Promise<OrderRecord[]> {
  return readJsonFile<OrderRecord[]>("orders.json", []);
}

export async function getOrderById(id: string): Promise<OrderRecord | undefined> {
  const orders = await getOrders();
  return orders.find((o) => o.id === id || o.order_code === id);
}

export async function getOrderSlots(orderId: string): Promise<OrderSlotRecord[]> {
  const slots = await readJsonFile<OrderSlotRecord[]>("order_slots.json", []);
  return slots.filter((s) => s.order_id === orderId);
}

export async function createOrderWithSlots(
  order: Omit<OrderRecord, "id" | "order_code" | "created_at" | "updated_at"> & { id?: string; order_code?: string },
  beadSlotIds: (string | null)[]
): Promise<{ order: OrderRecord; slots: OrderSlotRecord[] }> {
  const orders = await getOrders();
  const beads = await getBeadTypes();
  const now = new Date().toISOString();

  const newOrder: OrderRecord = {
    ...order,
    id: order.id || `ord-${Date.now()}`,
    order_code: order.order_code || `BS-${Date.now()}`,
    created_at: now,
    updated_at: now,
  };

  orders.push(newOrder);
  await writeJsonFile("orders.json", orders);

  const allOrderSlots = await readJsonFile<OrderSlotRecord[]>("order_slots.json", []);
  const createdSlots: OrderSlotRecord[] = [];

  beadSlotIds.forEach((beadId, index) => {
    if (beadId) {
      const bead = beads.find((b) => b.id === beadId);
      const unitPrice = bead ? bead.sell_price : 0;
      createdSlots.push({
        id: `os-${Date.now()}-${index}`,
        order_id: newOrder.id,
        slot_index: index,
        bead_type_id: beadId,
        unit_price: unitPrice, // Price Snapshot
      });
    }
  });

  await writeJsonFile("order_slots.json", [...allOrderSlots, ...createdSlots]);

  return { order: newOrder, slots: createdSlots };
}

export async function updateTrangThaiThanhToan(
  id: string,
  trangThai: "chua_thanh_toan" | "da_thanh_toan" | "that_bai"
): Promise<OrderRecord | null> {
  const orders = await getOrders();
  const order = orders.find((o) => o.id === id || o.order_code === id);
  if (order) {
    order.payment_status = trangThai === "da_thanh_toan" ? "paid" : trangThai === "that_bai" ? "failed" : "pending";
    order.updated_at = new Date().toISOString();
    await writeJsonFile("orders.json", orders);
    return order;
  }
  return null;
}

// Backward compatibility alias
export async function getKhachHang(): Promise<KhachHangRecord[]> {
  const orders = await getOrders();
  const allSlots = await readJsonFile<OrderSlotRecord[]>("order_slots.json", []);

  return orders.map((o) => {
    const oSlots = allSlots.filter((s) => s.order_id === o.id).sort((a, b) => a.slot_index - b.slot_index);
    const beadList = oSlots.map((s) => s.bead_type_id);

    return {
      id: o.id,
      hoTen: o.customer_name,
      soDienThoai: o.phone,
      diaChi: o.address,
      cauHinhVong: {
        chuViCoTay: o.wrist_circumference,
        danhSachCharm: beadList,
      },
      tongTien: o.total_price,
      phuongThucThanhToan: "momo",
      trangThaiThanhToan: o.payment_status === "paid" ? "da_thanh_toan" : o.payment_status === "failed" ? "that_bai" : "chua_thanh_toan",
      ngayTao: o.created_at,
    };
  });
}

// ─── 8. Payment Logs ─────────────────────────────────────────────────────────

export async function addPaymentLog(log: Omit<PaymentLogRecord, "id" | "created_at">): Promise<PaymentLogRecord> {
  const logs = await readJsonFile<PaymentLogRecord[]>("payment_logs.json", []);
  const newLog: PaymentLogRecord = {
    ...log,
    id: `paylog-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  logs.push(newLog);
  await writeJsonFile("payment_logs.json", logs);
  return newLog;
}

// ─── 9. Admin Audit Logs ─────────────────────────────────────────────────────

export async function getAdminAuditLogs(): Promise<AdminAuditLogRecord[]> {
  return readJsonFile<AdminAuditLogRecord[]>("admin_audit_logs.json", []);
}

export async function addAdminAuditLog(
  adminId: string,
  action: string,
  targetTable: string,
  targetId: string,
  detail: string
): Promise<AdminAuditLogRecord> {
  const logs = await getAdminAuditLogs();
  const newLog: AdminAuditLogRecord = {
    id: `audit-${Date.now()}`,
    admin_id: adminId,
    action,
    target_table: targetTable,
    target_id: targetId,
    detail,
    created_at: new Date().toISOString(),
  };
  logs.push(newLog);
  await writeJsonFile("admin_audit_logs.json", logs);
  return newLog;
}

// ─── 10. Financial Report (Teammate SQL Query Logic) ─────────────────────────

export interface FinancialReportItem {
  thang: string; // YYYY-MM
  doanh_thu: number;
  gia_von: number;
  loi_nhuan: number;
}

export async function getFinancialReport(): Promise<FinancialReportItem[]> {
  const orders = await getOrders();
  const paidOrders = orders.filter((o) => o.payment_status === "paid");
  const allOrderSlots = await readJsonFile<OrderSlotRecord[]>("order_slots.json", []);
  const beadTypes = await getBeadTypes();

  const monthlyData: Record<string, { doanh_thu: number; gia_von: number }> = {};

  for (const order of paidOrders) {
    const month = order.created_at.substring(0, 7); // "YYYY-MM"
    if (!monthlyData[month]) {
      monthlyData[month] = { doanh_thu: 0, gia_von: 0 };
    }

    const oSlots = allOrderSlots.filter((s) => s.order_id === order.id);
    for (const slot of oSlots) {
      const bead = beadTypes.find((b) => b.id === slot.bead_type_id);
      const unitPrice = slot.unit_price;
      const costPrice = bead ? bead.cost_price : 0;

      monthlyData[month].doanh_thu += unitPrice;
      monthlyData[month].gia_von += costPrice;
    }
  }

  return Object.entries(monthlyData).map(([thang, data]) => ({
    thang,
    doanh_thu: data.doanh_thu,
    gia_von: data.gia_von,
    loi_nhuan: data.doanh_thu - data.gia_von,
  }));
}
