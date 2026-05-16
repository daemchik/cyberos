import React from "react";
import { Download, BarChart2, PieChart, TrendingUp, TrendingDown, Users, Monitor, Calendar, Clock } from "lucide-react";
import { motion } from "motion/react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { cn, formatCurrency } from "../lib/utils";
import { toast } from "sonner";
import { api } from "../lib/api";

export function ClubReports() {
  const [period, setPeriod] = React.useState<"day" | "week" | "month">("week");
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setLoading(true);
    api
      .getAnalytics(period)
      .then((d) => {
        setData(d);
        setUpdatedAt(new Date());
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [period]);

  const pctChange = (a: number, b: number) => {
    if (a === 0) return b > 0 ? 100 : 0;
    return Math.round(((b - a) / a) * 100);
  };

  const daily = data?.dailyRevenue || [];
  const revPair =
    daily.length >= 2
      ? pctChange(daily[daily.length - 2].rev, daily[daily.length - 1].rev)
      : null;
  const dd = data?.dailyDetail || [];
  const sessPair =
    dd.length >= 2 ? pctChange(dd[dd.length - 2].sessions, dd[dd.length - 1].sessions) : null;
  const cliPair =
    dd.length >= 2 ? pctChange(dd[dd.length - 2].newClients, dd[dd.length - 1].newClients) : null;

  const fmtTrend = (n: number | null) =>
    n === null ? "—" : `${n >= 0 ? "+" : ""}${n}%`;

  const stats = [
    { label: "Выручка", value: data ? formatCurrency(Number(data.revenue)) : "—", trend: fmtTrend(revPair), up: revPair === null ? true : revPair >= 0 },
    { label: "Продажи", value: data ? String(data.salesCount) : "—", trend: "—", up: true },
    { label: "Сессии", value: data ? String(data.sessionsCount) : "—", trend: fmtTrend(sessPair), up: sessPair === null ? true : sessPair >= 0 },
    { label: "Новые клиенты", value: data ? String(data.newClients) : "—", trend: fmtTrend(cliPair), up: cliPair === null ? true : cliPair >= 0 },
  ];

  const topClients = data?.topClients || [];
  const peakHours =
    data?.hourlyLoad?.length > 0
      ? data.hourlyLoad
      : [];
  const dailyRevenueRows = data?.dailyRevenue || [];

  const revenueChartData = dailyRevenueRows.map((d: any) => {
    const day = d.day ? new Date(d.day) : null;
    const label =
      day && !Number.isNaN(day.getTime())
        ? day.toLocaleDateString("ru-RU", { month: "short", day: "numeric" })
        : String(d.day ?? "");
    return { label, revK: Number(d.rev || 0) / 1000 };
  });
  const revMax = Math.max(0.01, ...revenueChartData.map((d: { revK: number }) => d.revK));

  const peakHoursChart =
    peakHours.length > 0
      ? peakHours.map((h: { hour: string; load: number }) => ({
          hour: h.hour.split(":")[0] || h.hour,
          load: h.load,
        }))
      : [];
  const zoneList = data?.zoneRevenue || [];

  const totalZoneRev = zoneList.reduce((s: number, x: any) => s + x.revenue, 0) || 1;
  const revenueByZone = zoneList.map((z: any) => ({
    zone: z.zone,
    revenue: z.revenue,
    pct: Math.round((z.revenue / totalZoneRev) * 100),
  }));

  const popularZone =
    zoneList.length > 0
      ? zoneList.reduce((a: any, b: any) => (a.revenue >= b.revenue ? a : b)).zone
      : "—";
  const peakSlot =
    peakHours.length > 0
      ? peakHours.reduce((a: any, b: any) => (a.load >= b.load ? a : b)).hour
      : "—";

  const currentStats = stats;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-[var(--text-secondary)] text-xs font-mono uppercase tracking-widest border border-[var(--app-border)] bg-[var(--panel-bg)]">
        Загрузка аналитики…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--panel-bg)] border border-[var(--app-border)] p-6 md:p-8">
        <div className="flex flex-col">
          <h2 className="text-lg md:text-xl font-black uppercase tracking-wider text-[var(--text-heading)]">Аналитика и отчеты</h2>
          <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-widest mt-1">
            {updatedAt
              ? `Обновлено: ${updatedAt.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
              : "Загрузка…"}
          </span>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => toast.info("PDF: подключите reportlab или отдельный сервис")} className="bg-[var(--panel-muted)] border border-[var(--app-border)] text-[var(--text-primary)] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest hover:text-[var(--text-heading)] transition-all flex items-center gap-2">
            <Download size={14} /> PDF
          </button>
          <button
            type="button"
            onClick={() => {
              void api.downloadAnalyticsCsv(period).catch((e: Error) => toast.error(e.message));
            }}
            className="bg-[#00FF00] hover:bg-[#00EE00] text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        {([["day", "Сегодня"], ["week", "Неделя"], ["month", "Месяц"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setPeriod(key)} className={cn("px-4 py-2.5 text-[10px] font-black uppercase border transition-all", period === key ? "border-[#00FF00]/50 bg-[#00FF00]/10 text-[#00FF00]" : "border-[var(--app-border)] text-[var(--text-secondary)] hover:text-[var(--text-heading)]")}>
            {label}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {currentStats.map((stat, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="bg-[var(--panel-bg)] border border-[var(--app-border)] p-4 md:p-5 flex flex-col gap-3 hover:border-[#00FF00]/30 transition-all">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">{stat.label}</span>
              <span className={cn("text-[9px] font-mono font-bold px-1.5 py-0.5 border flex items-center gap-1", stat.up ? "text-[#00FF00] border-[#00FF00]/20 bg-[#00FF00]/5" : "text-red-500 border-red-500/20 bg-red-500/5")}>
                {stat.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                {stat.trend}
              </span>
            </div>
            <span className={cn("text-xl md:text-2xl font-black font-mono tracking-tighter", stat.up ? "text-[var(--text-heading)]" : "text-[var(--text-primary)]")}>{stat.value}</span>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-[var(--panel-bg)] border border-[var(--app-border)] p-5 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase text-[var(--text-secondary)] tracking-wider flex items-center gap-2">
              <BarChart2 size={14} className="text-[#00FF00]" /> Динамика выручки
            </h3>
            <span className="text-[9px] font-mono text-[var(--text-secondary)]">тыс. ₽ / день</span>
          </div>
          <div className="h-48 md:h-56 w-full min-h-[12rem]">
            {revenueChartData.length === 0 ? (
              <p className="text-[var(--text-secondary)] text-xs font-mono w-full text-center py-20">Нет данных за период</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00FF00" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#00FF00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--chart-tick)", fontSize: 10, fontFamily: "ui-monospace" }} axisLine={{ stroke: "var(--chart-grid)" }} tickLine={false} />
                  <YAxis domain={[0, Math.ceil(revMax * 1.2 * 10) / 10]} tick={{ fill: "var(--chart-tick)", fontSize: 10, fontFamily: "ui-monospace" }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    contentStyle={{ background: "var(--panel-bg)", border: "1px solid var(--app-border)", fontSize: 11, color: "var(--text-primary)" }}
                    labelStyle={{ color: "var(--text-secondary)" }}
                    formatter={(v: number) => [`${v.toFixed(1)} тыс. ₽`, "Выручка"]}
                  />
                  <Area type="monotone" dataKey="revK" stroke="#00FF00" strokeWidth={2} fill="url(#revFill)" dot={{ r: 2, fill: "#00FF00" }} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Revenue by zone */}
        <div className="bg-[var(--panel-bg)] border border-[var(--app-border)] p-5 md:p-6">
          <h3 className="text-xs font-black uppercase text-[var(--text-secondary)] tracking-wider mb-6 flex items-center gap-2">
            <PieChart size={14} className="text-blue-500" /> По зонам
          </h3>
          <div className="space-y-4">
            {revenueByZone.map((item: { zone: string; revenue: number; pct: number }) => (
              <div key={item.zone} className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span className="text-[var(--text-primary)]">{item.zone}</span>
                  <span className="text-[var(--text-heading)]">{item.pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--panel-muted)] overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }} className={cn("h-full", item.zone === "VIP" ? "bg-purple-500" : item.zone === "Киберспорт" ? "bg-blue-500" : item.zone === "Маркет" ? "bg-orange-500" : "bg-[#00FF00]")} />
                </div>
                <span className="text-[9px] font-mono text-[var(--text-secondary)]">{(item.revenue / 1000).toFixed(0)}k ₽</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Peak hours */}
        <div className="bg-[var(--panel-bg)] border border-[var(--app-border)] p-5 md:p-6">
          <h3 className="text-xs font-black uppercase text-[var(--text-secondary)] tracking-wider mb-6 flex items-center gap-2">
            <Clock size={14} className="text-orange-400" /> Пиковые часы загрузки
          </h3>
          <div className="h-40 w-full min-h-[10rem]">
            {peakHoursChart.length === 0 ? (
              <p className="text-[var(--text-secondary)] text-xs font-mono w-full text-center py-12">Нет данных по сессиям за период</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHoursChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: "var(--chart-tick)", fontSize: 9, fontFamily: "ui-monospace" }} axisLine={{ stroke: "var(--chart-grid)" }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "var(--chart-tick)", fontSize: 9 }} width={28} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--panel-bg)", border: "1px solid var(--app-border)", fontSize: 11, color: "var(--text-primary)" }}
                    formatter={(v: number) => [`${v}%`, "Загрузка"]}
                  />
                  <Bar dataKey="load" radius={[2, 2, 0, 0]}>
                    {peakHoursChart.map((entry: { load: number }, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.load > 85 ? "#ef4444" : entry.load > 60 ? "#f97316" : "#22c55e"}
                        fillOpacity={0.65}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex gap-4 mt-4 text-[9px] font-black uppercase text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#00FF00]/40" /> Норма</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-orange-500/40" /> Высокая</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500/40" /> Пик</span>
          </div>
        </div>

        {/* Top clients */}
        <div className="bg-[var(--panel-bg)] border border-[var(--app-border)] p-5 md:p-6">
          <h3 className="text-xs font-black uppercase text-[var(--text-secondary)] tracking-wider mb-4 flex items-center gap-2">
            <Users size={14} className="text-purple-400" /> Топ клиенты за период
          </h3>
          <div className="space-y-1">
            {topClients.map((client: { name: string; sessions: number; spent: number }, i: number) => (
              <div key={client.name} className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className={cn("w-6 h-6 flex items-center justify-center text-[10px] font-black border", i === 0 ? "border-[#00FF00]/50 text-[#00FF00] bg-[#00FF00]/5" : "border-[var(--app-border)] text-[var(--text-secondary)]")}>{i + 1}</span>
                  <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--text-heading)]">{client.name}</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono">
                  <span className="text-[var(--text-secondary)]">{client.sessions} сес.</span>
                  <span className="text-[#00FF00] font-black">{formatCurrency(client.spent)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Third row - additional metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Ср. длительность сессии", value: data?.avgSessionMinutes != null ? `${data.avgSessionMinutes} мин` : "—", icon: <Clock size={14} className="text-blue-400" /> },
          { label: "Популярная зона", value: popularZone, icon: <Monitor size={14} className="text-[#00FF00]" /> },
          { label: "Пик посещений", value: peakSlot, icon: <Calendar size={14} className="text-orange-400" /> },
          { label: "Новых клиентов (период)", value: data ? String(data.newClients) : "—", icon: <Users size={14} className="text-purple-400" /> },
        ].map((item, idx) => (
          <div key={idx} className="bg-[var(--panel-bg)] border border-[var(--app-border)] p-4 md:p-5 space-y-3">
            <div className="flex items-center gap-2">
              {item.icon}
              <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">{item.label}</span>
            </div>
            <span className="text-lg md:text-xl font-black font-mono tracking-tighter text-[var(--text-heading)] block">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Revenue breakdown table */}
      <div className="bg-[var(--panel-bg)] border border-[var(--app-border)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--app-border)] flex justify-between items-center">
          <h3 className="text-xs font-black uppercase text-[var(--text-secondary)] tracking-wider">Детализация по дням</h3>
          <button onClick={() => toast.info("Полный отчет загружается...")} className="text-[9px] font-black text-[#00FF00] uppercase hover:underline">Показать все</button>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--app-border)]">
              <tr>
                <th className="px-5 py-3">Дата</th>
                <th className="px-5 py-3">Выручка</th>
                <th className="px-5 py-3">Сессии</th>
                <th className="px-5 py-3">Клиенты</th>
                <th className="px-5 py-3">Загрузка</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)] font-mono text-xs">
              {(dd.length > 0 ? dd : []).slice().reverse().map((row: { day: string; revenue: number; sessions: number; newClients: number; loadPct: number }) => {
                const d = new Date(row.day);
                const dateStr = Number.isNaN(d.getTime()) ? row.day : d.toLocaleDateString("ru-RU");
                return (
                <tr key={row.day} className="hover:bg-[var(--accent)]/5 transition-colors">
                  <td className="px-5 py-3 text-[var(--text-primary)]">{dateStr}</td>
                  <td className="px-5 py-3 text-[#00FF00] font-black">{formatCurrency(row.revenue)}</td>
                  <td className="px-5 py-3 text-[var(--text-primary)]">{row.sessions}</td>
                  <td className="px-5 py-3 text-[var(--text-primary)]">{row.newClients}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-16 bg-[var(--panel-muted)] overflow-hidden"><div className={cn("h-full", row.loadPct > 80 ? "bg-red-500" : row.loadPct > 60 ? "bg-orange-500" : "bg-[#00FF00]")} style={{ width: `${row.loadPct}%` }} /></div>
                      <span className="text-[var(--text-secondary)]">{row.loadPct}%</span>
                    </div>
                  </td>
                </tr>
              );})}
              {dd.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[var(--text-secondary)] text-xs">Нет данных за период</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
