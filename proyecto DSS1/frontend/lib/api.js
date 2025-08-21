// frontend/lib/api.js (versión corregida y simplificada)
import axios from "axios";

const isProd = process.env.NODE_ENV === "production";

/** ========= Base URL ========= **/
const RAW_ENV =
  process.env.NEXT_PUBLIC_API_URL || // recomendado
  process.env.NEXT_PUBLIC_API_BASE || // compatibilidad
  null;

// 🚨 En producción nunca caigas en localhost
if (isProd && !RAW_ENV) {
  throw new Error("❌ Falta NEXT_PUBLIC_API_URL en producción. Configúrala en Railway → Variables.");
}

// En dev se permite fallback a localhost
const RAW = RAW_ENV || "http://127.0.0.1:8000";

// normaliza: añade protocolo si falta y quita barras al final
const NORMALIZED = (/^https?:\/\//i.test(RAW) ? RAW : `https://${RAW}`).replace(/\/+$/, "");

// asegura que siempre termines en /api
export const BASE_URL = /\/api$/i.test(NORMALIZED) ? NORMALIZED : `${NORMALIZED}/api`;

// Debug visible en navegador
if (typeof window !== "undefined") {
  window.__BASE_URL__ = BASE_URL;
}

/** ========= Cliente Axios listo ========= **/
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

export default api;
