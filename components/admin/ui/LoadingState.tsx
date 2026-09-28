interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative w-10 h-10 mb-4">
        <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
        <div className="absolute inset-0 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
      </div>
      {message && <p className="text-sm text-gray-400">{message}</p>}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {/* Header skeleton */}
      <div className="flex gap-4 pb-3 border-b border-gray-100">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-4 bg-gray-100 rounded animate-pulse-subtle flex-1" />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3">
          {[1, 2, 3, 4, 5].map((j) => (
            <div
              key={j}
              className="h-4 bg-gray-50 rounded animate-pulse-subtle flex-1"
              style={{ animationDelay: `${(i * 5 + j) * 100}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse-subtle">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-3 w-20 bg-gray-100 rounded mb-3" />
          <div className="h-7 w-28 bg-gray-100 rounded" />
        </div>
        <div className="w-10 h-10 bg-gray-50 rounded-lg" />
      </div>
    </div>
  );
}
