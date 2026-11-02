# Contexto del Proyecto: Carrito IoT Frontend

Este documento sirve como base de conocimiento para la arquitectura y funcionamiento del frontend del proyecto Carrito IoT (ESP8266 + Flask + React).

## 🏗️ Arquitectura
* **Framework**: React 19 + Vite.
* **Estilos**: Vanilla CSS con variables globales (`index.css`) y CSS puro responsivo (`App.css`). Diseño basado en **Glassmorphism**, colores neón en modo oscuro. La interfaz se divide en 3 columnas principales para distribuir mejor los controles sin comprimirlos en el centro.
* **Componente 3D**: `Three.js` + `@react-three/fiber` + `@react-three/drei`. Renderiza un carrito en 3D en `<Scene3D />` que responde visualmente al último estado (adelante, atrás, rotaciones). El carrito rota sobre su propio eje en el centro de la escena para no desaparecer del campo de visión.

## 🔌 Conexión con el Backend
* El despliegue original (AWS Academy) ya no existe. La URL del backend se define con la variable de entorno `VITE_API_URL` (vacía por defecto = modo simulado).
* La selección de modo real/simulado y el acceso a la API viven en la capa `src/api/` (`resolveApi`, `realApi`, `simulatedApi`); los componentes no llaman a `fetch` directamente.
* En modo desarrollo (`pnpm dev`), el proxy de `vite.config.js` es opcional y solo se activa si defines `VITE_API_PROXY_TARGET`.
* **Estado de la App**: Manejado por el custom hook `useCarControl.js`. Realiza el *polling* del último movimiento cada 2 segundos y mantiene sincronizados:
  - Velocidad actual (`speed`)
  - Catálogo de movimientos disponibles (`movimientos`)
  - Catálogo de demostraciones (`demos`)
  - Log histórico local (`logs`, últimos 5)

## 📁 Estructura de Directorios Clave
* `/src/App.jsx`: Layout principal de cuadrícula (CSS Grid expandido) que junta las vistas.
* `/src/Navbar.jsx` y `/src/Footer.jsx`: Contienen los datos del desarrollador, institución y docente.
* `/src/useCarControl.js`: Core lógico. Fetch, polling y timeout.
* `/src/Scene3D.jsx`: Visor interactivo del vehículo en 3D. Evitar el uso de atajos de `@react-three/drei` (como `<Box>`) que fallan en algunas versiones; usar siempre `<mesh>` y geometrías nativas de R3F.
* `/vite.config.js`: Configuración de proxy para bypass de CORS en Dev.

## 🚨 Gotchas y Problemas Comunes
* **CORS**: Si al desplegar a producción (Github Pages por HTTPS) el backend sigue en HTTP, habrá un error de *Mixed Content*. La API debe contar con certificado SSL (HTTPS) si el frontend usa HTTPS.
* **WebGL Crash**: Si `Scene3D` tiene errores sintácticos, React desmonta toda la vista. Siempre usar geometrías declarativas seguras.
