// lib/attention-client.js
// Motor compacto de atención para usarlo desde cualquier pantalla (e.g. actividad/[id].jsx)
// Devuelve un score 0..1 por llamada (1 = 100%)

(function attachAttention() {
  if (typeof window === 'undefined' || window.Attention) return;

  const THRESH = { EAR: 0.20, MAR: 0.35, YAW: 20 };
  const dist = (a, b) => Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0));
  function calcEAR(lm) { const v=(dist(lm[386],lm[374])+dist(lm[385],lm[380]))/2; const h=dist(lm[263],lm[362])+1e-6; return v/h; }
  function calcMAR(lm) { const v=dist(lm[13],lm[14]); const h=dist(lm[78],lm[308])+1e-6; return v/h; }
  function calcYaw(lm) { const L=234,R=454,N=1; const midX=(lm[L].x+lm[R].x)/2; const off=(lm[N].x-midX)/(lm[R].x-lm[L].x+1e-6); return off*90*1.2; }

  function attentionScore01(ear, mar, yawAbs) {
    let score100 = 100;
    if (ear < THRESH.EAR) score100 -= 30;
    if (mar > THRESH.MAR) score100 -= 15;
    if (yawAbs > THRESH.YAW) score100 -= 25;
    const clamped = Math.max(0, Math.min(100, Math.round(score100)));
    return clamped / 100; // 0..1
  }

  let face = null;
  let ready = false;

  async function ensure() {
    if (ready) return true;
    // carga scripts MP solo 1 vez
    const load = (src, id) => new Promise((res, rej) => {
      if (document.getElementById(id)) return res();
      const s = document.createElement('script'); s.src = src; s.async = true; s.id = id; s.onload=res; s.onerror=rej; document.body.appendChild(s);
    });
    await load("https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js", "mp-face-mesh");
    await load("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js", "mp-camera-utils");

    face = new window.FaceMesh({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
    });
    face.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });
    ready = true;
    return true;
  }

  // Ejecuta UNA inferencia sobre el frame actual del <video> y regresa 0..1
  async function compute(videoEl) {
    try {
      await ensure();
      const results = await new Promise((resolve, reject) => {
        const onResults = (r) => { try { face.onResults(null); } catch {} resolve(r); };
        try { face.onResults(onResults); } catch {}
        face.send({ image: videoEl }).catch(reject);
        // salvaguarda timeout por si algo se queda colgado
        setTimeout(() => resolve({}), 2000);
      });

      const lm = results?.multiFaceLandmarks?.[0];
      if (!lm) return 0; // sin rostro => 0
      const ear = calcEAR(lm), mar = calcMAR(lm), yaw = Math.abs(calcYaw(lm));
      return attentionScore01(ear, mar, yaw);
    } catch {
      return 0;
    }
  }

  window.Attention = { ensure, compute };
})();
