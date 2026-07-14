import { Html } from '@react-three/drei';
import type { CSSProperties } from 'react';
import type { Agent } from '../types';
import { ROOM_D, ROOM_W, WALL_H, WALL_T } from './layout';

type Props = {
  agent: Agent;
  center: [number, number, number];
  width?: number;
  depth?: number;
};

function Computer({ color, x = 0 }: { color: string; x?: number }) {
  return (
    <group position={[x, 0.89, -0.12]}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.78, 0.5, 0.08]} />
        <meshStandardMaterial color="#09080c" metalness={0.72} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.18, 0.046]}>
        <planeGeometry args={[0.68, 0.4]} />
        <meshStandardMaterial color="#0b0612" emissive="#6d28d9" emissiveIntensity={1.15} />
      </mesh>
      <mesh position={[-0.22, 0.28, 0.052]}>
        <planeGeometry args={[0.18, 0.025]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[-0.19, 0.18, 0.052]}>
        <planeGeometry args={[0.24, 0.035]} />
        <meshBasicMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0.19, 0.15, 0.052]}>
        <planeGeometry args={[0.18, 0.17]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, -0.12, 0]} castShadow>
        <boxGeometry args={[0.07, 0.16, 0.07]} />
        <meshStandardMaterial color="#0b090e" metalness={0.75} />
      </mesh>
      <mesh position={[0, -0.2, 0.02]} castShadow>
        <boxGeometry args={[0.3, 0.035, 0.16]} />
        <meshStandardMaterial color="#0b090e" metalness={0.75} />
      </mesh>
    </group>
  );
}

function DeskSetup({ color, executive }: { color: string; executive: boolean }) {
  const deskWidth = executive ? 3 : 2.35;

  return (
    <group>
      <mesh position={[0, 0.69, 0]} castShadow receiveShadow>
        <boxGeometry args={[deskWidth, 0.12, 0.92]} />
        <meshStandardMaterial color="#2b2530" metalness={0.44} roughness={0.3} />
      </mesh>
      {[-deskWidth / 2 + 0.15, deskWidth / 2 - 0.15].map((x) => (
        <mesh key={x} position={[x, 0.35, 0]} castShadow>
          <boxGeometry args={[0.1, 0.7, 0.72]} />
          <meshStandardMaterial color="#151219" metalness={0.72} roughness={0.26} />
        </mesh>
      ))}
      <mesh position={[-deskWidth / 2 + 0.35, 0.37, 0.02]} castShadow>
        <boxGeometry args={[0.55, 0.6, 0.68]} />
        <meshStandardMaterial color="#2b2431" metalness={0.4} roughness={0.36} />
      </mesh>
      {[0.2, 0.38, 0.56].map((y) => (
        <mesh key={y} position={[-deskWidth / 2 + 0.35, y, 0.368]}>
          <boxGeometry args={[0.4, 0.025, 0.012]} />
          <meshBasicMaterial color="#8b5cf6" />
        </mesh>
      ))}

      {executive ? (
        <>
          <Computer color={color} x={-0.48} />
          <Computer color={color} x={0.48} />
        </>
      ) : (
        <Computer color={color} />
      )}

      <mesh position={[0, 0.77, 0.31]} rotation={[0.02, 0, 0]} castShadow>
        <boxGeometry args={[0.72, 0.035, 0.25]} />
        <meshStandardMaterial color="#0d0b10" metalness={0.55} roughness={0.28} />
      </mesh>
      <mesh position={[0.58, 0.77, 0.31]} castShadow>
        <boxGeometry args={[0.13, 0.035, 0.19]} />
        <meshStandardMaterial color="#0d0b10" metalness={0.55} roughness={0.28} />
      </mesh>

      <group position={[0, 0, 1.05]}>
        <mesh position={[0, 0.62, 0]} castShadow>
          <boxGeometry args={[0.72, 0.62, 0.15]} />
          <meshStandardMaterial color="#292330" metalness={0.32} roughness={0.44} />
        </mesh>
        <mesh position={[0, 0.62, 0.081]}>
          <boxGeometry args={[0.5, 0.045, 0.018]} />
          <meshStandardMaterial color="#8b5cf6" emissive="#7c3aed" emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[0, 0.35, -0.06]} castShadow>
          <boxGeometry args={[0.65, 0.11, 0.58]} />
          <meshStandardMaterial color="#211b27" metalness={0.38} roughness={0.42} />
        </mesh>
        <mesh position={[0, 0.09, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.48, 12]} />
          <meshStandardMaterial color="#08070a" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 0.72, 8]} />
          <meshStandardMaterial color="#08070a" metalness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

function LuminousBeacon({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <pointLight position={[0, 1.18, 0]} color="#f5f3ff" intensity={1.35} distance={4.6} decay={2} />

      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.4, 0.16, 16]} />
        <meshStandardMaterial color="#09070d" metalness={0.82} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.27, 0.31, 0.08, 16]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#7c3aed" emissiveIntensity={1.4} metalness={0.55} />
      </mesh>

      <mesh position={[0, 0.82, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 1.22, 12]} />
        <meshStandardMaterial color="#17131d" metalness={0.72} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0.86, 0]}>
        <cylinderGeometry args={[0.045, 0.055, 1.08, 12]} />
        <meshStandardMaterial color="#f5f3ff" emissive="#ddd6fe" emissiveIntensity={2.2} />
      </mesh>

      {[0.48, 0.84, 1.2].map((y, i) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2 + i * 0.035, 0.025, 8, 24]} />
          <meshStandardMaterial color="#a78bfa" emissive="#8b5cf6" emissiveIntensity={1.8} metalness={0.45} />
        </mesh>
      ))}

      <mesh position={[0, 1.52, 0]}>
        <sphereGeometry args={[0.19, 16, 12]} />
        <meshStandardMaterial color="#f5f3ff" emissive="#a78bfa" emissiveIntensity={2.1} metalness={0.28} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.29, 0.03, 8, 28]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#7c3aed" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

function WoodFloor({ width, depth }: { width: number; depth: number }) {
  const plankCount = Math.ceil(depth / 0.48);
  const plankDepth = depth / plankCount;
  const wood = ['#241c24', '#302331', '#1c171e', '#38263b'];

  return (
    <group position={[0, -0.025, 0]}>
      {Array.from({ length: plankCount }, (_, i) => {
        const z = -depth / 2 + plankDepth * (i + 0.5);
        return (
          <mesh key={i} position={[0, 0, z]} receiveShadow>
            <boxGeometry args={[width - 0.12, 0.07, plankDepth - 0.025]} />
            <meshStandardMaterial color={wood[i % wood.length]} roughness={0.76} />
          </mesh>
        );
      })}
      {[-width / 3, width / 3].map((x) => (
        <mesh key={x} position={[x, 0.039, 0]}>
          <boxGeometry args={[0.018, 0.006, depth - 0.12]} />
          <meshBasicMaterial color="#7c3aed" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function OfficeWindow({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1.85, 1.18, 0.09]} />
        <meshStandardMaterial color="#09070d" metalness={0.78} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0, 0.051]}>
        <planeGeometry args={[1.62, 0.95]} />
        <meshStandardMaterial color="#10071c" emissive="#6d28d9" emissiveIntensity={0.72} metalness={0.42} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0, 0.062]}>
        <boxGeometry args={[0.045, 0.98, 0.025]} />
        <meshStandardMaterial color="#e9d5ff" metalness={0.72} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.063]}>
        <boxGeometry args={[1.65, 0.045, 0.025]} />
        <meshStandardMaterial color="#e9d5ff" metalness={0.72} roughness={0.2} />
      </mesh>
      <mesh position={[-0.55, -0.31, 0.07]}>
        <planeGeometry args={[0.28, 0.12]} />
        <meshBasicMaterial color={color} transparent opacity={0.68} />
      </mesh>
      <mesh position={[0.48, 0.27, 0.07]}>
        <planeGeometry args={[0.38, 0.06]} />
        <meshBasicMaterial color="#d2efff" transparent opacity={0.72} />
      </mesh>
    </group>
  );
}

function OnyxLinkWallSign({ depth }: { depth: number }) {
  return (
    <Html position={[0, 2.06, -depth / 2 + 0.16]} center distanceFactor={8} zIndexRange={[4, 0]}>
      <div
        style={{
          width: 220,
          height: 56,
          border: '1px solid rgba(139, 92, 246, 0.85)',
          borderRadius: 3,
          background: '#191919',
          boxShadow: '0 0 24px rgba(124,58,237,.55), 0 7px 18px rgba(0,0,0,.55)',
          overflow: 'hidden',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <img
          src="/onyxlink-brand.jpg"
          alt="ONYXLINK Artificial Intelligence"
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 53%' }}
        />
      </div>
    </Html>
  );
}

export default function OfficeRoom({ agent, center, width = ROOM_W, depth = ROOM_D }: Props) {
  const executive = agent.id === 'coordinator';
  const deskZ = -depth / 2 + 1.25;

  return (
    <group position={center}>
      <WoodFloor width={width} depth={depth} />
      <mesh position={[0, 0.016, 1.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[executive ? 3.8 : 3.25, executive ? 2.1 : 1.85]} />
        <meshStandardMaterial color="#17111d" transparent opacity={0.92} roughness={0.7} />
      </mesh>

      <pointLight position={[0, 2.15, -depth / 2 + 1.25]} color="#8b5cf6" intensity={2.45} distance={6.2} decay={2} />
      <pointLight position={[0, 2.8, 1]} color="#f5f3ff" intensity={1.08} distance={5.6} decay={2} />

      <mesh position={[0, WALL_H / 2, -depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[width, WALL_H, WALL_T]} />
        <meshStandardMaterial color="#2a2430" metalness={0.18} roughness={0.6} />
      </mesh>
      <mesh position={[-width / 2, WALL_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_T, WALL_H, depth]} />
        <meshStandardMaterial color="#1d1922" metalness={0.16} roughness={0.66} />
      </mesh>
      <mesh position={[width / 2, WALL_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_T, WALL_H, depth]} />
        <meshStandardMaterial color="#1d1922" metalness={0.16} roughness={0.66} />
      </mesh>

      <mesh position={[0, 2.84, -0.35]}>
        <boxGeometry args={[1.9, 0.08, 0.9]} />
        <meshStandardMaterial color="#09070d" metalness={0.72} roughness={0.24} />
      </mesh>
      <mesh position={[0, 2.79, -0.35]}>
        <boxGeometry args={[1.7, 0.04, 0.72]} />
        <meshStandardMaterial color="#f5f3ff" emissive="#c4b5fd" emissiveIntensity={1.7} />
      </mesh>

      <mesh position={[0, 0.1, -depth / 2 + 0.12]}>
        <boxGeometry args={[width - 0.25, 0.11, 0.08]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#7c3aed" emissiveIntensity={1.1} />
      </mesh>

      <group position={[0, 0, deskZ]}>
        <DeskSetup color={agent.color} executive={executive} />
      </group>

      <group position={[-width / 2 + 0.55, 1.72, -depth / 2 + 0.16]}>
        <mesh castShadow>
          <boxGeometry args={[0.85, 0.72, 0.09]} />
          <meshStandardMaterial color="#09070d" metalness={0.55} roughness={0.34} />
        </mesh>
        <mesh position={[0, 0, 0.052]}>
          <planeGeometry args={[0.69, 0.55]} />
          <meshStandardMaterial color="#6d28d9" emissive="#7c3aed" emissiveIntensity={0.65} />
        </mesh>
        <mesh position={[0, 0.1, 0.058]}>
          <planeGeometry args={[0.42, 0.045]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[0, -0.07, 0.058]}>
          <planeGeometry args={[0.55, 0.025]} />
          <meshBasicMaterial color="#d4dbe6" />
        </mesh>
      </group>

      <OfficeWindow position={[width / 2 - 2.1, 1.82, -depth / 2 + 0.16]} color={agent.color} />
      {executive && <OnyxLinkWallSign depth={depth} />}

      <group position={[width / 2 - 0.52, 0, -depth / 2 + 0.48]}>
        <mesh position={[0, 0.72, 0]} castShadow>
          <boxGeometry args={[0.75, 1.44, 0.55]} />
          <meshStandardMaterial color="#2b2431" metalness={0.4} roughness={0.38} />
        </mesh>
        {[0.32, 0.75, 1.18].map((y) => (
          <mesh key={y} position={[0, y, 0.285]}>
            <boxGeometry args={[0.62, 0.025, 0.02]} />
            <meshBasicMaterial color="#8b5cf6" />
          </mesh>
        ))}
      </group>
      <LuminousBeacon position={[width / 2 - 0.7, 0, 0.8]} />

      <Html position={[0, WALL_H + 0.18, -depth / 2]} center zIndexRange={[5, 0]}>
        <div className="office-sign" style={{ '--agent-color': '#8b5cf6' } as CSSProperties}>
          <span className="office-sign__dot" />
          {agent.department}
        </div>
      </Html>
    </group>
  );
}
