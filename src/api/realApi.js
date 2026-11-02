// Real backend implementation of the API interface.
//
// Talks to the REST API over fetch() and to the native WebSocket server for
// realtime movement pushes. Both URLs come from Vite env vars (VITE_API_URL /
// VITE_WS_URL) and are empty by default, so no endpoint is hard-coded.
import { API_URL, WS_URL, DEVICE_ID, HEALTHCHECK_TIMEOUT_MS } from './config';

async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function getJson(path) {
  const res = await fetchWithTimeout(`${API_URL}${path}`);
  return res.json();
}

async function postJson(path, body) {
  const res = await fetchWithTimeout(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export const realApi = {
  mode: 'real',

  // Returns true only when the backend answers within the timeout window.
  async healthCheck() {
    if (!API_URL) return false;
    try {
      const res = await fetchWithTimeout(`${API_URL}/movimientos`, {}, HEALTHCHECK_TIMEOUT_MS);
      return res.ok;
    } catch {
      return false;
    }
  },

  getMovimientos: () => getJson('/movimientos'),
  getDemos: () => getJson('/demos'),
  getVelocidad: () => getJson('/velocidad'),
  getUltimoMovimiento: () => getJson('/ultimo_movimiento'),
  setVelocidad: (velocidad) => postJson('/velocidad', { velocidad: parseInt(velocidad, 10) }),
  enviarMovimiento: (movimiento) =>
    postJson('/enviar_movimiento', { movimiento, identificador: DEVICE_ID }),
  ejecutarDemo: (demoId, demoNombre) =>
    postJson('/ejecutar_demo', {
      demo_id: demoId,
      demo_nombre: demoNombre,
      identificador: DEVICE_ID,
    }),

  // Subscribes to realtime movements. `handler` receives the movement payload
  // ({ movimiento, mia_pwm, mda_pwm, mi_time }); `onStatus` receives the
  // WebSocket connection state. Returns an unsubscribe function.
  subscribe(handler, onStatus) {
    if (!WS_URL || typeof WebSocket === 'undefined') {
      if (onStatus) onStatus(false);
      return () => {};
    }

    let socket = null;
    let reconnectTimeout = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      try {
        socket = new WebSocket(WS_URL);
        socket.onopen = () => onStatus && onStatus(true);
        socket.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.success && parsed.data && parsed.data.movimiento) {
              handler(parsed.data);
            }
          } catch {
            // ignore malformed frames
          }
        };
        socket.onclose = () => {
          if (onStatus) onStatus(false);
          if (!closed) reconnectTimeout = setTimeout(connect, 60000);
        };
        socket.onerror = () => socket && socket.close();
      } catch {
        if (!closed) reconnectTimeout = setTimeout(connect, 60000);
      }
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  },
};
