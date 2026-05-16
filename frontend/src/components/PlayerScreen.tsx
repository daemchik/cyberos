import React from "react";
import { Wallet, Play, Pause, LogOut, ShoppingBag, Monitor, Zap, HelpCircle, User, UserPlus, Ticket, Settings } from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { toast } from "sonner";
import { motion } from "motion/react";
import { api } from "../lib/api";

export function PlayerScreen() {
  const workstationDbId = React.useMemo(() => {
    const h = window.location.hash || "";
    const q = h.includes("?") ? new URLSearchParams(h.split("?")[1] || "") : new URLSearchParams(window.location.search);
    const w = Number(q.get("ws") || "1");
    return Number.isFinite(w) && w > 0 ? w : 1;
  }, []);

  const [authed, setAuthed] = React.useState(false);
  const [clientId, setClientId] = React.useState<number | null>(null);
  const [sessionId, setSessionId] = React.useState<number | null>(null);
  const [authMode, setAuthMode] = React.useState<"login" | "register">("login");
  const [phone, setPhone] = React.useState("");
  const [regName, setRegName] = React.useState("");
  const [playerName, setPlayerName] = React.useState("");
  const [playerPhone, setPlayerPhone] = React.useState("");

  const [sessionActive, setSessionActive] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [balance, setBalance] = React.useState(0);
  const [timeLeftSec, setTimeLeftSec] = React.useState(0);
  const [totalSessions, setTotalSessions] = React.useState(0);
  const [selectedTariff, setSelectedTariff] = React.useState<number | null>(null);
  const [topUpAmount, setTopUpAmount] = React.useState("");
  const [showTopUp, setShowTopUp] = React.useState(false);
  const [showShop, setShowShop] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);
  const [playerPassword, setPlayerPassword] = React.useState("");
  const [showPromo, setShowPromo] = React.useState(false);
  const [promoCode, setPromoCode] = React.useState("");


  const handleLogin = async () => {
    if (!phone.trim() || phone.length < 10) { toast.error("Введите корректный номер телефона"); return; }
    if (!playerPassword.trim() || playerPassword.trim().length < 4) { toast.error("Введите пароль (не короче 4 символов)"); return; }
    try {
      const client = await api.playerLogin(phone.trim(), playerPassword.trim());
      setClientId(Number(client.id));
      setPlayerName(client.name);
      setPlayerPhone(client.phone);
      setBalance(Number(client.balance));
      setAuthed(true);
      setPlayerPassword("");
      toast.success(`Добро пожаловать, ${client.name}!`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRegister = async () => {
    if (!phone.trim() || phone.length < 10) { toast.error("Введите номер телефона"); return; }
    if (!regName.trim()) { toast.error("Введите имя"); return; }
    if (!playerPassword.trim() || playerPassword.trim().length < 4) { toast.error("Придумайте пароль не короче 4 символов"); return; }
    try {
      const res = await api.playerRegister(regName.trim(), phone.trim(), playerPassword.trim());
      setClientId(Number(res.id));
      setPlayerName(regName.trim());
      setPlayerPhone(phone);
      setBalance(0);
      setAuthed(true);
      setPlayerPassword("");
      toast.success(`Аккаунт создан. Добро пожаловать, ${regName.trim()}!`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleLogout = () => {
    setAuthed(false);
    setClientId(null);
    setSessionId(null);
    setSessionActive(false);
    setPaused(false);
    setTimeLeftSec(0);
    setSelectedTariff(null);
    setPhone("");
    setRegName("");
    setShowProfile(false);
    toast.info("Вы вышли из аккаунта");
  };

  const applyPromo = async () => {
    if (!promoCode.trim()) { toast.error("Введите промокод"); return; }
    if (!clientId) { toast.error("Сначала войдите в аккаунт"); return; }
    try {
      const result = await api.applyPromo(promoCode.trim().toUpperCase(), clientId);
      if (typeof result.client_balance === "number") setBalance(result.client_balance);
      if (result.promo_type === "discount") toast.success(`Промокод применён: ${result.value}`);
      else toast.success(result.bonus_added ? `+${result.bonus_added} ₽ на баланс` : "Промокод применён");
      setPromoCode(""); setShowPromo(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const [tariffs, setTariffs] = React.useState<any[]>([]);

  React.useEffect(() => {
    api.getTariffs().then((data) => setTariffs(data.filter((t: any) => t.is_active).map((t: any) => ({ id: t.id, name: t.name, desc: t.zone || "Стандарт", price: Number(t.price), minutes: t.duration_minutes })))).catch(() => {});
  }, []);

  const PRICE_PER_MINUTE = 2; // ₽ за минуту для кастомного времени
  const [customMinutes, setCustomMinutes] = React.useState("");
  const [shopItems, setShopItems] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!clientId) return;
    api.getClient(clientId).then((c) => setTotalSessions(Number(c.total_sessions) || 0)).catch(() => {});
  }, [clientId, authed]);

  // Load shop items from API
  React.useEffect(() => {
    api.getProducts().then((data) => setShopItems(data.map((p: any) => ({ name: p.name, price: Number(p.price), id: p.id })))).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!sessionActive || paused || timeLeftSec <= 0) return;
    const interval = setInterval(() => {
      setTimeLeftSec((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setSessionActive(false);
          setSessionId(null);
          toast.info("Время вышло!");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionActive, paused]);

  const startSession = async () => {
    if (!clientId) { toast.error("Войдите в аккаунт"); return; }
    if (selectedTariff === -1) {
      const mins = Number(customMinutes);
      if (!mins || mins < 10) { toast.error("Минимум 10 минут"); return; }
      const price = mins * PRICE_PER_MINUTE;
      if (balance < price) { toast.error("Недостаточно средств"); return; }
      try {
        const res = await api.createSession({
          client_id: clientId,
          workstation_id: workstationDbId,
          tariff_id: null,
          duration_minutes: mins,
          amount: price,
        });
        setSessionId(Number(res.id));
        if (typeof res.client_balance === "number") setBalance(res.client_balance);
        setTimeLeftSec(typeof res.remaining_seconds === "number" ? res.remaining_seconds : mins * 60);
        setSessionActive(true);
        setPaused(false);
        toast.success(`Сеанс начат: ${mins} мин (${price} ₽)`);
      } catch (e: any) { toast.error(e.message); }
      return;
    }
    if (!selectedTariff) { toast.error("Выберите тариф"); return; }
    const tariff = tariffs.find((t) => t.id === selectedTariff);
    if (!tariff) return;
    if (balance < tariff.price) { toast.error("Недостаточно средств"); return; }
    try {
      const res = await api.createSession({
        client_id: clientId,
        workstation_id: workstationDbId,
        tariff_id: tariff.id,
        duration_minutes: tariff.minutes,
        amount: tariff.price,
      });
      setSessionId(Number(res.id));
      if (typeof res.client_balance === "number") setBalance(res.client_balance);
      setTimeLeftSec(typeof res.remaining_seconds === "number" ? res.remaining_seconds : tariff.minutes * 60);
      setSessionActive(true);
      setPaused(false);
      toast.success(`Сеанс начат: ${tariff.name}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const endSession = async () => {
    try {
      if (sessionId) await api.endSession(sessionId);
    } catch { /* ignore */ }
    setSessionActive(false);
    setPaused(false);
    setTimeLeftSec(0);
    setSessionId(null);
    setSelectedTariff(null);
    if (clientId) {
      api.getClient(clientId).then((c) => {
        setBalance(Number(c.balance));
        setTotalSessions(Number(c.total_sessions) || 0);
      }).catch(() => {});
    }
    toast.info("Сеанс завершен. Спасибо за игру!");
  };

  const togglePause = async () => {
    if (!sessionId) { setPaused((p) => !p); return; }
    try {
      if (paused) {
        await api.resumeSession(sessionId);
        setPaused(false);
        toast.info("Возобновлено");
      } else {
        await api.pauseSession(sessionId);
        setPaused(true);
        toast.info("Пауза");
      }
    } catch (e: any) { toast.error(e.message); }
  };

  const topUp = async () => {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) { toast.error("Введите сумму"); return; }
    if (!clientId) { toast.error("Войдите в аккаунт"); return; }
    try {
      await api.updateClient(clientId, { balance: balance + amount });
      setBalance((b) => b + amount);
      setTopUpAmount("");
      setShowTopUp(false);
      toast.success(`+${amount} ₽`);
    } catch (e: any) { toast.error(e.message); }
  };

  const buyItem = async (item: { id: number; name: string; price: number }) => {
    if (!clientId) { toast.error("Войдите в аккаунт"); return; }
    if (balance < item.price) { toast.error("Недостаточно средств"); return; }
    try {
      const res = await api.createOrder({
        client_id: clientId,
        workstation_id: workstationDbId,
        product_id: item.id,
        quantity: 1,
      });
      if (typeof res.client_balance === "number") setBalance(res.client_balance);
      toast.success(`${item.name} заказан!`);
    } catch (e: any) { toast.error(e.message); }
  };

  const addHour = async () => {
    if (!sessionId || !clientId) { toast.error("Нет активной сессии"); return; }
    const cost = 100;
    if (balance < cost) { toast.error("Мало средств"); return; }
    try {
      await api.updateClient(clientId, { balance: balance - cost });
      await api.extendSession(sessionId, { additional_minutes: 60 });
      setBalance((b) => b - cost);
      setTimeLeftSec((t) => t + 3600);
      toast.success("+1 час");
    } catch (e: any) { toast.error(e.message); }
  };

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-[#2A2A2C] px-4 md:px-6 py-3 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#00FF00] rounded-sm flex items-center justify-center font-black text-black text-[10px]">CC</div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-wider text-[#00FF00]">Cyber Core</h1>
            <span className="text-[9px] font-mono text-zinc-500">ПК #{workstationDbId}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {authed && (
            <>
              <div className="flex items-center gap-1.5">
                <Wallet size={13} className="text-[#00FF00]" />
                <span className="text-xs font-mono font-black text-[#00FF00]">{formatCurrency(balance)}</span>
              </div>
              <button onClick={() => setShowProfile(true)} className="p-1.5 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all">
                <User size={14} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-10">
        {!authed ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto border border-[#00FF00]/30 bg-[#00FF00]/5 flex items-center justify-center">
                <User size={24} className="text-[#00FF00]" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-wider">Авторизация</h2>
              <p className="text-[10px] text-zinc-500 font-mono">Войдите или создайте аккаунт</p>
            </div>
            <div className="flex border border-[#2A2A2C]">
              <button onClick={() => setAuthMode("login")} className={cn("flex-1 py-2.5 text-[10px] font-black uppercase transition-all", authMode === "login" ? "bg-[#00FF00]/10 text-[#00FF00]" : "text-zinc-500 hover:text-white")}>Вход</button>
              <button onClick={() => setAuthMode("register")} className={cn("flex-1 py-2.5 text-[10px] font-black uppercase transition-all border-l border-[#2A2A2C]", authMode === "register" ? "bg-[#00FF00]/10 text-[#00FF00]" : "text-zinc-500 hover:text-white")}>Регистрация</button>
            </div>
            <div className="space-y-3">
              {authMode === "register" && (
                <div><label className="text-[10px] font-black uppercase text-zinc-600 block mb-1">Имя</label>
                <input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Иван Иванов" className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none placeholder:text-zinc-800" /></div>
              )}
              <div><label className="text-[10px] font-black uppercase text-zinc-600 block mb-1">Телефон</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (999) 123-45-67" className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none placeholder:text-zinc-800" onKeyDown={(e) => { if (e.key === "Enter") authMode === "login" ? handleLogin() : handleRegister(); }} /></div>
              <div><label className="text-[10px] font-black uppercase text-zinc-600 block mb-1">Пароль</label>
              <input
                value={playerPassword}
                onChange={(e) => setPlayerPassword(e.target.value)}
                type="password"
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                placeholder="••••"
                className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none placeholder:text-zinc-800"
              />
              </div>
            </div>
            <button onClick={authMode === "login" ? handleLogin : handleRegister} className="w-full py-3 bg-[#00FF00] hover:bg-[#00EE00] text-black text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
              {authMode === "login" ? <><User size={14} /> Войти</> : <><UserPlus size={14} /> Создать аккаунт</>}
            </button>
          </motion.div>
        ) : !sessionActive ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-wider">Привет, {playerName}</h2>
              <p className="text-xs text-zinc-500 font-mono">Выберите тариф и начните сеанс</p>
            </div>

            {/* Balance + promo */}
            <div className="bg-black/40 border border-[#2A2A2C] p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-600 block mb-1">Баланс</span>
                <span className="text-2xl font-mono font-black text-[#00FF00]">{formatCurrency(balance)}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowPromo(true)} className="border border-zinc-800 text-zinc-400 hover:text-white px-3 py-2 text-[10px] font-black uppercase transition-all flex items-center gap-1.5">
                  <Ticket size={13} /> Промокод
                </button>
                <button onClick={() => setShowTopUp(true)} className="border border-zinc-800 text-zinc-400 hover:text-white px-3 py-2 text-[10px] font-black uppercase transition-all flex items-center gap-1.5">
                  <Wallet size={13} /> Пополнить
                </button>
              </div>
            </div>

            {/* Tariffs */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Тарифы</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tariffs.map((t) => (
                  <button key={t.id} onClick={() => { setSelectedTariff(t.id); setCustomMinutes(""); }} className={cn("p-4 border text-left transition-all", selectedTariff === t.id ? "border-[#00FF00]/50 bg-[#00FF00]/5" : "border-[#2A2A2C] hover:border-zinc-700")}>
                    <span className="text-xs font-black text-white block mb-0.5">{t.name}</span>
                    <span className="text-[9px] text-zinc-600 font-mono block mb-2">{t.desc}</span>
                    <span className="text-base font-mono font-black text-[#00FF00]">{t.price} ₽</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom time */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Или выберите своё время</h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <input value={customMinutes} onChange={(e) => { setCustomMinutes(e.target.value); if (e.target.value) setSelectedTariff(-1); else setSelectedTariff(null); }} type="number" min={10} placeholder="Минуты (мин. 10)" className="w-full bg-black border border-[#2A2A2C] px-4 py-3 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none placeholder:text-zinc-800" />
                </div>
                {customMinutes && Number(customMinutes) >= 10 && (
                  <div className="text-right shrink-0">
                    <span className="text-lg font-mono font-black text-[#00FF00]">{Number(customMinutes) * PRICE_PER_MINUTE} ₽</span>
                    <span className="text-[9px] text-zinc-600 font-mono block">{PRICE_PER_MINUTE} ₽/мин</span>
                  </div>
                )}
              </div>
            </div>

            <button type="button" onClick={() => void startSession()} disabled={!selectedTariff} className={cn("w-full py-4 text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3", selectedTariff ? "bg-[#00FF00] hover:bg-[#00EE00] text-black" : "bg-zinc-900 text-zinc-700 cursor-not-allowed")}>
              <Play size={18} /> Начать сеанс
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg space-y-5">
            <div className="text-center space-y-3">
              <div className={cn("inline-flex items-center gap-2 px-3 py-1 border text-[10px] font-black uppercase", paused ? "border-orange-500/30 text-orange-500 bg-orange-500/5" : "border-[#00FF00]/30 text-[#00FF00] bg-[#00FF00]/5")}>
                <div className={cn("w-2 h-2 rounded-full", paused ? "bg-orange-500" : "bg-[#00FF00] animate-pulse")} />
                {paused ? "Пауза" : "Активен"}
              </div>
              <div className="text-5xl md:text-6xl font-mono font-black text-white tracking-tighter">{formatTime(timeLeftSec)}</div>
              <p className="text-[10px] text-zinc-600 font-mono">Осталось</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => void togglePause()} className={cn("py-3.5 border text-xs font-black uppercase transition-all flex items-center justify-center gap-2", paused ? "border-[#00FF00]/50 text-[#00FF00]" : "border-orange-500/30 text-orange-500")}>
                {paused ? <><Play size={14} /> Продолжить</> : <><Pause size={14} /> Пауза</>}
              </button>
              <button type="button" onClick={() => void endSession()} className="py-3.5 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-black text-xs font-black uppercase transition-all flex items-center justify-center gap-2">
                <LogOut size={14} /> Завершить
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setShowTopUp(true)} className="py-3 bg-zinc-900 border border-zinc-800 text-[9px] font-black uppercase text-zinc-400 hover:text-white transition-all flex flex-col items-center gap-1"><Wallet size={14} />Пополнить</button>
              <button onClick={() => setShowShop(true)} className="py-3 bg-zinc-900 border border-zinc-800 text-[9px] font-black uppercase text-zinc-400 hover:text-white transition-all flex flex-col items-center gap-1"><ShoppingBag size={14} />Маркет</button>
              <button type="button" onClick={() => void addHour()} className="py-3 bg-zinc-900 border border-zinc-800 text-[9px] font-black uppercase text-zinc-400 hover:text-white transition-all flex flex-col items-center gap-1"><Zap size={14} />+1 час</button>
            </div>

            <button onClick={() => toast.success("Переход на рабочий стол")} className="w-full py-4 bg-zinc-900 border border-zinc-800 hover:border-[#00FF00]/50 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
              <Monitor size={16} /> Перейти на рабочий стол
            </button>

            <button onClick={() => toast.info("Администратор уведомлен")} className="w-full py-2.5 border border-zinc-800 text-zinc-600 hover:text-white text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2">
              <HelpCircle size={13} /> Вызвать администратора
            </button>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-[#2A2A2C] px-4 py-2.5 flex justify-between items-center text-[9px] font-mono text-zinc-700">
        <span>Cyber Core v1.0</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-[#00FF00] rounded-full" /> Подключено</span>
      </footer>

      {/* Profile modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowProfile(false)} />
          <div className="relative w-full max-w-sm bg-[#0A0A0B] border border-[#2A2A2C] p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-black uppercase tracking-wider text-white">Профиль</h2>
              <button onClick={() => setShowProfile(false)} className="text-zinc-500 hover:text-white"><Settings size={16} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 border border-zinc-800 bg-zinc-900 flex items-center justify-center text-xl font-black text-[#00FF00]">
                  {playerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-black text-white">{playerName}</div>
                  <div className="text-[10px] font-mono text-zinc-500">{playerPhone}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#2A2A2C]">
                <div className="text-center p-3 bg-zinc-900/50 border border-zinc-800">
                  <div className="text-lg font-mono font-black text-[#00FF00]">{balance} ₽</div>
                  <div className="text-[9px] text-zinc-600 font-black uppercase">Баланс</div>
                </div>
                <div className="text-center p-3 bg-zinc-900/50 border border-zinc-800">
                  <div className="text-lg font-mono font-black text-white">{totalSessions}</div>
                  <div className="text-[9px] text-zinc-600 font-black uppercase">Сессий</div>
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full py-2.5 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-black text-xs font-black uppercase transition-all flex items-center justify-center gap-2">
              <LogOut size={14} /> Выйти из аккаунта
            </button>
          </div>
        </div>
      )}

      {/* Promo modal */}
      {showPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPromo(false)} />
          <div className="relative w-full max-w-sm bg-[#0A0A0B] border border-[#2A2A2C] p-6 space-y-5">
            <h2 className="text-base font-black uppercase tracking-wider text-white">Промокод</h2>
            <div>
              <input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="Введите код..." className="w-full bg-black border border-[#2A2A2C] px-4 py-3 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none placeholder:text-zinc-800 uppercase" onKeyDown={(e) => { if (e.key === "Enter") applyPromo(); }} autoFocus />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPromo(false)} className="flex-1 py-2.5 border border-zinc-800 text-zinc-500 hover:text-white text-xs font-black uppercase transition-all">Отмена</button>
              <button onClick={applyPromo} className="flex-1 py-2.5 bg-[#00FF00] hover:bg-[#00EE00] text-black text-xs font-black uppercase transition-all">Применить</button>
            </div>
          </div>
        </div>
      )}

      {/* Top-up modal */}
      {showTopUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowTopUp(false)} />
          <div className="relative w-full max-w-sm bg-[#0A0A0B] border border-[#2A2A2C] p-6 space-y-5">
            <h2 className="text-base font-black uppercase tracking-wider text-white">Пополнение</h2>
            <div className="grid grid-cols-3 gap-2">
              {[100, 200, 500, 1000, 2000, 5000].map((v) => (
                <button key={v} onClick={() => setTopUpAmount(String(v))} className={cn("py-2.5 border text-xs font-mono font-black transition-all", topUpAmount === String(v) ? "border-[#00FF00]/50 bg-[#00FF00]/10 text-[#00FF00]" : "border-zinc-800 text-zinc-400 hover:text-white")}>{v} ₽</button>
              ))}
            </div>
            <input value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} type="number" placeholder="Сумма" className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowTopUp(false)} className="flex-1 py-2.5 border border-zinc-800 text-zinc-500 hover:text-white text-xs font-black uppercase transition-all">Отмена</button>
              <button type="button" onClick={() => void topUp()} className="flex-1 py-2.5 bg-[#00FF00] hover:bg-[#00EE00] text-black text-xs font-black uppercase transition-all">Пополнить</button>
            </div>
          </div>
        </div>
      )}

      {/* Shop modal */}
      {showShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowShop(false)} />
          <div className="relative w-full max-w-sm bg-[#0A0A0B] border border-[#2A2A2C] p-6 space-y-4">
            <h2 className="text-base font-black uppercase tracking-wider text-white">Маркет</h2>
            <p className="text-[9px] text-zinc-600 font-mono">Доставка к вашему ПК</p>
            <div className="space-y-2">
              {shopItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 border border-[#2A2A2C] hover:border-zinc-700 transition-all">
                  <span className="text-xs font-bold text-zinc-300">{item.name}</span>
                  <button type="button" onClick={() => void buyItem(item)} className="text-[10px] font-black text-[#00FF00] border border-[#00FF00]/30 px-3 py-1 hover:bg-[#00FF00]/10 transition-all">{item.price} ₽</button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowShop(false)} className="w-full py-2.5 border border-zinc-800 text-zinc-500 hover:text-white text-xs font-black uppercase transition-all">Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
}
