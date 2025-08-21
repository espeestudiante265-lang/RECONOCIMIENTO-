// pages/dashboard/estudiante/monitor.jsx
"use client";
import { useEffect, useRef, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import { MENU } from "../../../config/menu";
import { useAuthGuard } from "../../../lib/auth";
import api, { getAccessToken } from "../../../lib/api";

// Endpoints (ajusta si tus rutas difieren)
const EP = {
  start: "/api/attendance/start/",   // opcional
  stop:  "/api/attendance/stop/",    // envía promedio final
  bulk:  "/api/attendance/sample/",  // opcional: muestras individuales
};

/* =========================
   Parámetros / utilidades
========================= */
const dist = (a, b) => Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0));

// Umbrales base
const THRESH = {
  EAR: 0.20,  // ojos cerrados
  MAR: 0.35,  // boca abierta
  YAW: 20,    // grados
};

// Penalizaciones y ventana temporal
const TUNING = {
  SAMPLE_MS: 1000,       // cada cuánto consolidamos una muestra (≈1/s)
  ABSENT_SOFT_MS: 1000,  // >1s sin rostro => penalización media
  ABSENT_HARD_MS: 3000,  // >3s sin rostro => penalización fuerte
  EMA_ALPHA: 0.35,       // suavizado exponencial del score visual
  // Resolución interna del canvas/video (render); el tamaño visible se controla por CSS
  CAM_W: 480,
  CAM_H: 360,
};

// Ajuste por tiempo de sesión (ligero, no invasivo).
// Objetivo: no castigar demasiado sesiones largas y ser un poco más estricto en sesiones muy cortas.
function timeWeightFactor(sessionMs) {
  const minShort = 5 * 60 * 1000;    // 5 min
  const target   = 20 * 60 * 1000;   // 20 min
  const d = sessionMs;

  if (d <= minShort) return 0.95;                 // cortas: -5%
  if (d < target) {                               // 5..20min: 0.98 → 1.05
    const t = (d - minShort) / (target - minShort);
    return 0.98 + 0.07 * t;
  }
  return 1.05;                                    // largas: +5% (cap)
}

// ========================= Métricas básicas =========================
function calcEAR(lm) {
  // Ojo derecho: vertical (386-374 y 385-380)/2, horizontal (263-362)
  const v = (dist(lm[386], lm[374]) + dist(lm[385], lm[380])) / 2;
  const h = dist(lm[263], lm[362]) + 1e-6;
  return v / h;
}
function calcMAR(lm) {
  const v = dist(lm[13], lm[14]);
  const h = dist(lm[78], lm[308]) + 1e-6;
  return v / h;
}
function calcYaw(lm) {
  const L = 234, R = 454, N = 1;
  const midX = (lm[L].x + lm[R].x) / 2;
  const off = (lm[N].x - midX) / (lm[R].x - lm[L].x + 1e-6);
  return off * 90 * 1.2; // grados aprox
}

// Score 0..100 con reglas simples
function attentionScore(ear, mar, yawAbs) {
  let score = 100;
  if (ear < THRESH.EAR) score -= 30;      // ojos cerrados
  if (mar > THRESH.MAR) score -= 15;      // boca abierta
  if (yawAbs > THRESH.YAW) score -= 25;   // mirada desviada
  return Math.max(0, Math.min(100, Math.round(score)));
}

export default function Monitor() {
  const { ready, logout } = useAuthGuard(["estudiante"]);

  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const cameraRef  = useRef(null);   // window.Camera
  const faceRef    = useRef(null);   // window.FaceMesh
  const startedRef = useRef(false);  // evita doble start

  // Estado UI
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState("Listo");
  const [score, setScore]     = useState(0);   // score visible (EMA)
  const [avg, setAvg]         = useState(0);   // promedio acumulado 0..100
  const [attnPct, setAttnPct] = useState(0);   // % de muestras con buena atención

  // Acumuladores / refs
  const samplesRef      = useRef([]);    // muestras 0..100 (incluye "absent")
  const totalRef        = useRef(0);     // total muestras consolidadas
  const attentiveRef    = useRef(0);     // muestras con score >= 80
  const lastFaceTsRef   = useRef(0);     // timestamp ms de última detección con rostro
  const emaScoreRef     = useRef(80);    // suavizado del score (arranque neutro)
  const tickerRef       = useRef(null);  // setInterval handle
  const startTsRef      = useRef(0);     // inicio de sesión (ms)

  // --- Carga segura de scripts por CDN (sin duplicar) ---
  async function ensureMediapipeScripts() {
    if (typeof window === "undefined") return;
    if (window.__faceMeshCdnLoaded) return;
    if (document.getElementById("mp-face_mesh")) return;

    const load = (src, id) =>
      new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        if (id) s.id = id;
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });

    await load("https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js", "mp-face_mesh");
    await load("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js", "mp-camera_utils");
    window.__faceMeshCdnLoaded = true;
  }

  // --- Dibujo de overlays de guía ---
  function drawOverlays(lm) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    if (!lm) return;

    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth   = 2;

    const line = (a, b) => {
      ctx.beginPath();
      ctx.moveTo(lm[a].x * W, lm[a].y * H);
      ctx.lineTo(lm[b].x * W, lm[b].y * H);
      ctx.stroke();
    };

    // Líneas guía mínimas
    line(386, 374); line(385, 380); line(263, 362);
    line(13, 14);   line(78, 308);
    line(33, 263);
  }

  // --- Consolida una muestra (rostro o ausencia) ---
  async function pushSample(value, meta = {}) {
    samplesRef.current.push(value);
    totalRef.current += 1;
    if (value >= 80) attentiveRef.current += 1;

    // promedio acumulado y % atención visibles
    const newAvg = Math.round(
      samplesRef.current.reduce((a, b) => a + b, 0) / samplesRef.current.length
    );
    setAvg(newAvg);
    setAttnPct(Math.round((100 * attentiveRef.current) / Math.max(1, totalRef.current)));

    // (opcional) enviar
    if (getAccessToken()) {
      try {
        await api.post(EP.bulk, {
          score: value,
          absent: !!meta.absent,
          reason: meta.reason || null,
        });
      } catch { /* silencioso */ }
    }
  }

  // --- Iniciar monitoreo ---
  async function startMonitor() {
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      setLoading(true);
      setStatus("Cargando modelo…");

      // 1) Scripts
      await ensureMediapipeScripts();

      // 2) Instancia FaceMesh
      faceRef.current = new window.FaceMesh({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
      });
      faceRef.current.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });

      // 3) Callback de resultados
      faceRef.current.onResults(async (results) => {
        const lm = results.multiFaceLandmarks?.[0];

        if (lm) {
          lastFaceTsRef.current = Date.now();

          const ear = calcEAR(lm);
          const mar = calcMAR(lm);
          const yaw = calcYaw(lm);

          const raw = attentionScore(ear, mar, Math.abs(yaw));
          // EMA para un score visual más estable
          emaScoreRef.current = TUNING.EMA_ALPHA * raw + (1 - TUNING.EMA_ALPHA) * emaScoreRef.current;
          setScore(Math.round(emaScoreRef.current));

          setStatus(raw >= 80 ? "Atento" : raw >= 60 ? "Atención media" : "Baja atención");

          drawOverlays(lm);
        } else {
          // no hay rostro en este frame (lo consolidará el ticker)
          setStatus("Rostro no detectado…");
          drawOverlays(null);
        }
      });

      // 4) Cámara + loop (resolución interna fija; tamaño visible por CSS)
      setStatus("Solicitando cámara…");
      cameraRef.current = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (faceRef.current) {
            await faceRef.current.send({ image: videoRef.current });
          }
        },
        width: TUNING.CAM_W,
        height: TUNING.CAM_H,
      });

      await cameraRef.current.start();
      await videoRef.current.play();

      // Ajusta resolución interna del canvas
      if (videoRef.current && canvasRef.current) {
        canvasRef.current.width  = TUNING.CAM_W;
        canvasRef.current.height = TUNING.CAM_H;
      }

      // 5) Avisar inicio (opcional)
      try { await api.post(EP.start, {}); } catch {}

      // 6) Ticker 1s: consolida una muestra (rostro o ausencia)
      lastFaceTsRef.current = Date.now();
      startTsRef.current = lastFaceTsRef.current;
      emaScoreRef.current = 80; // arranque neutro
      tickerRef.current = setInterval(async () => {
        const now = Date.now();
        const since = now - lastFaceTsRef.current;

        if (document.hidden) {
          // pestaña oculta => tratar como ausencia fuerte
          const p = 0;
          await pushSample(p, { absent: true, reason: "tab_hidden" });
          setStatus("Pestaña en segundo plano (penaliza)");
          setScore(p);
          return;
        }

        if (since > TUNING.ABSENT_SOFT_MS) {
          // ausencia temporal o prolongada
          const p = since >= TUNING.ABSENT_HARD_MS ? 0 : 40;
          await pushSample(p, { absent: true, reason: "no_face" });
          setStatus(since >= TUNING.ABSENT_HARD_MS ? "Ausencia prolongada" : "Rostro no detectado");
          setScore(p);
        } else {
          // usamos el EMA actual como muestra consolidada
          const s = Math.round(emaScoreRef.current);
          await pushSample(s, { absent: false });
        }
      }, TUNING.SAMPLE_MS);

      setLoading(false);
      setRunning(true);
      setStatus("Iniciado");
    } catch (e) {
      console.error(e);
      setStatus("No se pudo iniciar la cámara o el modelo");
      setLoading(false);
      startedRef.current = false;
    }
  }

  // --- Detener monitoreo ---
  async function stopMonitor() {
    setRunning(false);
    setStatus("Finalizando…");

    // ticker
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }

    // detener camera_utils
    try { cameraRef.current?.stop?.(); } catch {}
    cameraRef.current = null;

    // cortar tracks
    try {
      const src = videoRef.current?.srcObject;
      src?.getTracks?.().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch {}

    // limpiar canvas
    try {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    } catch {}

    // promedio final y ajuste por tiempo
    const arr = samplesRef.current;
    const avg100 = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0; // 0..100
    const average_score = Math.max(0, Math.min(1, avg100 / 100)); // 0..1

    const sessionMs = Math.max(0, Date.now() - (startTsRef.current || Date.now()));
    const factor = timeWeightFactor(sessionMs);
    const timeAdjustedAvg = Math.max(0, Math.min(100, Math.round(avg100 * factor)));

    try {
      await api.post(EP.stop, {
        average_score,              // 0..1
        average_score_100: avg100,  // 0..100 (sin ajuste)
        time_adjusted_avg: timeAdjustedAvg, // 0..100 (ajustado por tiempo)
        attentive_pct: attnPct,     // % atento durante la sesión
        total_samples: totalRef.current,
        session_ms: sessionMs,
      });
    } catch (e) {
      console.warn("No se pudo notificar el promedio:", e?.response?.data || e.message);
    }

    // reset acumuladores
    samplesRef.current = [];
    totalRef.current = 0;
    attentiveRef.current = 0;
    emaScoreRef.current = 80;
    lastFaceTsRef.current = 0;
    startedRef.current = false;
    startTsRef.current = 0;

    setStatus(`Finalizado (promedio: ${timeAdjustedAvg})`);
  }

  // cleanup al desmontar
  useEffect(() => () => { try { stopMonitor(); } catch {} }, []);
  if (!ready) return null;

  return (
    <DashboardLayout title="Monitoreo" menu={MENU.estudiante} onLogout={logout}>
      <div className="min-h-[70vh] w-full flex flex-col items-center">
        {/* Contenedor más compacto */}
        <div className="w-full max-w-2xl bg-[#1a2235] border border-[#22345c] rounded-2xl shadow-xl p-5">
          <div className="w-full flex flex-col items-center gap-4">
            {/* Cuadro centrado y “cuadrado” */}
            <div className="w-full flex justify-center">
              <div
                className="relative shadow rounded-2xl overflow-hidden border-4 border-[#38bdf8] bg-black flex items-center justify-center"
                style={{
                  width: "100%",
                  maxWidth: "480px",
                  aspectRatio: "4 / 3",     // mantiene proporción 4:3
                }}
              >
                <video
                  ref={videoRef}
                  width={TUNING.CAM_W}
                  height={TUNING.CAM_H}
                  autoPlay
                  muted
                  className="rounded-2xl w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  width={TUNING.CAM_W}
                  height={TUNING.CAM_H}
                  className="absolute top-0 left-0 w-full h-full"
                />
              </div>
            </div>

            {/* Info inferior compacta */}
            <div className="text-sm text-white/80 flex flex-col items-center gap-1">
              <div>Estado: <b>{status}</b></div>
              <div>Score actual: <b>{score}</b></div>
              <div>Promedio acumulado: <b>{avg}</b> · Atención sostenida: <b>{attnPct}%</b></div>
              {loading && <span className="text-yellow-300">Cargando modelo…</span>}
            </div>

            {/* Botones */}
            <div className="flex gap-2">
              {!running ? (
                <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={startMonitor}>
                  Iniciar monitoreo
                </button>
              ) : (
                <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={stopMonitor}>
                  Detener monitoreo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
