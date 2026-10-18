import { AuthShell } from "@/components/AuthShell";
import AutoSignIn from "./AutoSignIn";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Xác minh email">
      <AutoSignIn token={token ?? ""} />
    </AuthShell>
  );
}
