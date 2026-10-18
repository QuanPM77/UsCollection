import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EmailVerificationForm from "./EmailVerificationForm";

export default async function VerifyRequiredPage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, emailVerifiedAt: true, profileCompletedAt: true } });
  if (!user?.profileCompletedAt) redirect("/complete-profile");
  if (user.emailVerifiedAt) redirect("/post-login");

  return <EmailVerificationForm email={user.email ?? ""} />;
}
