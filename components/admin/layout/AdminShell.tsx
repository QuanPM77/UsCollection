'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { ToastContainer } from '@/components/admin/ui/Toast';
import AdminSupportChat from '@/components/admin/support/AdminSupportChat';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-[#FFF5F7] overflow-hidden">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto admin-scrollbar">
          <div className="p-4 lg:p-6 max-w-[1400px]">{children}</div>
        </main>
      </div>
      <ToastContainer />
      {pathname !== '/admin/settings' && <AdminSupportChat />}
    </div>
  );
}
