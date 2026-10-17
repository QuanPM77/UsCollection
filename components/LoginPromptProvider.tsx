"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LoginPromptContextValue = {
  isAuthenticated: boolean;
  requestLogin: () => void;
};

const LoginPromptContext = createContext<LoginPromptContextValue | null>(null);

export function LoginPromptProvider({ children, isAuthenticated }: { children: React.ReactNode; isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const [returnTo, setReturnTo] = useState("/");
  const router = useRouter();

  const requestLogin = useCallback(() => {
    setReturnTo(`${window.location.pathname}${window.location.search}${window.location.hash}`);
    setOpen(true);
  }, []);

  const contextValue = useMemo(() => ({ isAuthenticated, requestLogin }), [isAuthenticated, requestLogin]);
  const loginUrl = `/login?callbackUrl=${encodeURIComponent(returnTo)}`;

  return (
    <LoginPromptContext.Provider value={contextValue}>
      {children}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="login-prompt-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 id="login-prompt-title" className="font-display text-2xl font-bold text-pink-text">Vui lòng đăng nhập để tiếp tục</h2>
            <div className="mx-auto mt-6 grid w-full max-w-sm grid-cols-2 gap-3">
              <button type="button" onClick={() => setOpen(false)} className="w-full rounded-xl border border-pink-mid/40 px-4 py-3 text-sm font-semibold text-pink-deep hover:bg-pink-light">Hủy</button>
              <button type="button" onClick={() => { setOpen(false); router.push(loginUrl); }} className="w-full rounded-xl bg-pink-deep px-4 py-3 text-sm font-semibold text-white hover:bg-pink-text">Đăng nhập</button>
            </div>
          </section>
        </div>
      )}
    </LoginPromptContext.Provider>
  );
}

export function useLoginPrompt() {
  const context = useContext(LoginPromptContext);
  if (!context) throw new Error("useLoginPrompt must be used inside LoginPromptProvider.");
  return context;
}
