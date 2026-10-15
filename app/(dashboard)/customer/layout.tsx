import { requireRole } from "@/lib/guard";
export default async function L({ children }: { children: React.ReactNode }) {
  await requireRole("customer");
  return <>{children}</>;
}
