'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  BarChart3,
  Settings,
  X,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Đơn hàng', icon: ShoppingBag },
  { href: '/admin/products', label: 'Sản phẩm', icon: Package },
  { href: '/admin/analytics', label: 'Phân tích', icon: BarChart3 },
  { href: '/admin/settings', label: 'Cài đặt', icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname.startsWith(href);
}

export function AdminSidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[260px] bg-white border-r border-gray-200 flex flex-col
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 shrink-0">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="text-xl">💎</span>
            <div>
              <span className="font-bold text-gray-900 text-sm">UsCollection</span>
              <span className="block text-[10px] text-gray-400 -mt-0.5 font-medium tracking-wide">ADMIN</span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto admin-scrollbar">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors admin-focus
                      ${active
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <item.icon className={`w-[18px] h-[18px] ${active ? 'text-brand-500' : 'text-gray-400'}`} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-xs font-bold text-brand-600">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Admin</p>
              <p className="text-xs text-gray-400 truncate">admin@uscollection.vn</p>
            </div>
          </div>
          <button
            className="flex items-center gap-3 w-full px-3 py-2 mt-1 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            title="Đăng xuất (chưa triển khai)"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}
