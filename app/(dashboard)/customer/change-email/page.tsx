import { requireRole } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import ChangeEmailForm from "./ChangeEmailForm";

export default async function ChangeEmailPage() {
  const session = await requireRole("customer");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
  return <ChangeEmailForm currentEmail={user?.email ?? ""} />;
}
