import { AuthShell } from "@/components/AuthShell";
import SignOutOnLoad from "./SignOutOnLoad";

export default function ForceSignOutPage() {
  return (
    <AuthShell title="Đang đăng xuất">
      <SignOutOnLoad />
    </AuthShell>
  );
}
