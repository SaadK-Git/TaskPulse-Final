import { useState, useEffect, useRef } from "react";

/**
 * Drop-in replacement for useState that also persists to sessionStorage
 * (default) or localStorage, so the value survives a page refresh.
 *
 * - sessionStorage: right choice for "UI state that should survive F5"
 *   (current page, open filters, pagination, drafts) — it clears itself
 *   when the tab actually closes, so we don't accumulate stale state
 *   forever the way localStorage would.
 * - localStorage: only for things that should persist across sessions,
 *   e.g. a theme preference.
 *
 * Never put tokens/passwords through this — auth stays in HttpOnly
 * cookies (see AuthContext), not in Web Storage.
 *
 * Usage:
 *   const [page, setPage] = usePersistedState("adm.projects.page", 1);
 *   const [theme, setTheme] = usePersistedState("theme", "light", { storage: "local" });
 */
export function usePersistedState(key, defaultValue, { storage = "session" } = {}) {
  const getStore = () =>
    storage === "local" ? window.localStorage : window.sessionStorage;

  const [value, setValue] = useState(() => {
    try {
      const raw = getStore().getItem(key);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch {
      // Storage unavailable (private mode, quota, etc) — fall back silently.
      return defaultValue;
    }
  });

  // Skip writing on the very first render when we just read the same
  // value back out — avoids a pointless write-then-read on every mount.
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      const store = getStore();
      if (value === undefined) {
        store.removeItem(key);
      } else {
        store.setItem(key, JSON.stringify(value));
      }
    } catch {
      // Quota exceeded or storage disabled — state still works in-memory
      // for this session, it just won't survive a refresh. Not worth
      // surfacing an error to the user for this.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value, storage]);

  return [value, setValue];
}

/** Remove every persisted key under a prefix — call on logout so the next
 * user (or a re-login) doesn't inherit a stale UI state. */
export function clearPersistedState(prefix, storage = "session") {
  const store = storage === "local" ? window.localStorage : window.sessionStorage;
  const toRemove = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k && k.startsWith(prefix)) toRemove.push(k);
  }
  toRemove.forEach((k) => store.removeItem(k));
}