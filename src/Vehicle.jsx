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

  useFrame(() => {
    let engineForce = 0;
    let steeringValue = 0;

    if (movementStatus) {
      const cmd = movementStatus.toLowerCase();
      if (cmd.includes('adelante')) engineForce = -600; 
      if (cmd.includes('atrás') || cmd.includes('atras')) engineForce = 600;
      
      if (cmd.includes('derecha')) steeringValue = -0.4;
      if (cmd.includes('izquierda')) steeringValue = 0.4;

      if (cmd === 'detener') {
        vehicleApi.setBrake(20, 0);
        vehicleApi.setBrake(20, 1);
        vehicleApi.setBrake(20, 2);
        vehicleApi.setBrake(20, 3);
      } else {
        vehicleApi.setBrake(0, 0);
        vehicleApi.setBrake(0, 1);
        vehicleApi.setBrake(0, 2);
        vehicleApi.setBrake(0, 3);
      }
    }

    vehicleApi.applyEngineForce(engineForce, 2);
    vehicleApi.applyEngineForce(engineForce, 3);
    vehicleApi.setSteeringValue(steeringValue, 0);
    vehicleApi.setSteeringValue(steeringValue, 1);

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
