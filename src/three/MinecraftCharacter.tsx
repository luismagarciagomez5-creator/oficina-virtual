import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Agent } from '../types';

type Props = {
  agent: Agent;
  center: [number, number, number];
  patrolAmplitude: number;
  phase: number;
  seated?: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

const STATUS_COLOR: Record<Agent['status'], string> = {
  online: '#34d399',
  working: '#fbbf24',
  idle: '#94a3b8',
  offline: '#f43f5e',
};

const STATUS_LABEL: Record<Agent['status'], string> = {
  online: 'Disponible',
  working: 'Trabajando',
  idle: 'Inactivo',
  offline: 'Desconectado',
};

export default function MinecraftCharacter({
  agent,
  center,
  patrolAmplitude,
  phase,
  seated = false,
  isSelected,
  onSelect,
  onHover,
}: Props) {
  const group = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const bodyBob = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const speed = 0.6;
  const legSpeed = 5.5;

  const { shirtColor, pantsColor, skinColor, hairColor } = agent.appearance;

  const materials = useMemo(
    () => ({
      shirt: new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.7 }),
      pants: new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 }),
      skin: new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 }),
      hair: new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 }),
    }),
    [shirtColor, pantsColor, skinColor, hairColor],
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const localX = seated ? 0 : Math.sin(t * speed + phase) * patrolAmplitude;
    const velocity = Math.cos(t * speed + phase);

    if (group.current) {
      group.current.position.set(center[0] + localX, center[1], center[2]);
      const targetYaw = seated ? Math.PI : velocity >= 0 ? Math.PI / 2 : -Math.PI / 2;
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetYaw, 0.06);
    }

    const swing = Math.sin(t * legSpeed) * 0.55;
    if (leftLeg.current) leftLeg.current.rotation.x = swing;
    if (rightLeg.current) rightLeg.current.rotation.x = -swing;
    if (leftArm.current) leftArm.current.rotation.x = -swing;
    if (rightArm.current) rightArm.current.rotation.x = swing;
    if (bodyBob.current) {
      bodyBob.current.position.y = seated ? -0.2 : Math.abs(Math.sin(t * legSpeed)) * 0.05;
    }
  });

  return (
    <group
      ref={group}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(agent.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover(agent.id);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover(null);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* easier click/hover target than the thin body parts */}
      <mesh position={[0, 1, 0]} visible={false}>
        <boxGeometry args={[0.9, 2, 0.7]} />
      </mesh>

      <group ref={bodyBob}>
        {/* Seated limbs bend toward local +Z, which faces the computer. */}
        {seated ? (
          <>
            {[-0.14, 0.14].map((x) => (
              <group key={x} position={[x, 0.86, 0]}>
                <mesh position={[0, 0, 0.26]} material={materials.pants} castShadow>
                  <boxGeometry args={[0.24, 0.24, 0.58]} />
                </mesh>
                <mesh position={[0, -0.31, 0.53]} material={materials.pants} castShadow>
                  <boxGeometry args={[0.24, 0.58, 0.24]} />
                </mesh>
                <mesh position={[0, -0.61, 0.61]} material={materials.pants} castShadow>
                  <boxGeometry args={[0.27, 0.14, 0.4]} />
                </mesh>
              </group>
            ))}
          </>
        ) : (
          <>
            <group ref={leftLeg} position={[-0.13, 0.75, 0]}>
              <mesh position={[0, -0.375, 0]} material={materials.pants} castShadow>
                <boxGeometry args={[0.24, 0.75, 0.24]} />
              </mesh>
            </group>
            <group ref={rightLeg} position={[0.13, 0.75, 0]}>
              <mesh position={[0, -0.375, 0]} material={materials.pants} castShadow>
                <boxGeometry args={[0.24, 0.75, 0.24]} />
              </mesh>
            </group>
          </>
        )}

        {/* torso */}
        <mesh position={[0, 1.1, 0]} material={materials.shirt} castShadow>
          <boxGeometry args={[0.5, 0.7, 0.28]} />
        </mesh>

        {/* arms */}
        {seated ? (
          <>
            {[-0.32, 0.32].map((x) => (
              <group key={x}>
                <group position={[x, 1.43, 0]} rotation={[-0.58, 0, 0]}>
                  <mesh position={[0, -0.23, 0]} material={materials.shirt} castShadow>
                    <boxGeometry args={[0.22, 0.46, 0.22]} />
                  </mesh>
                </group>
                <group position={[x, 1.16, 0.17]} rotation={[-Math.PI / 2, 0, 0]}>
                  <mesh position={[0, -0.22, 0]} material={materials.shirt} castShadow>
                    <boxGeometry args={[0.22, 0.44, 0.22]} />
                  </mesh>
                  <mesh position={[0, -0.48, 0]} material={materials.skin} castShadow>
                    <boxGeometry args={[0.23, 0.14, 0.24]} />
                  </mesh>
                </group>
              </group>
            ))}
          </>
        ) : (
          <>
            <group ref={leftArm} position={[-0.38, 1.45, 0]}>
              <mesh position={[0, -0.35, 0]} material={materials.shirt} castShadow>
                <boxGeometry args={[0.22, 0.7, 0.22]} />
              </mesh>
              <mesh position={[0, -0.68, 0]} material={materials.skin} castShadow>
                <boxGeometry args={[0.22, 0.12, 0.22]} />
              </mesh>
            </group>
            <group ref={rightArm} position={[0.38, 1.45, 0]}>
              <mesh position={[0, -0.35, 0]} material={materials.shirt} castShadow>
                <boxGeometry args={[0.22, 0.7, 0.22]} />
              </mesh>
              <mesh position={[0, -0.68, 0]} material={materials.skin} castShadow>
                <boxGeometry args={[0.22, 0.12, 0.22]} />
              </mesh>
            </group>
          </>
        )}

        {/* head */}
        <mesh position={[0, 1.72, 0]} material={materials.skin} castShadow>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
        </mesh>
        <mesh position={[0, 1.99, 0]} material={materials.hair} castShadow>
          <boxGeometry args={[0.52, 0.14, 0.52]} />
        </mesh>

        {/* status light */}
        <mesh position={[0, 2.25, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial
            color={STATUS_COLOR[agent.status]}
            emissive={STATUS_COLOR[agent.status]}
            emissiveIntensity={1.6}
          />
        </mesh>

        <Html position={[0, 2.55, 0]} center distanceFactor={9} occlude={false} zIndexRange={[10, 0]}>
          <div className="flex flex-col items-center pointer-events-none select-none">
            <div
              className="px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-100 bg-slate-900/85 border whitespace-nowrap shadow-lg"
              style={{ borderColor: isSelected ? '#ffffff' : agent.color }}
            >
              {agent.name}
            </div>
            {(hovered || isSelected) && (
              <div className="mt-0.5 text-[9px] text-slate-300 bg-slate-900/70 px-1.5 rounded-full whitespace-nowrap">
                {STATUS_LABEL[agent.status]}
              </div>
            )}
          </div>
        </Html>
      </group>

      {/* Keep the interaction marker on the floor when the seated body lowers. */}
      {(isSelected || hovered) && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.62, 32]} />
          <meshBasicMaterial color={agent.color} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}
