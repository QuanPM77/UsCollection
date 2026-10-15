import { requireRole } from '@/lib/guard';
import AdminShell from '@/components/admin/layout/AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole('admin');
  return <AdminShell>{children}</AdminShell>;
}
