import { redirect } from "next/navigation";
import { getSession as auth } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import EmailVerificationForm from "./EmailVerificationForm";

export default async function VerifyRequiredPage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");
  if (session.user.role !== "customer") redirect(session.user.destination);
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, emailVerifiedAt: true, profileCompletedAt: true, phone: true } });
  if (!user) redirect("/login");
  if (!user.profileCompletedAt || !user.phone) redirect("/complete-profile");
  if (user.email && user.emailVerifiedAt) redirect("/post-login");

  return <EmailVerificationForm email={user.email ?? ""} />;
}
