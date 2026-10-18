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
  '/admin/products/catalog': 'Vòng bán sẵn',
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
    if (pathname.startsWith('/admin/products/catalog')) {
      crumbs.push({ label: 'Sản phẩm', href: '/admin/products' });
      crumbs.push({ label: 'Vòng bán sẵn', href: '/admin/products/catalog' });
      if (pathname !== '/admin/products/catalog') crumbs.push({ label: pathname.endsWith('/new') ? 'Thêm vòng' : 'Chỉnh sửa' });
    } else if (pathname === '/admin/products') {
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
    <header className="sticky top-0 z-30 h-16 bg-[#FFFBFC]/95 backdrop-blur-sm border-b border-pink-100 px-4 lg:px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-pink-50 transition-colors"
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
          className="p-2 rounded-lg hover:bg-pink-50 transition-colors relative"
          aria-label="Thông báo"
          title="Thông báo (chưa triển khai)"
        >
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-400 rounded-full" />
        </button>
      </div>
    </header>
  );
}
