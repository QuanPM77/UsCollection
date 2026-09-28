'use client';

import { useState } from 'react';
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { ToastContainer } from '@/components/admin/ui/Toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto admin-scrollbar">
          <div className="p-4 lg:p-6 max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
