import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Tìm kiếm...', className = '' }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300
                   placeholder:text-gray-400 transition-colors"
      />
    </div>
  );
}
