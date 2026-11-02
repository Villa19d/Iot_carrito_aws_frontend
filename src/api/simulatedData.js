// Static catalogue of movements and demo sequences used by the simulated
// (in-browser) backend.
//
// The values mirror the production MySQL data found in the repository:
//   - Carrito_backend/SQL_Scripts/esquema_bd_y_sp.sql  (schema + stored procs)
//   - Carrito_backend/Respaldo RDS/respaldo_limpio.sql  (seeded rows)
// They are only consumed when the app runs without a real backend.

// Each movement carries the state/PWM/duration of both motors (A = left,
// B = right). Straight movements keep mi_time = 0 (infinite on hardware);
// turns have a fixed duration.
export const MOVIMIENTOS = [
  { id_movimiento: 1, nombre_movimiento: 'Adelante', mia_estado: 'LOW', mia_pwm: 255, mi_time: 0, mda_estado: 'LOW', mda_pwm: 255, md_time: 0 },
  { id_movimiento: 2, nombre_movimiento: 'Atrás', mia_estado: 'LOW', mia_pwm: 255, mi_time: 0, mda_estado: 'LOW', mda_pwm: 255, md_time: 0 },
  { id_movimiento: 3, nombre_movimiento: 'Detener', mia_estado: 'LOW', mia_pwm: 0, mi_time: 0, mda_estado: 'LOW', mda_pwm: 0, md_time: 0 },
  { id_movimiento: 4, nombre_movimiento: 'Vuelta adelante derecha', mia_estado: 'LOW', mia_pwm: 200, mi_time: 500, mda_estado: 'LOW', mda_pwm: 255, md_time: 500 },
  { id_movimiento: 5, nombre_movimiento: 'Vuelta adelante izquierda', mia_estado: 'LOW', mia_pwm: 255, mi_time: 500, mda_estado: 'LOW', mda_pwm: 200, md_time: 500 },
  { id_movimiento: 6, nombre_movimiento: 'Vuelta atrás derecha', mia_estado: 'LOW', mia_pwm: 200, mi_time: 500, mda_estado: 'LOW', mda_pwm: 255, md_time: 500 },
  { id_movimiento: 7, nombre_movimiento: 'Vuelta atrás izquierda', mia_estado: 'LOW', mia_pwm: 255, mi_time: 500, mda_estado: 'LOW', mda_pwm: 200, md_time: 500 },
  { id_movimiento: 8, nombre_movimiento: 'Giro 90° derecha', mia_estado: 'LOW', mia_pwm: 255, mi_time: 500, mda_estado: 'LOW', mda_pwm: 255, md_time: 500 },
  { id_movimiento: 9, nombre_movimiento: 'Giro 90° izquierda', mia_estado: 'LOW', mia_pwm: 255, mi_time: 500, mda_estado: 'LOW', mda_pwm: 255, md_time: 500 },
  { id_movimiento: 10, nombre_movimiento: 'Giro 360° derecha', mia_estado: 'LOW', mia_pwm: 255, mi_time: 2000, mda_estado: 'LOW', mda_pwm: 255, md_time: 2000 },
  { id_movimiento: 11, nombre_movimiento: 'Giro 360° izquierda', mia_estado: 'LOW', mia_pwm: 255, mi_time: 2000, mda_estado: 'LOW', mda_pwm: 255, md_time: 2000 },
];

// Fixed-angle turns ignore the global speed (mirrors backend
// MOVIMIENTOS_VELOCIDAD_FIJA).
export const MOVIMIENTOS_VELOCIDAD_FIJA = new Set([8, 9, 10, 11]);

// Durations that override the stored mi_time (mirrors backend
// TIEMPOS_ESPECIALES): Adelante is shortened to 500 ms for choreography and
// 90° turns take 600 ms.
export const TIEMPOS_ESPECIALES = { 1: 500, 8: 600, 9: 600, 10: 2000, 11: 2000 };

// Demo sequences: id_movimiento order per secuencia (from the RDS report).
// "Demo Final" (id 7) has no movements and is filtered out by the UI anyway.
export const DEMO_SECUENCIAS = [
  { id_secuencia: 1, nombre_secuencia: 'Zig Zag', descripcion: 'Secuencia para esquivar obstáculos', movimientos: [1, 8, 1, 9, 1] },
  { id_secuencia: 3, nombre_secuencia: 'Cuadrado', descripcion: 'Recorrido de un cuadrado', movimientos: [1, 4, 1, 4, 1, 4, 1, 4] },
  { id_secuencia: 4, nombre_secuencia: 'Estacionar', descripcion: 'Maniobra para estacionar', movimientos: [1, 3, 2, 3] },
  { id_secuencia: 5, nombre_secuencia: 'Giro en U', descripcion: 'Giro de 180 grados', movimientos: [4, 4] },
  { id_secuencia: 6, nombre_secuencia: 'Baile', descripcion: 'Secuencia divertida', movimientos: [1, 2, 5, 1, 4, 2, 3] },
  { id_secuencia: 7, nombre_secuencia: 'Demo Final', descripcion: 'Prueba de funcionamiento', movimientos: [] },
  { id_secuencia: 9, nombre_secuencia: 'Testing', descripcion: 'Secuencia para esquivar obstáculos', movimientos: [1, 4, 1, 5, 1] },
];

export function getMovimientoById(id) {
  return MOVIMIENTOS.find((m) => m.id_movimiento === id);
}

export function getMovimientoByName(nombre) {
  return MOVIMIENTOS.find((m) => m.nombre_movimiento === nombre);
}

// Build the hardware command exactly like the Flask backend does in
// server_final.py (global-speed scaling + fixed turns + special durations).
export function buildCommand(idMovimiento, velocidadGlobal) {
  const mov = getMovimientoById(idMovimiento);
  if (!mov) return null;
  const factor = velocidadGlobal / 255;
  const fixed = MOVIMIENTOS_VELOCIDAD_FIJA.has(idMovimiento);
  const mia_pwm = fixed ? mov.mia_pwm : Math.floor(mov.mia_pwm * factor);
  const mda_pwm = fixed ? mov.mda_pwm : Math.floor(mov.mda_pwm * factor);
  const mi_time =
    TIEMPOS_ESPECIALES[idMovimiento] ?? (mov.mi_time > 0 ? mov.mi_time : 2000);
  return { movimiento: mov.nombre_movimiento, mia_pwm, mda_pwm, mi_time };
}
