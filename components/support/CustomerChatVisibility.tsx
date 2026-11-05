"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
const CustomerChatWidget = dynamic(() => import("@/components/support/CustomerChatWidget"), { ssr: false });

const hiddenPaths = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-required",
  "/complete-profile",
  "/customer",
];

export default function CustomerChatVisibility() {
  const pathname = usePathname();
  const shouldHide = hiddenPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  return shouldHide ? null : <CustomerChatWidget />;
}
