import { CardSkeleton } from "@/components/admin/ui/LoadingState";

export default function AdminLoading() {
  return <div role="status" aria-label="Đang tải trang quản trị" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
    {Array.from({ length: 5 }, (_, index) => <CardSkeleton key={index} />)}
  </div>;
}
