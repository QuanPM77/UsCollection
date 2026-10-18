export const ADMIN_AVATAR_KEY = 'usstory-admin-avatar';
export const ADMIN_AVATAR_EVENT = 'usstory-admin-avatar-change';

export function getAdminAvatar(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ADMIN_AVATAR_KEY);
}

export function setAdminAvatar(value: string | null): void {
  if (typeof window === 'undefined') return;
  if (value) window.localStorage.setItem(ADMIN_AVATAR_KEY, value);
  else window.localStorage.removeItem(ADMIN_AVATAR_KEY);
  window.dispatchEvent(new Event(ADMIN_AVATAR_EVENT));
}
