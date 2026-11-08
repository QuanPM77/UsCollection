type Account = {
  role: string;
  phone: string | null;
  email: string | null;
  profileCompletedAt: Date | null;
  emailVerifiedAt: Date | null;
};

export function authDestination(user: Account) {
  if (user.role === "admin") return "/admin";
  if (user.role === "staff") return "/staff";
  if (!user.profileCompletedAt || !user.phone) return "/complete-profile";
  if (!user.email || !user.emailVerifiedAt) return "/verify-required";
  return "/";
}

export function safeCallbackUrl(value: unknown) {
  return typeof value === "string" && value.startsWith("/") &&
    !value.startsWith("//") && !/[\\\x00-\x20]/.test(value) ? value : undefined;
}
