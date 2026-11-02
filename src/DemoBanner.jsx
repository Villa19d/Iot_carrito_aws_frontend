import React from 'react';
import { Radio, AlertTriangle } from 'lucide-react';

// Permanent, always-visible banner that states whether the app is driving real
// hardware ("LIVE") or running the in-browser simulation. It is intentionally
// explicit that the simulated mode never controls physical hardware.
export default function DemoBanner({ mode }) {
  const isLive = mode === 'real';
  const isChecking = mode === 'checking';

  const label = isLive ? 'LIVE' : 'DEMO SIMULADA (sin hardware)';
  const note = isLive
    ? 'Conectado a un backend real configurado en VITE_API_URL.'
    : isChecking
      ? 'Verificando backend... si no responde, se usará la simulación local.'
      : 'El backend original en AWS Academy ya no existe; los comandos se simulan localmente en tu navegador.';

  const stateClass = isLive ? 'live' : isChecking ? 'checking' : 'sim';

  return (
    <div className={`mode-banner mode-${stateClass}`} role="status" aria-live="polite">
      <span className="mode-badge">
        {isLive ? <Radio size={16} /> : <AlertTriangle size={16} />}
        {label}
      </span>
      <span className="mode-note">{note}</span>
    </div>
  );
}
