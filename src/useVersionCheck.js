import { useState, useEffect, useRef } from 'react';

/**
 * useVersionCheck
 * ───────────────
 * Polls /version.json every `intervalMs` milliseconds.
 * Returns `updateAvailable` (bool) and `refresh` (fn).
 *
 * Low-end device optimisations:
 *  • Uses Page Visibility API — the interval is paused while the tab is hidden,
 *    so background tabs on low-memory devices never waste CPU / radio time.
 *  • fetch() request is deliberately minimal (HEAD not needed because the file
 *    is tiny; Cache-Control: no-store ensures the CDN always returns fresh data).
 *  • No heavy dependencies; completely tree-shakeable.
 */
export function useVersionCheck(intervalMs = 5 * 60 * 1000) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const currentVersionRef = useRef(null);   // version string captured on first load
  const timerRef = useRef(null);
  const checkingRef = useRef(false);         // prevent concurrent fetches

  const check = async () => {
    // Skip if tab is hidden or a check is already in-flight
    if (document.hidden || checkingRef.current) return;
    checkingRef.current = true;
    try {
      const res = await fetch(`/version.json?_=${Date.now()}`, {
        cache: 'no-store',                   // bypass any residual HTTP cache
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return;
      const data = await res.json();
      const remote = data?.version;
      if (!remote) return;

      if (currentVersionRef.current === null) {
        // First load — store as baseline, never show the banner
        currentVersionRef.current = remote;
      } else if (currentVersionRef.current !== remote) {
        setUpdateAvailable(true);
      }
    } catch {
      // Network errors are silently swallowed — no UX noise on poor connections
    } finally {
      checkingRef.current = false;
    }
  };

  useEffect(() => {
    // Run the first check immediately (sets baseline version)
    check();

    const schedule = () => {
      clearInterval(timerRef.current);
      // Only poll when the tab is visible
      if (!document.hidden) {
        timerRef.current = setInterval(check, intervalMs);
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        // Entering background — pause polling
        clearInterval(timerRef.current);
      } else {
        // Returning to foreground — check immediately then restart interval
        check();
        schedule();
      }
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => window.location.reload();

  return { updateAvailable, refresh };
}
