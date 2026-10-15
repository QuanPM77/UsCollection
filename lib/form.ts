export type FormState = { error?: string; ok?: boolean } | undefined;
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
