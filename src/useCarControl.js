import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = import.meta.env.DEV ? '/api' : 'http://50.16.92.186:5001/api';
// WebSocket server runs on port 5000 (not 5001)
const WS_URL = 'ws://50.16.92.186:5000'; 
const DEVICE_ID = 'ESP8266-CAR-001';

export function useCarControl() {
  const [speed, setSpeed] = useState(255);
  const [movimientos, setMovimientos] = useState([]);
  const [demos, setDemos] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('conectando'); // conectando, conectado, error, enviando
  const [statusMsg, setStatusMsg] = useState('Iniciando conexión...');
  const [wsConnected, setWsConnected] = useState(false);
  const [obstacleWarning, setObstacleWarning] = useState(false);
  
  const wsRef = useRef(null);

  const fetchWithTimeout = async (url, options, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  };

  const loadData = useCallback(async () => {
    try {
      fetch(`${API_URL}/velocidad`).then(res => res.json()).then(data => { if (data.success) setSpeed(data.velocidad); }).catch(() => {});
      fetch(`${API_URL}/movimientos`).then(res => res.json()).then(data => { if (data.success) setMovimientos(data.data); }).catch(() => {});
      fetch(`${API_URL}/demos`).then(res => res.json()).then(data => { if (data.success) setDemos(data.data); }).catch(() => {});
      setStatus('conectado');
      setStatusMsg('Conectado al servidor');
    } catch (e) {
      setStatus('error');
      setStatusMsg('Error al conectar');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pushLog = useCallback((name, pwm, timestamp = null) => {
    setLogs(prev => {
      const newLog = {
        id: `${timestamp || Date.now()}-${name}`,
        name: name,
        date: timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString(),
        pwm: pwm || 255
      };
      if (prev.length > 0 && prev[0].id === newLog.id) return prev;
      return [newLog, ...prev].slice(0, 5); // Keep last 5 elements
    });
  }, []);

  const updateLastMovement = useCallback(async () => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/ultimo_movimiento`, {}, 3000);
      const data = await res.json();
      if (data.success && data.data) {
        pushLog(data.data.nombre_movimiento, data.data.mia_pwm, data.data.fecha_hora);
      }
    } catch (e) {
      // Silent fail for polling
    }
  }, [pushLog]);

  // Setup WebSocket connection
  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      if (!isMounted) return;

      try {
        const socket = new WebSocket(WS_URL);
        
        socket.onopen = () => {
          if (!isMounted) {
            socket.close();
            return;
          }
          setWsConnected(true);
          console.log("WebSocket Conectado");
        };

        socket.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const parsed = JSON.parse(event.data);
            // El servidor envía: { success: True, data: { movimiento, mia_pwm, mda_pwm, mi_time } }
            if (parsed.success && parsed.data && parsed.data.movimiento) {
              pushLog(parsed.data.movimiento, parsed.data.mia_pwm);
            }
          } catch (e) {}
        };

        socket.onclose = () => {
          if (!isMounted) return;
          setWsConnected(false);
          // Intentar reconectar en 60 segundos si falla para no saturar consola
          reconnectTimeout = setTimeout(connectWebSocket, 60000);
        };

        socket.onerror = (err) => {
          // No logueamos el error para no saturar la consola si el WS no existe
          socket.close();
        };

        wsRef.current = socket;
      } catch (e) {
        if (isMounted) {
          reconnectTimeout = setTimeout(connectWebSocket, 60000);
        }
      }
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, [pushLog]);

  // Setup HTTP Polling as Fallback and Telemetry Sync
  useEffect(() => {
    updateLastMovement();
    const interval = setInterval(() => {
      // Fuerza la actualización cada 2 segundos según requerimiento
      updateLastMovement();
      
      // Sincronizar también la velocidad
      fetch(`${API_URL}/velocidad`)
        .then(res => res.json())
        .then(data => { if (data.success) setSpeed(data.velocidad); })
        .catch(() => {});
    }, 2000);
    return () => clearInterval(interval);
  }, [updateLastMovement, wsConnected]);

  const sendMovement = async (movimiento) => {
    setStatus('enviando');
    setStatusMsg(`Enviando: ${movimiento}...`);
    try {
      const res = await fetchWithTimeout(`${API_URL}/enviar_movimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movimiento, identificador: DEVICE_ID })
      });
      const data = await res.json();
      if (data.success) {
        setStatus('conectado');
        setStatusMsg(`Comando exitoso`);
        if (!wsConnected) updateLastMovement(); // If WS works, server will push it
      } else {
        setStatus('error');
        setStatusMsg(`Error: ${data.error}`);
      }
    } catch (e) {
      setStatus('error');
      setStatusMsg('Error de conexión');
    }
    setTimeout(() => {
      setStatus(prev => prev === 'enviando' ? prev : 'conectado');
      setStatusMsg(prev => prev.includes('Error') ? prev : 'Conectado al servidor');
    }, 3000);
  };

  const executeDemo = async (demoId, demoNombre) => {
    setStatus('enviando');
    setStatusMsg(`Demo: ${demoNombre}...`);
    try {
      const res = await fetchWithTimeout(`${API_URL}/ejecutar_demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demo_id: demoId, demo_nombre: demoNombre, identificador: DEVICE_ID })
      });
      const data = await res.json();
      if (data.success) {
        setStatus('conectado');
        setStatusMsg(data.message);
        if (!wsConnected) updateLastMovement();
      } else {
        setStatus('error');
        setStatusMsg(`Error`);
      }
    } catch (e) {
      setStatus('error');
      setStatusMsg('Error');
    }
  };

  const changeSpeed = async (newSpeed) => {
    setSpeed(newSpeed);
    try {
      await fetch(`${API_URL}/velocidad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ velocidad: parseInt(newSpeed) })
      });
    } catch (e) {}
  };

  return {
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
  };
}
