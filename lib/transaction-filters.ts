import type { Prisma } from "@prisma/client";

export type TransactionQuery = { page?: string; search?: string; dateFrom?: string; dateTo?: string };

function dateValue(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : "";
}

export function transactionFilters(userId: string, query: TransactionQuery) {
  const search = typeof query.search === "string" ? query.search.trim().slice(0, 200) : "";
  const dateFrom = dateValue(query.dateFrom);
  const dateTo = dateValue(query.dateTo);
  const error = (query.dateFrom && !dateFrom) || (query.dateTo && !dateTo)
    ? "Ngày lọc không hợp lệ. Vui lòng chọn lại."
    : dateFrom && dateTo && dateFrom > dateTo ? "Ngày bắt đầu không được sau ngày kết thúc." : "";
  const where: Prisma.OrderWhereInput = { user_id: userId };
  if (search) {
    const code = search.replace(/^#/, "");
    where.OR = [
      { order_items: { some: { product_name: { contains: search, mode: "insensitive" } } } },
      ...(/^\d{1,19}$/.test(code) && BigInt(code) <= BigInt("9223372036854775807") ? [{ orderCode: BigInt(code) }] : []),
    ];
  }
  if (!error && (dateFrom || dateTo)) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00+07:00`) } : {}),
      ...(dateTo ? { lt: new Date(new Date(`${dateTo}T00:00:00+07:00`).getTime() + 86400000) } : {}),
    };
  }
  const active = Boolean(search || dateFrom || dateTo || error);
  function href(page = 1) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (page > 1) params.set("page", String(page));
    return `/transactions${params.size ? `?${params}` : ""}`;
  }
  return { where, search, dateFrom, dateTo, error, active, href };
}
