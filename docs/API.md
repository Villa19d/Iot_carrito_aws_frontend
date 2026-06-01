# Documentación de APIs (Carrito IoT)

Base URL (Producción): `http://50.16.92.186:5001/api`
Base URL (Desarrollo): `/api` (Vía Proxy de Vite)

Dispositivo Identificador Estándar: `ESP8266-CAR-001`

## 1. Movimientos
### `GET /movimientos`
Retorna la lista de movimientos direccionales y acciones estáticas configuradas en base de datos.
**Response**: `{ success: true, data: [{ id_movimiento, nombre_movimiento, mia_pwm }] }`

### `POST /enviar_movimiento`
Envía una instrucción al carrito.
**Body**:
```json
{
  "movimiento": "Adelante",
  "identificador": "ESP8266-CAR-001"
}
```

### `GET /ultimo_movimiento`
Retorna el último registro de movimiento detectado/ejecutado por el carrito. (Usado para real-time polling).
**Response**:
```json
{
  "success": true,
  "data": {
    "fecha_hora": "2026-05-31T20:00:00Z",
    "nombre_movimiento": "Adelante",
    "mia_pwm": 255
  }
}
```

## 2. Velocidad
### `GET /velocidad`
Obtiene el nivel de PWM configurado actualmente para los motores (0 a 255).
**Response**: `{ success: true, velocidad: 255 }`

### `POST /velocidad`
Ajusta la velocidad base del carrito.
**Body**:
```json
{
  "velocidad": 200
}
```

## 3. Demostraciones (Secuencias)
### `GET /demos`
Obtiene secuencias pre-guardadas en la base de datos (Stored Procedures en RDS) que representan combinaciones de movimientos repetitivos o demos preprogramados.
**Response**: `{ success: true, data: [{ id_secuencia, nombre_secuencia, total_movimientos }] }`

### `POST /ejecutar_demo`
Inicia la ejecución de una secuencia DEMO específica en el hardware.
**Body**:
```json
{
  "demo_id": 1,
  "demo_nombre": "Demo 1",
  "identificador": "ESP8266-CAR-001"
}
```
