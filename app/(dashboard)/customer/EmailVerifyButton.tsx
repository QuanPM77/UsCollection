"use client";

import { useState, useTransition } from "react";

interface Props {
  action: () => Promise<{ error?: string; ok?: boolean }>;
}

export default function EmailVerifyButton({ action }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setMessage({ type: "ok", text: "Email xác thực đã được gửi! Vui lòng kiểm tra hộp thư." });
      } else {
        setMessage({ type: "err", text: result.error ?? "Có lỗi xảy ra." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || message?.type === "ok"}
        className="rounded-lg border border-pink-mid/50 px-3 py-1 text-xs font-semibold text-pink-deep transition hover:bg-pink-light disabled:opacity-50"
      >
        {isPending ? "Đang gửi..." : "Gửi email xác thực"}
      </button>
      {message && (
        <p className={`text-xs ${message.type === "ok" ? "text-emerald-600" : "text-rose-600"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
