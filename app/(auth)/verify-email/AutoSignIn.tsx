"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Notice } from "@/components/AuthShell";

export default function AutoSignIn({ token }: { token: string }) {
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setError("Liên kết không hợp lệ hoặc đã hết hạn.");
      return;
    }

    void (async () => {
      try {
        const result = await signIn("email-verification", { token, redirect: false, redirectTo: "/post-login" });
        if (result?.error || !result?.url) {
          setError("Liên kết không hợp lệ hoặc đã hết hạn. Hãy đăng nhập để gửi lại email xác minh.");
          return;
        }
        window.location.replace(result.url);
      } catch {
        setError("Không thể xác minh email lúc này. Vui lòng thử lại.");
      }
    })();
  }, [token]);

  if (error) {
    return (
      <>
        <Notice kind="err">{error}</Notice>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-semibold text-rose-600 hover:underline">Đến trang đăng nhập</Link>
        </p>
      </>
    );
  }
  return <p className="text-center text-sm text-rose-900/70">Đang xác minh email và đăng nhập...</p>;
}
