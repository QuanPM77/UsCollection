import { requireRole } from "@/lib/guard";
export default async function L({ children }: { children: React.ReactNode }) {
  await requireRole("staff", "admin");
  return <>{children}</>;
}
