import { useEffect, useState, useCallback } from "react";
import { getSetting, setSetting } from "../lib/db";

export function useDarkMode() {
  const [dark, setDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await getSetting("darkMode", null);
      const initial =
        saved !== null ? saved : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      if (!cancelled) {
        setDark(!!initial);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.classList.toggle("dark", dark);
  }, [dark, loaded]);

  const toggle = useCallback(() => {
    setDark((d) => {
      const next = !d;
      setSetting("darkMode", next);
      return next;
    });
  }, []);

  return { dark, toggle, loaded };
}
