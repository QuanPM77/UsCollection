import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function PostLoginPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role === 'admin') redirect('/admin');
  if (session.user.role === 'staff') redirect('/staff');
  if (session.user.role === 'customer') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, emailVerifiedAt: true, profileCompletedAt: true, phone: true } });
    if (!user?.profileCompletedAt || !user.phone) redirect('/complete-profile');
    if (!user.email || !user.emailVerifiedAt) redirect('/verify-required');
  }
  redirect('/');
}
