export type TabId =
  | "dashboard"
  | "floor"
  | "clients"
  | "tasks"
  | "market"
  | "reports"
  | "promos"
  | "tariffs"
  | "settings"
  | "notifications";

export type TabI18nKey =
  | "nav.dashboard"
  | "nav.floor"
  | "nav.clients"
  | "nav.tasks"
  | "nav.market"
  | "nav.reports"
  | "nav.promos"
  | "nav.tariffs"
  | "nav.settings"
  | "nav.notifications";

export const TAB_ORDER: { id: TabId; i18n: TabI18nKey }[] = [
  { id: "dashboard", i18n: "nav.dashboard" },
  { id: "floor", i18n: "nav.floor" },
  { id: "clients", i18n: "nav.clients" },
  { id: "tasks", i18n: "nav.tasks" },
  { id: "market", i18n: "nav.market" },
  { id: "reports", i18n: "nav.reports" },
  { id: "promos", i18n: "nav.promos" },
  { id: "tariffs", i18n: "nav.tariffs" },
  { id: "settings", i18n: "nav.settings" },
  { id: "notifications", i18n: "nav.notifications" },
];

export const DEFAULT_TAB: TabId = "dashboard";
