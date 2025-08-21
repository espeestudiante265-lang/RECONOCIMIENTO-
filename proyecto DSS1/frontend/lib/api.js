// frontend/lib/api.js
import axios from "axios";

/** ========= Entorno ========= **/
const isBrowser = () => typeof window !== "undefined";
const isProd = process.env.NODE_ENV === "production";

/** ========= Base URL (sin localhost en prod) ========= **/
const RAW_ENV =
  process.env.NEXT_PUBLIC_API_URL || // recomendado
  process.env.NEXT_PUBLIC_API_BASE || // compat previo
  null;

// En producción nunca permitas fallback a localhost
if (isProd && !RAW_ENV) {
  // Evita que Axios use 127.0.0.1 en producción silenciosamente
  throw new Error(
    "Falta NEXT_PUBLIC_API_URL en producción. Configúrala en Railway → Variables (frontend)."
  );
}

// En desarrollo puedes usar localhost si no hay env
const RAW = RAW_ENV || "http://127.0.0.1:8000";

// normaliza: quita barras al final y garantiza que tenga http/https
const hasProtocol = /^https?:\/\//i.test(RAW);
const NORMALIZED = (hasProtocol ? RAW : `https://${RAW}`).replace(/\/+$/, "");

// Si la env ya termina en /api no lo añadas, si no, agrégalo
const BASE_URL = /\/api$/i.test(NORMALIZED) ? NORMALIZED : `${NORMALIZED}/api`;

/** ========= Cookies/CSRF opcionales ========= **/
const WITH_CREDENTIALS =
  String(process.env.NEXT_PUBLIC_WITH_CREDENTIALS || "")
    .trim()
    .toLowerCase() === "true" ||
  process.env.NEXT_PUBLIC_WITH_CREDENTIALS === "1";

/** ========= Tokens en localStorage ========= **/
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
  withCredentials: WITH_CREDENTIALS, // si usas cookies/CSRF
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

// Adjunta Authorization: Bearer <access> (solo en cliente)
api.interceptors.request.use((config) => {
  if (!isBrowser()) return config;
  // No sobreescribas si ya viene seteado
  if (!config.headers?.Authorization) {
    const tk = getAccessToken();
    if (tk) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${tk}`;
    }
  }
  return config;
});

/** ========= Refresh automático (ajusta endpoint) ========= **/
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

    // Solo intentamos refresh una vez y solo en cliente
    if (status === 401 && isBrowser() && !original?._retry) {
      const refresh = getRefreshToken();
      if (!refresh) {
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
              original.headers = original.headers || {};
              original.headers.Authorization = `Bearer ${newAccess}`;
              resolve(api(original));
            },
            reject,
          });
        });
      }

      try {
        isRefreshing = true;

        // ⚠️ AJUSTA ESTA RUTA al endpoint real de tu backend:
        // - DRF SimpleJWT por defecto: /api/auth/jwt/refresh/
        // - Tu proyecto anterior: /api/auth/refresh/
        const refreshUrl = `${BASE_URL}/auth/jwt/refresh/`;
        const { data } = await axios.post(
          refreshUrl,
          { refresh },
          { headers: { "Content-Type": "application/json" }, withCredentials: WITH_CREDENTIALS }
        );

        const newAccess = data?.access || data?.access_token;
        if (!newAccess) throw new Error("No access token in refresh response");

        setTokens({ access: newAccess });
        processQueue(null, newAccess);

        // reintenta la petición original con el nuevo access
        original.headers = original.headers || {};
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

    // Otros errores
    console.error("API ERROR", status, err?.response?.data || err.message);
    return Promise.reject(err);
  }
);

export { BASE_URL };
export default api;
