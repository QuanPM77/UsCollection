// One request at a time; pause background tabs and offline browsers.
export function startVisiblePolling(task: (signal: AbortSignal) => Promise<void>, interval: number) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  const available = () => document.visibilityState === "visible" && navigator.onLine !== false;

  async function run() {
    if (controller.signal.aborted || running) return;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (!available()) return;
    running = true;
    try { await task(controller.signal); }
    catch { /* Each caller owns its error UI; later polls can recover. */ }
    finally {
      running = false;
      if (!controller.signal.aborted && available()) timer = setTimeout(run, interval);
    }
  }
  function resume() { void run(); }
  document.addEventListener("visibilitychange", resume);
  window.addEventListener("online", resume);
  window.addEventListener("offline", resume);
  void run();
  return () => {
    controller.abort();
    if (timer !== undefined) clearTimeout(timer);
    document.removeEventListener("visibilitychange", resume);
    window.removeEventListener("online", resume);
    window.removeEventListener("offline", resume);
  };
}
