import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Прокси `/api` → Django. 502 в браузере почти всегда значит: бэкенд недоступен по target.
 * Запуск: из `backend/` → `python manage.py runserver 127.0.0.1:8000`
 * Если API на другом хосте/порту — задайте в `cyberos/.env.development`:
 *   VITE_API_PROXY_TARGET=http://127.0.0.1:8000
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const target = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          configure(proxy) {
            proxy.on("error", (err) => {
              console.error(
                `[vite proxy] /api → ${target} : ${err.message}\n` +
                  "Убедитесь, что Django запущен (порт 8000) и MySQL доступен."
              );
            });
          },
        },
      },
    },
    preview: {
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
        },
      },
    },
  };
});
