import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const defaults = { store_name: "UsStory", store_description: "", contact_phone: "", contact_email: "", address: "", low_stock_threshold: 5, currency: "VND", order_auto_confirm: false };
type SocialLink = { name: string; url: string };
type SavedSocialLink = SocialLink & { id: string; sort_order: number; created_at: Date };
const settingsSelect = {
  id: true,
  store_name: true,
  contact_phone: true,
  contact_email: true,
  low_stock_threshold: true,
  currency: true,
  order_auto_confirm: true,
} as const;

async function requireAdmin() {
  const session = await auth();
  return session?.user?.id && session.user.role === "admin";
}

async function readSocialLinks(client: Pick<typeof prisma, "$queryRaw">): Promise<SocialLink[]> {
  const links = await client.$queryRaw<SavedSocialLink[]>`
    SELECT "id", "name", "url", "sort_order", "created_at"
    FROM "store_social_links"
    ORDER BY "sort_order" ASC, "created_at" ASC
  `;
  return links.map(({ name, url }) => ({ name, url }));
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  const [settings, socialLinks] = await Promise.all([
    prisma.store_settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {}, select: settingsSelect }),
    readSocialLinks(prisma),
  ]);
  return NextResponse.json({ ...settings, socialLinks });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const links = body?.socialLinks;
  const validLinks = Array.isArray(links) && links.length <= 20 && links.every((item) => {
    if (!item || typeof item !== "object") return false;
    const link = item as Record<string, unknown>;
    if (typeof link.name !== "string" || !link.name.trim() || link.name.trim().length > 100) return false;
    if (typeof link.url !== "string" || link.url.length > 2048) return false;
    try {
      const parsed = new URL(link.url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  });
  if (!body || typeof body.storeName !== "string" || !body.storeName.trim() || body.storeName.length > 150 ||
    typeof body.contactPhone !== "string" || body.contactPhone.length > 50 ||
    typeof body.contactEmail !== "string" || !body.contactEmail.includes("@") || body.contactEmail.length > 254 ||
    !validLinks || !Number.isSafeInteger(body.lowStockThreshold) || Number(body.lowStockThreshold) < 1 ||
    typeof body.orderAutoConfirm !== "boolean") {
    return NextResponse.json({ message: "Thông tin cài đặt không hợp lệ." }, { status: 400 });
  }

  const storeName = (body.storeName as string).trim();
  const contactPhone = (body.contactPhone as string).trim();
  const contactEmail = (body.contactEmail as string).trim();
  const lowStockThreshold = Number(body.lowStockThreshold);
  const orderAutoConfirm = body.orderAutoConfirm as boolean;
  const socialLinks = (links as SocialLink[]).map((link) => ({ name: link.name.trim(), url: link.url.trim() }));
  const result = await prisma.$transaction(async (tx) => {
    const settings = await tx.store_settings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        ...defaults,
        store_name: storeName,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        low_stock_threshold: lowStockThreshold,
        order_auto_confirm: orderAutoConfirm,
      },
      update: {
        store_name: storeName,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        low_stock_threshold: lowStockThreshold,
        order_auto_confirm: orderAutoConfirm,
      },
      select: settingsSelect,
    });

    await tx.$executeRaw`DELETE FROM "store_social_links"`;
    for (const [index, link] of socialLinks.entries()) {
      await tx.$executeRaw`
        INSERT INTO "store_social_links" ("name", "url", "sort_order")
        VALUES (${link.name}, ${link.url}, ${index})
      `;
    }
    const savedLinks = await readSocialLinks(tx);
    return { ...settings, socialLinks: savedLinks };
  });

  return NextResponse.json(result);
}
