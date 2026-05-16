import React from "react";
import { api } from "./api";

type Settings = {
  accent_color: string;
  font_family: string;
  font_size: string;
  dark_mode: string;
  language: string;
  auto_logout_minutes?: string;
};

const defaults: Settings = {
  accent_color: "#00FF00",
  font_family: "JetBrains Mono",
  font_size: "12",
  dark_mode: "true",
  language: "ru",
  auto_logout_minutes: "30",
};

const SettingsContext = React.createContext<{ settings: Settings; reload: () => void }>({ settings: defaults, reload: () => {} });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<Settings>(defaults);

  const reload = () => {
    api.getSettings().then((s) => setSettings({ ...defaults, ...s })).catch(() => {});
  };

  React.useEffect(() => { reload(); }, []);

  // Apply CSS variables
  React.useEffect(() => {
    const root = document.documentElement;
    const dark = settings.dark_mode === "true";
    root.setAttribute("data-theme", dark ? "dark" : "light");
    root.style.setProperty("--accent", settings.accent_color);
    if (dark) {
      root.style.setProperty("--panel-bg", "#0a0a0b");
      root.style.setProperty("--panel-muted", "#18181b");
      root.style.setProperty("--input-bg", "#09090b");
      root.style.setProperty("--text-heading", "#fafafa");
      root.style.setProperty("--text-primary", "#e4e4e7");
      root.style.setProperty("--text-secondary", "#a1a1aa");
      root.style.setProperty("--chart-grid", "#2a2a2c");
      root.style.setProperty("--chart-tick", "#71717a");
    } else {
      root.style.setProperty("--panel-bg", "#ffffff");
      root.style.setProperty("--panel-muted", "#f4f4f5");
      root.style.setProperty("--input-bg", "#fafafa");
      root.style.setProperty("--text-heading", "#09090b");
      root.style.setProperty("--text-primary", "#27272a");
      root.style.setProperty("--text-secondary", "#52525b");
      root.style.setProperty("--chart-grid", "#e4e4e7");
      root.style.setProperty("--chart-tick", "#71717a");
    }
    root.style.setProperty("--font-mono", `'${settings.font_family}', monospace`);
    root.style.setProperty(
      "--font-app",
      `'${settings.font_family}', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
    );
    document.body.style.fontFamily = "var(--font-app)";
    document.body.style.fontSize = `${settings.font_size}px`;
    
    // Dynamically inject accent color override
    let style = document.getElementById("accent-override");
    if (!style) {
      style = document.createElement("style");
      style.id = "accent-override";
      document.head.appendChild(style);
    }
    const c = settings.accent_color;
    style.textContent = `
      .text-\\[\\#00FF00\\] { color: ${c} !important; }
      .bg-\\[\\#00FF00\\] { background-color: ${c} !important; }
      .border-\\[\\#00FF00\\] { border-color: ${c} !important; }
      .bg-\\[\\#00FF00\\]\\/10 { background-color: ${c}1a !important; }
      .bg-\\[\\#00FF00\\]\\/5 { background-color: ${c}0d !important; }
      .border-\\[\\#00FF00\\]\\/50 { border-color: ${c}80 !important; }
      .border-\\[\\#00FF00\\]\\/30 { border-color: ${c}4d !important; }
      .border-\\[\\#00FF00\\]\\/20 { border-color: ${c}33 !important; }
      .text-\\[\\#00FF00\\]\\/50 { color: ${c}80 !important; }
      .shadow-\\[0_0_8px_\\#00FF00\\] { box-shadow: 0 0 8px ${c} !important; }
      .hover\\:bg-\\[\\#00EE00\\]:hover { background-color: ${c} !important; filter: brightness(0.95); }
      .hover\\:bg-\\[\\#00FF00\\]:hover { background-color: ${c} !important; }
      .hover\\:text-\\[\\#00FF00\\]:hover { color: ${c} !important; }
      .hover\\:border-\\[\\#00FF00\\]\\/50:hover { border-color: ${c}80 !important; }
      .hover\\:border-\\[\\#00FF00\\]\\/30:hover { border-color: ${c}4d !important; }
    `;
  }, [settings]);

  return <SettingsContext.Provider value={{ settings, reload }}>{children}</SettingsContext.Provider>;
}

export function useSettings() { return React.useContext(SettingsContext); }
