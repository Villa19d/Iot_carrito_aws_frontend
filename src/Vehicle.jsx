import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useBox, useRaycastVehicle, useCylinder } from '@react-three/cannon';
import * as THREE from 'three';

const Wheel = React.forwardRef(({ radius, leftSide }, ref) => {
  useCylinder(() => ({
    mass: 20,
    type: 'Kinematic',
    material: 'wheel',
    collisionFilterGroup: 0, 
    args: [radius, radius, 0.25, 32],
    rotation: [0, 0, leftSide ? Math.PI : 0],
  }), ref);

  return (
    <group ref={ref}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, 0.25, 32]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[leftSide ? 0.13 : -0.13, 0, 0]}>
        <cylinderGeometry args={[radius * 0.7, radius * 0.7, 0.06, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[leftSide ? 0.14 : -0.14, 0, 0]}>
        <cylinderGeometry args={[radius * 0.5, radius * 0.5, 0.06, 16]} />
        <meshStandardMaterial color="#0f0f0f" roughness={0.8} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[leftSide ? 0.15 : -0.15, 0, 0]}>
        <cylinderGeometry args={[radius * 0.15, radius * 0.15, 0.05, 16]} />
        <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.2} />
      </mesh>
    </group>
  );
});

export default function Vehicle({ movementStatus, controlsRef }) {
  const chassisRef = useRef();
  const wheel1 = useRef();
  const wheel2 = useRef();
  const wheel3 = useRef();
  const wheel4 = useRef();

  const { camera } = useThree();

  const chassisWidth = 1.3;
  const chassisHeight = 0.5;
  const chassisLength = 2.8;
  
  const [chassisBody, chassisApi] = useBox(() => ({
    mass: 800, 
    args: [chassisWidth, chassisHeight, chassisLength],
    position: [0, 1.0, 0], 
    allowSleep: false,
  }), chassisRef);

  const wheelRadius = 0.32;
  const wheelInfo = {
    radius: wheelRadius,
    directionLocal: [0, -1, 0],
    suspensionStiffness: 30, 
    suspensionRestLength: 0.35,
    maxSuspensionForce: 10000, 
    maxSuspensionTravel: 1.0, 
    dampingRelaxation: 2.3,
    dampingCompression: 4.4,
    axleLocal: [-1, 0, 0],
    useCustomSlidingRotationalSpeed: true,
    customSlidingRotationalSpeed: -30,
    frictionSlip: 2,
  };

  const wheelInfos = [
    { ...wheelInfo, chassisConnectionPointLocal: [-0.75, -0.3,  1.0], isFrontWheel: true },
    { ...wheelInfo, chassisConnectionPointLocal: [ 0.75, -0.3,  1.0], isFrontWheel: true },
    { ...wheelInfo, chassisConnectionPointLocal: [-0.75, -0.3, -1.0], isFrontWheel: false },
    { ...wheelInfo, chassisConnectionPointLocal: [ 0.75, -0.3, -1.0], isFrontWheel: false },
  ];

  const [vehicle, vehicleApi] = useRaycastVehicle(() => ({
    chassisBody,
    wheels: [wheel1, wheel2, wheel3, wheel4],
    wheelInfos,
    indexForwardAxis: 2,
    indexRightAxis: 0,
    indexUpAxis: 1,
  }), useRef(null));

  const commandState = useRef({ cmd: '', startTime: 0 });

  useFrame(() => {
    let engineForceLeft = 0;
    let engineForceRight = 0;
    let steeringValue = 0;
    let braking = 0;

    if (movementStatus && movementStatus.name) {
      const cmd = movementStatus.name.toLowerCase();
      
      // Update command tracking for pulses
      if (commandState.current.cmd !== movementStatus.id) {
        commandState.current.cmd = movementStatus.id;
        commandState.current.startTime = Date.now();
      }

      const elapsed = Date.now() - commandState.current.startTime;

      // Usar la duración enviada por el servidor, o valores por defecto para pre-visualizar
      let durationMs = Infinity; 
      if (movementStatus.duration) {
        durationMs = movementStatus.duration;
      } else {
        if (cmd.includes('vuelta')) durationMs = 800; // 0.8 seconds pulse
        if (cmd.includes('90')) durationMs = 500; // 0.5 sec rotation
        if (cmd.includes('36')) durationMs = 2000; // 2.0 sec rotation
      }

      if (elapsed < durationMs && cmd !== 'detener') {
        const baseForce = 600;
        const maxSteer = 0.8; // Curvas mucho más pronunciadas

        // Movimientos Continuos
        if (cmd === 'adelante') { 
          engineForceLeft = -baseForce; engineForceRight = -baseForce; 
        }
        else if (cmd === 'atrás' || cmd === 'atras') { 
          engineForceLeft = baseForce; engineForceRight = baseForce; 
        }
        
        // Movimientos por Pulso (Vueltas)
        else if (cmd === 'vuelta adelante derecha') { 
          engineForceLeft = -baseForce; engineForceRight = -baseForce; steeringValue = -maxSteer; 
        }
        else if (cmd === 'vuelta adelante izquierda') { 
          engineForceLeft = -baseForce; engineForceRight = -baseForce; steeringValue = maxSteer; 
        }
        else if (cmd === 'vuelta atrás derecha' || cmd === 'vuelta atras derecha') { 
          engineForceLeft = baseForce; engineForceRight = baseForce; steeringValue = -maxSteer; 
        }
        else if (cmd === 'vuelta atrás izquierda' || cmd === 'vuelta atras izquierda') { 
          engineForceLeft = baseForce; engineForceRight = baseForce; steeringValue = maxSteer; 
        }
        
        // Movimientos de Eje Propio / Skid Steering (Giros 90 y 360)
        else if (cmd.includes('giro')) {
          // Usamos la API correcta de Cannon.js para forzar rotación sobre su propio eje (Tank Turn).
          // Esto evita que se mueva como un coche normal, manteniéndolo en su lugar y girando rápido a velocidad fija.
          const angularSpeed = 6.0; // Velocidad de giro radical en radianes/s
          
          if (cmd.includes('derecha')) {
            chassisApi.angularVelocity.set(0, -angularSpeed, 0);
          } else if (cmd.includes('izquierda')) {
            chassisApi.angularVelocity.set(0, angularSpeed, 0);
          }
        }
      } else {
        // Stop / Frenado (si se acabó el tiempo o es comando 'detener')
        braking = 30;
        // Frenar rotación en seco si estaba girando
        if (commandState.current.cmd.toLowerCase().includes('giro')) {
          chassisApi.angularVelocity.set(0, 0, 0);
        }
      }
    } else {
      braking = 30;
      if (commandState.current.cmd.toLowerCase().includes('giro')) {
        chassisApi.angularVelocity.set(0, 0, 0);
      }
    }

    // Aplicar fuerzas independientemente por lado (0: Front-Left, 1: Front-Right, 2: Back-Left, 3: Back-Right)
    vehicleApi.applyEngineForce(engineForceLeft, 0);
    vehicleApi.applyEngineForce(engineForceRight, 1);
    vehicleApi.applyEngineForce(engineForceLeft, 2);
    vehicleApi.applyEngineForce(engineForceRight, 3);

    vehicleApi.setSteeringValue(steeringValue, 0);
    vehicleApi.setSteeringValue(steeringValue, 1);

    for (let i = 0; i < 4; i++) {
      vehicleApi.setBrake(braking, i);
    }

    if (chassisRef.current) {
      const carPos = new THREE.Vector3();
      chassisRef.current.getWorldPosition(carPos);
      
      if (Number.isFinite(carPos.x) && Number.isFinite(carPos.y) && Number.isFinite(carPos.z)) {
        if (controlsRef && controlsRef.current) {
          controlsRef.current.target.lerp(carPos, 0.1);
        }
      }
    }
  });

  return (
    <group ref={vehicle}>
      <group ref={chassisBody}>
        {/* Carrocería principal Neon-Ready */}
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[chassisWidth, chassisHeight, chassisLength]} />
          <meshStandardMaterial color="#ff0a33" metalness={0.4} roughness={0.3} />
        </mesh>
        
        {/* Cabina */}
        <mesh position={[0, 0.3, -0.2]}>
          <boxGeometry args={[1.0, 0.45, 1.4]} />
          <meshStandardMaterial color="#000000" metalness={0.8} roughness={0.1} transparent opacity={0.8} />
        </mesh>

        {/* Faldones laterales */}
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[1.35, 0.1, 1.6]} />
          <meshStandardMaterial color="#111" roughness={0.8} />
        </mesh>

        {/* Alerón Trasero Deportivo */}
        <mesh position={[0, 0.4, -1.3]}>
          <boxGeometry args={[1.2, 0.05, 0.3]} />
          <meshStandardMaterial color="#111" metalness={0.5} roughness={0.2} />
        </mesh>
        {/* Soportes del alerón */}
        <mesh position={[-0.4, 0.25, -1.3]}>
          <boxGeometry args={[0.05, 0.3, 0.1]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0.4, 0.25, -1.3]}>
          <boxGeometry args={[0.05, 0.3, 0.1]} />
          <meshStandardMaterial color="#111" />
        </mesh>

        {/* Espejos Retrovisores */}
        <mesh position={[0.65, 0.2, 0.3]}>
          <boxGeometry args={[0.15, 0.1, 0.1]} />
          <meshStandardMaterial color="#ff0a33" metalness={0.4} roughness={0.3} />
        </mesh>
        <mesh position={[-0.65, 0.2, 0.3]}>
          <boxGeometry args={[0.15, 0.1, 0.1]} />
          <meshStandardMaterial color="#ff0a33" metalness={0.4} roughness={0.3} />
        </mesh>

        {/* Faros Delanteros con Brillo y Luz Dinámica */}
        <mesh position={[0.4, 0.0, 1.3]}>
          <boxGeometry args={[0.3, 0.08, 0.05]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
        </mesh>
        <mesh position={[-0.4, 0.0, 1.3]}>
          <boxGeometry args={[0.3, 0.08, 0.05]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
        </mesh>
        <pointLight position={[0.4, 0, 1.5]} color="#0ea5e9" intensity={2} distance={5} />
        <pointLight position={[-0.4, 0, 1.5]} color="#0ea5e9" intensity={2} distance={5} />

        {/* Faros Traseros Neon */}
        <mesh position={[0.3, 0.0, -1.3]}>
          <boxGeometry args={[0.4, 0.08, 0.05]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={3} />
        </mesh>
        <mesh position={[-0.3, 0.0, -1.3]}>
          <boxGeometry args={[0.4, 0.08, 0.05]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={3} />
        </mesh>
        <pointLight position={[0, 0, -1.5]} color="#ff0000" intensity={1} distance={3} />

        {/* Parrilla Frontal Mesh */}
        <mesh position={[0, -0.15, 1.301]}>
          <boxGeometry args={[0.7, 0.2, 0.05]} />
          <meshStandardMaterial color="#000" roughness={0.9} />
        </mesh>

        {/* Escapes traseros */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0.3, -0.25, -1.32]}>
          <cylinderGeometry args={[0.06, 0.06, 0.1, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[-0.3, -0.25, -1.32]}>
          <cylinderGeometry args={[0.06, 0.06, 0.1, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Sombra Falsa (Cero costo gráfico) */}
        <mesh position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[chassisWidth * 1.5, chassisLength * 1.2]} />
          <meshBasicMaterial color="#000" transparent opacity={0.6} />
        </mesh>

      </group>

      <Wheel ref={wheel1} radius={wheelRadius} leftSide={true} />
      <Wheel ref={wheel2} radius={wheelRadius} leftSide={false} />
      <Wheel ref={wheel3} radius={wheelRadius} leftSide={true} />
      <Wheel ref={wheel4} radius={wheelRadius} leftSide={false} />
    </group>
  );
}
