import React from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useAuth } from "../lib/AuthContext";

export function LoginScreen() {
  const { login } = useAuth();
  const [user, setUser] = React.useState("admin");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(user.trim(), password);
      toast.success("Вход выполнен");
    } catch (err: any) {
      toast.error(err?.message || "Ошибка входа");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-md border border-[#2A2A2C] bg-[#0A0A0B] p-8 space-y-6"
      >
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest text-white">CyberOS</h1>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-2">Вход сотрудника</p>
        </div>
        <div className="space-y-3">
          <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest">Логин</label>
          <input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
            className="w-full bg-black border border-[#2A2A2C] px-4 py-3 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none"
          />
        </div>
        <div className="space-y-3">
          <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full bg-black border border-[#2A2A2C] px-4 py-3 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 bg-[#00FF00] hover:bg-[#00EE00] disabled:opacity-50 text-black text-xs font-black uppercase tracking-widest"
        >
          {busy ? "…" : "Войти"}
        </button>
      </motion.form>
    </div>
  );
}
