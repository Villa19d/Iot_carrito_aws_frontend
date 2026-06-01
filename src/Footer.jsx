import React from 'react';
import { Cpu, Globe, Server } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      padding: '32px 24px',
      color: 'var(--text-muted)',
      fontSize: '0.9rem',
      marginTop: 'auto',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      gridColumn: '1 / -1',
      background: 'rgba(0,0,0,0.2)',
      borderRadius: '16px 16px 0 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={16} /> Backend: AWS EC2 + RDS
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={16} /> WebSocket + HTTP API
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={16} /> Microcontrolador NodeMCU ESP8266
        </div>
      </div>
      
      <p style={{ textAlign: 'center', maxWidth: '600px', margin: '12px 0 0 0', lineHeight: '1.5' }}>
        Desarrollado como proyecto final para la materia de <strong>Implementación de Soluciones IoT</strong>.
        El sistema controla los movimientos direccionales de un vehículo de forma remota, 
        evalúa los niveles de velocidad y registra métricas en tiempo real.
      </p>
      
      <p style={{ marginTop: '16px', fontSize: '0.8rem', opacity: 0.5, letterSpacing: '1px' }}>
        © 2026 LUIS RODRIGO DEL VILLAR MORALES • TECNOLÓGICO NACIONAL DE MÉXICO
      </p>
    </footer>
  );
}
