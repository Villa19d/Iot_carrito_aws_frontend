import React, { Suspense, useEffect, useState } from 'react';
import Scene3D from './Scene3D';
import { Terminal, AlertTriangle, Activity, Wifi } from 'lucide-react';

export default function MonitorPanel({ logs, obstacleWarning, statusMsg, wsConnected }) {
  const lastMovementName = logs.length > 0 ? logs[0].name : null;
  const [ping, setPing] = useState(0);

  // Animación visual de barrido de telemetría cada 2 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setPing(prev => (prev === 100 ? 0 : prev + 50));
    }, 1000); // Se llena cada 2s
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', gridColumn: '1 / -1' }}>
      
      {/* HUD Header */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }} className="gradient-text">
            <Activity size={28} /> Centro de Monitoreo
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Estado: {wsConnected ? <span style={{color: '#10b981'}}>Conectado (WebSocket)</span> : <span style={{color: '#f59e0b'}}>Activo (Polling a 2 seg)</span>}
            <Wifi size={14} style={{ opacity: ping > 50 ? 1 : 0.3, transition: 'opacity 0.2s' }} />
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
            Telemetría en Vivo 
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ping === 0 ? '#10b981' : '#38bdf8', transition: 'background 0.5s' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
            {lastMovementName ? `[ ${lastMovementName.toUpperCase()} ]` : '[ ESPERANDO... ]'}
          </div>
        </div>
      </div>

      {/* Barredor de radar lineal (Visualizador de los 2 segundos) */}
      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ 
          height: '100%', 
          width: '50%', 
          background: 'linear-gradient(90deg, transparent, var(--primary), transparent)',
          transform: `translateX(${ping === 0 ? -100 : ping === 50 ? 50 : 200}%)`,
          transition: 'transform 1s linear'
        }} />
      </div>

      {/* Obstacle Alert */}
      {obstacleWarning && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.2)', 
          border: '1px solid #ef4444', 
          padding: '16px', 
          borderRadius: '12px',
          color: '#fca5a5',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'pulse 1s infinite'
        }}>
          <AlertTriangle size={32} />
          <div>
            <strong style={{ fontSize: '1.2rem', display: 'block' }}>¡OBSTÁCULO DETECTADO!</strong>
            <span>El sensor frontal ha registrado un objeto próximo.</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Big 3D Visualizer */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
          <div className="canvas-container" style={{ flex: 1, borderRadius: '12px', border: 'none', background: 'radial-gradient(circle at center, rgba(56, 189, 248, 0.1), transparent 80%)' }}>
            <Suspense fallback={<div className="flex-center w-full h-full text-muted">Cargando visualizador 3D...</div>}>
              <Scene3D lastMovement={lastMovementName} />
            </Suspense>
            <div className="overlay-text">
              Actualizado: Hace {ping === 0 ? 0 : ping === 50 ? 1 : 2} segundo(s)
            </div>
          </div>
        </div>

        {/* Big Terminal Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <h2 className="section-title"><Terminal size={20} className="gradient-text" /> Telemetría de Motores</h2>
            <div className="terminal-log" style={{ flex: 1, minHeight: '200px' }}>
              {logs.length === 0 ? (
                <div style={{ opacity: 0.5 }}>Esperando telemetría...</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="terminal-entry" style={{ marginBottom: '12px', fontSize: '0.9rem' }}>
                    <span className="terminal-time" style={{ display: 'block', fontSize: '0.75rem' }}>[{log.date}]</span>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>{log.name}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '12px' }}>PWM: {log.pwm}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <h2 className="section-title"><Wifi size={20} className="gradient-text" /> Tráfico de Red (Polling)</h2>
            <div className="terminal-log" style={{ flex: 1, minHeight: '200px', fontSize: '0.8rem', color: '#cbd5e1' }}>
              {(!networkLogs || networkLogs.length === 0) ? (
                <div style={{ opacity: 0.5 }}>Escuchando red...</div>
              ) : (
                networkLogs.map((nlog, i) => (
                  <div key={i} style={{ marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                    {nlog}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
