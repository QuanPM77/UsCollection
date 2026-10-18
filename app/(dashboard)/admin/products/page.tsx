import { redirect } from "next/navigation";

// The customer catalog is backed by Prisma products; the old inventory page
// operated on an isolated in-memory mock and must not present itself as live data.
export default function ProductsPage() {
  redirect("/admin/products/catalog");
}
