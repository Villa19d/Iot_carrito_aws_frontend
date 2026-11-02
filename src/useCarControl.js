import { useState, useEffect, useCallback, useRef } from 'react';
import { resolveApi, getApi, initialMode, MODE } from './api';

const POLL_INTERVAL_MS = 2000;
// Neutral label used in the access-log style display (no hard-coded IPs).
const CLIENT_LABEL = 'client';

function formatAccessDate(now) {
  const dd = String(now.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MMM = months[now.getMonth()];
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${dd}/${MMM}/${yyyy} ${hh}:${mm}:${ss}`;
}

export function useCarControl() {
  const [mode, setMode] = useState(initialMode); // 'checking' | 'real' | 'simulated'
  const [speed, setSpeed] = useState(255);
  const [movimientos, setMovimientos] = useState([]);
  const [demos, setDemos] = useState([]);
  const [logs, setLogs] = useState([]);
  const [networkLogs, setNetworkLogs] = useState([]);
  const [status, setStatus] = useState('conectando'); // conectando, conectado, error, enviando
  const [statusMsg, setStatusMsg] = useState('Iniciando conexión...');
  const [wsConnected, setWsConnected] = useState(false);
  const [obstacleWarning] = useState(false);

  const modeRef = useRef(initialMode);
  const wsConnectedRef = useRef(false);

  const idleStatusMsg = useCallback(
    () => (modeRef.current === MODE.SIMULATED ? 'Modo simulado activo' : 'Conectado al servidor'),
    []
  );

  const pushNetworkLog = useCallback((method, endpoint, statusCode = 200) => {
    setNetworkLogs((prev) => {
      const dateStr = formatAccessDate(new Date());
      const logStr = `${CLIENT_LABEL} - - [${dateStr}] "${method} ${endpoint} HTTP/1.1" ${statusCode} -`;
      return [logStr, ...prev].slice(0, 15); // keep the last 15 entries
    });
  }, []);

  const pushLog = useCallback((name, pwm, timestamp = null, duration = null, fromPush = false) => {
    setLogs((prev) => {
      // When a realtime push channel is active (WebSocket in real mode, the
      // scheduler in simulated mode) polling logs are ignored to avoid dupes.
      const pushActive =
        modeRef.current === MODE.SIMULATED ||
        (modeRef.current === MODE.REAL && wsConnectedRef.current);

      if (!fromPush && pushActive && prev.length > 0) {
        return prev;
      }

      const newLog = {
        id: `${timestamp || Date.now()}-${name}`,
        name,
        date: timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString(),
        pwm: pwm || 255,
        duration: duration || null,
      };

      if (prev.length > 0 && prev[0].id === newLog.id) return prev;
      return [newLog, ...prev].slice(0, 5); // keep the last 5 entries
    });
  }, []);

  const loadData = useCallback(async (api) => {
    api.getVelocidad()
      .then((data) => { if (data.success) setSpeed(data.velocidad); })
      .catch(() => {});
    api.getMovimientos()
      .then((data) => { if (data.success) setMovimientos(data.data); })
      .catch(() => {});
    api.getDemos()
      .then((data) => {
        if (!data.success) return;
        // Hide internal demos and rename the rest to "Demo 1", "Demo 2", ...
        const filtered = data.data.filter((d) => {
          const name = d.nombre_secuencia.toLowerCase();
          return !name.includes('demo final') && !name.includes('testing');
        });
        filtered.forEach((d, index) => {
          d.nombre_secuencia = `Demo ${index + 1}`;
        });
        setDemos(filtered);
      })
      .catch(() => {});
    setStatus('conectado');
    setStatusMsg(idleStatusMsg());
  }, [idleStatusMsg]);

  // Resolve the mode (real vs simulated) and wire up the realtime channel.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    (async () => {
      const { api, mode: resolvedMode } = await resolveApi();
      if (cancelled) return;

      modeRef.current = resolvedMode;
      setMode(resolvedMode);

      const onMovement = (data) =>
        pushLog(data.movimiento, data.mia_pwm, null, data.mi_time, true);

      if (resolvedMode === MODE.REAL) {
        unsubscribe = api.subscribe(onMovement, (connected) => {
          wsConnectedRef.current = connected;
          setWsConnected(connected);
        });
      } else {
        unsubscribe = api.subscribe(onMovement);
      }

      await loadData(api);
    })();

    return () => {
      cancelled = true;
      unsubscribe();
      const api = getApi();
      if (api && typeof api.clear === 'function') api.clear();
    };
  }, [loadData, pushLog]);

  const updateLastMovement = useCallback(async () => {
    try {
      const data = await getApi().getUltimoMovimiento();
      if (data.success && data.data) {
        pushLog(
          data.data.nombre_movimiento,
          data.data.mia_pwm,
          data.data.fecha_hora,
          data.data.mi_time,
          false
        );
      }
    } catch {
      // Silent fail for polling
    }
  }, [pushLog]);

  // HTTP polling fallback and telemetry sync.
  useEffect(() => {
    updateLastMovement();
    const interval = setInterval(() => {
      updateLastMovement();
      pushNetworkLog('GET', '/api/ultimo_movimiento');

      getApi()
        .getVelocidad()
        .then((data) => { if (data.success) setSpeed(data.velocidad); })
        .catch(() => {});

      setTimeout(() => pushNetworkLog('GET', '/api/velocidad'), 200); // small visual delay
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [updateLastMovement, wsConnected, pushNetworkLog]);

  const sendMovement = async (movimiento) => {
    setStatus('enviando');
    setStatusMsg(`Enviando: ${movimiento}...`);
    try {
      const data = await getApi().enviarMovimiento(movimiento);
      if (data.success) {
        setStatus('conectado');
        setStatusMsg('Comando exitoso');
      } else {
        setStatus('error');
        setStatusMsg(`Error: ${data.error}`);
      }
    } catch {
      setStatus('error');
      setStatusMsg('Error de conexión');
    }
    setTimeout(() => {
      setStatus((prev) => (prev === 'enviando' ? prev : 'conectado'));
      setStatusMsg((prev) => (prev.includes('Error') ? prev : idleStatusMsg()));
    }, 3000);
  };

  const executeDemo = async (demoId, demoNombre) => {
    setStatus('enviando');
    setStatusMsg(`Demo: ${demoNombre}...`);
    try {
      const data = await getApi().ejecutarDemo(demoId, demoNombre);
      if (data.success) {
        setStatus('conectado');
        setStatusMsg(data.message);
      } else {
        setStatus('error');
        setStatusMsg('Error');
      }
    } catch {
      setStatus('error');
      setStatusMsg('Error');
    }
  };

  const changeSpeed = async (newSpeed) => {
    setSpeed(newSpeed);
    try {
      await getApi().setVelocidad(newSpeed);
    } catch {
      // ignore
    }
  };

  return {
    mode,
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
    changeSpeed,
  };
}

