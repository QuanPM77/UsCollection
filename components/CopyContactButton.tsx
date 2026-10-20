"use client";

import { useState } from "react";

export default function CopyContactButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setError(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(true);
      setCopied(false);
      window.setTimeout(() => setError(false), 2500);
    }
  }

  return <div className="w-full">
    <button type="button" onClick={copyValue} className="grid w-full grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-2 text-left text-sm transition hover:text-pink-deep hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-deep/30" aria-label={`Sao chép ${label}: ${value}`}>
      <span className="text-pink-text/60">{label}:</span>
      <span className="break-all font-semibold text-pink-deep">{value}</span>
    </button>
    {copied && <span role="status" className="mt-1 block pl-[8rem] text-xs text-green-700">Đã sao chép</span>}
    {error && <span role="status" className="mt-1 block pl-[8rem] text-xs text-red-600">Không thể sao chép</span>}
  </div>;
}
