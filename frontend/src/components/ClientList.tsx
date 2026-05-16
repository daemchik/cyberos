import React from "react";
import { Search, Plus, X, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency } from "../lib/utils";
import { api } from "../lib/api";

export function ClientList() {
  const [clients, setClients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [showCreate, setShowCreate] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");

  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editBalance, setEditBalance] = React.useState("");
  const [editPassword, setEditPassword] = React.useState("");

  const load = async () => {
    try {
      const data = await api.getClients();
      setClients(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  const filtered = search
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          String(c.phone).includes(search)
      )
    : clients;

  const createClient = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast.error("Заполните имя и телефон");
      return;
    }
    try {
      const payload: { name: string; phone: string; player_password?: string } = {
        name: newName.trim(),
        phone: newPhone.trim(),
      };
      if (newPassword.trim().length >= 4) payload.player_password = newPassword.trim();
      await api.createClient(payload);
      toast.success("Клиент создан");
      setShowCreate(false);
      setNewName("");
      setNewPhone("");
      setNewPassword("");
      void load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openEdit = async (id: number) => {
    try {
      const c = await api.getClient(id);
      setEditingId(id);
      setEditName(String(c.name ?? ""));
      setEditPhone(String(c.phone ?? ""));
      setEditBalance(String(c.balance ?? "0"));
      setEditPassword("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    if (!editName.trim() || !editPhone.trim()) {
      toast.error("Имя и телефон обязательны");
      return;
    }
    const bal = Number(editBalance);
    if (Number.isNaN(bal)) {
      toast.error("Некорректный баланс");
      return;
    }
    try {
      const body: Record<string, unknown> = {
        name: editName.trim(),
        phone: editPhone.trim(),
        balance: bal,
      };
      if (editPassword.trim().length >= 4) body.player_password = editPassword.trim();
      await api.updateClient(editingId, body);
      toast.success("Сохранено");
      setEditingId(null);
      void load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const removeClient = async (id: number, name: string) => {
    if (!window.confirm(`Удалить клиента «${name}»?`)) return;
    try {
      await api.deleteClient(id);
      toast.success("Клиент удалён");
      void load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-[#0A0A0B] border border-[#2A2A2C] p-4 md:p-8">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-1 min-w-0">
          <div className="relative group flex-1 min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00FF00] transition-colors" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
              placeholder="Поиск: имя / телефон..."
              className="bg-black/40 border border-[#2A2A2C] pl-12 pr-4 py-2.5 text-xs w-full font-mono focus:outline-none focus:border-[#00FF00]/50 transition-all placeholder:text-zinc-800 text-zinc-300"
            />
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-2 bg-[#00FF00] hover:bg-[#00EE00] text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all shrink-0"
          type="button"
        >
          <Plus size={16} /> Регистрация
        </button>
      </div>

      <div className="bg-[#0A0A0B] border border-[#2A2A2C] overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead className="text-[9px] font-black text-zinc-600 uppercase tracking-wider border-b border-[#2A2A2C]">
              <tr>
                <th className="px-4 md:px-6 py-4">Клиент</th>
                <th className="px-4 md:px-6 py-4">Телефон</th>
                <th className="px-4 md:px-6 py-4">Баланс</th>
                <th className="px-4 md:px-6 py-4">Сессии</th>
                <th className="px-4 md:px-6 py-4">Дата рег.</th>
                <th className="px-4 md:px-6 py-4 w-24 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2C]/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-600 font-mono">
                    Загрузка...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-600 font-mono">
                    Нет клиентов
                  </td>
                </tr>
              ) : (
                filtered.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-[#00FF00]/2 group transition-colors border-l-2 border-transparent hover:border-l-[#00FF00]"
                  >
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 border border-zinc-800 bg-zinc-900/50 flex items-center justify-center font-black text-zinc-600 group-hover:text-[#00FF00] text-xs">
                          {client.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-zinc-200 group-hover:text-white block">
                            {client.name}
                          </span>
                          <span className="text-[10px] text-zinc-600 font-mono">ID: {client.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-xs font-mono text-zinc-400">{client.phone}</td>
                    <td className="px-4 md:px-6 py-4">
                      <span
                        className={cn(
                          "text-sm font-black font-mono",
                          Number(client.balance) > 0 ? "text-[#00FF00]" : "text-zinc-500"
                        )}
                      >
                        {formatCurrency(Number(client.balance))}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-xs font-black text-zinc-300">{client.total_sessions}</td>
                    <td className="px-4 md:px-6 py-4 text-xs text-zinc-500 font-mono">
                      {new Date(client.registered_at).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => void openEdit(Number(client.id))}
                          className="p-2 text-zinc-500 hover:text-[#00FF00] hover:bg-white/5 transition-colors"
                          title="Редактировать"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeClient(Number(client.id), client.name)}
                          className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 md:px-6 py-3 bg-black border-t border-[#2A2A2C] text-[10px] font-black uppercase tracking-widest text-zinc-700">
          Всего: {filtered.length}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-sm bg-[#0A0A0B] border border-[#2A2A2C] p-6 space-y-5">
            <div className="flex justify-between">
              <h2 className="text-base font-black uppercase text-white">Новый клиент</h2>
              <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-white" type="button">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Имя</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Иванов Иван"
                  className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Телефон</label>
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+7 999 123 45 67"
                  className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Пароль игрока (опц.)</label>
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type="password"
                  placeholder="Не короче 4 символов"
                  className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 border border-zinc-800 text-zinc-500 hover:text-white text-xs font-black uppercase transition-all"
                type="button"
              >
                Отмена
              </button>
              <button
                onClick={() => void createClient()}
                className="flex-1 py-2.5 bg-[#00FF00] hover:bg-[#00EE00] text-black text-xs font-black uppercase transition-all"
                type="button"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {editingId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingId(null)} />
          <div className="relative w-full max-w-sm bg-[#0A0A0B] border border-[#2A2A2C] p-6 space-y-5">
            <div className="flex justify-between">
              <h2 className="text-base font-black uppercase text-white">Клиент #{editingId}</h2>
              <button onClick={() => setEditingId(null)} className="text-zinc-500 hover:text-white" type="button">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Имя</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Телефон</label>
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Баланс</label>
                <input
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  type="number"
                  step="0.01"
                  className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Новый пароль (опц.)</label>
                <input
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  type="password"
                  placeholder="Оставьте пустым, чтобы не менять"
                  className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditingId(null)}
                className="flex-1 py-2.5 border border-zinc-800 text-zinc-500 hover:text-white text-xs font-black uppercase transition-all"
                type="button"
              >
                Отмена
              </button>
              <button
                onClick={() => void saveEdit()}
                className="flex-1 py-2.5 bg-[#00FF00] hover:bg-[#00EE00] text-black text-xs font-black uppercase transition-all"
                type="button"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
