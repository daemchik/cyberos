import React from "react";
import { useAuth } from "../lib/AuthContext";
import { useSettings } from "../lib/SettingsContext";

const LS_ACTIVE = "cyberos_last_active_at";

/** Автовыход при бездействии; перед выходом фиксируем метку времени. */
export function IdleLogout() {
  const { settings } = useSettings();
  const { logout } = useAuth();
  const last = React.useRef(Date.now());

  React.useEffect(() => {
    const bump = () => {
      last.current = Date.now();
      try {
        localStorage.setItem(LS_ACTIVE, String(last.current));
      } catch {
        /* ignore */
      }
    };
    bump();
    const evs: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "touchstart"];
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true } as AddEventListenerOptions));
    const mins = Math.max(5, parseInt(settings.auto_logout_minutes || "30", 10) || 30);
    const ms = mins * 60 * 1000;
    const iv = window.setInterval(() => {
      if (Date.now() - last.current >= ms) {
        try {
          sessionStorage.setItem("cyberos_idle_logout", "1");
        } catch {
          /* ignore */
        }
        logout();
      }
    }, 5000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(iv);
    };
  }, [settings.auto_logout_minutes, logout]);

  return null;
}
