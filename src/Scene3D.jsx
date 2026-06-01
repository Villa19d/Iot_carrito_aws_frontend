import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, OrbitControls, Stars } from '@react-three/drei';
import { Physics, usePlane } from '@react-three/cannon';
import Vehicle from './Vehicle';

function Ground() {
  const [ref] = usePlane(() => ({
    type: 'Static',
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -0.5, 0],
    material: 'ground'
  }));

  return (
    <group ref={ref}>
      <mesh position={[0, 0, 0]} visible={false}>
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

export default function Scene3D({ lastMovement }) {
  const controlsRef = useRef();

  return (
    <Canvas 
      camera={{ position: [5, 5, 10], fov: 45 }} 
      style={{ width: '100%', height: '100%', background: '#0f0c29' }}
    >
      {/* Fondo degradado espacial/synthwave y Niebla para el horizonte */}
      <color attach="background" args={['#0f0c29']} />
      <fog attach="fog" args={['#0f0c29', 10, 50]} />

      <OrbitControls ref={controlsRef} makeDefault maxPolarAngle={Math.PI / 2 - 0.05} minDistance={3} maxDistance={20} />
      
      {/* Estrellas de fondo */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Grid espectacular estilo Synthwave / Cyberpunk (Fuera del motor de físicas para que quede horizontal) */}
      <Grid 
        args={[1000, 1000]} 
        position={[0, -0.49, 0]}
        cellSize={1} 
        cellThickness={1.5} 
        cellColor="#0ea5e9" 
        sectionSize={5} 
        sectionThickness={2.5} 
        sectionColor="#8b5cf6" 
        fadeDistance={50} 
        fadeStrength={1} 
      />

      {/* Iluminación Neon Synthwave: Cero costo gráfico, 100% estilo */}
      <hemisphereLight skyColor="#8b5cf6" groundColor="#000000" intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} color="#0ea5e9" />
      <directionalLight position={[-10, 10, -10]} intensity={1.0} color="#ff007f" />
      <ambientLight intensity={0.3} />
      
      <Physics broadphase="sap" gravity={[0, -9.81, 0]}>
        <Vehicle movementStatus={lastMovement} controlsRef={controlsRef} />
        <Ground />
      </Physics>
    </Canvas>
  );
}
