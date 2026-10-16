import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guard";
import { setStatus } from "./actions";

const PAGE = 20;
type SP = { q?: string; status?: string; page?: string };

export default async function UsersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await requireRole("admin");
  const { q = "", status = "", page = "1" } = await searchParams;
  const p = Math.max(1, Number(page) || 1);

  const where: Prisma.UserWhereInput = {
    ...(q && {
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    }),
    ...(status === "active" || status === "locked" ? { status } : {}),
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (p - 1) * PAGE, take: PAGE }),
    prisma.user.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (n: number) => `/admin/users?${new URLSearchParams({ q, status, page: String(n) })}`;
  const fmt = (d: Date | null) => (d ? d.toLocaleString("vi-VN") : "Chưa đăng nhập");

  return (
    <main className="min-h-screen bg-pink-50 p-6 text-rose-950 md:p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-sm text-rose-600 hover:underline">← Bảng điều khiển</Link>
        <h1 className="mt-2 text-2xl font-bold">Quản lý người dùng</h1>

        <form className="mt-5 flex flex-wrap gap-3">
          <input name="q" defaultValue={q} placeholder="Tìm theo tên, email, số điện thoại"
            className="min-w-64 flex-1 rounded-lg border border-pink-200 bg-white px-3 py-2 outline-none focus:border-rose-500" />
          <select name="status" defaultValue={status} className="rounded-lg border border-pink-200 bg-white px-3 py-2">
            <option value="">Mọi trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Đã khóa</option>
          </select>
          <button className="rounded-lg bg-rose-500 px-4 py-2 font-semibold text-white hover:bg-rose-700">Tìm</button>
        </form>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-pink-100 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-pink-100/60 text-rose-800">
              <tr><th className="p-3">Người dùng</th><th className="p-3">Điện thoại</th><th className="p-3">Vai trò</th><th className="p-3">Trạng thái</th><th className="p-3">Đăng nhập gần nhất</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {users.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-rose-700/70">Không tìm thấy người dùng nào.</td></tr>}
              {users.map((u) => (
                <tr key={u.id} className="border-t border-pink-100">
                  <td className="p-3"><div className="font-medium">{u.fullName ?? "(chưa có tên)"}</div><div className="text-rose-700/70">{u.email ?? "(chưa có email)"}{u.email && !u.emailVerifiedAt && " (chưa xác minh)"}</div></td>
                  <td className="p-3">{u.phone ?? "—"}</td>
                  <td className="p-3"><span className="rounded-full bg-pink-100 px-2.5 py-1 text-xs font-semibold text-rose-800">{u.role}</span></td>
                  <td className="p-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {u.status === "active" ? "Hoạt động" : "Đã khóa"}
                    </span>
                  </td>
                  <td className="p-3 text-rose-900/70">{fmt(u.lastLoginAt)}</td>
                  <td className="p-3 text-right">
                    {u.id !== me.user.id && (
                      <form action={setStatus}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="to" value={u.status === "active" ? "locked" : "active"} />
                        <button className="rounded-lg border border-pink-200 px-3 py-1.5 text-rose-700 hover:bg-pink-50">
                          {u.status === "active" ? "Khóa" : "Mở khóa"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-rose-800">
          <span>{total} người dùng</span>
          <div className="flex items-center gap-3">
            {p > 1 && <Link href={href(p - 1)} className="hover:underline">← Trước</Link>}
            <span>Trang {p}/{pages}</span>
            {p < pages && <Link href={href(p + 1)} className="hover:underline">Sau →</Link>}
          </div>
        </div>
      </div>
    </main>
  );
}
