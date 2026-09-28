interface StatusBadgeProps {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand';
  size?: 'sm' | 'md';
  dot?: boolean;
}

const VARIANT_STYLES = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-gray-50 text-gray-600 border-gray-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
};

const DOT_STYLES = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-gray-400',
  brand: 'bg-brand-400',
};

export function StatusBadge({ label, variant, size = 'sm', dot = true }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full
        ${size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
        ${VARIANT_STYLES[variant]}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT_STYLES[variant]}`} />}
      {label}
    </span>
  );
}
