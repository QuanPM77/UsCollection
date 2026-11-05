import { avatarDisplayUrl } from "@/lib/supabase-storage";

export function AvatarPlaceholder({ name }: { name: string | null }) {
  return <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-deep font-semibold text-white">{(name?.trim().charAt(0) || "K").toUpperCase()}</div>;
}

export default async function ReviewAvatar({ path, name }: { path: string | null; name: string | null }) {
  const url = await avatarDisplayUrl(path).catch(() => null);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" loading="lazy" decoding="async" className="h-11 w-11 shrink-0 rounded-full bg-pink-light object-cover" /> : <AvatarPlaceholder name={name} />;
}
