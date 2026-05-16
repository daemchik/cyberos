import React from "react";
import { Shield, Database, Save, RotateCcw, Palette, Type, Monitor, Globe } from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useSettings } from "../lib/SettingsContext";

export function SystemNerve() {
  const { settings: loaded, reload } = useSettings();
  const [accentColor, setAccentColor] = React.useState("#00FF00");
  const [fontSize, setFontSize] = React.useState("12");
  const [fontFamily, setFontFamily] = React.useState("JetBrains Mono");
  const [darkMode, setDarkMode] = React.useState(true);
  const [notifications, setNotifications] = React.useState(true);
  const [autoLogout, setAutoLogout] = React.useState("30");
  const [language, setLanguage] = React.useState("ru");

  React.useEffect(() => {
    setAccentColor(loaded.accent_color);
    setFontSize(loaded.font_size);
    setFontFamily(loaded.font_family);
    setDarkMode(loaded.dark_mode === "true");
    setLanguage(loaded.language);
    // Load security toggles from settings if available
    const s = loaded as any;
    if (s.sec_two_factor !== undefined) setSecToggles((prev) => ({ ...prev, twoFactor: s.sec_two_factor === "true" }));
    if (s.sec_network_isolation !== undefined) setSecToggles((prev) => ({ ...prev, networkIsolation: s.sec_network_isolation === "true" }));
    if (s.sec_auto_purge !== undefined) setSecToggles((prev) => ({ ...prev, autoPurge: s.sec_auto_purge === "true" }));
    if (s.sec_usb_block !== undefined) setSecToggles((prev) => ({ ...prev, usbBlock: s.sec_usb_block === "true" }));
    if (s.notifications !== undefined) setNotifications(s.notifications === "true");
    if (s.auto_logout_minutes) setAutoLogout(s.auto_logout_minutes);
  }, [loaded]);

  const saveSettings = async () => {
    try {
      await api.updateSettings({
        accent_color: accentColor, font_size: fontSize, font_family: fontFamily,
        dark_mode: String(darkMode), auto_logout_minutes: autoLogout, language,
        sec_two_factor: String(secToggles.twoFactor),
        sec_network_isolation: String(secToggles.networkIsolation),
        sec_auto_purge: String(secToggles.autoPurge),
        sec_usb_block: String(secToggles.usbBlock),
        notifications: String(notifications),
      });
      reload();
      toast.success("Настройки сохранены и применены");
    } catch (e: any) { toast.error(e.message); }
  };

  const resetSettings = async () => {
    try {
      await api.updateSettings({ accent_color: "#00FF00", font_size: "12", font_family: "JetBrains Mono", dark_mode: "true", auto_logout_minutes: "30", language: "ru", sec_two_factor: "true", sec_network_isolation: "true", sec_auto_purge: "false", sec_usb_block: "false", notifications: "true" });
      reload();
      setAccentColor("#00FF00"); setFontSize("12"); setFontFamily("JetBrains Mono"); setDarkMode(true); setAutoLogout("30"); setLanguage("ru");
      setSecToggles({ twoFactor: true, networkIsolation: true, autoPurge: false, usbBlock: false });
      toast.success("Настройки сброшены");
    } catch (e: any) { toast.error(e.message); }
  };

  const [secToggles, setSecToggles] = React.useState({
    twoFactor: true,
    networkIsolation: true,
    autoPurge: false,
    usbBlock: false,
  });

  const toggleSec = (key: keyof typeof secToggles) => {
    setSecToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const accentPresets = ["#00FF00", "#33D6FF", "#B517FF", "#FFD166", "#FF6B6B", "#FF9F43"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--panel-bg)] border border-[var(--app-border)] p-6 md:p-8">
        <div className="flex flex-col">
          <h2 className="text-lg md:text-xl font-black uppercase tracking-wider text-[var(--text-heading)]">Ядро системы</h2>
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-1">Настройки, безопасность, визуал</span>
        </div>
        <div className="flex gap-3">
          <button onClick={resetSettings} className="bg-[var(--panel-muted)] border border-[var(--app-border)] text-[var(--text-secondary)] px-4 md:px-6 py-2.5 text-xs font-black uppercase tracking-widest hover:text-[var(--text-heading)] transition-all flex items-center gap-2">
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Сброс</span>
          </button>
          <button onClick={saveSettings} className="bg-[#00FF00] hover:bg-[#00EE00] text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
            <Save size={14} />
            Сохранить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance */}
        <div className="bg-[var(--panel-bg)] border border-[var(--app-border)] p-6 space-y-6">
          <h3 className="text-xs font-black uppercase text-zinc-500 tracking-wider flex items-center gap-2">
            <Palette size={14} className="text-purple-400" />
            Внешний вид
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-zinc-600 block mb-2">Акцентный цвет</label>
              <div className="flex gap-2 flex-wrap">
                {accentPresets.map((color) => (
                  <button key={color} onClick={() => { setAccentColor(color); toast.success(`Акцент: ${color}`); }} className={cn("w-8 h-8 border-2 transition-all hover:scale-110", accentColor === color ? "border-white scale-110" : "border-zinc-800")} style={{ backgroundColor: color }} />
                ))}
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-8 h-8 bg-transparent border border-zinc-800 cursor-pointer" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-zinc-600 block mb-2">Тема</label>
              <div className="flex gap-2">
                <button onClick={() => setDarkMode(true)} className={cn("flex-1 py-2.5 text-[10px] font-black uppercase border transition-all", darkMode ? "border-[#00FF00]/50 bg-[#00FF00]/10 text-[#00FF00]" : "border-zinc-800 text-zinc-500 hover:text-[var(--text-heading)]")}>Тёмная</button>
                <button onClick={() => setDarkMode(false)} className={cn("flex-1 py-2.5 text-[10px] font-black uppercase border transition-all", !darkMode ? "border-[#00FF00]/50 bg-[#00FF00]/10 text-[#00FF00]" : "border-zinc-800 text-zinc-500 hover:text-[var(--text-heading)]")}>Светлая</button>
              </div>
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="bg-[var(--panel-bg)] border border-[var(--app-border)] p-6 space-y-6">
          <h3 className="text-xs font-black uppercase text-zinc-500 tracking-wider flex items-center gap-2">
            <Type size={14} className="text-blue-400" />
            Типографика
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-zinc-600 block mb-2">Шрифт интерфейса</label>
              <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--app-border)] px-4 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#00FF00]/50">
                <option value="JetBrains Mono">JetBrains Mono</option>
                <option value="Inter">Inter</option>
                <option value="Fira Code">Fira Code</option>
                <option value="IBM Plex Mono">IBM Plex Mono</option>
                <option value="Source Code Pro">Source Code Pro</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-zinc-600 block mb-2">Размер шрифта: {fontSize}px</label>
              <input type="range" min="10" max="16" value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="w-full accent-[#00FF00]" />
              <div className="flex justify-between text-[9px] text-zinc-700 mt-1"><span>10px</span><span>16px</span></div>
            </div>

            <div className="p-3 bg-[var(--panel-muted)] border border-[var(--app-border)]">
              <p className="text-[var(--text-secondary)]" style={{ fontFamily, fontSize: `${fontSize}px` }}>
                Превью: Быстрая коричневая лиса 0123456789
              </p>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-[var(--panel-bg)] border border-[var(--app-border)] p-6 space-y-6">
          <h3 className="text-xs font-black uppercase text-zinc-500 tracking-wider flex items-center gap-2">
            <Shield size={14} className="text-[#00FF00]" />
            Безопасность
          </h3>

          <div className="space-y-5">
            {([
              { key: "twoFactor" as const, label: "Двухфакторная авторизация", desc: "Требовать подтверждение для ROOT" },
              { key: "networkIsolation" as const, label: "Изоляция сети", desc: "Блокировка межстанционных пакетов" },
              { key: "autoPurge" as const, label: "Авто-очистка логов", desc: "Удаление логов старше 7 дней" },
              { key: "usbBlock" as const, label: "Блокировка USB", desc: "Запрет внешних устройств на ПК" },
            ]).map((s) => (
              <div key={s.key} className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-[var(--text-primary)]">{s.label}</span>
                  <span className="text-[10px] text-zinc-600 font-mono">{s.desc}</span>
                </div>
                <div onClick={() => toggleSec(s.key)} className={cn("w-10 h-5 border p-0.5 cursor-pointer transition-all shrink-0", secToggles[s.key] ? "border-[#00FF00] bg-[#00FF00]/10" : "border-[var(--app-border)] bg-[var(--input-bg)]")}>
                  <div className={cn("w-3 h-full transition-all", secToggles[s.key] ? "bg-[#00FF00] ml-auto" : "bg-[var(--text-secondary)]/50 ml-0")} />
                </div>
              </div>
            ))}

            <div>
              <label className="text-[10px] font-black uppercase text-zinc-600 block mb-2">Авто-выход (мин бездействия)</label>
              <select value={autoLogout} onChange={(e) => setAutoLogout(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--app-border)] px-4 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#00FF00]/50">
                <option value="15">15 минут</option>
                <option value="30">30 минут</option>
                <option value="60">1 час</option>
                <option value="0">Никогда</option>
              </select>
            </div>
          </div>
        </div>

        {/* System */}
        <div className="bg-[var(--panel-bg)] border border-[var(--app-border)] p-6 space-y-6">
          <h3 className="text-xs font-black uppercase text-zinc-500 tracking-wider flex items-center gap-2">
            <Monitor size={14} className="text-orange-400" />
            Система
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-zinc-600 block mb-2">Язык интерфейса</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--app-border)] px-4 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#00FF00]/50">
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)]">Уведомления</span>
                <p className="text-[10px] text-zinc-600 font-mono">Звуковые и визуальные оповещения</p>
              </div>
              <div onClick={() => setNotifications(!notifications)} className={cn("w-10 h-5 border p-0.5 cursor-pointer transition-all shrink-0", notifications ? "border-[#00FF00] bg-[#00FF00]/10" : "border-[var(--app-border)] bg-[var(--input-bg)]")}>
                <div className={cn("w-3 h-full transition-all", notifications ? "bg-[#00FF00] ml-auto" : "bg-[var(--text-secondary)]/50 ml-0")} />
              </div>
            </div>
          </div>
        </div>

        {/* Storage */}
        <div className="bg-[var(--panel-bg)] border border-[var(--app-border)] p-6 space-y-6">
          <h3 className="text-xs font-black uppercase text-zinc-500 tracking-wider flex items-center gap-2">
            <Database size={14} className="text-blue-500" />
            Хранилище
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-mono uppercase font-black">
                <span className="text-zinc-600">Основной узел</span>
                <span className="text-[#00FF00]">42.5 / 100 GB</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--panel-muted)] overflow-hidden"><div className="h-full bg-[#00FF00] w-[42.5%]" /></div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-mono uppercase font-black">
                <span className="text-zinc-600">Облачный бэкап</span>
                <span className="text-blue-500">Синхронизация...</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--panel-muted)] overflow-hidden"><div className="h-full bg-blue-500 w-1/3 animate-pulse" /></div>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  const d = await api.getSystemDiagnostics();
                  if (d.database !== "connected") {
                    toast.error("База данных недоступна", { description: d.error || "" });
                    return;
                  }
                  toast.success("Диагностика", {
                    description: [
                      `БД: ${d.database}`,
                      `ПК: ${d.workstations}`,
                      `Активных сессий: ${d.active_sessions}`,
                      d.mysql_version ? `СУБД: ${d.mysql_version}` : "",
                      d.server_time_utc ? `Время сервера (UTC): ${d.server_time_utc}` : "",
                    ]
                      .filter(Boolean)
                      .join("\n"),
                  });
                } catch (e: any) {
                  toast.error(e.message || "Ошибка диагностики");
                }
              }}
              className="w-full py-2.5 bg-[var(--panel-muted)] border border-[var(--app-border)] text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-heading)] transition-all"
            >
              Диагностика
            </button>
          </div>
        </div>

        {/* Network */}
        <div className="bg-[var(--panel-bg)] border border-[var(--app-border)] p-6 space-y-6">
          <h3 className="text-xs font-black uppercase text-zinc-500 tracking-wider flex items-center gap-2">
            <Globe size={14} className="text-cyan-400" />
            Сеть
          </h3>
          <div className="space-y-4 font-mono">
            <div className="flex justify-between py-2 border-b border-[var(--app-border)]">
              <span className="text-[10px] text-zinc-500 font-black uppercase">Админ ПК</span>
              <span className="text-xs text-[#00FF00]">192.168.0.100</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--app-border)]">
              <span className="text-[10px] text-zinc-500 font-black uppercase">Шлюз</span>
              <span className="text-xs text-[var(--text-primary)]">192.168.0.1</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--app-border)]">
              <span className="text-[10px] text-zinc-500 font-black uppercase">DNS</span>
              <span className="text-xs text-[var(--text-primary)]">8.8.8.8</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--app-border)]">
              <span className="text-[10px] text-zinc-500 font-black uppercase">Подсеть</span>
              <span className="text-xs text-[var(--text-primary)]">255.255.255.0</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[10px] text-zinc-500 font-black uppercase">Пинг</span>
              <span className="text-xs text-[#00FF00]">14ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
