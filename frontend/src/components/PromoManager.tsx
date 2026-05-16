import React from "react";
import { Ticket, Plus, Search, Trash2, Copy, Edit3, X } from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { api } from "../lib/api";

type Promo = {
  id: string;
  code: string;
  type: "discount" | "fixed" | "bonus";
  value: string;
  maxUsage: number;
  used: number;
  expiry: string;
  active: boolean;
};

const typeLabels: Record<string, string> = { discount: "Скидка", fixed: "Фикс. сумма", bonus: "Бонус" };

export function PromoManager() {
  const [promos, setPromos] = React.useState<Promo[]>([]);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [editingPromo, setEditingPromo] = React.useState<Promo | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newCode, setNewCode] = React.useState("");
  const [newType, setNewType] = React.useState<"discount" | "fixed" | "bonus">("discount");
  const [newValue, setNewValue] = React.useState("");
  const [newMaxUsage, setNewMaxUsage] = React.useState("100");
  const [newExpiry, setNewExpiry] = React.useState("2026-12-31");

  const load = async () => {
    try {
      const data = await api.getPromos();
      setPromos(data.map((p: any) => ({ ...p, active: !!p.is_active, type: p.promo_type, maxUsage: p.max_usage, used: p.used_count, expiry: p.expires_at?.split("T")[0] || "" })));
    } catch (e: any) { toast.error(e.message); }
  };

  React.useEffect(() => { load(); }, []);

  const filtered = promos.filter((p) => {
    if (filter === "active" && !p.active) return false;
    if (filter === "inactive" && p.active) return false;
    if (search && !p.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const createPromo = async () => {
    if (!newCode.trim()) { toast.error("Введите код"); return; }
    if (!newValue.trim()) { toast.error("Введите значение"); return; }
    try {
      await api.createPromo({ code: newCode.trim().toUpperCase(), promo_type: newType, value: newValue.trim(), max_usage: Number(newMaxUsage) || 100, expires_at: newExpiry });
      setShowCreate(false); setNewCode(""); setNewValue(""); setNewMaxUsage("100");
      toast.success("Промокод создан"); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const deletePromo = async (id: string) => {
    try { await api.deletePromo(Number(id)); toast.success("Удалено"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try { await api.updatePromo(Number(id), { is_active: !current }); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const saveEdit = async () => {
    if (!editingPromo) return;
    try {
      await api.updatePromo(Number(editingPromo.id), { code: editingPromo.code, value: editingPromo.value, max_usage: editingPromo.maxUsage, expires_at: editingPromo.expiry });
      setEditingPromo(null); toast.success("Обновлено"); load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0A0A0B] border border-[#2A2A2C] p-6 md:p-8">
        <div className="flex flex-col">
          <h2 className="text-lg md:text-xl font-black uppercase tracking-wider text-white">Промокоды</h2>
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-1">Всего: {promos.length} / Активных: {promos.filter((p) => p.active).length}</span>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-[#00FF00] hover:bg-[#00EE00] text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
          <Plus size={16} />
          Создать
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative group flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 w-4 h-4 group-focus-within:text-[#00FF00] transition-colors" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Поиск по коду..." className="bg-black border border-[#2A2A2C] pl-12 pr-4 py-2.5 text-xs w-full font-mono focus:outline-none focus:border-[#00FF00]/50 transition-all placeholder:text-zinc-800 text-zinc-300" />
        </div>
        <div className="flex gap-2">
          {([["all", "Все"], ["active", "Активные"], ["inactive", "Неактивные"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} className={cn("px-4 py-2.5 text-[10px] font-black uppercase border transition-all", filter === key ? "border-[#00FF00]/50 bg-[#00FF00]/10 text-[#00FF00]" : "border-zinc-800 text-zinc-500 hover:text-white")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Promo list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((promo) => (
          <div key={promo.id} className={cn("bg-[#0A0A0B] border p-5 flex flex-col relative group transition-all", promo.active ? "border-[#2A2A2C] hover:border-[#00FF00]/40" : "border-zinc-900 opacity-50")}>
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2 border", promo.active ? "border-zinc-800 text-[#00FF00]" : "border-zinc-900 text-zinc-700")}>
                <Ticket size={16} />
              </div>
              <div className="flex gap-1">
                <button onClick={() => { navigator.clipboard.writeText(promo.code); toast.success("Скопировано"); }} className="p-1.5 hover:bg-white/5 text-zinc-700 hover:text-white transition-all"><Copy size={12} /></button>
                <button onClick={() => setEditingPromo({ ...promo })} className="p-1.5 hover:bg-white/5 text-zinc-700 hover:text-white transition-all"><Edit3 size={12} /></button>
                <button onClick={() => deletePromo(promo.id)} className="p-1.5 hover:bg-red-500/10 text-zinc-700 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
              </div>
            </div>
            <h3 className="text-lg font-black font-mono tracking-tighter text-white mb-1">{promo.code}</h3>
            <span className="text-[10px] font-mono text-zinc-600 uppercase mb-4">{typeLabels[promo.type]}: {promo.value}</span>
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#2A2A2C]/50 mt-auto">
              <div>
                <span className="text-[8px] font-black text-zinc-600 uppercase block mb-1">Использовано</span>
                <span className="text-sm font-black text-white font-mono">{promo.used}/{promo.maxUsage}</span>
              </div>
              <div className="text-right">
                <span className="text-[8px] font-black text-zinc-600 uppercase block mb-1">До</span>
                <span className="text-sm font-mono text-zinc-400">{promo.expiry}</span>
              </div>
            </div>
            <div className="mt-3 flex justify-between items-center">
              <button onClick={() => toggleActive(promo.id, promo.active)} className={cn("text-[9px] font-black uppercase px-2 py-1 border transition-all", promo.active ? "border-[#00FF00]/30 text-[#00FF00] hover:bg-[#00FF00]/10" : "border-zinc-800 text-zinc-600 hover:text-white")}>
                {promo.active ? "Активен" : "Откл"}
              </button>
              <div className={cn("w-2 h-2 rounded-full", promo.active ? "bg-[#00FF00]" : "bg-zinc-800")} />
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md bg-[#0A0A0B] border border-[#2A2A2C] p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-black uppercase tracking-wider text-white">Новый промокод</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Код</label>
                <input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="MYCODE" className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Тип</label>
                <div className="flex gap-2">
                  {(["discount", "fixed", "bonus"] as const).map((t) => (
                    <button key={t} onClick={() => setNewType(t)} className={cn("flex-1 py-2 text-[10px] font-black uppercase border transition-all", newType === t ? "border-[#00FF00]/50 bg-[#00FF00]/10 text-[#00FF00]" : "border-zinc-800 text-zinc-500 hover:text-white")}>
                      {typeLabels[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Значение</label>
                  <input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="20% или 500 ₽" className="w-full bg-black border border-[#2A2A2C] px-3 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Макс. исп.</label>
                  <input value={newMaxUsage} onChange={(e) => setNewMaxUsage(e.target.value)} type="number" className="w-full bg-black border border-[#2A2A2C] px-3 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Срок действия</label>
                <input value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} type="date" className="w-full bg-black border border-[#2A2A2C] px-3 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-zinc-800 text-zinc-500 hover:text-white text-xs font-black uppercase transition-all">Отмена</button>
              <button onClick={createPromo} className="flex-1 py-2.5 bg-[#00FF00] hover:bg-[#00EE00] text-black text-xs font-black uppercase transition-all">Создать</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingPromo(null)} />
          <div className="relative w-full max-w-md bg-[#0A0A0B] border border-[#2A2A2C] p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-black uppercase tracking-wider text-white">Редактирование: {editingPromo.code}</h2>
              <button onClick={() => setEditingPromo(null)} className="p-1 text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Код</label>
                <input value={editingPromo.code} onChange={(e) => setEditingPromo({ ...editingPromo, code: e.target.value.toUpperCase() })} className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Значение</label>
                <input value={editingPromo.value} onChange={(e) => setEditingPromo({ ...editingPromo, value: e.target.value })} className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Макс. исп.</label>
                  <input value={editingPromo.maxUsage} onChange={(e) => setEditingPromo({ ...editingPromo, maxUsage: Number(e.target.value) })} type="number" className="w-full bg-black border border-[#2A2A2C] px-3 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Срок</label>
                  <input value={editingPromo.expiry} onChange={(e) => setEditingPromo({ ...editingPromo, expiry: e.target.value })} type="date" className="w-full bg-black border border-[#2A2A2C] px-3 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditingPromo(null)} className="flex-1 py-2.5 border border-zinc-800 text-zinc-500 hover:text-white text-xs font-black uppercase transition-all">Отмена</button>
              <button onClick={saveEdit} className="flex-1 py-2.5 bg-[#00FF00] hover:bg-[#00EE00] text-black text-xs font-black uppercase transition-all">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
