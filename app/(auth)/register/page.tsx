import RegisterForm from "./RegisterForm";
import { safeCallbackUrl } from "@/lib/auth-destination";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  return <RegisterForm callbackUrl={safeCallbackUrl(callbackUrl)} />;
}
