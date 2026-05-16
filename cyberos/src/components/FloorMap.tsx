import React from "react";
import {
  Info,
  Power,
  WifiOff,
  ShieldAlert,
  Edit2,
  Check,
  RotateCcw,
  GripVertical,
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { api } from "../lib/api";

type WorkstationStatus = "free" | "occupied" | "maintenance";

type Workstation = {
  id: number;
  dbId: number;
  status: WorkstationStatus;
  zone: string;
  zoneId: number;
  gridPos: number;
  ip: string;
  clientName?: string;
  specs: { cpu: string; gpu: string; ram: string };
};

type Zone = { id: number; name: string; color: string };

const GRID_COLS = 10;
const GRID_CELLS = 80;

const statusColors: Record<WorkstationStatus, string> = {
  free: "bg-zinc-900 border-[#2A2A2C] text-zinc-600 opacity-50",
  occupied: "bg-[#00FF00]/10 border-[#00FF00]/40 text-[#00FF00] shadow-[0_0_15px_#00FF0010]",
  maintenance: "bg-red-900/10 border-red-500/30 text-red-500",
};

const statusIcons: Record<WorkstationStatus, React.ReactNode> = {
  free: <Power size={12} />,
  occupied: <div className="w-1.5 h-1.5 bg-[#00FF00] rounded-full animate-pulse" />,
  maintenance: <ShieldAlert size={12} />,
};

function formatPcLabel(id: number) {
  return `ПК ${String(id).padStart(2, "0")}`;
}

function formatRemainingSeconds(sec: number | undefined | null) {
  if (sec == null || !Number.isFinite(Number(sec))) return "—";
  const s = Math.max(0, Math.floor(Number(sec)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function NetworkConfig({ pc, onUpdateIp }: { pc: Workstation; onUpdateIp: (id: number, ip: string) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [ipValue, setIpValue] = React.useState(pc.ip);

  React.useEffect(() => { setIpValue(pc.ip); setEditing(false); }, [pc.id, pc.ip]);

  const save = () => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ipValue)) {
      toast.error("Неверный формат IP-адреса");
      return;
    }
    onUpdateIp(pc.id, ipValue);
    setEditing(false);
    toast.success(`IP для ${formatPcLabel(pc.id)} обновлен: ${ipValue}`);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-widest flex items-center gap-2">
        <WifiOff size={12} className="rotate-45" />
        Сеть
      </h3>
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-zinc-500 font-black uppercase">IP-адрес</span>
          {!editing ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#00FF00]">{pc.ip}</span>
              <button onClick={() => setEditing(true)} className="text-[9px] text-zinc-600 hover:text-white border border-zinc-800 px-2 py-0.5 hover:border-zinc-600 transition-all">
                Изм.
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                value={ipValue}
                onChange={(e) => setIpValue(e.target.value)}
                className="bg-black border border-[#2A2A2C] px-2 py-1 text-xs font-mono text-white w-[140px] focus:border-[#00FF00]/50 outline-none"
                onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setIpValue(pc.ip); } }}
                autoFocus
              />
              <button onClick={save} className="text-[9px] text-[#00FF00] border border-[#00FF00]/30 px-2 py-0.5 hover:bg-[#00FF00]/10 transition-all">OK</button>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-zinc-500 font-black uppercase">Шлюз</span>
          <span className="text-xs font-mono text-zinc-400">192.168.0.1</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-zinc-500 font-black uppercase">Маска</span>
          <span className="text-xs font-mono text-zinc-400">255.255.255.0</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-zinc-500 font-black uppercase">Коммутатор</span>
          <span className="text-xs font-mono text-zinc-400">Порт {pc.id}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-zinc-500 font-black uppercase">Статус</span>
          <span className="text-xs font-mono text-[#00FF00] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#00FF00] rounded-full animate-pulse" />
            Подключен
          </span>
        </div>
      </div>
      <div className="p-3 bg-blue-500/5 border border-blue-500/20">
        <p className="text-[9px] text-zinc-500 font-mono leading-relaxed">
          <span className="text-blue-400">Админ ПК:</span> 192.168.0.100 (неприкосаемый)
        </p>
      </div>
    </div>
  );
}

function PcRenameSection({ pc, onRename }: { pc: Workstation; onRename: (oldId: number, newId: number) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState(String(pc.id));

  React.useEffect(() => { setVal(String(pc.id)); setEditing(false); }, [pc.id]);

  const save = () => {
    const num = parseInt(val);
    if (isNaN(num) || num < 1 || num > 99) { toast.error("Номер ПК: 1-99"); return; }
    if (num === pc.id) { setEditing(false); return; }
    onRename(pc.id, num);
    setEditing(false);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Номер ПК</h3>
      {!editing ? (
        <div className="flex items-center justify-between">
          <span className="text-lg font-mono font-black text-white">{formatPcLabel(pc.id)}</span>
          <button onClick={() => setEditing(true)} className="text-[9px] text-zinc-600 hover:text-white border border-zinc-800 px-2 py-1 hover:border-zinc-600 transition-all">Переименовать</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">ПК</span>
          <input value={val} onChange={(e) => setVal(e.target.value)} type="number" min={1} max={99} className="bg-black border border-[#2A2A2C] px-3 py-1.5 text-sm font-mono text-white w-20 focus:border-[#00FF00]/50 outline-none" onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }} autoFocus />
          <button onClick={save} className="text-[9px] text-[#00FF00] border border-[#00FF00]/30 px-2 py-1 hover:bg-[#00FF00]/10 transition-all">OK</button>
          <button onClick={() => setEditing(false)} className="text-[9px] text-zinc-600 border border-zinc-800 px-2 py-1 hover:text-white transition-all">Отмена</button>
        </div>
      )}
    </div>
  );
}

export function FloorMap() {
  const [pcs, setPcs] = React.useState<Workstation[]>([]);
  const [zones, setZones] = React.useState<Zone[]>([]);
  const [selectedPcId, setSelectedPcId] = React.useState<number | null>(null);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [activeZone, setActiveZone] = React.useState<string>("");
  const [draggedPcId, setDraggedPcId] = React.useState<number | null>(null);
  const [zoom, setZoom] = React.useState(100);
  const [newZoneName, setNewZoneName] = React.useState("");
  const [showAddZone, setShowAddZone] = React.useState(false);
  const [bindingPcId, setBindingPcId] = React.useState<number | null>(null);
  const [bindClientName, setBindClientName] = React.useState("");
  const [bindAccountPassword, setBindAccountPassword] = React.useState("");
  const [bindPromoCode, setBindPromoCode] = React.useState("");
  const [bindDurationMinutes, setBindDurationMinutes] = React.useState("");
  const [bindTariffId, setBindTariffId] = React.useState<number | null>(null);
  const [bindTariffs, setBindTariffs] = React.useState<any[]>([]);
  const [bindMode, setBindMode] = React.useState<"existing" | "new" | "self">("existing");
  const [sessionByPc, setSessionByPc] = React.useState<Record<number, any>>({});
  /** Серверный remaining_seconds + время синхронизации для отображения с шагом 1 с */
  const sessionClockRef = React.useRef<
    Record<number, { remaining: number; syncedAt: number; status: string }>
  >({});
  const [, setSessionTick] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setSessionTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const getLiveRemainingSeconds = React.useCallback((wsId: number) => {
    const meta = sessionClockRef.current[wsId];
    if (!meta) return undefined;
    if (meta.status === "paused") return meta.remaining;
    const elapsed = Math.floor((Date.now() - meta.syncedAt) / 1000);
    return Math.max(0, meta.remaining - elapsed);
  }, []);

  React.useEffect(() => {
    if (bindingPcId === null) return;
    let cancelled = false;
    api
      .getTariffs()
      .then((list) => {
        if (cancelled) return;
        const active = (list || []).filter((x: any) => x.is_active);
        setBindTariffs(active);
        const first = active[0];
        if (first) {
          setBindTariffId(Number(first.id));
          setBindDurationMinutes(String(Number(first.duration_minutes) || 60));
        } else {
          setBindTariffId(null);
          setBindDurationMinutes("60");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bindingPcId]);

  const refreshSessions = React.useCallback((): Promise<any[]> => {
    return api
      .getActiveSessions()
      .then((rows) => {
        const now = Date.now();
        const m: Record<number, any> = {};
        const clock = sessionClockRef.current;
        rows.forEach((r: any) => {
          const wid = Number(r.workstation_id);
          if (!Number.isFinite(wid)) return;
          m[wid] = { ...r, workstation_id: wid };
          const rem = Number(r.remaining_seconds);
          clock[wid] = {
            remaining: Number.isFinite(rem) ? Math.max(0, rem) : 0,
            syncedAt: now,
            status: String(r.status || "active"),
          };
        });
        Object.keys(clock).forEach((k) => {
          const id = Number(k);
          if (!(id in m)) delete clock[id];
        });
        setSessionByPc(m);
        return rows;
      })
      .catch((e) => {
        console.error("getActiveSessions", e);
        return [];
      });
  }, []);

  React.useEffect(() => {
    refreshSessions();
    const iv = setInterval(refreshSessions, 5000);
    return () => clearInterval(iv);
  }, [refreshSessions]);

  const loadZones = async () => {
    try {
      const data = await api.getZones();
      setZones(data);
      if (!activeZone && data.length > 0) setActiveZone(data[0].name);
    } catch (e: any) { toast.error(e.message); }
  };

  const loadPcs = async () => {
    try {
      const data = await api.getWorkstations();
      setPcs(data.map((w: any) => ({
        id: w.pc_number,
        dbId: w.id,
        status: w.status as WorkstationStatus,
        zone: w.zone_name,
        zoneId: w.zone_id,
        gridPos: w.grid_position,
        ip: w.ip_address,
        specs: { cpu: w.cpu, gpu: w.gpu, ram: w.ram },
      })));
    } catch (e: any) { toast.error(e.message); }
  };

  React.useEffect(() => { loadZones(); loadPcs(); }, []);

  const customZones = zones.map((z) => z.name);
  const filteredPcs = pcs.filter((p) => p.zone === activeZone);
  const selectedPc = pcs.find((p) => p.id === selectedPcId) ?? null;

  const panelSession = React.useMemo(() => {
    if (!selectedPc || selectedPc.status !== "occupied") return null;
    return sessionByPc[selectedPc.dbId] ?? null;
  }, [selectedPc, sessionByPc]);

  const terminateSessionOnPc = async () => {
    if (!selectedPc) return;
    try {
      const rows = await api.getActiveSessions();
      const s = rows.find((x: any) => x.workstation_id === selectedPc.dbId);
      if (s) await api.endSession(s.id);
      else await api.updateWorkstation(selectedPc.dbId, { status: "free" });
      toast.success("Сеанс прерван");
      await loadPcs();
      refreshSessions();
      setSelectedPcId(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const togglePcPause = async () => {
    if (!selectedPc || !panelSession) { toast.error("Нет записи сессии в БД для этого ПК"); return; }
    try {
      if (panelSession.status === "paused") {
        await api.resumeSession(panelSession.id);
        toast.success("Сеанс возобновлён");
      } else {
        await api.pauseSession(panelSession.id);
        toast.success("Сеанс на паузе");
      }
      refreshSessions();
      await loadPcs();
    } catch (e: any) { toast.error(e.message); }
  };

  const addPcTime = async () => {
    if (!selectedPc || !panelSession) { toast.error("Нет записи сессии в БД"); return; }
    const raw = window.prompt("Сколько минут добавить?", "60");
    if (raw === null) return;
    const m = parseInt(raw, 10);
    if (!m || m < 1) { toast.error("Введите число минут"); return; }
    try {
      await api.extendSession(panelSession.id, { additional_minutes: m });
      toast.success(`+${m} мин к сессии`);
      refreshSessions();
    } catch (e: any) { toast.error(e.message); }
  };

  const updatePcStatus = async (id: number, status: WorkstationStatus) => {
    const pc = pcs.find((p) => p.id === id);
    if (!pc) return;
    try {
      await api.updateWorkstation(pc.dbId, { status });
      setPcs((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
      toast.success(`Статус ${formatPcLabel(id)} изменен`);
      refreshSessions();
    } catch (e: any) { toast.error(e.message); }
  };

  const startOccupy = (pcId: number) => {
    setBindingPcId(pcId);
    setBindClientName("");
    setBindAccountPassword("");
    setBindPromoCode("");
    setBindDurationMinutes("");
    setBindTariffId(null);
    setBindTariffs([]);
    setBindMode("existing");
  };

  const confirmBind = async () => {
    if (!bindingPcId) return;
    const pc = pcs.find((p) => p.id === bindingPcId);
    if (!pc) return;
    const rows = await refreshSessions();
    if (rows.some((r: any) => Number(r.workstation_id) === pc.dbId)) {
      toast.error("На этом ПК уже есть активная сессия");
      return;
    }
    const raw = bindClientName.trim();
    const clientNameSelf = `Саморегистрация (${formatPcLabel(bindingPcId)})`;
    const displayName = bindMode === "self" ? clientNameSelf : raw;
    if (bindMode !== "self" && !raw) {
      toast.error(bindMode === "new" ? "Введите имя" : "Введите имя или ID клиента");
      return;
    }
    if (bindMode === "new") {
      if (!bindAccountPassword.trim() || bindAccountPassword.trim().length < 4) {
        toast.error("Задайте пароль для нового аккаунта (не короче 4 символов)");
        return;
      }
    }

    const tariffsListAll =
      bindTariffs.length > 0 ? bindTariffs : (await api.getTariffs()).filter((x: any) => x.is_active);
    if (!tariffsListAll.length) {
      toast.error("Нет активных тарифов — добавьте тариф в конфиге");
      return;
    }
    let t: any;
    let dm: number;
    if (bindMode === "self") {
      t = tariffsListAll[0];
      dm = Math.max(1, Number(t.duration_minutes) || 60);
    } else {
      t = tariffsListAll.find((x: any) => Number(x.id) === Number(bindTariffId)) || tariffsListAll[0];
      const dmParsed = parseInt(String(bindDurationMinutes).trim(), 10);
      dm = Number.isFinite(dmParsed) && dmParsed > 0 ? dmParsed : Number(t.duration_minutes) || 60;
      if (dm < 1) {
        toast.error("Укажите длительность сеанса в минутах (отсчёт с момента старта)");
        return;
      }
    }

    try {
      let clientId: number;
      let resolvedName = displayName;
      if (bindMode === "existing") {
        if (/^\d+$/.test(raw)) {
          const c = await api.getClient(parseInt(raw, 10));
          clientId = c.id;
          resolvedName = c.name;
        } else {
          const found = await api.searchClients(raw);
          if (found.length === 0) {
            toast.error("Клиент не найден");
            return;
          }
          if (found.length > 1) {
            toast.error("Несколько совпадений — введите точный ID клиента");
            return;
          }
          clientId = found[0].id;
          resolvedName = found[0].name;
        }
      } else if (bindMode === "new") {
        const phone = `guest-${Date.now()}`;
        const c = await api.createClient({
          name: raw,
          phone,
          player_password: bindAccountPassword.trim(),
        });
        clientId = c.id;
        resolvedName = c.name;
      } else {
        const phone = `self-${Date.now()}`;
        const c = await api.createClient({ name: clientNameSelf, phone });
        clientId = c.id;
        resolvedName = c.name;
      }

      const promoRaw = bindPromoCode.trim();
      if (bindMode !== "self" && promoRaw) {
        try {
          await api.applyPromo(promoRaw.toUpperCase(), clientId);
          toast.success("Промокод применён к аккаунту");
        } catch (e: any) {
          toast.error(e.message || "Промокод не применён");
          return;
        }
      }

      await api.createSession({
        client_id: clientId,
        workstation_id: pc.dbId,
        tariff_id: t.id,
        duration_minutes: dm,
        amount: 0,
      });
      setPcs((prev) =>
        prev.map((p) =>
          p.id === bindingPcId ? { ...p, status: "occupied", clientName: resolvedName } : p
        )
      );
      toast.success(`${formatPcLabel(bindingPcId)}: сеанс — ${resolvedName}, ${dm} мин`);
      setBindingPcId(null);
      setBindClientName("");
      setBindAccountPassword("");
      setBindPromoCode("");
      setBindDurationMinutes("");
      setBindTariffId(null);
      setBindTariffs([]);
      refreshSessions();
      await loadPcs();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAction = (action: string) => {
    if (!selectedPc) return;
    switch (action) {
      case "authorize": startOccupy(selectedPc.id); break;
      case "maintenance": updatePcStatus(selectedPc.id, "maintenance"); break;
      case "restore": updatePcStatus(selectedPc.id, "free"); break;
    }
  };

  const addZone = async () => {
    const name = newZoneName.trim();
    if (!name) { toast.error("Введите название"); return; }
    try {
      await api.createZone({ name });
      setNewZoneName(""); setShowAddZone(false);
      toast.success(`Зона "${name}" добавлена`);
      loadZones();
    } catch (e: any) { toast.error(e.message); }
  };

  const removeZone = async (zoneName: string) => {
    const zone = zones.find((z) => z.name === zoneName);
    if (!zone) return;
    try {
      await api.deleteZone(zone.id);
      toast.success(`Зона "${zoneName}" удалена`);
      loadZones();
      if (activeZone === zoneName) setActiveZone(zones[0]?.name || "");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDragStart = (pcId: number) => {
    if (!isEditMode) return;
    setDraggedPcId(pcId);
  };

  const handleDrop = async (cellIndex: number) => {
    if (!isEditMode || draggedPcId === null) return;
    const draggedPc = pcs.find((p) => p.id === draggedPcId);
    if (!draggedPc) return;
    const occupant = pcs.find((p) => p.gridPos === cellIndex && p.id !== draggedPcId && p.zone === activeZone);
    if (occupant) {
      // Swap
      await api.updateWorkstation(draggedPc.dbId, { grid_position: cellIndex });
      await api.updateWorkstation(occupant.dbId, { grid_position: draggedPc.gridPos });
      setPcs((prev) => prev.map((p) => {
        if (p.id === draggedPcId) return { ...p, gridPos: cellIndex };
        if (p.id === occupant.id) return { ...p, gridPos: draggedPc.gridPos };
        return p;
      }));
    } else {
      await api.updateWorkstation(draggedPc.dbId, { grid_position: cellIndex });
      setPcs((prev) => prev.map((p) => (p.id === draggedPcId ? { ...p, gridPos: cellIndex } : p)));
    }
    setDraggedPcId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Build grid: array of GRID_CELLS, each cell either has a PC or is empty
  const gridCells = React.useMemo(() => {
    const cells: (Workstation | null)[] = Array(GRID_CELLS).fill(null);
    filteredPcs.forEach((pc) => {
      if (pc.gridPos < GRID_CELLS) cells[pc.gridPos] = pc;
    });
    return cells;
  }, [filteredPcs]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 relative h-full">
      {/* Legend & Filters */}
      <div className="w-full lg:w-56 shrink-0 grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-6">
        <div className="bg-[#0A0A0B] border border-[#2A2A2C] p-5 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold uppercase text-gray-500 tracking-wider flex items-center gap-2">
              <Info size={14} />
              Состояние
            </h4>
            <button
              onClick={() => {
                setIsEditMode((v) => {
                  const next = !v;
                  toast[next ? "info" : "success"](next ? "Режим редактирования: перетащите ПК в любую ячейку" : "Планировка сохранена");
                  return next;
                });
              }}
              className={cn("p-1 border transition-all", isEditMode ? "bg-[#00FF00] border-[#00FF00] text-black" : "border-zinc-800 text-zinc-500 hover:text-white")}
            >
              {isEditMode ? <Check size={12} /> : <Edit2 size={12} />}
            </button>
          </div>
          <div className="space-y-2">
            {([
              { label: "Свободно", count: pcs.filter((p) => p.status === "free").length, color: "bg-gray-700", key: "free" },
              { label: "Занято", count: pcs.filter((p) => p.status === "occupied").length, color: "bg-[#00FF00]", key: "occupied" },
              { label: "Оффлайн", count: pcs.filter((p) => p.status === "maintenance").length, color: "bg-red-500", key: "maintenance" },
            ] as const).map((item) => (
              <div key={item.key} className="flex justify-between items-center p-1 rounded hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-sm", item.color)} />
                  <span className="text-xs text-gray-400">{item.label}</span>
                </div>
                <span className="text-xs font-bold text-gray-600">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0A0A0B] border border-[#2A2A2C] p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[10px] font-bold uppercase text-gray-600 tracking-widest">Зоны зала</h4>
            <button onClick={() => setShowAddZone(!showAddZone)} className="text-zinc-600 hover:text-[#00FF00] border border-zinc-800 hover:border-[#00FF00]/30 w-5 h-5 flex items-center justify-center text-xs transition-all">+</button>
          </div>
          {showAddZone && (
            <div className="flex gap-1.5 mb-3">
              <input value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} placeholder="Название..." className="flex-1 bg-black border border-[#2A2A2C] px-2 py-1 text-[10px] font-mono text-white focus:border-[#00FF00]/50 outline-none" onKeyDown={(e) => { if (e.key === "Enter") addZone(); }} />
              <button onClick={addZone} className="text-[9px] text-[#00FF00] border border-[#00FF00]/30 px-2 py-1 hover:bg-[#00FF00]/10">OK</button>
            </div>
          )}
          <div className="space-y-1">
            {customZones.map((zoneName) => (
              <div key={zoneName} onClick={() => setActiveZone(zoneName)} className={cn("text-xs p-2 rounded cursor-pointer flex justify-between items-center transition-colors", activeZone === zoneName ? "bg-[#00FF00]/10 text-[#00FF00]" : "text-gray-400 hover:bg-white/5")}>
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-1 rounded-sm", zoneName === "VIP" ? "bg-purple-500" : zoneName === "Стандарт" ? "bg-zinc-700" : "bg-cyan-500")} />
                  <span>{zoneName}</span>
                </div>
                <div className="flex items-center gap-1">
                  {activeZone === zoneName && <div className="w-1.5 h-1.5 bg-[#00FF00] rounded-full" />}
                  {zoneName !== "VIP" && zoneName !== "Стандарт" && (
                    <button onClick={(e) => { e.stopPropagation(); removeZone(zoneName); }} className="text-[8px] text-red-500 hover:text-red-400 ml-1">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hall Grid */}
      <div className="flex-1 overflow-auto bg-[#050505] border border-[#2A2A2C] p-4 md:p-6 relative scroll-smooth no-scrollbar min-h-[400px]" style={{ backgroundImage: "radial-gradient(#ffffff05 1px, transparent 1px)", backgroundSize: "32px 32px" }}>
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wider text-white">{activeZone}</h2>
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
              {isEditMode ? "Перетащите ПК в любую свободную ячейку" : `${filteredPcs.length} ПК в зоне`}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {/* Zoom */}
            <div className="flex items-center gap-1 border border-zinc-800 px-1">
              <button onClick={() => setZoom((z) => Math.max(50, z - 10))} className="px-1.5 py-1 text-zinc-500 hover:text-white text-xs font-black">−</button>
              <span className="text-[9px] font-mono text-zinc-500 w-8 text-center">{zoom}%</span>
              <button onClick={() => setZoom((z) => Math.min(150, z + 10))} className="px-1.5 py-1 text-zinc-500 hover:text-white text-xs font-black">+</button>
            </div>
            {isEditMode && (
              <>
                <button onClick={async () => {
                  const maxId = pcs.reduce((m, p) => Math.max(m, p.id), 0);
                  const emptyCell = Array.from({ length: GRID_CELLS }).findIndex((_, i) => !filteredPcs.some((p) => p.gridPos === i));
                  if (emptyCell === -1) { toast.error("Нет свободных ячеек"); return; }
                  const zone = zones.find((z) => z.name === activeZone);
                  if (!zone) return;
                  try {
                    await api.createWorkstation({ pc_number: maxId + 1, zone_id: zone.id, ip_address: `192.168.0.${100 + maxId + 1}`, grid_position: emptyCell, cpu: "AMD Ryzen 7 5800H", gpu: "Nvidia RTX 3070", ram: "32GB" });
                    toast.success(`ПК ${maxId + 1} добавлен`);
                    loadPcs();
                  } catch (e: any) { toast.error(e.message); }
                }} className="bg-[#00FF00] text-black px-3 py-1.5 text-[10px] font-black uppercase hover:bg-[#00EE00] transition-colors">
                  + Добавить ПК
                </button>
                <button onClick={() => loadPcs()} className="bg-zinc-900 border border-zinc-800 text-zinc-500 px-3 py-1.5 text-[10px] font-black uppercase hover:text-white transition-colors flex items-center gap-1.5">
                  <RotateCcw size={12} /> Обновить
                </button>
              </>
            )}
          </div>
        </div>

        {/* Grid */}
        <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}>
          <div className="grid gap-1 md:gap-2" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}>
          {gridCells.map((pc, cellIdx) => (
            <div
              key={cellIdx}
              className={cn(
                "aspect-square border transition-all duration-200 relative",
                isEditMode && !pc && "border-dashed border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900/30",
                isEditMode && draggedPcId !== null && !pc && "border-[#00FF00]/30 bg-[#00FF00]/5",
                !isEditMode && !pc && "border-transparent"
              )}
              onDragOver={isEditMode ? handleDragOver : undefined}
              onDrop={isEditMode ? () => handleDrop(cellIdx) : undefined}
            >
              {pc && (
                <div
                  draggable={isEditMode}
                  onDragStart={() => handleDragStart(pc.id)}
                  onDragEnd={() => setDraggedPcId(null)}
                  onClick={() => !isEditMode && setSelectedPcId(pc.id)}
                  className={cn(
                    "w-full h-full border p-2 md:p-3 flex flex-col justify-between transition-all duration-300",
                    isEditMode
                      ? "bg-[#0A0A0B] border-zinc-700 cursor-grab active:cursor-grabbing border-dashed hover:border-[#00FF00]/50"
                      : cn(statusColors[pc.status], "cursor-pointer group"),
                    draggedPcId === pc.id && "opacity-40 scale-95"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] md:text-[10px] font-mono tracking-widest font-black">{formatPcLabel(pc.id)}</span>
                    {isEditMode ? <GripVertical size={12} className="text-zinc-700" /> : statusIcons[pc.status]}
                  </div>
                  {/* Zone indicator */}
                  <div className={cn(
                    "absolute top-0 left-0 w-full h-[2px]",
                    pc.zone === "VIP" ? "bg-purple-500" : pc.zone === "Стандарт" ? "bg-zinc-700" : "bg-cyan-500"
                  )} />
                  {!isEditMode && pc.status === "occupied" && (
                    <div className="flex flex-col">
                      <div className="text-[8px] md:text-[9px] font-black uppercase text-zinc-400 truncate tracking-tighter">
                        {sessionByPc[pc.dbId]?.client_name || pc.clientName || "Клиент"}
                      </div>
                      <div className="text-sm md:text-lg font-mono font-bold leading-none tracking-tighter">
                        {formatRemainingSeconds(getLiveRemainingSeconds(pc.dbId))}
                      </div>
                    </div>
                  )}
                  {!isEditMode && pc.status === "maintenance" && <span className="text-[7px] md:text-[8px] font-black uppercase text-red-500">Оффлайн</span>}
                  {!isEditMode && pc.status === "free" && <span className="text-[9px] font-mono opacity-20 italic hidden md:block">Готов</span>}
                  {isEditMode && <span className="text-[8px] font-mono text-zinc-600 mt-auto">{pc.ip}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
        </div>

        {/* Side Overlay Panel */}
        <AnimatePresence>
          {selectedPc && (
            <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} className="absolute top-0 right-0 h-full w-full sm:w-[380px] bg-[#0A0A0B] border-l border-[#2A2A2C] shadow-[-20px_0_40px_rgba(0,0,0,0.8)] z-20 flex flex-col overflow-hidden">
              <div className="p-6 border-b border-[#2A2A2C] flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-14 h-14 border border-[#00FF00]/40 bg-[#00FF00]/10 flex items-center justify-center font-black text-[#00FF00] text-2xl">ПК</div>
                  <div className="flex flex-col justify-center">
                    <h2 className="text-xl font-black uppercase tracking-tighter">Стойка #{String(selectedPc.id).padStart(2, "0")}</h2>
                    <span className="text-[#00FF00] text-[10px] font-mono font-black uppercase">{selectedPc.zone}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedPcId(null)} className="p-2 hover:bg-[#00FF00]/10 transition-colors">
                  <WifiOff size={18} className="text-zinc-600 hover:text-[#00FF00] rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                {selectedPc.status === "occupied" && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Активная сессия</h3>
                    <div className="space-y-4 border-l-2 border-zinc-800 pl-4">
                      <div>
                        <div className="text-[10px] font-black text-zinc-500 uppercase mb-1">Клиент</div>
                        <div className="text-lg font-bold">{panelSession?.client_name || selectedPc.clientName || "Не указан"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-zinc-500 uppercase mb-1">Осталось</div>
                        <div className="text-4xl font-mono font-black text-[#00FF00] tracking-tighter">
                          {formatRemainingSeconds(
                            selectedPc ? getLiveRemainingSeconds(selectedPc.dbId) : undefined
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rename PC */}
                <PcRenameSection pc={selectedPc} onRename={async (id, newId) => {
                  const pc = pcs.find((p) => p.id === id);
                  if (pc) {
                    try {
                      await api.updateWorkstation(pc.dbId, { pc_number: newId });
                      setPcs((prev) => prev.map((p) => p.id === id ? { ...p, id: newId } : p));
                      setSelectedPcId(newId);
                      toast.success(`ПК переименован: ${formatPcLabel(id)} → ${formatPcLabel(newId)}`);
                    } catch (e: any) { toast.error(e.message); }
                  }
                }} />

                {/* Quick status change */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Статус</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => updatePcStatus(selectedPc.id, "free")} className={cn("py-2 text-[9px] font-black uppercase border transition-all hover:bg-white/5 border-zinc-700 text-zinc-400", selectedPc.status === "free" && "bg-white/5")}>
                      Свободен
                    </button>
                    <button onClick={() => startOccupy(selectedPc.id)} className={cn("py-2 text-[9px] font-black uppercase border transition-all hover:bg-white/5 border-[#00FF00]/30 text-[#00FF00]", selectedPc.status === "occupied" && "bg-white/5")}>
                      Занят
                    </button>
                    <button onClick={() => updatePcStatus(selectedPc.id, "maintenance")} className={cn("py-2 text-[9px] font-black uppercase border transition-all hover:bg-white/5 border-orange-500/30 text-orange-500", selectedPc.status === "maintenance" && "bg-white/5")}>
                      Обслуж.
                    </button>
                  </div>
                </div>

                {/* Specs */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Характеристики</h3>
                  <div className="font-mono space-y-2">
                    <div className="flex border-b border-[#2A2A2C] py-2 justify-between">
                      <span className="text-[10px] text-zinc-500 font-black uppercase">CPU</span>
                      <span className="text-xs text-zinc-300">{selectedPc.specs.cpu}</span>
                    </div>
                    <div className="flex border-b border-[#2A2A2C] py-2 justify-between">
                      <span className="text-[10px] text-zinc-500 font-black uppercase">GPU</span>
                      <span className="text-xs text-zinc-300">{selectedPc.specs.gpu}</span>
                    </div>
                    <div className="flex border-b border-[#2A2A2C] py-2 justify-between">
                      <span className="text-[10px] text-zinc-500 font-black uppercase">RAM</span>
                      <span className="text-xs text-zinc-300">{selectedPc.specs.ram}</span>
                    </div>
                  </div>
                </div>

                {/* Network */}
                <NetworkConfig pc={selectedPc} onUpdateIp={async (id, ip) => {
                  const pc = pcs.find((p) => p.id === id);
                  if (pc) { await api.updateWorkstation(pc.dbId, { ip_address: ip }); setPcs((prev) => prev.map((p) => p.id === id ? { ...p, ip } : p)); }
                }} />

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  {selectedPc.status === "free" && (
                    <button onClick={() => startOccupy(selectedPc.id)} className="w-full bg-[#00FF00] hover:bg-[#00EE00] text-black font-black py-3 text-xs uppercase tracking-wider transition-all active:scale-95">
                      Авторизовать сеанс
                    </button>
                  )}
                  {selectedPc.status === "occupied" && (
                    <>
                      <button onClick={() => terminateSessionOnPc()} className="w-full border border-red-500/50 hover:bg-red-500 hover:text-black text-red-500 font-black py-3 text-xs uppercase tracking-wider transition-all">
                        Прервать сеанс
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => void addPcTime()} className="bg-zinc-800 hover:bg-zinc-700 py-2.5 text-[10px] font-black uppercase text-white transition-colors">Доб. время</button>
                        <button type="button" onClick={() => void togglePcPause()} className="bg-zinc-800 hover:bg-zinc-700 py-2.5 text-[10px] font-black uppercase text-white transition-colors">{panelSession?.status === "paused" ? "Продолжить" : "Пауза"}</button>
                      </div>
                      {!panelSession && (
                        <p className="text-[9px] text-zinc-600 font-mono">Нет сессии в БД — пауза и время доступны после создания сессии (например, со страницы игрока).</p>
                      )}
                    </>
                  )}
                  {selectedPc.status === "maintenance" && (
                    <button onClick={() => handleAction("restore")} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 text-xs uppercase tracking-wider transition-all">
                      Восстановить
                    </button>
                  )}
                </div>

                {/* Utility actions */}
                <div className="space-y-3 pt-2 border-t border-[#2A2A2C]">
                  <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-widest pt-2">Утилиты</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => toast.promise(new Promise((r) => setTimeout(r, 2000)), { loading: "Перезагрузка...", success: `${formatPcLabel(selectedPc.id)} перезагружен`, error: "Ошибка" })} className="py-2.5 bg-zinc-900 border border-zinc-800 text-[9px] font-black uppercase text-zinc-400 hover:text-white transition-all">
                      Перезагрузка
                    </button>
                    <button onClick={() => toast.promise(new Promise((r) => setTimeout(r, 1500)), { loading: "Wake-on-LAN...", success: "Сигнал отправлен", error: "Ошибка" })} className="py-2.5 bg-zinc-900 border border-zinc-800 text-[9px] font-black uppercase text-zinc-400 hover:text-white transition-all">
                      Включить (WoL)
                    </button>
                    <button onClick={() => toast.info("Открытие удаленного рабочего стола")} className="py-2.5 bg-zinc-900 border border-zinc-800 text-[9px] font-black uppercase text-zinc-400 hover:text-white transition-all">
                      Удал. доступ
                    </button>
                    <button onClick={() => toast.info("Скриншот экрана")} className="py-2.5 bg-zinc-900 border border-zinc-800 text-[9px] font-black uppercase text-zinc-400 hover:text-white transition-all">
                      Скриншот
                    </button>
                  </div>

                  {/* Delete PC */}
                  <button
                    onClick={async () => {
                      if (selectedPc.status === "occupied") { toast.error("Нельзя удалить ПК с активной сессией"); return; }
                      try {
                        await api.deleteWorkstation(selectedPc.dbId);
                        setPcs((prev) => prev.filter((p) => p.id !== selectedPc.id));
                        setSelectedPcId(null);
                        toast.success(`${formatPcLabel(selectedPc.id)} удален`);
                      } catch (e: any) { toast.error(e.message); }
                    }}
                    className="w-full py-2.5 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-black text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Удалить ПК из зала
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Client Binding Modal */}
      <AnimatePresence>
        {bindingPcId !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => {
                setBindingPcId(null);
                setBindClientName("");
                setBindAccountPassword("");
                setBindPromoCode("");
              }}
            />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} className="relative w-full max-w-md bg-[#0A0A0B] border border-[#2A2A2C] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 space-y-5 max-h-[90vh] overflow-y-auto">
              <div>
                <h2 className="text-base font-black uppercase tracking-wider text-white">Привязка клиента</h2>
                <span className="text-[10px] font-mono text-zinc-600">{formatPcLabel(bindingPcId)} → Выберите способ</span>
              </div>

              <div className="flex gap-2">
                {([
                  { m: "existing" as const, label: "Существующий" },
                  { m: "new" as const, label: "Новый клиент" },
                  { m: "self" as const, label: "Саморег." },
                ]).map((item) => (
                  <button
                    key={item.m}
                    type="button"
                    onClick={() => {
                      setBindMode(item.m);
                      setBindAccountPassword("");
                    }}
                    className={cn("flex-1 py-2 text-[9px] font-black uppercase border transition-all", bindMode === item.m ? "border-[#00FF00]/50 bg-[#00FF00]/10 text-[#00FF00]" : "border-zinc-800 text-zinc-500 hover:text-white")}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {bindMode === "self" ? (
                <div className="p-4 bg-blue-500/5 border border-blue-500/20">
                  <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                    Клиент зарегистрируется самостоятельно через {formatPcLabel(bindingPcId)}. ПК будет переведен в режим регистрации.
                    Сеанс стартует с первым активным тарифом и его длительностью.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block">
                    {bindMode === "new" ? "Имя нового клиента" : "Имя или ID клиента"}
                  </label>
                  <input
                    value={bindClientName}
                    onChange={(e) => setBindClientName(e.target.value)}
                    placeholder={bindMode === "new" ? "Иванов Иван" : "Поиск по имени или ID..."}
                    className="w-full bg-black border border-[#2A2A2C] px-4 py-3 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none placeholder:text-zinc-800"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void confirmBind();
                    }}
                    autoFocus
                  />
                  {bindMode === "new" && (
                    <>
                      <p className="text-[9px] text-zinc-600 font-mono">Будет создан новый аккаунт</p>
                      <div>
                        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1">Пароль аккаунта</label>
                        <input
                          value={bindAccountPassword}
                          onChange={(e) => setBindAccountPassword(e.target.value)}
                          type="password"
                          autoComplete="new-password"
                          placeholder="Не короче 4 символов"
                          className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none placeholder:text-zinc-800"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {bindMode !== "self" && (
              <div className="space-y-3 pt-2 border-t border-[#2A2A2C]">
                <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">Сеанс на ПК</p>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1">Тариф</label>
                  <select
                    value={bindTariffId ?? ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setBindTariffId(id);
                      const tr = bindTariffs.find((x: any) => Number(x.id) === id);
                      if (tr) setBindDurationMinutes(String(Number(tr.duration_minutes) || 60));
                    }}
                    className="w-full bg-black border border-[#2A2A2C] px-3 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none"
                  >
                    {bindTariffs.map((tr: any) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.name} — {tr.duration_minutes} мин / {tr.price} ₽
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1">Минуты сеанса</label>
                  <input
                    value={bindDurationMinutes}
                    onChange={(e) => setBindDurationMinutes(e.target.value)}
                    type="number"
                    min={1}
                    step={1}
                    placeholder="60"
                    className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none placeholder:text-zinc-800"
                  />
                  <p className="text-[9px] text-zinc-600 font-mono mt-1">Таймер с момента старта; по умолчанию — длительность выбранного тарифа</p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1">Промокод (опционально)</label>
                  <input
                    value={bindPromoCode}
                    onChange={(e) => setBindPromoCode(e.target.value)}
                    placeholder="К аккаунту до оплаты сеанса"
                    className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none placeholder:text-zinc-800 uppercase"
                  />
                  <p className="text-[9px] text-zinc-600 font-mono mt-1">Начисление бонуса и т.п.; при ошибке сеанс не стартует</p>
                </div>
              </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setBindingPcId(null);
                    setBindClientName("");
                    setBindAccountPassword("");
                    setBindPromoCode("");
                  }}
                  className="flex-1 py-3 border border-zinc-800 text-zinc-500 hover:text-white text-xs font-black uppercase transition-all"
                >
                  Отмена
                </button>
                <button type="button" onClick={() => void confirmBind()} className="flex-1 py-3 bg-[#00FF00] hover:bg-[#00EE00] text-black text-xs font-black uppercase transition-all">
                  Подтвердить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
