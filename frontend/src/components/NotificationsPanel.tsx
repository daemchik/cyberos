import React from "react";
import { Bell, UtensilsCrossed, Headphones, CheckCheck } from "lucide-react";
import { api } from "../lib/api";
import { playNotificationBeep } from "../lib/sounds";
import { cn } from "../lib/utils";
import { toast } from "sonner";

type Row = {
  id: number;
  kind: string;
  ref_id: number | null;
  title: string;
  detail: string;
  created_at: string;
  read_at: string | null;
};

export function NotificationsPanel() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const topIdRef = React.useRef(0);

  const load = React.useCallback(async () => {
    try {
      const list = await api.getNotifications();
      const arr = Array.isArray(list) ? list : [];
      if (arr.length > 0) {
        const mx = Math.max(...arr.map((r) => Number(r.id) || 0));
        if (mx > topIdRef.current && topIdRef.current > 0) {
          try {
            playNotificationBeep();
          } catch {
            /* ignore */
          }
        }
        topIdRef.current = mx;
      }
      setRows(arr as Row[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Не удалось загрузить уведомления");
    }
  }, []);

  React.useEffect(() => {
    void load();
    const iv = window.setInterval(() => void load(), 6000);
    return () => window.clearInterval(iv);
  }, [load]);

  const markAllRead = async () => {
    try {
      await api.markNotificationsRead();
      toast.success("Все уведомления отмечены прочитанными");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Ошибка");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-[var(--panel-bg)] border border-[var(--app-border)] p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-[var(--text-heading)] flex items-center gap-2">
              <Bell size={20} className="text-[#00FF00]" /> Уведомления
            </h2>
            <p className="text-[10px] text-[var(--text-secondary)] font-mono mt-2">
              Заказы с ПК и вызовы администратора сохраняются в базе. Обновление ~6 с.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest border border-[var(--app-border)] bg-[var(--panel-muted)] text-[var(--text-primary)] hover:border-[#00FF00]/40 transition-all shrink-0"
          >
            <CheckCheck size={14} className="text-[#00FF00]" />
            Прочитать всё
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="text-[var(--text-secondary)] text-xs font-mono py-12 text-center border border-[var(--app-border)] bg-[var(--panel-bg)]">
            Нет уведомлений
          </div>
        ) : (
          rows.map((e) => (
            <div
              key={e.id}
              className={cn(
                "flex items-start gap-4 p-4 border border-[var(--app-border)] bg-[var(--panel-bg)]",
                e.kind === "call" ? "border-l-4 border-l-amber-500" : "border-l-4 border-l-cyan-500",
                e.read_at ? "opacity-60" : ""
              )}
            >
              <div className="p-2 border border-[var(--app-border)] shrink-0 bg-[var(--panel-muted)]">
                {e.kind === "order" ? (
                  <UtensilsCrossed size={18} className="text-cyan-400" />
                ) : (
                  <Headphones size={18} className="text-amber-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black uppercase text-[var(--text-heading)]">{e.title}</div>
                <div className="text-sm text-[var(--text-primary)] font-mono mt-1">{e.detail}</div>
                <div className="text-[9px] text-[var(--text-secondary)] mt-2 flex flex-wrap gap-2">
                  <span>{e.created_at}</span>
                  {e.read_at && <span className="text-emerald-600 dark:text-emerald-400">прочитано</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
