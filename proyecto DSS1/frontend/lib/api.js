// /frontend/lib/api.js
import axios from "axios";
import { getAccessToken, clearTokens } from "./tokens";

/** ========= Entorno ========= **/
const IS_PROD = process.env.NODE_ENV === "production";

/** ========= Base URL =========
 * Acepta:
 *  - NEXT_PUBLIC_API_URL (recomendado)
 *  - NEXT_PUBLIC_API_BASE (compat)
 * En producción exige una de las dos. En dev hace fallback a http://127.0.0.1:8000
 **/
const RAW_ENV =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  null;

if (IS_PROD && !RAW_ENV) {
  throw new Error(
    "❌ Falta NEXT_PUBLIC_API_URL en producción. Configúrala en Railway → Variables del servicio frontend."
  );
}

// En desarrollo puedes trabajar con el backend local
const RAW = RAW_ENV || "http://127.0.0.1:8000";

// Normaliza: agrega protocolo si falta y quita / al final
const WITH_PROTOCOL = /^https?:\/\//i.test(RAW) ? RAW : `https://${RAW}`;
const TRIMMED = WITH_PROTOCOL.replace(/\/+$/, "");

// Asegura terminar en /api SIN duplicarlo si ya viene
export const BASE_URL = /\/api$/i.test(TRIMMED) ? TRIMMED : `${TRIMMED}/api`;

// Debug útil en navegador
if (typeof window !== "undefined") {
  window.__BASE_URL__ = BASE_URL;
}

/** ========= Cliente Axios ========= **/
const api = axios.create({
  baseURL: BASE_URL, // ej: https://tu-backend.up.railway.app/api
  withCredentials: true, // cookies (csrftoken, session) si aplica
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/** ========= Interceptors ========= **/
// Adjunta Bearer <access_token> si existe
api.interceptors.request.use((config) => {
  const tk = getAccessToken?.();
  if (tk) config.headers.Authorization = `Bearer ${tk}`;
  return config;
});

// Manejo de 401: limpia tokens y (opcional) redirige a /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      try {
        clearTokens?.();
      } catch {}
      if (typeof window !== "undefined") {
        const isLogin = window.location.pathname.endsWith("/login");
        if (!isLogin) {
          // Descomenta si quieres redirección automática:
          // window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { api };
