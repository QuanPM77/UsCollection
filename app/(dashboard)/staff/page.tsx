import { auth, signOut } from "@/auth";
export default async function Page() {
  const s = await auth();
  return (
    <main className="min-h-screen bg-pink-50 p-8 text-rose-950">
      <h1 className="text-2xl font-bold">Khu vực nhân viên</h1>
      <p className="mt-1 text-rose-700">Xin chào {s?.user.name} ({s?.user.role})</p>
      <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
        <button className="mt-6 rounded-lg border border-pink-200 bg-white px-4 py-2 text-rose-700">Đăng xuất</button>
      </form>
    </main>
  );
}
