"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="w-full rounded-xl bg-pink-deep px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-text disabled:opacity-60">
      {pending ? "Đang lưu thông tin..." : "Lưu thông tin và tiếp tục"}
    </button>
  );
}
