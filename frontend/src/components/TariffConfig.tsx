import React from "react";
import { Clock, Zap, Star, Edit3, Trash2, Plus, X } from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { api } from "../lib/api";

type Tariff = {
  id: number;
  name: string;
  price: number;
  duration_minutes: number;
  zone: string;
  tariff_type: string;
  is_active: boolean;
};

export function TariffConfig() {
  const [tariffs, setTariffs] = React.useState<Tariff[]>([]);
  const [zones, setZones] = React.useState<{ id: number; name: string }[]>([]);
  const [editing, setEditing] = React.useState<Tariff | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", price: "", zone: "Стандарт", type: "обычный", duration: "60" });

  const load = async () => {
    try {
      const [tdata, zdata] = await Promise.all([api.getTariffs(), api.getZones()]);
      setTariffs(tdata.map((t: any) => ({ ...t, is_active: !!t.is_active })));
      const zl = (zdata || []).map((z: any) => ({ id: z.id, name: z.name }));
      setZones(zl);
      setForm((f) => {
        if (f.zone && zl.some((z) => z.name === f.zone)) return f;
        const first = zl[0]?.name;
        return first ? { ...f, zone: first } : f;
      });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  React.useEffect(() => { load(); }, []);

  const createTariff = async () => {
    if (!form.name.trim() || !form.price) { toast.error("Заполните все поля"); return; }
    try {
      await api.createTariff({ name: form.name.trim(), price: Number(form.price), duration_minutes: Number(form.duration) || 60, zone: form.zone, tariff_type: form.type });
      setShowCreate(false); setForm({ name: "", price: "", zone: "Стандарт", type: "обычный", duration: "60" });
      toast.success("Тариф создан"); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await api.updateTariff(editing.id, { name: editing.name, price: editing.price, duration_minutes: editing.duration_minutes, zone: editing.zone, tariff_type: editing.tariff_type });
      setEditing(null); toast.success("Обновлено"); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteTariff = async (id: number) => {
    try { await api.deleteTariff(id); toast.success("Удалено"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const toggleActive = async (id: number, current: boolean) => {
    try { await api.updateTariff(id, { is_active: !current }); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0A0A0B] border border-[#2A2A2C] p-6 md:p-8">
        <div className="flex flex-col">
          <h2 className="text-lg md:text-xl font-black uppercase tracking-wider text-white">Конфиг тарифов</h2>
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-1">Всего: {tariffs.length} / Активных: {tariffs.filter((t) => t.is_active).length}</span>
        </div>
        <button onClick={() => { setForm((f) => ({ ...f, name: "", price: "", zone: zones[0]?.name || "Стандарт", type: "обычный", duration: "60" })); setShowCreate(true); }} className="bg-[#00FF00] hover:bg-[#00EE00] text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
          <Plus size={16} />
          Новый тариф
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {tariffs.map((tariff) => (
          <div key={tariff.id} className={cn("bg-[#0A0A0B] border p-6 flex flex-col relative overflow-hidden group transition-all", tariff.is_active ? "border-[#2A2A2C] hover:border-[#00FF00]/50" : "border-zinc-900 opacity-60")}>
            {!tariff.is_active && <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-black px-4 py-1 uppercase translate-x-[25%] translate-y-[50%] rotate-45">Откл</div>}
            <div className="flex justify-between items-start mb-5">
              <div className="p-2 border border-zinc-800">
                {tariff.tariff_type === "премиум" ? <Star className="text-[#00FF00]" size={18} /> : tariff.tariff_type === "пакет" ? <Zap className="text-blue-500" size={18} /> : <Clock className="text-zinc-500" size={18} />}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing({ ...tariff })} className="p-1.5 hover:bg-white/10 text-zinc-600 hover:text-white transition-all"><Edit3 size={13} /></button>
                <button onClick={() => deleteTariff(tariff.id)} className="p-1.5 hover:bg-red-500/10 text-zinc-600 hover:text-red-500 transition-all"><Trash2 size={13} /></button>
              </div>
            </div>
            <div className="flex flex-col mb-6">
              <h3 className="text-base font-black uppercase tracking-tighter text-white">{tariff.name}</h3>
              <span className="text-[10px] font-mono text-zinc-600 uppercase">{tariff.zone}</span>
            </div>
            <div className="mt-auto flex items-end justify-between">
              <div>
                <span className="text-[9px] font-black text-zinc-700 uppercase block mb-1">Стоимость</span>
                <div className="text-2xl font-black font-mono tracking-tighter text-[#00FF00]">{tariff.price} ₽<span className="text-sm font-bold text-zinc-700">/ч</span></div>
              </div>
              <button onClick={() => toggleActive(tariff.id, tariff.is_active)} className={cn("px-2 py-1 text-[9px] font-black uppercase border transition-all", tariff.is_active ? "border-[#00FF00]/30 text-[#00FF00]" : "border-zinc-800 text-zinc-600 hover:text-white")}>
                {tariff.is_active ? "Вкл" : "Откл"}
              </button>
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
              <h2 className="text-base font-black uppercase tracking-wider text-white">Новый тариф</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Название</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ночной пакет" className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Цена (₽/ч)</label><input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" className="w-full bg-black border border-[#2A2A2C] px-3 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" /></div>
                <div><label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Зона</label>
                  {zones.length > 0 ? (
                    <select
                      value={form.zone}
                      onChange={(e) => setForm({ ...form, zone: e.target.value })}
                      className="w-full bg-black border border-[#2A2A2C] px-3 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none"
                    >
                      {zones.map((z) => (
                        <option key={z.id} value={z.name}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} className="w-full bg-black border border-[#2A2A2C] px-3 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" />
                  )}
                </div>
              </div>
              <div><label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Тип</label>
                <div className="flex gap-2">
                  {["обычный", "премиум", "пакет", "акция"].map((t) => (
                    <button key={t} onClick={() => setForm({ ...form, type: t })} className={cn("flex-1 py-2 text-[10px] font-black uppercase border transition-all", form.type === t ? "border-[#00FF00]/50 bg-[#00FF00]/10 text-[#00FF00]" : "border-zinc-800 text-zinc-500 hover:text-white")}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-zinc-800 text-zinc-500 hover:text-white text-xs font-black uppercase transition-all">Отмена</button>
              <button onClick={createTariff} className="flex-1 py-2.5 bg-[#00FF00] hover:bg-[#00EE00] text-black text-xs font-black uppercase transition-all">Создать</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-md bg-[#0A0A0B] border border-[#2A2A2C] p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-black uppercase tracking-wider text-white">Редактирование</h2>
              <button onClick={() => setEditing(null)} className="p-1 text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Название</label><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Цена (₽/ч)</label><input value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} type="number" className="w-full bg-black border border-[#2A2A2C] px-3 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" /></div>
                <div><label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Зона</label>
                  {zones.length > 0 ? (
                    <select
                      value={editing.zone}
                      onChange={(e) => setEditing({ ...editing, zone: e.target.value })}
                      className="w-full bg-black border border-[#2A2A2C] px-3 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none"
                    >
                      {!zones.some((z) => z.name === editing.zone) && (
                        <option value={editing.zone}>{editing.zone} (нет в списке)</option>
                      )}
                      {zones.map((z) => (
                        <option key={z.id} value={z.name}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input value={editing.zone} onChange={(e) => setEditing({ ...editing, zone: e.target.value })} className="w-full bg-black border border-[#2A2A2C] px-3 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 border border-zinc-800 text-zinc-500 hover:text-white text-xs font-black uppercase transition-all">Отмена</button>
              <button onClick={saveEdit} className="flex-1 py-2.5 bg-[#00FF00] hover:bg-[#00EE00] text-black text-xs font-black uppercase transition-all">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
