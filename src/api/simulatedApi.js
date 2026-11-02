// Simulated (in-browser) implementation of the API interface.
//
// It replicates the behaviour of the original Flask + MySQL backend entirely
// in the browser: the 11 movements with their real PWM/timings, the global
// speed (0-255), the DEMO sequences with their real delays, and an in-memory
// event log persisted to sessionStorage. No hardware is involved.
import { EVENT_STORAGE_KEY } from './config';
import {
  MOVIMIENTOS,
  DEMO_SECUENCIAS,
  getMovimientoById,
  getMovimientoByName,
  buildCommand,
} from './simulatedData';

const MAX_EVENTS = 50;
const STOP_ID = 3; // "Detener"

let velocidad = 255;
let events = loadEvents();
let lastMovement = events.length > 0 ? events[0] : null;
const subscribers = new Set();
const timers = new Set();

function loadEvents() {
  try {
    const raw = sessionStorage.getItem(EVENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistEvents() {
  try {
    sessionStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {
    // sessionStorage may be unavailable (private mode); ignore.
  }
}

// Record an executed command, persist it and notify subscribers.
function record(cmd) {
  const now = new Date();
  const event = {
    id: `${now.getTime()}-${cmd.movimiento}-${Math.random().toString(16).slice(2, 6)}`,
    name: cmd.movimiento,
    pwm: cmd.mia_pwm,
    date: now.toLocaleString(),
    timestamp: now.toISOString(),
  };
  events = [event, ...events].slice(0, MAX_EVENTS);
  lastMovement = event;
  persistEvents();
  subscribers.forEach((handler) => {
    try {
      handler(cmd);
    } catch {
      // a subscriber failing must not break the simulation
    }
  });
  return event;
}

function schedule(fn, ms) {
  const id = setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.add(id);
  return id;
}

export const simulatedApi = {
  mode: 'simulated',

  async healthCheck() {
    // The simulated backend is always available.
    return true;
  },

  async getMovimientos() {
    return {
      success: true,
      data: MOVIMIENTOS.map((m) => ({
        id_movimiento: m.id_movimiento,
        nombre_movimiento: m.nombre_movimiento,
        mia_pwm: m.mia_pwm,
      })),
    };
  },

  async getDemos() {
    return {
      success: true,
      data: DEMO_SECUENCIAS.map((d) => ({
        id_secuencia: d.id_secuencia,
        nombre_secuencia: d.nombre_secuencia,
        descripcion: d.descripcion,
        total_movimientos: d.movimientos.length,
      })),
    };
  },

  async getVelocidad() {
    return { success: true, velocidad };
  },

  async setVelocidad(nueva) {
    velocidad = Math.max(0, Math.min(255, parseInt(nueva, 10) || 0));
    return { success: true, velocidad };
  },

  async getUltimoMovimiento() {
    if (!lastMovement) return { success: true, data: null };
    const mov = getMovimientoByName(lastMovement.name);
    const cmd = buildCommand(mov ? mov.id_movimiento : STOP_ID, velocidad);
    return {
      success: true,
      data: {
        nombre_movimiento: lastMovement.name,
        mia_pwm: lastMovement.pwm,
        mda_pwm: cmd ? cmd.mda_pwm : 0,
        mi_time: cmd ? cmd.mi_time : 0,
        fecha_hora: lastMovement.timestamp,
      },
    };
  },

  async enviarMovimiento(movimiento) {
    const mov = getMovimientoByName(movimiento);
    if (!mov) return { success: false, error: 'Movimiento no encontrado' };
    record(buildCommand(mov.id_movimiento, velocidad));
    return { success: true, message: `Movimiento ${movimiento} enviado (simulado)` };
  },

  // Replays a DEMO sequence with the same delays the Flask backend used:
  // for each movement wait (mi_time + 150) ms and then inject an explicit
  // "Detener" to cancel the hardware's infinite inertia.
  async ejecutarDemo(demoId) {
    const demo = DEMO_SECUENCIAS.find((d) => d.id_secuencia === demoId);
    if (!demo || demo.movimientos.length === 0) {
      return { success: false, error: 'La demo no tiene movimientos' };
    }

    let delay = 0;
    demo.movimientos.forEach((idMov) => {
      const cmd = buildCommand(idMov, velocidad);
      if (!cmd) return;
      schedule(() => record(cmd), delay);
      const pausa = cmd.mi_time + 150;
      schedule(() => record(buildCommand(STOP_ID, velocidad)), delay + pausa);
      delay += pausa + 100; // stabilization pause before the next movement
    });

    return {
      success: true,
      message: `Demo iniciada con ${demo.movimientos.length} movimientos (simulada)`,
    };
  },

  subscribe(handler) {
    subscribers.add(handler);
    return () => subscribers.delete(handler);
  },

  // Cancel all pending scheduled movements (used on unmount).
  clear() {
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
  },
};

// Exposed for potential debugging in the browser console.
export const _simulatedState = {
  get speed() {
    return velocidad;
  },
  get lastMovementId() {
    return lastMovement ? lastMovement.id : null;
  },
  reset() {
    simulatedApi.clear();
    events = [];
    lastMovement = null;
    velocidad = 255;
    persistEvents();
  },
};

export { getMovimientoById };
