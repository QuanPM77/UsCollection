type ConnectionInfo = { saveData?: boolean; effectiveType?: string };

// Warm heavy features only after a visitor points at or focuses their link.
export function scheduleLinkPreloads(loaders: Record<string, () => Promise<unknown>>) {
  const scheduled = new Map<string, () => void>();
  function onIntent(event: Event) {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>("a[href]");
    if (!link || link.origin !== window.location.origin) return;
    const loader = loaders[link.pathname];
    if (loader && !scheduled.has(link.pathname)) {
      scheduled.set(link.pathname, scheduleIdlePreloads([loader]));
    }
  }
  document.addEventListener("pointerover", onIntent);
  document.addEventListener("focusin", onIntent);
  return () => {
    document.removeEventListener("pointerover", onIntent);
    document.removeEventListener("focusin", onIntent);
    scheduled.forEach(stop => stop());
  };
}

function canPreload() {
  const connection = (navigator as Navigator & { connection?: ConnectionInfo }).connection;
  return document.readyState === "complete" && document.visibilityState === "visible" &&
    navigator.onLine !== false && !connection?.saveData &&
    !["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "");
}

// Wait for the page load and a quiet interval, then warm one module at a time.
// This schedules optional code only; normal rendering never waits for it.
export function scheduleIdlePreloads(loaders: Array<() => Promise<unknown>>) {
  const queue = [...loaders];
  let disposed = false;
  let busy = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let idle: number | undefined;

  async function run() {
    idle = undefined;
    timer = undefined;
    if (disposed || !canPreload()) { busy = false; return; }
    try {
      await queue.shift()?.();
    } catch {
      // A failed speculative import must not affect navigation or show an error.
    } finally {
      busy = false;
      schedule();
    }
  }

  function schedule() {
    if (disposed || busy || !queue.length || !canPreload()) return;
    busy = true;
    timer = setTimeout(() => {
      timer = undefined;
      if (disposed || !canPreload()) { busy = false; return; }
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(() => { void run(); });
      } else {
        timer = setTimeout(() => { void run(); }, 1000);
      }
    }, 1500);
  }

  window.addEventListener("load", schedule);
  window.addEventListener("online", schedule);
  document.addEventListener("visibilitychange", schedule);
  schedule();

  return () => {
    disposed = true;
    if (timer !== undefined) clearTimeout(timer);
    if (idle !== undefined) window.cancelIdleCallback(idle);
    window.removeEventListener("load", schedule);
    window.removeEventListener("online", schedule);
    document.removeEventListener("visibilitychange", schedule);
  };
}
