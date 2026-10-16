import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

const COLLECTION_FILES = [
  "users.json",
  "user_addresses.json",
  "bead_types.json",
  "bracelet_templates.json",
  "bracelet_template_slots.json",
  "custom_designs.json",
  "custom_design_slots.json",
  "favorites.json",
  "orders.json",
  "order_slots.json",
  "payment_logs.json",
  "admin_audit_logs.json",
];

export async function GET() {
  try {
    const backupData: Record<string, any> = {};

    for (const filename of COLLECTION_FILES) {
      const filePath = path.join(DATA_DIR, filename);
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const collectionName = filename.replace(".json", "");
        backupData[collectionName] = JSON.parse(content);
      } catch {
        backupData[filename.replace(".json", "")] = [];
      }
    }

    return NextResponse.json({
      success: true,
      exported_at: new Date().toISOString(),
      collections_count: Object.keys(backupData).length,
      database: backupData,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi sao lưu CSDL" }, { status: 500 });
  }
}
