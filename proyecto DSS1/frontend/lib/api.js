// frontend/lib/api.js
import axios from "axios";

/** ========= Config base ========= **/
const RAW =
  process.env.NEXT_PUBLIC_API_URL || // <- usa esta en Railway
  process.env.NEXT_PUBLIC_API_BASE || // (compat con tu nombre anterior)
  "http://127.0.0.1:8000";            // fallback local

// normaliza: quita barras al final
const NORMALIZED = /^https?:\/\//i.test(RAW) ? RAW.replace(/\/+$/, "") : "http://127.0.0.1:8000";

// si no incluiste /api en la env, te lo agrego
const BASE_URL = NORMALIZED.match(/\/api$/i) ? NORMALIZED : `${NORMALIZED}/api`;

// Si en algún momento usas cookies/sesiones, puedes activar esto por env (1/true)
const WITH_CREDENTIALS =
  String(process.env.NEXT_PUBLIC_WITH_CREDENTIALS || "").toLowerCase() === "true" ||
  process.env.NEXT_PUBLIC_WITH_CREDENTIALS === "1";

/** ========= Helpers de tokens (solo en cliente) ========= **/
const isBrowser = () => typeof window !== "undefined";

export function getAccessToken() {
  if (!isBrowser()) return null;
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("token") ||
    null
  );
}

export function getRefreshToken() {
  if (!isBrowser()) return null;
  return localStorage.getItem("refresh") || null;
}

export function setTokens({ access, refresh }) {
  if (!isBrowser()) return;
  if (access) localStorage.setItem("access", access);
  if (refresh) localStorage.setItem("refresh", refresh);
}

export function clearTokens() {
  if (!isBrowser()) return;
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("token");
}

/** ========= Cliente Axios ========= **/
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: WITH_CREDENTIALS, // útil si usas cookies/CSRF; con JWT puro puedes dejarlo en false
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

// Adjunta Authorization: Bearer <access> en cliente
api.interceptors.request.use((config) => {
  // En SSR no hay localStorage: no añadas token
  if (!isBrowser()) return config;

  const tk = getAccessToken();
  if (tk) config.headers.Authorization = `Bearer ${tk}`;
  return config;
});

/** ========= Refresh automático (opcional) ========= **/
let isRefreshing = false;
let pendingQueue = [];

function processQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const status = err?.response?.status;
    const original = err.config;

    // Si es 401, intentamos refresh UNA vez
    if (status === 401 && isBrowser() && !original?._retry) {
      const refresh = getRefreshToken();
      if (!refresh) {
        // Sin refresh: limpiar y redirigir a /login si no estás ya allí
        clearTokens();
        if (!/\/login$/.test(location.pathname)) location.href = "/login";
        return Promise.reject(err);
      }

      original._retry = true;

      if (isRefreshing) {
        // Espera a que termine el refresh en curso
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (newAccess) => {
              original.headers.Authorization = `Bearer ${newAccess}`;
              resolve(api(original));
            },
            reject,
          });
        });
      }

      try {
        isRefreshing = true;
        // Ajusta esta ruta a tu endpoint real de refresh
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
        const newAccess = data?.access || data?.access_token;
        if (!newAccess) throw new Error("No access token in refresh response");

        setTokens({ access: newAccess });
        processQueue(null, newAccess);

        // reintenta la petición original con el nuevo access
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (e) {
        processQueue(e, null);
        clearTokens();
        if (!/\/login$/.test(location.pathname)) location.href = "/login";
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    // Para otros errores, registra y propaga
    console.error("API ERROR", status, err?.response?.data || err.message);
    return Promise.reject(err);
  }
);

export { BASE_URL };
export default api;
