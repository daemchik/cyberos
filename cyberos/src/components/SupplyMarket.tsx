import React from "react";
import { Package, Plus, Edit3, Trash2, X, Bell, Check, ShoppingCart, Calculator, CreditCard, Banknote, Smartphone } from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../lib/api";

type Product = { id: string; name: string; category: string; stock: number; price: number; img: string };
type Order = { id: string; pc: string; client: string; item: string; time: string; status: "pending" | "done" };
type CartItem = { product: Product; qty: number };
type Sale = { id: string; items: { name: string; qty: number; price: number }[]; total: number; method: string; time: string };

export function SupplyMarket() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [tab, setTab] = React.useState<"cashier" | "products" | "orders" | "supply">("cashier");
  const [showAdd, setShowAdd] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [form, setForm] = React.useState({ name: "", category: "Снеки", price: "", stock: "", image_url: "" });
  const [editImageUrl, setEditImageUrl] = React.useState("");
  const [supplyProducts, setSupplyProducts] = React.useState<{productId: string; qty: string}[]>([{productId: "", qty: ""}]);
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [payMethod, setPayMethod] = React.useState<"cash" | "card" | "sbp">("cash");
  const [cashGiven, setCashGiven] = React.useState("");
  const [showCalc, setShowCalc] = React.useState(false);
  const [calcDisplay, setCalcDisplay] = React.useState("0");

  const loadProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data.map((p: any) => ({ ...p, id: String(p.id), img: p.image_url || `https://picsum.photos/seed/${p.id}/80` })));
    } catch (e: any) { toast.error(e.message); }
  };

  const loadSales = async () => {
    try {
      const data = await api.getSales();
      setSales(data.map((s: any) => ({ ...s, id: String(s.id), items: [], method: s.payment_method === "cash" ? "Наличные" : s.payment_method === "sbp" ? "СБП" : "Карта", time: new Date(s.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) })));
    } catch {}
  };

  const loadOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data.map((o: any) => ({ id: String(o.id), pc: `ПК ${String(o.pc_number).padStart(2, "0")}`, client: o.client_name, item: o.product_name, time: new Date(o.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }), status: o.status })));
    } catch {}
  };

  React.useEffect(() => { loadProducts(); loadSales(); loadOrders(); }, []);

  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const cartTotal = cart.reduce((sum, c) => sum + c.product.price * c.qty, 0);
  const change = payMethod === "cash" && Number(cashGiven) > cartTotal ? Number(cashGiven) - cartTotal : 0;

  // Cart functions
  const addToCart = (product: Product) => {
    if (product.stock <= 0) { toast.error("Нет в наличии"); return; }
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) { toast.error("Больше нет на складе"); return prev; }
        return prev.map((c) => c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((c) => c.product.id !== productId));
  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.product.id !== productId) return c;
      const newQty = c.qty + delta;
      if (newQty <= 0) return c;
      if (newQty > c.product.stock) { toast.error("Превышает остаток"); return c; }
      return { ...c, qty: newQty };
    }));
  };

  const completeSale = async () => {
    if (cart.length === 0) { toast.error("Корзина пуста"); return; }
    if (payMethod === "cash" && Number(cashGiven) < cartTotal) { toast.error("Недостаточно средств"); return; }
    try {
      await api.createSale({
        items: cart.map((c) => ({ product_id: Number(c.product.id), quantity: c.qty, price: c.product.price })),
        total: cartTotal,
        payment_method: payMethod,
        cash_given: payMethod === "cash" ? Number(cashGiven) : 0,
        change_given: payMethod === "cash" ? change : 0,
      });
      const changeMsg = payMethod === "cash" && change > 0 ? ` Сдача: ${formatCurrency(change)}` : "";
      toast.success(`Продажа ${formatCurrency(cartTotal)} проведена.${changeMsg}`);
      setCart([]); setCashGiven("");
      loadProducts(); loadSales();
    } catch (e: any) { toast.error(e.message); }
  };

  // Calculator
  const calcPress = (val: string) => {
    if (val === "C") { setCalcDisplay("0"); return; }
    if (val === "=") {
      try { setCalcDisplay(String(eval(calcDisplay))); } catch { setCalcDisplay("Ошибка"); }
      return;
    }
    setCalcDisplay((prev) => prev === "0" ? val : prev + val);
  };

  const addProduct = async () => {
    if (!form.name.trim() || !form.price) { toast.error("Заполните поля"); return; }
    try {
      await api.createProduct({ name: form.name.trim(), category: form.category, price: Number(form.price), stock: Number(form.stock) || 0, image_url: form.image_url.trim() });
      setShowAdd(false); setForm({ name: "", category: "Снеки", price: "", stock: "", image_url: "" });
      toast.success("Товар добавлен"); loadProducts();
    } catch (e: any) { toast.error(e.message); }
  };
  const saveEdit = async () => {
    if (!editing) return;
    try {
      await api.updateProduct(Number(editing.id), { name: editing.name, category: editing.category, price: editing.price, stock: editing.stock, image_url: editImageUrl || editing.img });
      setEditing(null); toast.success("Обновлено"); loadProducts();
    } catch (e: any) { toast.error(e.message); }
  };
  const deleteProduct = async (id: string) => {
    try { await api.deleteProduct(Number(id)); toast.success("Удалено"); loadProducts(); }
    catch (e: any) { toast.error(e.message); }
  };
  const addSupplyRow = () => {
    setSupplyProducts(prev => [...prev, {productId: "", qty: ""}]);
  };
  
  const updateSupplyRow = (index: number, field: "productId" | "qty", value: string) => {
    setSupplyProducts(prev => prev.map((row, i) => i === index ? {...row, [field]: value} : row));
  };
  
  const removeSupplyRow = (index: number) => {
    if (supplyProducts.length > 1) {
      setSupplyProducts(prev => prev.filter((_, i) => i !== index));
    }
  };

  const acceptSupply = async () => {
    const validRows = supplyProducts.filter(r => r.productId && r.qty && parseInt(r.qty) > 0);
    if (validRows.length === 0) { toast.error("Добавьте хотя бы один товар"); return; }
    
    let successCount = 0;
    for (const row of validRows) {
      const p = products.find((x) => x.id === row.productId);
      if (p) {
        try {
          await api.updateProduct(Number(row.productId), { stock: p.stock + Number(row.qty) });
          successCount++;
        } catch (e: any) { toast.error(`${p.name}: ${e.message}`); }
      }
    }
    
    if (successCount > 0) {
      toast.success(`Поставка: ${successCount} позиций принято`);
      setSupplyProducts([{productId: "", qty: ""}]);
      loadProducts();
    }
  };
  const completeOrder = async (id: string) => {
    try { await api.completeOrder(Number(id)); toast.success("Выполнен"); loadOrders(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0A0A0B] border border-[#2A2A2C] p-6">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider text-white">Маркет снабжения</h2>
          <span className="text-[10px] font-mono text-zinc-600 uppercase mt-1">Товаров: {products.length} / Продаж: {sales.length}</span>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-[#00FF00] hover:bg-[#00EE00] text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
          <Plus size={14} /> Товар
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([["cashier", "Касса"], ["products", "Товары"], ["orders", `Заказы (${pendingOrders})`], ["supply", "Поставки"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={cn("px-4 py-2.5 text-[10px] font-black uppercase border transition-all", tab === key ? "border-[#00FF00]/50 bg-[#00FF00]/10 text-[#00FF00]" : "border-zinc-800 text-zinc-500 hover:text-white")}>
            {label}
          </button>
        ))}
      </div>

      {/* === CASHIER TAB === */}
      {tab === "cashier" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Product picker */}
          <div className="lg:col-span-3 bg-[#0A0A0B] border border-[#2A2A2C] p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Выберите товары</h3>
              <button onClick={() => setShowCalc(!showCalc)} className="border border-zinc-800 text-zinc-500 hover:text-white p-1.5 transition-all"><Calculator size={14} /></button>
            </div>

            {showCalc && (
              <div className="bg-black border border-[#2A2A2C] p-3 space-y-2">
                <div className="bg-zinc-900 px-3 py-2 text-right text-lg font-mono text-white">{calcDisplay}</div>
                <div className="grid grid-cols-4 gap-1">
                  {["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+","C"].map((b) => (
                    <button key={b} onClick={() => calcPress(b)} className={cn("py-2 text-xs font-mono font-black border border-zinc-800 transition-all", b === "=" ? "bg-[#00FF00] text-black col-span-1" : b === "C" ? "bg-red-500/20 text-red-500 col-span-3" : "text-zinc-300 hover:bg-zinc-800")}>{b}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto no-scrollbar">
              {products.filter((p) => p.stock > 0).map((p) => (
                <button key={p.id} onClick={() => addToCart(p)} className="border border-[#2A2A2C] p-3 text-left hover:border-[#00FF00]/30 transition-all group flex items-center gap-3">
                  <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 shrink-0 overflow-hidden">
                    <img src={p.img} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" onError={(e) => ((e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23333"><rect width="24" height="24"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23666" font-size="8">?</text></svg>')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-zinc-300 group-hover:text-white truncate">{p.name}</div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm font-mono font-black text-[#00FF00]">{p.price} ₽</span>
                      <span className="text-[9px] text-zinc-600">{p.stock} шт</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cart + payment */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#0A0A0B] border border-[#2A2A2C] p-4 space-y-3">
              <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-wider flex items-center gap-2"><ShoppingCart size={13} /> Корзина</h3>
              {cart.length === 0 ? (
                <p className="text-xs text-zinc-700 font-mono py-4 text-center">Пусто — выберите товары слева</p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
                  {cart.map((c) => (
                    <div key={c.product.id} className="flex items-center justify-between p-2 border border-[#2A2A2C]/50">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-zinc-300 truncate block">{c.product.name}</span>
                        <span className="text-[9px] text-zinc-600 font-mono">{c.product.price} ₽ × {c.qty}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => updateCartQty(c.product.id, -1)} className="w-6 h-6 border border-zinc-800 text-zinc-500 hover:text-white text-xs flex items-center justify-center">−</button>
                        <span className="text-xs font-mono text-white w-5 text-center">{c.qty}</span>
                        <button onClick={() => updateCartQty(c.product.id, 1)} className="w-6 h-6 border border-zinc-800 text-zinc-500 hover:text-white text-xs flex items-center justify-center">+</button>
                        <button onClick={() => removeFromCart(c.product.id)} className="w-6 h-6 text-red-500 hover:bg-red-500/10 text-xs flex items-center justify-center ml-1"><X size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-3 border-t border-[#2A2A2C] flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-zinc-500">Итого</span>
                <span className="text-xl font-mono font-black text-[#00FF00]">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-[#0A0A0B] border border-[#2A2A2C] p-4 space-y-4">
              <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Оплата</h3>
              <div className="flex gap-2">
                <button onClick={() => setPayMethod("cash")} className={cn("flex-1 py-2 border text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-all", payMethod === "cash" ? "border-[#00FF00]/50 bg-[#00FF00]/10 text-[#00FF00]" : "border-zinc-800 text-zinc-500 hover:text-white")}>
                  <Banknote size={13} /> Нал
                </button>
                <button onClick={() => setPayMethod("card")} className={cn("flex-1 py-2 border text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-all", payMethod === "card" ? "border-[#00FF00]/50 bg-[#00FF00]/10 text-[#00FF00]" : "border-zinc-800 text-zinc-500 hover:text-white")}>
                  <CreditCard size={13} /> Карта
                </button>
                <button onClick={() => setPayMethod("sbp")} className={cn("flex-1 py-2 border text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-all", payMethod === "sbp" ? "border-[#00FF00]/50 bg-[#00FF00]/10 text-[#00FF00]" : "border-zinc-800 text-zinc-500 hover:text-white")}>
                  <Smartphone size={13} /> СБП
                </button>
              </div>

              {payMethod === "cash" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-600 block">Получено от клиента</label>
                  <input value={cashGiven} onChange={(e) => setCashGiven(e.target.value)} type="number" placeholder="0" className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-lg font-mono text-white focus:border-[#00FF00]/50 outline-none" />
                  <div className="flex gap-2">
                    {[100, 200, 500, 1000, 2000, 5000].map((v) => (
                      <button key={v} onClick={() => setCashGiven(String(v))} className="flex-1 py-1.5 border border-zinc-800 text-[9px] font-mono text-zinc-500 hover:text-white transition-all">{v}</button>
                    ))}
                  </div>
                  {Number(cashGiven) > 0 && cartTotal > 0 && (
                    <div className={cn("p-3 border text-sm font-mono font-black", Number(cashGiven) >= cartTotal ? "border-[#00FF00]/20 bg-[#00FF00]/5 text-[#00FF00]" : "border-red-500/20 bg-red-500/5 text-red-500")}>
                      {Number(cashGiven) >= cartTotal ? `Сдача: ${formatCurrency(Number(cashGiven) - cartTotal)}` : `Не хватает: ${formatCurrency(cartTotal - Number(cashGiven))}`}
                    </div>
                  )}
                </div>
              )}

              {payMethod === "card" && (
                <div className="p-3 bg-blue-500/5 border border-blue-500/20">
                  <p className="text-[9px] text-zinc-500 font-mono">В будущем можно доработать, нужен договор с банком.</p>
                </div>
              )}

              {payMethod === "sbp" && (
                <div className="p-3 bg-purple-500/5 border border-purple-500/20">
                  <p className="text-[9px] text-zinc-500 font-mono">В будущем можно доработать, нужен договор с банком.</p>
                </div>
              )}

              <button onClick={completeSale} disabled={cart.length === 0} className={cn("w-full py-3.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2", cart.length > 0 ? "bg-[#00FF00] hover:bg-[#00EE00] text-black" : "bg-zinc-900 text-zinc-700 cursor-not-allowed")}>
                <Check size={14} /> Провести продажу
              </button>
            </div>

            {/* Recent sales */}
            {sales.length > 0 && (
              <div className="bg-[#0A0A0B] border border-[#2A2A2C] p-4 space-y-3">
                <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Последние продажи</h3>
                <div className="space-y-2 max-h-[150px] overflow-y-auto no-scrollbar">
                  {sales.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex justify-between items-center p-2 border border-[#2A2A2C]/50 text-[10px] font-mono">
                      <div>
                        <span className="text-zinc-400">{s.time}</span>
                        <span className="text-zinc-600 ml-2">{s.items.map((i) => `${i.name}×${i.qty}`).join(", ")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-600">{s.method}</span>
                        <span className="text-[#00FF00] font-black">{formatCurrency(s.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === PRODUCTS TAB === */}
      {tab === "products" && (
        <div className="bg-[#0A0A0B] border border-[#2A2A2C] overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead className="text-[9px] font-black text-zinc-600 uppercase tracking-wider border-b border-[#2A2A2C]">
                <tr><th className="px-4 py-3">Товар</th><th className="px-4 py-3">Категория</th><th className="px-4 py-3">Остаток</th><th className="px-4 py-3">Цена</th><th className="px-4 py-3 text-right">Действия</th></tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2C]/50 font-mono">
                {products.map((item) => (
                  <tr key={item.id} className="hover:bg-[#00FF00]/2 transition-colors group">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0"><img src={item.img} alt="" className="w-full h-full object-cover opacity-70" referrerPolicy="no-referrer" /></div><span className="text-xs font-bold text-zinc-200">{item.name}</span></div></td>
                    <td className="px-4 py-3"><span className="text-[9px] font-black border border-zinc-800 px-2 py-0.5 text-zinc-500 uppercase">{item.category}</span></td>
                    <td className="px-4 py-3"><span className={cn("text-[10px] font-black", item.stock === 0 ? "text-red-500" : item.stock < 15 ? "text-orange-500" : "text-[#00FF00]")}>{item.stock}</span></td>
                    <td className="px-4 py-3 text-xs font-black text-zinc-200">{item.price} ₽</td>
                    <td className="px-4 py-3 text-right"><div className="flex justify-end gap-1"><button onClick={() => { setEditing({ ...item }); setEditImageUrl(""); }} className="p-1.5 text-zinc-600 hover:text-white"><Edit3 size={12} /></button><button onClick={() => deleteProduct(item.id)} className="p-1.5 text-zinc-600 hover:text-red-500"><Trash2 size={12} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === ORDERS TAB === */}
      {tab === "orders" && (
        <div className="space-y-3">
          {orders.length === 0 && <p className="text-zinc-600 text-sm font-mono p-6 text-center">Нет заказов</p>}
          {orders.map((order) => (
            <div key={order.id} className={cn("bg-[#0A0A0B] border p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all", order.status === "done" ? "border-zinc-900 opacity-50" : "border-[#2A2A2C]")}>
              <div className="flex items-center gap-3">
                <div className={cn("w-9 h-9 border flex items-center justify-center", order.status === "pending" ? "border-orange-500/30 bg-orange-500/5" : "border-zinc-800")}>{order.status === "pending" ? <Bell size={14} className="text-orange-500" /> : <Check size={14} className="text-zinc-600" />}</div>
                <div><div className="text-xs font-black text-white">{order.item}</div><div className="text-[10px] font-mono text-zinc-500">{order.client} • {order.pc} • {order.time}</div></div>
              </div>
              {order.status === "pending" && <button onClick={() => completeOrder(order.id)} className="bg-[#00FF00] hover:bg-[#00EE00] text-black px-4 py-2 text-[10px] font-black uppercase transition-all flex items-center gap-1.5"><Check size={12} /> Выполнено</button>}
            </div>
          ))}
        </div>
      )}

      {/* === SUPPLY TAB === */}
      {tab === "supply" && (
        <div className="bg-[#0A0A0B] border border-[#2A2A2C] p-6 space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-wider">Принять поставку</h3>
            <button onClick={addSupplyRow} className="text-[10px] font-black uppercase text-[#00FF00] border border-[#00FF00]/30 px-3 py-1 hover:bg-[#00FF00]/10 transition-all">+ Добавить строку</button>
          </div>
          
          <div className="space-y-3">
            {supplyProducts.map((row, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
                  <select 
                    value={row.productId} 
                    onChange={(e) => updateSupplyRow(index, "productId", e.target.value)} 
                    className="w-full bg-black border border-[#2A2A2C] px-3 py-2.5 text-xs font-mono text-zinc-300 focus:border-[#00FF00]/50 outline-none"
                  >
                    <option value="">Выберите товар...</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stock} шт)</option>)}
                  </select>
                </div>
                <div className="col-span-4">
                  <input 
                    value={row.qty} 
                    onChange={(e) => updateSupplyRow(index, "qty", e.target.value)} 
                    type="number" min={1} placeholder="Кол-во" 
                    className="w-full bg-black border border-[#2A2A2C] px-3 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" 
                  />
                </div>
                <div className="col-span-2">
                  {supplyProducts.length > 1 && (
                    <button onClick={() => removeSupplyRow(index)} className="text-red-500 hover:text-red-400 text-xs p-2">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <button onClick={acceptSupply} className="bg-[#00FF00] hover:bg-[#00EE00] text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"><Package size={14} /> Принять поставку</button>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md bg-[#0A0A0B] border border-[#2A2A2C] p-6 space-y-5">
            <div className="flex justify-between"><h2 className="text-base font-black uppercase text-white">Новый товар</h2><button onClick={() => setShowAdd(false)} className="text-zinc-500 hover:text-white"><X size={18} /></button></div>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Название" className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none" />
              <div className="grid grid-cols-3 gap-2">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-black border border-[#2A2A2C] px-2 py-2.5 text-xs font-mono text-zinc-300 focus:border-[#00FF00]/50 outline-none"><option>Напитки</option><option>Снеки</option><option>Горячее</option><option>Железо</option></select>
                <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" placeholder="Цена" className="bg-black border border-[#2A2A2C] px-2 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" />
                <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} type="number" placeholder="Остаток" className="bg-black border border-[#2A2A2C] px-2 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">URL изображения (опционально)</label>
                <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" />
              </div>
            </div>
            <div className="flex gap-3"><button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-zinc-800 text-zinc-500 hover:text-white text-xs font-black uppercase transition-all">Отмена</button><button onClick={addProduct} className="flex-1 py-2.5 bg-[#00FF00] hover:bg-[#00EE00] text-black text-xs font-black uppercase transition-all">Добавить</button></div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-md bg-[#0A0A0B] border border-[#2A2A2C] p-6 space-y-5">
            <div className="flex justify-between"><h2 className="text-base font-black uppercase text-white">Редактирование</h2><button onClick={() => setEditing(null)} className="text-zinc-500 hover:text-white"><X size={18} /></button></div>
            <div className="space-y-3">
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-sm font-mono text-white focus:border-[#00FF00]/50 outline-none" />
              <div className="grid grid-cols-3 gap-2">
                <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="bg-black border border-[#2A2A2C] px-2 py-2.5 text-xs font-mono text-zinc-300 focus:border-[#00FF00]/50 outline-none"><option>Напитки</option><option>Снеки</option><option>Горячее</option><option>Железо</option></select>
                <input value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} type="number" className="bg-black border border-[#2A2A2C] px-2 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" />
                <input value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} type="number" className="bg-black border border-[#2A2A2C] px-2 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">URL изображения</label>
                <input value={editImageUrl || editing.img} onChange={(e) => setEditImageUrl(e.target.value)} placeholder="https://..." className="w-full bg-black border border-[#2A2A2C] px-4 py-2.5 text-xs font-mono text-white focus:border-[#00FF00]/50 outline-none" />
                {(editImageUrl || editing.img) && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={editImageUrl || editing.img} alt="" className="w-12 h-12 object-cover border border-zinc-800" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                    <span className="text-[9px] text-zinc-600">Превью</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3"><button onClick={() => setEditing(null)} className="flex-1 py-2.5 border border-zinc-800 text-zinc-500 hover:text-white text-xs font-black uppercase transition-all">Отмена</button><button onClick={saveEdit} className="flex-1 py-2.5 bg-[#00FF00] hover:bg-[#00EE00] text-black text-xs font-black uppercase transition-all">Сохранить</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
