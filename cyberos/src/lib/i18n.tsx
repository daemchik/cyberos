import React from "react";
import { useSettings } from "./SettingsContext";

const dict = {
  ru: {
    "nav.dashboard": "Панель управления",
    "nav.floor": "Карта зала",
    "nav.clients": "База клиентов",
    "nav.tasks": "Задачи админа",
    "nav.market": "Маркет снабжения",
    "nav.reports": "Отчеты и Аналитика",
    "nav.promos": "Промокоды",
    "nav.tariffs": "Конфиг Тарифов",
    "nav.settings": "Ядро Системы",
    "nav.notifications": "Уведомления",
  },
  en: {
    "nav.dashboard": "Dashboard",
    "nav.floor": "Floor map",
    "nav.clients": "Clients",
    "nav.tasks": "Admin tasks",
    "nav.market": "Supply market",
    "nav.reports": "Reports & analytics",
    "nav.promos": "Promo codes",
    "nav.tariffs": "Tariffs",
    "nav.settings": "System core",
    "nav.notifications": "Notifications",
  },
} as const;

export type Lang = "ru" | "en";

export function useI18n() {
  const { settings } = useSettings();
  const lang = (settings.language === "en" ? "en" : "ru") as Lang;
  const t = React.useCallback(
    (key: keyof (typeof dict)["ru"]) => dict[lang][key] || dict.ru[key] || key,
    [lang]
  );
  return { lang, t };
}
