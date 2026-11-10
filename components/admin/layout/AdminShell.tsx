'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { ToastContainer } from '@/components/admin/ui/Toast';
import dynamic from "next/dynamic";
const AdminSupportChat = dynamic(() => import("@/components/admin/support/AdminSupportChat"), { ssr: false });

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-[#FFF5F7] overflow-hidden">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto admin-scrollbar">
          <div className="w-full min-w-0 p-4 lg:p-6">{children}</div>
        </main>
      </div>
      <ToastContainer />
      {pathname !== '/admin/settings' && <AdminSupportChat />}
    </div>
  );
}
