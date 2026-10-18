'use client';

import { Menu, Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface AdminHeaderProps {
  onMenuToggle: () => void;
}

type AdminNotification = { id: string; type: 'stock' | 'order'; title: string; message: string; href: string; createdAt: string };
const READ_KEY = 'admin-notifications-read-v1';

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Tổng quan',
  '/admin/orders': 'Đơn hàng',
  '/admin/products': 'Sản phẩm',
  '/admin/products/new': 'Thêm sản phẩm',
  '/admin/products/catalog': 'Vòng bán sẵn',
  '/admin/beads': 'Các loại hạt',
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
  } else if (pathname.startsWith('/admin/beads')) {
    crumbs.push({ label: 'Các loại hạt' });
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
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unread, setUnread] = useState<string[]>([]);
  const [readStateLoaded, setReadStateLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<AdminNotification | null>(null);
  const initialized = useRef(false);
  const knownIds = useRef(new Set<string>());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try { setUnread(JSON.parse(localStorage.getItem(READ_KEY) || '[]')); } catch { setUnread([]); }
    setReadStateLoaded(true);
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/admin/notifications', { cache: 'no-store' });
        if (!response.ok) return;
        const result = await response.json() as { notifications: AdminNotification[] };
        if (!active) return;
        const next = result.notifications.slice(0, 10);
        if (initialized.current) {
          const fresh = next.filter((item) => !knownIds.current.has(item.id));
          const newest = fresh[0];
          if (newest) {
            setToast(newest);
            if (toastTimer.current) clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(() => setToast(null), 10_000);
            setUnread((current) => [...new Set([...fresh.map((item) => item.id), ...current])].slice(0, 10));
          }
        }
        knownIds.current = new Set(next.map((item) => item.id));
        setNotifications(next);
        setUnread((current) => current.filter((id) => next.some((item) => item.id === id)));
        initialized.current = true;
      } catch { /* Keep the header usable when notifications are temporarily unavailable. */ }
    };
    void load();
    const interval = setInterval(load, 30_000);
    return () => { active = false; clearInterval(interval); if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  useEffect(() => { if (readStateLoaded) localStorage.setItem(READ_KEY, JSON.stringify(unread.slice(0, 10))); }, [unread, readStateLoaded]);
  const markRead = (id: string) => setUnread((current) => current.filter((item) => item !== id));
  const openNotifications = () => {
    if (!open) setUnread([]);
    setOpen(!open);
  };

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

      <div className="relative flex items-center gap-2">
        {toast && <Link href={toast.href} onClick={() => { markRead(toast.id); setToast(null); }} className="absolute right-12 top-1/2 z-50 w-72 -translate-y-1/2 rounded-xl border border-pink-200 bg-white p-3 shadow-lg" role="status"><span className="block text-sm font-semibold text-gray-900">{toast.title}</span><span className="mt-1 block truncate text-xs text-gray-600">{toast.message}</span></Link>}
        <button onClick={openNotifications} className="rounded-lg p-2 transition-colors hover:bg-pink-50 relative" aria-label={`Thông báo${unread.length ? `, ${unread.length} chưa xem` : ''}`} aria-expanded={open}>
          <Bell className="w-5 h-5 text-gray-500" />
          {unread.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{Math.min(unread.length, 10)}</span>}
        </button>
        {open && <div className="absolute right-0 top-12 z-40 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3"><p className="font-semibold text-gray-900">Thông báo</p><span className="text-xs text-gray-500">Tối đa 10 thông báo</span></div>
          <div className="max-h-96 overflow-y-auto">{notifications.length ? notifications.map((item) => <Link key={item.id} href={item.href} onClick={() => { markRead(item.id); setOpen(false); }} className="block border-b border-gray-50 px-4 py-3 hover:bg-pink-50"><span className="flex items-center gap-2 text-sm font-semibold text-gray-900"><span className={`h-2 w-2 rounded-full ${item.type === 'stock' ? 'bg-amber-500' : 'bg-rose-500'}`} />{item.title}</span><span className="mt-1 block pl-4 text-xs text-gray-600">{item.message}</span></Link>) : <p className="px-4 py-8 text-center text-sm text-gray-500">Không có thông báo cần xử lý.</p>}</div>
        </div>}
      </div>
    </header>
  );
}
