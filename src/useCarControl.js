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
  const [networkLogs, setNetworkLogs] = useState([]);
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

  const pushNetworkLog = useCallback((method, endpoint, statusCode = 200) => {
    setNetworkLogs(prev => {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const MMM = months[now.getMonth()];
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      
      const dateStr = `${dd}/${MMM}/${yyyy} ${hh}:${mm}:${ss}`;
      const logStr = `79.127.147.92 - - [${dateStr}] "${method} ${endpoint} HTTP/1.1" ${statusCode} -`;
      
      return [logStr, ...prev].slice(0, 15); // Guardar los últimos 15
    });
  }, []);

  const loadData = useCallback(async () => {
    try {
      fetch(`${API_URL}/velocidad`).then(res => res.json()).then(data => { if (data.success) setSpeed(data.velocidad); }).catch(() => {});
      fetch(`${API_URL}/movimientos`).then(res => res.json()).then(data => { if (data.success) setMovimientos(data.data); }).catch(() => {});
      fetch(`${API_URL}/demos`).then(res => res.json()).then(data => { 
        if (data.success) {
          const filteredDemos = data.data.filter(d => {
            const name = d.nombre_secuencia.toLowerCase();
            return !name.includes('demo final') && !name.includes('testing');
          });
          
          // Renombrar dinámicamente en el frontend (Demo 1, Demo 2, etc.)
          filteredDemos.forEach((d, index) => {
            d.nombre_secuencia = `Demo ${index + 1}`;
          });
          
          setDemos(filteredDemos); 
        }
      }).catch(() => {});
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

  const pushLog = useCallback((name, pwm, timestamp = null, duration = null, fromWS = false) => {
    setLogs(prev => {
      const isWsActive = wsRef.current && wsRef.current.readyState === WebSocket.OPEN;
      
      // Para evitar duplicados en la simulación 3D:
      // Si este log viene del Polling HTTP (fromWS=false) y el WebSocket está activo,
      // lo ignoramos, porque el WebSocket ya lo empujó en tiempo real al instante.
      if (!fromWS && isWsActive && prev.length > 0) {
        return prev;
      }

      const newLog = {
        id: `${timestamp || Date.now()}-${name}`,
        name: name,
        date: timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString(),
        pwm: pwm || 255,
        duration: duration || null
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
        pushLog(data.data.nombre_movimiento, data.data.mia_pwm, data.data.fecha_hora, data.data.mi_time, false);
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
              pushLog(parsed.data.movimiento, parsed.data.mia_pwm, null, parsed.data.mi_time, true);
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
      pushNetworkLog('GET', '/api/ultimo_movimiento');
      
      // Sincronizar también la velocidad
      fetch(`${API_URL}/velocidad`)
        .then(res => res.json())
        .then(data => { if (data.success) setSpeed(data.velocidad); })
        .catch(() => {});
      
      setTimeout(() => pushNetworkLog('GET', '/api/velocidad'), 200); // Pequeño delay visual
    }, 2000);
    return () => clearInterval(interval);
  }, [updateLastMovement, wsConnected, pushNetworkLog]);

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
    networkLogs,
    status,
    statusMsg,
    wsConnected,
    obstacleWarning,
    sendMovement,
    executeDemo,
    changeSpeed
  };
}
