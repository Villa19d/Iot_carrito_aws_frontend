// Centralised runtime configuration for the API layer.
//
// The real backend is gone (the AWS Academy lab was closed), so nothing is
// hard-coded here anymore. The base URL is injected at build time through
// Vite environment variables (see .env.example). When VITE_API_URL is empty
// the app automatically falls back to the in-browser simulated backend.

export const API_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
export const WS_URL = (import.meta.env.VITE_WS_URL || '').trim().replace(/\/$/, '');

// Identifier the backend expects for the car. Kept configurable, defaults to
// the value used by the original solution.
export const DEVICE_ID = import.meta.env.VITE_DEVICE_ID || 'ESP8266-CAR-001';

// Max time to wait for the health check before declaring the backend offline.
export const HEALTHCHECK_TIMEOUT_MS = 2500;

// sessionStorage key used by the simulated backend to persist its event log.
export const EVENT_STORAGE_KEY = 'carrito_iot_simulated_events';
