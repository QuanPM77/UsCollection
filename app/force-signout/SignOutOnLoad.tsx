"use client";
import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

export default function SignOutOnLoad() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void signOut({ redirectTo: "/" });
  }, []);
  return <p className="text-sm text-pink-text/70">Phiên đăng nhập chưa xác minh email đang được kết thúc...</p>;
}
