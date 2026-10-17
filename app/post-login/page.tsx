import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function PostLoginPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role === 'customer') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { profileCompletedAt: true } });
    if (!user?.profileCompletedAt) redirect('/complete-profile');
  }
  redirect('/');
}
