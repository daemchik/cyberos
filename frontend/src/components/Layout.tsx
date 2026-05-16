import React from "react";
import {
  LayoutDashboard,
  Monitor,
  Users,
  ShoppingBag,
  Settings,
  BarChart2,
  Ticket,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Bell,
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { useI18n } from "../lib/i18n";
import { TAB_ORDER, type TabId } from "../lib/navTabs";

const PRIMARY: TabId[] = ["dashboard", "floor", "clients", "tasks", "market"];
const SECONDARY: TabId[] = ["reports", "promos", "tariffs", "settings", "notifications"];

const ICONS: Record<TabId, React.ReactNode> = {
  dashboard: <LayoutDashboard size={20} />,
  floor: <Monitor size={20} />,
  clients: <Users size={20} />,
  tasks: <CheckSquare size={20} />,
  market: <ShoppingBag size={20} />,
  reports: <BarChart2 size={20} />,
  promos: <Ticket size={20} />,
  tariffs: <Settings size={20} />,
  settings: <Settings size={20} />,
  notifications: <Bell size={20} />,
};

export const Layout = ({
  children,
  activeTab,
  onTabChange,
}: {
  children: React.ReactNode;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) => {
  const { t } = useI18n();

  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { logout, employee } = useAuth();
  const [headerStats, setHeaderStats] = React.useState({
    occupied: 0,
    total: 0,
    free: 0,
    revenue: 0,
    pendingOrders: 0,
  });
  const [pingMs, setPingMs] = React.useState<number | null>(null);
  const [loadPct, setLoadPct] = React.useState(35);
  const [clock, setClock] = React.useState(() => new Date());

  React.useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    const measure = async () => {
      const t0 = performance.now();
      try {
        await api.health();
        setPingMs(Math.round(performance.now() - t0));
      } catch {
        setPingMs(null);
      }
      let pct = 30;
      try {
        const mem = (performance as any).memory;
        if (mem && mem.jsHeapSizeLimit > 0) {
          pct = Math.min(98, Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100));
        } else {
          pct = Math.min(95, 25 + (navigator.hardwareConcurrency || 4) * 3);
        }
      } catch {
        pct = 40;
      }
      setLoadPct(pct);
    };
    void measure();
    const iv = window.setInterval(() => void measure(), 10000);
    return () => window.clearInterval(iv);
  }, []);

  React.useEffect(() => {
    const load = () => {
      Promise.all([api.getDashboardStats(), api.getLive()])
        .then(([s, live]) => {
          const ws = live.workstations || [];
          const occ = ws.filter((w: { status: string }) => w.status === "occupied").length;
          const free = ws.filter((w: { status: string }) => w.status === "free").length;
          setHeaderStats({
            occupied: occ,
            total: ws.length || s.pcs?.total || 0,
            free,
            revenue: Number(s.todayRevenue),
            pendingOrders: Number(live.pending_orders) || 0,
          });
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  const label = (id: TabId) => {
    const meta = TAB_ORDER.find((x) => x.id === id);
    return meta ? t(meta.i18n) : id;
  };

  const handleTabChange = (id: TabId) => {
    onTabChange(id);
    setMobileMenuOpen(false);
  };

  const SidebarItem = ({ id }: { id: TabId }) => {
    const active = activeTab === id;
    return (
      <button
        type="button"
        onClick={() => handleTabChange(id)}
        className={cn(
          "flex items-center gap-3 w-full text-left cursor-pointer transition-all duration-200 group relative rounded-none",
          sidebarOpen ? "px-4 py-3 justify-between" : "px-0 py-3 justify-center",
          active
            ? "bg-[#00FF00]/10 text-[#00FF00] border-l-4 border-[#00FF00]"
            : "text-zinc-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent"
        )}
        title={!sidebarOpen ? label(id) : undefined}
      >
        <div className={cn("flex items-center gap-3", !sidebarOpen && "gap-0")}>
          <div className={cn(active ? "text-[#00FF00]" : "text-zinc-500 group-hover:text-zinc-300")}>
            {ICONS[id]}
          </div>
          {sidebarOpen && (
            <span className="text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">{label(id)}</span>
          )}
        </div>
        {sidebarOpen && active && <ChevronRight className="w-3 h-3 opacity-50" />}
      </button>
    );
  };

  const sidebarContent = (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 no-scrollbar">
        <div className="space-y-0.5 px-1">
          {sidebarOpen && (
            <div className="px-5 mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-black">
              Операции
            </div>
          )}
          {PRIMARY.map((id) => (
            <SidebarItem key={id} id={id} />
          ))}
        </div>

        {sidebarOpen && (
          <div className="px-5 mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-black mt-3">
            Управление
          </div>
        )}
        {!sidebarOpen && <div className="my-3 mx-2 h-px bg-zinc-800" />}
        <div className="space-y-0.5 px-1">
          {SECONDARY.map((id) => (
            <SidebarItem key={id} id={id} />
          ))}
        </div>
      </div>

      {sidebarOpen && (
        <div className="p-4 border-t border-[#2A2A2C] text-[11px] font-mono leading-relaxed">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500 uppercase tracking-tighter">Смена</span>
            <span className="text-[#00FF00] font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF00] animate-pulse" />
              Система активна
            </span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="flex h-screen bg-[var(--app-bg)] text-[var(--app-fg)] font-sans overflow-hidden">
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside
        className={cn(
          "bg-[var(--sidebar-bg)] border-r border-[var(--app-border)] flex flex-col shrink-0 transition-all duration-300 z-50",
          sidebarOpen ? "w-64" : "w-16",
          "hidden lg:flex"
        )}
      >
        <div
          className={cn(
            "border-b border-[var(--app-border)] mb-2 flex items-center",
            sidebarOpen ? "p-4 justify-between" : "p-2 justify-center"
          )}
        >
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#00FF00] rounded-sm flex items-center justify-center font-black text-black text-xs">
                CC
              </div>
              <h1 className="text-[#00FF00] font-black text-sm tracking-tighter uppercase">CYBER CORE</h1>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-zinc-500 hover:text-white transition-colors"
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
        {sidebarContent}
      </aside>

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-[var(--sidebar-bg)] border-r border-[var(--app-border)] flex flex-col z-50 transition-transform duration-300 lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b border-[var(--app-border)] mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#00FF00] rounded-sm flex items-center justify-center font-black text-black text-xs">
              CC
            </div>
            <h1 className="text-[#00FF00] font-black text-sm tracking-tighter uppercase">CYBER CORE</h1>
          </div>
          <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-zinc-500 hover:text-white">
            <X size={18} />
          </button>
        </div>
        {sidebarContent}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[var(--app-bg)]">
        <header className="h-14 border-b border-[var(--app-border)] flex items-center justify-between px-4 md:px-6 shrink-0 z-10 bg-[var(--header-bg)] backdrop-blur-sm">
          <div className="flex items-center gap-3 md:gap-8">
            <button type="button" onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-zinc-400 hover:text-white">
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-4 md:gap-8">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase block font-black tracking-widest leading-none mb-1">Онлайн</span>
                <span className="text-lg md:text-xl font-mono leading-none font-bold tracking-tighter">
                  {headerStats.occupied}
                  <span className="text-zinc-700">/{headerStats.total}</span>
                </span>
              </div>
              <div className="hidden sm:block">
                <span className="text-[9px] text-zinc-500 uppercase block font-black tracking-widest leading-none mb-1">Выручка</span>
                <span className="text-lg md:text-xl font-mono leading-none text-[#00FF00] font-bold tracking-tighter">
                  {formatCurrency(headerStats.revenue)}
                </span>
              </div>
              <div className="hidden md:block">
                <span className="text-[9px] text-zinc-500 uppercase block font-black tracking-widest leading-none mb-1">Заказы</span>
                <span className="text-lg font-mono leading-none font-bold tracking-tighter text-amber-400/90">{headerStats.pendingOrders}</span>
              </div>
              <div className="hidden md:block">
                <span className="text-[9px] text-zinc-500 uppercase block font-black tracking-widest leading-none mb-1">Свободно</span>
                <span className="text-lg font-mono leading-none font-bold tracking-tighter text-zinc-300">
                  {headerStats.free} <span className="text-zinc-600 text-xs">ПК</span>
                </span>
              </div>
              <div className="hidden lg:block">
                <span className="text-[9px] text-zinc-500 uppercase block font-black tracking-widest leading-none mb-1">Время</span>
                <span className="text-lg font-mono leading-none font-bold tracking-tighter text-zinc-300">
                  {clock.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[9px] text-zinc-600 font-black uppercase">Нагр</span>
              <div className="h-1.5 w-14 md:w-20 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-[#00FF00] shadow-[0_0_8px_#00FF00] transition-all duration-500"
                  style={{ width: `${loadPct}%` }}
                />
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1 text-[9px] font-mono text-zinc-600">
              <span className="w-1.5 h-1.5 bg-[#00FF00] rounded-full" />
              <span>Пинг: {pingMs != null ? `${pingMs}ms` : "—"}</span>
            </div>

            {employee && (
              <span className="hidden lg:inline text-[10px] font-mono text-zinc-500 max-w-[120px] truncate" title={employee.name}>
                {employee.name}
              </span>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="px-3 py-1.5 text-zinc-500 hover:text-white transition-all border border-zinc-800 text-[10px] font-black uppercase tracking-widest"
            >
              Выход
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth no-scrollbar">{children}</div>
      </main>
    </div>
  );
};
