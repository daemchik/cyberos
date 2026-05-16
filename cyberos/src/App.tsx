import { useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";
import { motion } from "motion/react";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { FloorMap } from "./components/FloorMap";
import { ClientList } from "./components/ClientList";
import { TasksManager } from "./components/TasksManager";
import { SupplyMarket } from "./components/SupplyMarket";
import { ClubReports } from "./components/ClubReports";
import { PromoManager } from "./components/PromoManager";
import { TariffConfig } from "./components/TariffConfig";
import { SystemNerve } from "./components/SystemNerve";
import { PlayerScreen } from "./components/PlayerScreen";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { IdleLogout } from "./components/IdleLogout";
import { SettingsProvider } from "./lib/SettingsContext";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { LoginScreen } from "./components/LoginScreen";
import type { TabId } from "./lib/navTabs";
import { DEFAULT_TAB, TAB_ORDER } from "./lib/navTabs";

const VALID_TABS = new Set(TAB_ORDER.map((x) => x.id));

function parseStoredTab(raw: string | null): TabId {
  if (raw && VALID_TABS.has(raw as TabId)) return raw as TabId;
  return DEFAULT_TAB;
}

function AdminShell() {
  const { token, ready } = useAuth();
  if (!ready) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center text-zinc-500 text-xs font-mono uppercase tracking-widest">
        Загрузка…
      </div>
    );
  }
  if (!token) return <LoginScreen />;
  return (
    <SettingsProvider>
      <AdminPanel />
    </SettingsProvider>
  );
}

function AdminPanel() {
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    try {
      return parseStoredTab(localStorage.getItem("cyberos_last_tab"));
    } catch {
      return DEFAULT_TAB;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("cyberos_last_tab", activeTab);
    } catch {
      /* ignore */
    }
  }, [activeTab]);

  const setTabSafe = (tab: TabId) => {
    setActiveTab(tab);
  };

  const content = useMemo(() => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "floor":
        return <FloorMap />;
      case "clients":
        return <ClientList />;
      case "tasks":
        return <TasksManager />;
      case "market":
        return <SupplyMarket />;
      case "reports":
        return <ClubReports />;
      case "promos":
        return <PromoManager />;
      case "tariffs":
        return <TariffConfig />;
      case "settings":
        return <SystemNerve />;
      case "notifications":
        return <NotificationsPanel />;
      default:
        return <Dashboard />;
    }
  }, [activeTab]);

  return (
    <Layout activeTab={activeTab} onTabChange={setTabSafe}>
      <IdleLogout />
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {content}
      </motion.div>
    </Layout>
  );
}

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash);

  useEffect(() => {
    const handler = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const isPlayerRoute =
    route.startsWith("#/player") || window.location.pathname === "/player";

  return (
    <>
      <Toaster theme="dark" position="top-right" />
      {isPlayerRoute ? (
        <PlayerScreen />
      ) : (
        <AuthProvider>
          <AdminShell />
        </AuthProvider>
      )}
    </>
  );
}
