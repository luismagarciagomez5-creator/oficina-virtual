import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect } from 'react';
import * as THREE from 'three';
import type { Agent } from '../types';
import Building from './Building';

export type CameraMode = 'iso' | '2d';

type Props = {
  agents: Agent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  cameraMode: CameraMode;
};

function ResponsiveCamera({ cameraMode }: { cameraMode: CameraMode }) {
  const { camera, size } = useThree();

  useEffect(() => {
    const narrow = size.width < 640;

    if (cameraMode === '2d') {
      camera.position.set(0, narrow ? 58 : 46, narrow ? 14 : 10);
    } else {
      camera.position.set(0, narrow ? 27 : 16, narrow ? 52 : 26);
    }
    camera.lookAt(0, 1.35, 3.2);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = narrow ? 43 : 40;
      camera.updateProjectionMatrix();
    }
  }, [camera, size.width, cameraMode]);

  return null;
}

export default function OfficeCanvas({ agents, selectedId, onSelect, onHover, cameraMode }: Props) {
  const isIso = cameraMode === 'iso';

  return (
    <Canvas
      shadows
      camera={{ position: [0, 16, 26], fov: 40 }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={['#050407']} />
      <fog attach="fog" args={['#050407', 40, 88]} />

      <ambientLight intensity={1.24} color="#f5f3ff" />
      <hemisphereLight args={['#f5f3ff', '#170d21', 0.62]} />
      <directionalLight
        position={[8, 16, 12]}
        intensity={2.2}
        color="#f5f3ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={16}
        shadow-camera-bottom={-14}
      />
      <directionalLight position={[-10, 10, -6]} intensity={1.12} color="#c4b5fd" />
      <pointLight position={[0, 9, 5]} intensity={2.15} color="#7c3aed" distance={32} decay={2} />

      <Suspense fallback={null}>
        <ResponsiveCamera cameraMode={cameraMode} />
        <Building agents={agents} selectedId={selectedId} onSelect={onSelect} onHover={onHover} />
        <ContactShadows position={[0, -0.12, 4]} opacity={0.42} scale={38} blur={2.4} far={18} />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableRotate={isIso}
        minDistance={16}
        maxDistance={65}
        minPolarAngle={isIso ? Math.PI / 6 : 0.08}
        maxPolarAngle={isIso ? Math.PI / 2.3 : 0.08}
        target={[0, 1.35, 3.2]}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
