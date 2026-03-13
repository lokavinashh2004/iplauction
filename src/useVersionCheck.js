import { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// VERSION LOCK SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
//
// Strategy:
//  1. On first-ever load  → fetch version.json, save to localStorage, continue.
//  2. On subsequent loads → compare localStorage version with server version.
//     If they differ → update localStorage and hard-reload to get fresh JS/CSS.
//  3. While the user is on-site → poll every 2 minutes (visibility-aware).
//     If a new version is found → show the update banner (do NOT silent-reload
//     mid-session to avoid disrupting an in-progress game).
//  4. Before joining a room → expose getServerVersion() for a manual check.
//
// Low-end device care:
//  • Polling pauses when the tab is hidden (Page Visibility API).
//  • fetch uses cache:'no-store' + ?t= cache-buster — minimal network hit (~150 bytes).
//  • No dependencies beyond React.
// ─────────────────────────────────────────────────────────────────────────────

const LS_KEY = 'app_version_lock';
const VERSION_URL = () => `/version.json?t=${Date.now()}`;

/** Fetch the server's current version string. Returns null on any error. */
export async function getServerVersion() {
    try {
        const res = await fetch(VERSION_URL(), {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.version ?? null;
    } catch {
        return null;
    }
}

/**
 * runVersionLockOnLoad
 * ─────────────────────
 * Call this ONCE before mounting React.
 * Compares the stored version to the server version.
 * If they differ → update localStorage and reload (gets fresh hashed bundles).
 * This is a fire-and-forget async call; React mounts in parallel and the in-flight
 * fetch takes only ~100-200ms on a mobile connection — negligible.
 */
export async function runVersionLockOnLoad() {
    const stored = localStorage.getItem(LS_KEY);
    const server = await getServerVersion();
    if (!server) return; // network issue — don't punish the user

    if (!stored) {
        // Very first visit — just save and continue
        localStorage.setItem(LS_KEY, server);
        return;
    }

    if (stored !== server) {
        // Stale bundle detected — update record and reload
        localStorage.setItem(LS_KEY, server);
        window.location.reload();
    }
}

/**
 * useVersionCheck
 * ───────────────
 * React hook for the in-session polling banner.
 * Polls /version.json every `intervalMs` ms while the tab is visible.
 * Returns { updateAvailable, refresh }.
 */
export function useVersionCheck(intervalMs = 2 * 60 * 1000) {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const sessionVersionRef = useRef(null); // version at the time this session started
    const timerRef = useRef(null);
    const checkingRef = useRef(false);

    const check = async () => {
        if (document.hidden || checkingRef.current) return;
        checkingRef.current = true;
        try {
            const server = await getServerVersion();
            if (!server) return;

            if (sessionVersionRef.current === null) {
                // Capture the version that is running right now as the baseline
                sessionVersionRef.current = server;
                // Also keep localStorage in sync
                localStorage.setItem(LS_KEY, server);
            } else if (sessionVersionRef.current !== server) {
                setUpdateAvailable(true);
            }
        } finally {
            checkingRef.current = false;
        }
    };

    useEffect(() => {
        // Immediate first check (sets baseline)
        check();

        const startInterval = () => {
            clearInterval(timerRef.current);
            if (!document.hidden) {
                timerRef.current = setInterval(check, intervalMs);
            }
        };

        const onVisibility = () => {
            if (document.hidden) {
                clearInterval(timerRef.current);
            } else {
                // Tab became visible — check right away then resume interval
                check();
                startInterval();
            }
        };

        startInterval();
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            clearInterval(timerRef.current);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const refresh = () => {
        localStorage.setItem(LS_KEY, ''); // clear so next load doesn't get the old version
        window.location.reload();
    };

    return { updateAvailable, refresh };
}
