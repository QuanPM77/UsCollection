export default function Loading() {
  return (
    <div role="status" className="flex min-h-[60vh] items-center justify-center bg-cream text-pink-deep">
      <span className="motion-safe:animate-pulse">Đang tải trang...</span>
    </div>
  );
}
