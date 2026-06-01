import React, { useState, Suspense } from 'react';
import { useCarControl } from './useCarControl';
import Scene3D from './Scene3D';
import Navbar from './Navbar';
import Footer from './Footer';
import ControlPanel from './ControlPanel';
import MonitorPanel from './MonitorPanel';
import { Activity } from 'lucide-react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('control'); // 'control' or 'monitor'

  const {
    speed,
    movimientos,
    demos,
    logs,
    status,
    statusMsg,
    wsConnected,
    obstacleWarning,
    sendMovement,
    executeDemo,
    changeSpeed
  } = useCarControl();

  const lastMovement = logs.length > 0 ? logs[0] : null;

  return (
    <>
      <Navbar activeTab={activeTab} setTab={setActiveTab} />
      
      <div className="app-container">
        {activeTab === 'control' ? (
          <>
            <ControlPanel 
              speed={speed}
              changeSpeed={changeSpeed}
              sendMovement={sendMovement}
              movimientos={movimientos}
              demos={demos}
              executeDemo={executeDemo}
              logs={logs}
            />
            {/* View Panel for Control Mode */}
            <div className="panel-view">
              <div className="status-bar glass-card">
                <div className="flex-center gap-2">
                  <span className={`status-indicator ${status === 'error' ? 'error' : status === 'enviando' ? 'sending' : 'connected'}`}></span>
                  <span>{statusMsg}</span>
                </div>
                <div className="flex-center gap-2">
                  <Activity size={16} className="gradient-text" />
                  <span style={{ color: 'var(--text-muted)' }}>ESP8266-CAR-001</span>
                </div>
              </div>

              <div className="canvas-container" style={{ flex: 1, minHeight: '400px' }}>
                <Suspense fallback={<div className="flex-center w-full h-full text-muted">Cargando 3D...</div>}>
                  <Scene3D lastMovement={lastMovement} />
                </Suspense>
                <div className="overlay-text">Modelo en tiempo real</div>
              </div>
            </div>
          </>
        ) : (
          <MonitorPanel 
            logs={logs} 
            obstacleWarning={obstacleWarning} 
            statusMsg={statusMsg} 
            wsConnected={wsConnected} 
          />
        )}
      </div>

      <Footer />
    </>
  );
}

export default App;
