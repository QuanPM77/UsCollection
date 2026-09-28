'use client';

import { Menu, Bell } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface AdminHeaderProps {
  onMenuToggle: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Tổng quan',
  '/admin/orders': 'Đơn hàng',
  '/admin/products': 'Sản phẩm',
  '/admin/products/new': 'Thêm sản phẩm',
  '/admin/analytics': 'Phân tích',
  '/admin/settings': 'Cài đặt',
};

function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [];

  if (pathname === '/admin') return [{ label: 'Tổng quan' }];

  crumbs.push({ label: 'Tổng quan', href: '/admin' });

  if (pathname.startsWith('/admin/orders')) {
    if (pathname === '/admin/orders') {
      crumbs.push({ label: 'Đơn hàng' });
    } else {
      crumbs.push({ label: 'Đơn hàng', href: '/admin/orders' });
      crumbs.push({ label: 'Chi tiết đơn hàng' });
    }
  } else if (pathname.startsWith('/admin/products')) {
    if (pathname === '/admin/products') {
      crumbs.push({ label: 'Sản phẩm' });
    } else if (pathname === '/admin/products/new') {
      crumbs.push({ label: 'Sản phẩm', href: '/admin/products' });
      crumbs.push({ label: 'Thêm sản phẩm' });
    } else {
      crumbs.push({ label: 'Sản phẩm', href: '/admin/products' });
      crumbs.push({ label: 'Chỉnh sửa' });
    }
  } else if (pathname === '/admin/analytics') {
    crumbs.push({ label: 'Phân tích' });
  } else if (pathname === '/admin/settings') {
    crumbs.push({ label: 'Cài đặt' });
  }

  return crumbs;
}

export function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);
  const pageTitle = PAGE_TITLES[pathname] || breadcrumbs[breadcrumbs.length - 1]?.label || '';

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 lg:px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        <div>
          <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
          {breadcrumbs.length > 1 && (
            <nav className="flex items-center gap-1 text-xs text-gray-400" aria-label="Đường dẫn">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="w-3 h-3" />}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-brand-500 transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-gray-600">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
          aria-label="Thông báo"
          title="Thông báo (chưa triển khai)"
        >
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-400 rounded-full" />
        </button>
        <div className="hidden sm:flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-xs font-bold text-brand-600">A</span>
          </div>
          <span className="text-sm font-medium text-gray-700">Admin</span>
        </div>
      </div>
    </header>
  );
}
