import React from 'react';
import './Navbar.css';
import { ShieldAlert, Info, Gamepad2, Activity } from 'lucide-react';

export default function Navbar({ activeTab, setTab }) {
  return (
    <nav className="navbar glass-panel">
      <div className="navbar-brand">
        <div className="logo-icon">🏎️</div>
        <div>
          <h1 className="gradient-text">Carrito IoT Web</h1>
          <span className="subtitle-nav">Tecnológico Nacional de México Campus Pachuca</span>
        </div>
      </div>
      
      <div className="navbar-tabs" style={{ display: 'flex', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '12px' }}>
        <button 
          onClick={() => setTab('control')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: activeTab === 'control' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'control' ? '#fff' : 'var(--text-muted)',
            fontWeight: 'bold', transition: 'all 0.2s'
          }}
        >
          <Gamepad2 size={18} /> Control
        </button>
        <button 
          onClick={() => setTab('monitor')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: activeTab === 'monitor' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'monitor' ? '#fff' : 'var(--text-muted)',
            fontWeight: 'bold', transition: 'all 0.2s'
          }}
        >
          <Activity size={18} /> Monitoreo
        </button>
      </div>

      <div className="navbar-info">
        <div className="student-info">
          <strong>Luis Rodrigo Del Villar Morales</strong>
          <span>Ing. en Sistemas Computacionales</span>
        </div>
        <div className="prof-info">
          <Info size={16} />
          <span>Docente: Víctor Manuel Pinedo Fernández</span>
        </div>
      </div>
    </nav>
  );
}
