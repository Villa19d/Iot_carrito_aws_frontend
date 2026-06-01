import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square, Activity, Gauge, Terminal, Zap, Gamepad2 } from 'lucide-react';

export default function ControlPanel({ 
  speed, 
  changeSpeed, 
  sendMovement, 
  movimientos, 
  demos, 
  executeDemo,
  logs 
}) {
  return (
    <>
      {/* Controls Panel (D-Pad + Speed) */}
      <div className="panel-controls">
        <div className="glass-card">
          <h2 className="section-title"><Gamepad2 size={20} className="gradient-text" /> Control Direccional</h2>
          <div className="d-pad-container">
            <button className="btn-icon d-pad-up" onClick={() => sendMovement('Adelante')} aria-label="Adelante">
              <ArrowUp size={28} />
            </button>
            <button className="btn-icon d-pad-left" onClick={() => sendMovement('Giro 90° izquierda')} aria-label="Izquierda">
              <ArrowLeft size={28} />
            </button>
            <button className="btn-icon danger d-pad-stop" onClick={() => sendMovement('Detener')} aria-label="Detener">
              <Square size={28} fill="currentColor" />
            </button>
            <button className="btn-icon d-pad-right" onClick={() => sendMovement('Giro 90° derecha')} aria-label="Derecha">
              <ArrowRight size={28} />
            </button>
            <button className="btn-icon d-pad-down" onClick={() => sendMovement('Atrás')} aria-label="Atrás">
              <ArrowDown size={28} />
            </button>
          </div>
        </div>

        <div className="glass-card">
          <h2 className="section-title"><Gauge size={20} className="gradient-text" /> Velocidad</h2>
          <div className="speed-control">
            <span style={{ fontSize: '1.2rem' }}>🐢</span>
            <input 
              type="range" 
              min="0" 
              max="255" 
              step="5" 
              value={speed} 
              onChange={(e) => changeSpeed(e.target.value)}
            />
            <span style={{ fontSize: '1.2rem' }}>🐇</span>
            <span className="speed-value">{speed}</span>
          </div>
        </div>
      </div>

      {/* Extras Panel (Demos and Movs) */}
      <div className="panel-extras">
        <div className="glass-card">
          <h2 className="section-title"><Zap size={20} className="gradient-text" /> Movimientos</h2>
          {movimientos.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Esperando servidor...</p>
          ) : (
            <div className="action-grid">
              {movimientos.map((mov, i) => (
                <button key={i} className="pill-btn" onClick={() => sendMovement(mov.nombre_movimiento)}>
                  {mov.nombre_movimiento}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card">
          <h2 className="section-title"><Activity size={20} className="gradient-text" /> Secuencias Demo</h2>
          {demos.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Esperando servidor...</p>
          ) : (
            <div className="action-grid">
              {demos.map((demo, i) => (
                <button key={i} className="pill-btn" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#6ee7b7' }} onClick={() => executeDemo(demo.id_secuencia, demo.nombre_secuencia)}>
                  {demo.nombre_secuencia} ({demo.total_movimientos} movs)
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logs Panel */}
      <div className="panel-logs glass-card">
        <h2 className="section-title"><Terminal size={20} className="gradient-text" /> Registro de Eventos</h2>
        <div className="terminal-log">
          {logs.length === 0 ? (
            <div style={{ opacity: 0.5 }}>Esperando registros...</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="terminal-entry">
                <span className="terminal-time">[{log.date}]</span>
                <span style={{ color: '#38bdf8' }}>{log.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>→ PWM: {log.pwm}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
