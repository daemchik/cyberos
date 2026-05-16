import React from "react";
import { motion } from "motion/react";
import { ArrowUpRight, ArrowDownRight, TrendingUp, CreditCard, Tag, Wallet, Monitor, Wrench } from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { api } from "../lib/api";

function NeonStatCard(props: { label: string; value: string; subtext?: string; icon: React.ReactNode; trend?: number | null; accent: "green" | "cyan" | "yellow" | "magenta" }) {
  const cls = props.accent === "green" ? "border-[#00FF00]/30 shadow-[0_0_18px_rgba(0,255,102,0.18)] text-[#D9FFE8]" :
    props.accent === "cyan" ? "border-[#33D6FF]/30 shadow-[0_0_18px_rgba(51,214,255,0.14)] text-[#D8F6FF]" :
    props.accent === "yellow" ? "border-[#FFD166]/30 shadow-[0_0_18px_rgba(255,209,102,0.12)] text-[#FFF3D0]" :
    "border-[#B517FF]/30 shadow-[0_0_18px_rgba(181,23,255,0.14)] text-[#F4E3FF]";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`bg-black/40 border border-[#2A2A2C] p-4 md:p-6 hover:border-[#00FF00]/50 transition-all relative overflow-hidden flex flex-col justify-between h-36 md:h-40 cursor-pointer ${cls}`}>
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
      <div className="flex justify-between items-start z-10">
        <div>
          <p className="text-zinc-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-2 md:mb-3 leading-none">{props.label}</p>
          <div className="text-2xl md:text-3xl font-mono font-black tracking-tighter leading-none mb-2">{props.value}</div>
          {props.subtext && <p className="text-[9px] md:text-[10px] text-zinc-500 font-mono uppercase tracking-tighter opacity-70">{props.subtext}</p>}
        </div>
        <div className="p-2 rounded border border-transparent">{props.icon}</div>
      </div>
      {typeof props.trend === "number" ? (
        <div className={cn(
          "mt-auto flex items-end justify-between",
          props.trend >= 0 ? "text-[#00FF00]" : "text-red-400",
        )}>
          <div className={cn(
            "flex items-center gap-2 text-[10px] font-black px-2 py-1 border font-mono",
            props.trend >= 0 ? "bg-[#00FF00]/10 border-[#00FF00]/20" : "bg-red-500/10 border-red-500/20",
          )}>
            {props.trend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            <span>{props.trend >= 0 ? "+" : ""}{props.trend}%</span>
          </div>
        </div>
      ) : <div className="mt-auto h-1 w-full bg-zinc-900 overflow-hidden"><div className="h-full w-1/2 bg-[#00FF00]" /></div>}
    </motion.div>
  );
}

export function Dashboard() {
  const [stats, setStats] = React.useState<any>(null);
  const sessionClockRef = React.useRef<
    Record<number, { remaining: number; syncedAt: number; status: string }>
  >({});
  const [, setDashTick] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setDashTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  React.useLayoutEffect(() => {
    const list = stats?.activeSessions || [];
    const now = Date.now();
    const clock = sessionClockRef.current;
    list.forEach((s: any) => {
      const sid = Number(s.id);
      if (!Number.isFinite(sid)) return;
      const rem = Number(s.remaining_seconds);
      clock[sid] = {
        remaining: Number.isFinite(rem) ? Math.max(0, rem) : 0,
        syncedAt: now,
        status: String(s.status || "active"),
      };
    });
    Object.keys(clock).forEach((k) => {
      const id = Number(k);
      if (!list.some((s: any) => Number(s.id) === id)) delete clock[id];
    });
    setDashTick((t) => t + 1);
  }, [stats]);

  React.useEffect(() => {
    const load = () => api.getDashboardStats().then(setStats).catch((e) => console.error("getDashboardStats", e));
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const displaySessionRemainSec = React.useCallback((sessionId: number) => {
    const meta = sessionClockRef.current[sessionId];
    if (!meta) return 0;
    if (meta.status === "paused") return meta.remaining;
    const elapsed = Math.floor((Date.now() - meta.syncedAt) / 1000);
    return Math.max(0, meta.remaining - elapsed);
  }, []);

  const pcs = stats?.pcs || { total: 0, free_count: 0, occupied_count: 0, maintenance_count: 0 };
  const revenue = stats?.todayRevenue || 0;
  const sessions = stats?.activeSessions || [];
  const recentSales = stats?.recentSales || [];
  const recentTasks = stats?.recentTasks || [];

  const revTrend = stats?.revenueTrendPct;
  const sessTrend = stats?.sessionsTrendPct;

  return (
    <div className="space-y-6 md:space-y-8 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <NeonStatCard label="Выручка сегодня" value={formatCurrency(Number(revenue))} subtext={`Продаж: ${stats?.todaySalesCount || 0}`} icon={<TrendingUp className="text-[#00FF00]" size={18} />} trend={typeof revTrend === "number" ? revTrend : null} accent="green" />
        <NeonStatCard label="Активные сессии" value={String(sessions.length)} subtext={`Всего за день: ${stats?.todaySessionsCount || 0}`} icon={<CreditCard className="text-[#33D6FF]" size={18} />} trend={typeof sessTrend === "number" ? sessTrend : null} accent="cyan" />
        <NeonStatCard label="ПК всего" value={String(pcs.total)} subtext={`Свободно: ${pcs.free_count}`} icon={<Tag className="text-[#FFD166]" size={18} />} accent="yellow" />
        <NeonStatCard label="На обслуживании" value={String(pcs.maintenance_count)} subtext={`Занято: ${pcs.occupied_count}`} icon={<Wallet className="text-[#B517FF]" size={18} />} accent="magenta" />
      </div>

      {/* PC status */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        {[
          { label: "Всего ПК", val: String(pcs.total), icon: <Monitor size={14} />, color: "text-zinc-500" },
          { label: "Свободно", val: String(pcs.free_count), color: "text-[#00FF00]", dot: true },
          { label: "Занято", val: String(pcs.occupied_count), color: "text-blue-400", dot: true },
          { label: "Обслуживание", val: String(pcs.maintenance_count), icon: <Wrench size={14} />, color: "text-orange-500" },
        ].map((item, idx) => (
          <div key={idx} className="p-3 md:p-4 bg-black/40 border border-[#2A2A2C] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[8px] md:text-[9px] text-zinc-600 font-black uppercase tracking-wider mb-1">{item.label}</span>
              <span className={cn("text-base md:text-lg font-mono font-bold leading-none", item.color)}>{item.val}</span>
            </div>
            {item.dot ? <div className={cn("w-1.5 h-1.5 rounded-full", item.color?.replace("text-", "bg-"))} /> : item.icon}
          </div>
        ))}
      </div>

      {/* Active sessions */}
      {sessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Активные сессии ({sessions.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sessions.slice(0, 8).map((s: any) => {
              const remainSec = displaySessionRemainSec(Number(s.id));
              const totalSec = Math.max(1, Number(s.duration_minutes) * 60);
              const progress = Math.min(100, Math.max(0, (100 * (totalSec - remainSec)) / totalSec));
              const h = Math.floor(remainSec / 3600);
              const m = Math.floor((remainSec % 3600) / 60);
              return (
              <div key={s.id} className="bg-black/40 border border-[#2A2A2C] p-4 space-y-3 hover:border-zinc-700 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black uppercase text-zinc-600 block mb-1">ПК {String(s.pc_number).padStart(2, "0")}</span>
                    <span className="text-xs font-bold text-white">{s.client_name}</span>
                  </div>
                  <span className={cn("text-sm font-mono font-black", remainSec > 600 ? "text-[#00FF00]" : "text-red-500")}>{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}</span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00FF00] transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            );})}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Tasks */}
        <div className="lg:col-span-3 bg-black/40 border border-[#2A2A2C] flex flex-col">
          <div className="px-4 md:px-6 py-4 border-b border-[#2A2A2C] bg-black/20">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Задачи</h4>
          </div>
          <div className="flex-1 overflow-auto max-h-[300px] no-scrollbar">
            {recentTasks.length === 0 ? (
              <p className="p-6 text-zinc-600 font-mono text-xs">Нет активных задач</p>
            ) : (
              <table className="w-full text-left font-mono">
                <tbody className="divide-y divide-[#2A2A2C]">
                  {recentTasks.map((task: any) => (
                    <tr key={task.id} className="hover:bg-[#00FF00]/5 transition-colors">
                      <td className="px-4 md:px-6 py-3 text-xs text-zinc-400">{task.text}</td>
                      <td className="px-4 md:px-6 py-3 text-[10px] text-zinc-600">{task.creator}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent sales */}
        <div className="lg:col-span-2 bg-black/40 border border-[#2A2A2C] flex flex-col">
          <div className="px-4 md:px-6 py-4 border-b border-[#2A2A2C] bg-black/20">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Последние продажи</h4>
          </div>
          <div className="flex-1 overflow-auto max-h-[300px] no-scrollbar">
            {recentSales.length === 0 ? (
              <p className="p-6 text-zinc-600 font-mono text-xs">Нет продаж сегодня</p>
            ) : (
              <table className="w-full text-left font-mono">
                <tbody className="divide-y divide-[#2A2A2C]">
                  {recentSales.map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 md:px-6 py-3 text-xs text-zinc-400 truncate max-w-[200px]">{sale.items_text || "—"}</td>
                      <td className="px-4 md:px-6 py-3 text-[11px] font-black text-[#00FF00]">{formatCurrency(Number(sale.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
