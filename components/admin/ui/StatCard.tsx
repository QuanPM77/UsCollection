import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  color?: 'brand' | 'green' | 'amber' | 'red' | 'blue' | 'purple';
  subtitle?: string;
}

const COLOR_MAP = {
  brand: { bg: 'bg-brand-50', icon: 'text-brand-500', border: 'border-brand-100' },
  green: { bg: 'bg-emerald-50', icon: 'text-emerald-500', border: 'border-emerald-100' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-500', border: 'border-amber-100' },
  red: { bg: 'bg-red-50', icon: 'text-red-500', border: 'border-red-100' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-500', border: 'border-blue-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-500', border: 'border-purple-100' },
};

export function StatCard({ title, value, icon: Icon, trend, color = 'brand', subtitle }: StatCardProps) {
  const colors = COLOR_MAP[color];

  return (
    <div className={`bg-white rounded-xl border ${colors.border} p-5 hover:shadow-sm transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs font-medium mt-2 ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${colors.bg}`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
}
