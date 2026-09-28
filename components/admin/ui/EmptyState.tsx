import { ReactNode } from 'react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 text-gray-300">
        {icon || <PackageOpen className="w-16 h-16" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-600 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
