import Link from "next/link";
import BraceletFields from "../BraceletFields";
import { createBracelet } from "../actions";

export default function NewBraceletPage() {
  return <div className="mx-auto max-w-3xl space-y-5">
    <Link href="/admin/products/catalog" className="text-sm font-medium text-rose-600 hover:underline">← Danh sách vòng bán sẵn</Link>
    <h2 className="text-xl font-bold text-gray-900">Thêm vòng bán sẵn</h2>
    <form action={createBracelet} className="space-y-5"><BraceletFields /></form>
  </div>;
}
