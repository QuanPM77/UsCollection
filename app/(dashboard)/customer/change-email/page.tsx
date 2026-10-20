import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import ChangeEmailForm from "./ChangeEmailForm";

export default async function ChangeEmailPage() {
  const session = await requireRole("customer");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, googleId: true } });
  if (user?.googleId) redirect("/customer");
  return <ChangeEmailForm currentEmail={user?.email ?? ""} />;
}
