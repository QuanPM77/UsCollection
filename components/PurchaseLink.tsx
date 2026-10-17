"use client";

import Link from "next/link";
import { useLoginPrompt } from "@/components/LoginPromptProvider";

export function PurchaseLink({ href, disabled = false, className, children }: {
  href: string;
  disabled?: boolean;
  className: string;
  children: React.ReactNode;
}) {
  const { isAuthenticated, requestLogin } = useLoginPrompt();
  return (
    <Link
      href={disabled ? "#" : href}
      aria-disabled={disabled}
      className={className}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
        } else if (!isAuthenticated) {
          event.preventDefault();
          requestLogin();
        }
      }}
    >
      {children}
    </Link>
  );
}
