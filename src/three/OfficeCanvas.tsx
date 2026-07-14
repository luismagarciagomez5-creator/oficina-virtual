import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect } from 'react';
import * as THREE from 'three';
import type { Agent } from '../types';
import Building from './Building';

type Props = {
  agents: Agent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
};

function ResponsiveCamera() {
  const { camera, size } = useThree();

  useEffect(() => {
    const narrow = size.width < 640;
    camera.position.set(0, narrow ? 27 : 16, narrow ? 52 : 26);
    camera.lookAt(0, 1.35, 3.2);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = narrow ? 43 : 40;
      camera.updateProjectionMatrix();
    }
  }, [camera, size.width]);

  return null;
}

export default function OfficeCanvas({ agents, selectedId, onSelect, onHover }: Props) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 16, 26], fov: 40 }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={['#070b12']} />
      <fog attach="fog" args={['#070b12', 40, 88]} />

      <ambientLight intensity={0.82} color="#c5d7f2" />
      <directionalLight
        position={[8, 16, 12]}
        intensity={1.65}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={16}
        shadow-camera-bottom={-14}
      />
      <directionalLight position={[-10, 10, -6]} intensity={0.5} color="#8db5ff" />

      <Suspense fallback={null}>
        <ResponsiveCamera />
        <Building agents={agents} selectedId={selectedId} onSelect={onSelect} onHover={onHover} />
        <ContactShadows position={[0, -0.12, 4]} opacity={0.42} scale={38} blur={2.4} far={18} />
      </Suspense>

      <OrbitControls
        enablePan={false}
        minDistance={16}
        maxDistance={65}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.3}
        target={[0, 1.35, 3.2]}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
