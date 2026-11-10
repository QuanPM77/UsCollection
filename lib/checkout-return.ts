"use server";

import { cookies } from "next/headers";

export async function rememberCheckout(value?: string) {
  const jar = await cookies();
  // Only purchase destinations can survive onboarding; never accept external redirects.
  if (value && /^\/checkout(?:\/product\/[a-zA-Z0-9-]+)?$/.test(value)) {
    jar.set("checkout-return", value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 86400 });
  } else {
    jar.delete("checkout-return");
  }
}
