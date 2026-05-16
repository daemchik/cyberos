const BASE = "/api";

function authHeaders(): Record<string, string> {
  const t = localStorage.getItem("cyberos_admin_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...(options?.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    if (res.status === 401 && !path.includes("/auth/login") && !path.includes("/player/login") && !path.includes("/player/register")) {
      localStorage.removeItem("cyberos_admin_token");
      window.dispatchEvent(new Event("cyberos:auth"));
    }
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  playerLogin: (phone: string, password: string) =>
    request<{ id: number; name: string; phone: string; balance: number; total_sessions: number }>(
      "/player/login",
      { method: "POST", body: JSON.stringify({ phone, password }) }
    ),

  playerRegister: (name: string, phone: string, password: string) =>
    request<{ id: number; name: string; phone: string; balance: number }>("/player/register", {
      method: "POST",
      body: JSON.stringify({ name, phone, password }),
    }),

  authLogin: (login: string, password: string) =>
    request<{ access_token: string; employee: { id: number; name: string; login: string; role: string } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ login, password }) }
    ),
  authMe: () => request<{ id: number; name: string; login: string; role: string }>("/auth/me"),

  getLive: () =>
    request<{
      workstations: any[];
      pending_orders: number;
      pending_order_rows?: any[];
      pending_admin_calls?: any[];
      active_sessions: any[];
    }>("/live"),

  downloadAnalyticsCsv: async (period: string) => {
    const res = await fetch(`${BASE}/stats/export.csv?period=${encodeURIComponent(period)}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Ошибка экспорта");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cyberos-analytics-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },



  sendWorkstationCommand: (workstationId: number, command: string) =>
    request<any>(`/workstations/${workstationId}/command`, {
      method: "POST",
      body: JSON.stringify({ command }),
    }),

  // Zones
  getZones: () => request<any[]>("/zones"),
  createZone: (data: { name: string; color?: string }) => request<any>("/zones", { method: "POST", body: JSON.stringify(data) }),
  deleteZone: (id: number) => request<any>(`/zones/${id}`, { method: "DELETE" }),

  // Workstations
  getWorkstations: () => request<any[]>("/workstations"),
  getWorkstationsByZone: (zoneId: number) => request<any[]>(`/workstations/zone/${zoneId}`),
  updateWorkstation: (id: number, data: any) => request<any>(`/workstations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  createWorkstation: (data: any) => request<any>("/workstations", { method: "POST", body: JSON.stringify(data) }),
  deleteWorkstation: (id: number) => request<any>(`/workstations/${id}`, { method: "DELETE" }),

  // Clients
  getClients: () => request<any[]>("/clients"),
  getClient: (id: number) => request<any>(`/clients/${id}`),
  createClient: (data: { name: string; phone: string; player_password?: string }) =>
    request<any>("/clients", { method: "POST", body: JSON.stringify(data) }),
  updateClient: (id: number, data: any) => request<any>(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteClient: (id: number) => request<any>(`/clients/${id}`, { method: "DELETE" }),
  searchClients: (query: string) => request<any[]>("/clients/search", { method: "POST", body: JSON.stringify({ query }) }),

  // Tariffs
  getTariffs: () => request<any[]>("/tariffs"),
  createTariff: (data: any) => request<any>("/tariffs", { method: "POST", body: JSON.stringify(data) }),
  updateTariff: (id: number, data: any) => request<any>(`/tariffs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTariff: (id: number) => request<any>(`/tariffs/${id}`, { method: "DELETE" }),

  // Sessions
  getSessions: () => request<any[]>("/sessions"),
  getActiveSessions: () => request<any[]>("/sessions/active"),
  createSession: (data: any) => request<any>("/sessions", { method: "POST", body: JSON.stringify(data) }),
  endSession: (id: number) => request<any>(`/sessions/${id}/end`, { method: "PUT" }),
  extendSession: (id: number, data: { additional_minutes: number }) =>
    request<any>(`/sessions/${id}/extend`, { method: "PUT", body: JSON.stringify(data) }),
  pauseSession: (id: number) => request<any>(`/sessions/${id}/pause`, { method: "PUT" }),
  resumeSession: (id: number) => request<any>(`/sessions/${id}/resume`, { method: "PUT" }),

  // Products
  getProducts: () => request<any[]>("/products"),
  createProduct: (data: any) => request<any>("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: number, data: any) => request<any>(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id: number) => request<any>(`/products/${id}`, { method: "DELETE" }),

  // Sales
  getSales: () => request<any[]>("/sales"),
  createSale: (data: any) => request<any>("/sales", { method: "POST", body: JSON.stringify(data) }),

  // Promos
  getPromos: () => request<any[]>("/promos"),
  createPromo: (data: any) => request<any>("/promos", { method: "POST", body: JSON.stringify(data) }),
  updatePromo: (id: number, data: any) => request<any>(`/promos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePromo: (id: number) => request<any>(`/promos/${id}`, { method: "DELETE" }),
  applyPromo: (code: string, clientId: number) => request<any>("/promos/apply", { method: "POST", body: JSON.stringify({ code, client_id: clientId }) }),



  // Tasks
  getTasks: () => request<any[]>("/tasks"),
  createTask: (data: { text: string; priority?: string; creator?: string }) => request<any>("/tasks", { method: "POST", body: JSON.stringify(data) }),
  completeTask: (id: number) => request<any>(`/tasks/${id}/complete`, { method: "PUT" }),
  reopenTask: (id: number) => request<any>(`/tasks/${id}/reopen`, { method: "PUT" }),
  updateTask: (id: number, data: { text?: string; priority?: string }) =>
    request<any>(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTask: (id: number) => request<any>(`/tasks/${id}`, { method: "DELETE" }),

  // Settings
  getSettings: () => request<Record<string, string>>("/settings"),
  updateSettings: (data: Record<string, string>) => request<any>("/settings", { method: "PUT", body: JSON.stringify(data) }),

  // Health
  health: () => request<{ status: string; service: string }>("/health"),
  getSystemDiagnostics: () =>
    request<{
      database: string;
      workstations: number;
      active_sessions: number;
      mysql_version?: string;
      server_time_utc?: string;
      error?: string;
    }>("/system/diagnostics"),

  // Stats
  getDashboardStats: () => request<any>("/stats/dashboard"),
  getAnalytics: (period: string) => request<any>(`/stats/analytics?period=${period}`),

  getNotifications: () => request<any[]>("/notifications"),
  markNotificationsRead: (ids?: number[]) =>
    request<{ ok: boolean }>("/notifications/read", {
      method: "PUT",
      body: JSON.stringify(ids && ids.length ? { ids } : {}),
    }),

  // Orders (player)
  getOrders: () => request<any[]>("/orders"),
  createOrder: (data: any) => request<any>("/orders", { method: "POST", body: JSON.stringify(data) }),
  completeOrder: (id: number) => request<any>(`/orders/${id}/complete`, { method: "PUT" }),
};
