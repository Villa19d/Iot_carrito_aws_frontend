// API facade: picks between the real backend and the in-browser simulation.
//
// Selection rules:
//   - If VITE_API_URL is empty  -> simulated (no backend to talk to).
//   - Otherwise run a health check (~2.5 s timeout):
//       * healthy  -> real
//       * failure  -> simulated
//
// Both implementations share the same interface, so the rest of the app does
// not need to know which one is active.
import { API_URL } from './config';
import { realApi } from './realApi';
import { simulatedApi } from './simulatedApi';

export const MODE = {
  REAL: 'real',
  SIMULATED: 'simulated',
  CHECKING: 'checking',
};

export const initialMode = API_URL ? MODE.CHECKING : MODE.SIMULATED;

let activeApi = API_URL ? null : simulatedApi;
let currentMode = initialMode;

export async function resolveApi() {
  if (!API_URL) {
    activeApi = simulatedApi;
    currentMode = MODE.SIMULATED;
    return { api: simulatedApi, mode: MODE.SIMULATED };
  }

  const healthy = await realApi.healthCheck();
  if (healthy) {
    activeApi = realApi;
    currentMode = MODE.REAL;
    return { api: realApi, mode: MODE.REAL };
  }

  activeApi = simulatedApi;
  currentMode = MODE.SIMULATED;
  return { api: simulatedApi, mode: MODE.SIMULATED };
}

export function getApi() {
  return activeApi || simulatedApi;
}

export function getMode() {
  return currentMode;
}

export { realApi, simulatedApi };
