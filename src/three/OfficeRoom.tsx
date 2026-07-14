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
        <meshStandardMaterial color="#111827" metalness={0.35} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.18, 0.046]}>
        <planeGeometry args={[0.68, 0.4]} />
        <meshStandardMaterial color="#071525" emissive="#153b5b" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-0.22, 0.28, 0.052]}>
        <planeGeometry args={[0.18, 0.025]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[-0.19, 0.18, 0.052]}>
        <planeGeometry args={[0.24, 0.035]} />
        <meshBasicMaterial color="#91a4bd" />
      </mesh>
      <mesh position={[0.19, 0.15, 0.052]}>
        <planeGeometry args={[0.18, 0.17]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, -0.12, 0]} castShadow>
        <boxGeometry args={[0.07, 0.16, 0.07]} />
        <meshStandardMaterial color="#151b28" metalness={0.5} />
      </mesh>
      <mesh position={[0, -0.2, 0.02]} castShadow>
        <boxGeometry args={[0.3, 0.035, 0.16]} />
        <meshStandardMaterial color="#151b28" metalness={0.5} />
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
        <meshStandardMaterial color="#9a6845" roughness={0.48} />
      </mesh>
      {[-deskWidth / 2 + 0.15, deskWidth / 2 - 0.15].map((x) => (
        <mesh key={x} position={[x, 0.35, 0]} castShadow>
          <boxGeometry args={[0.1, 0.7, 0.72]} />
          <meshStandardMaterial color="#263142" metalness={0.45} roughness={0.38} />
        </mesh>
      ))}
      <mesh position={[-deskWidth / 2 + 0.35, 0.37, 0.02]} castShadow>
        <boxGeometry args={[0.55, 0.6, 0.68]} />
        <meshStandardMaterial color="#3c4655" roughness={0.55} />
      </mesh>
      {[0.2, 0.38, 0.56].map((y) => (
        <mesh key={y} position={[-deskWidth / 2 + 0.35, y, 0.368]}>
          <boxGeometry args={[0.4, 0.025, 0.012]} />
          <meshBasicMaterial color="#8793a5" />
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
        <meshStandardMaterial color="#1c2431" roughness={0.4} />
      </mesh>
      <mesh position={[0.58, 0.77, 0.31]} castShadow>
        <boxGeometry args={[0.13, 0.035, 0.19]} />
        <meshStandardMaterial color="#1c2431" roughness={0.4} />
      </mesh>

      <group position={[0, 0, 1.05]}>
        <mesh position={[0, 0.62, 0]} castShadow>
          <boxGeometry args={[0.72, 0.62, 0.15]} />
          <meshStandardMaterial color="#334155" roughness={0.72} />
        </mesh>
        <mesh position={[0, 0.35, -0.06]} castShadow>
          <boxGeometry args={[0.65, 0.11, 0.58]} />
          <meshStandardMaterial color="#263244" roughness={0.72} />
        </mesh>
        <mesh position={[0, 0.09, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.48, 12]} />
          <meshStandardMaterial color="#171e2b" metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 0.72, 8]} />
          <meshStandardMaterial color="#171e2b" metalness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.22, 0.5, 12]} />
        <meshStandardMaterial color="#8c5b43" roughness={0.85} />
      </mesh>
      {[-0.28, 0, 0.28].map((x, i) => (
        <mesh key={x} position={[x * 0.55, 0.68 + i * 0.08, 0]} rotation={[0, 0, x]} castShadow>
          <sphereGeometry args={[0.25, 10, 8]} />
          <meshStandardMaterial color={i === 1 ? '#49a66d' : '#347a56'} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function WoodFloor({ width, depth }: { width: number; depth: number }) {
  const plankCount = Math.ceil(depth / 0.48);
  const plankDepth = depth / plankCount;
  const wood = ['#7b4e32', '#8c5a38', '#70452e', '#95613d'];

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
          <meshBasicMaterial color="#3b281f" transparent opacity={0.55} />
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
        <meshStandardMaterial color="#131c29" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.051]}>
        <planeGeometry args={[1.62, 0.95]} />
        <meshStandardMaterial color="#17354b" emissive="#2f7194" emissiveIntensity={0.45} metalness={0.3} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0, 0.062]}>
        <boxGeometry args={[0.045, 0.98, 0.025]} />
        <meshStandardMaterial color="#a9b9c9" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0, 0.063]}>
        <boxGeometry args={[1.65, 0.045, 0.025]} />
        <meshStandardMaterial color="#a9b9c9" metalness={0.7} roughness={0.25} />
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
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          width: 184,
          height: 42,
          padding: '5px 10px',
          border: '1px solid rgba(203, 213, 225, 0.72)',
          borderRadius: 3,
          background: 'linear-gradient(180deg, rgba(248,250,252,.97), rgba(203,213,225,.94))',
          boxShadow: '0 0 18px rgba(226,232,240,.35), 0 5px 14px rgba(0,0,0,.4)',
          overflow: 'hidden',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            color: '#111827',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 22,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: 0,
            textShadow: '0 1px 0 #fff, 0 0 5px rgba(15,23,42,.25)',
          }}
        >
          ONYX
        </span>
        <span style={{ position: 'relative', display: 'block', width: 69, height: 31, overflow: 'hidden' }}>
          <img
            src="/onyxlink-logo.png"
            alt="LINK"
            draggable={false}
            style={{ position: 'absolute', width: 174, height: 35, maxWidth: 'none', left: -101, top: -2 }}
          />
        </span>
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
        <meshStandardMaterial color="#172033" transparent opacity={0.82} roughness={1} />
      </mesh>

      <pointLight position={[0, 2.15, -depth / 2 + 1.25]} color={agent.color} intensity={1.7} distance={5.5} decay={2} />
      <pointLight position={[0, 2.8, 1]} color="#d7e8ff" intensity={0.7} distance={5} decay={2} />

      <mesh position={[0, WALL_H / 2, -depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[width, WALL_H, WALL_T]} />
        <meshStandardMaterial color="#313a4d" roughness={0.82} />
      </mesh>
      <mesh position={[-width / 2, WALL_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_T, WALL_H, depth]} />
        <meshStandardMaterial color="#283144" roughness={0.85} />
      </mesh>
      <mesh position={[width / 2, WALL_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_T, WALL_H, depth]} />
        <meshStandardMaterial color="#283144" roughness={0.85} />
      </mesh>

      <mesh position={[0, 2.84, -0.35]}>
        <boxGeometry args={[1.9, 0.08, 0.9]} />
        <meshStandardMaterial color="#1f2937" roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.79, -0.35]}>
        <boxGeometry args={[1.7, 0.04, 0.72]} />
        <meshStandardMaterial color="#e7f0ff" emissive="#d7e8ff" emissiveIntensity={1.5} />
      </mesh>

      <mesh position={[0, 0.1, -depth / 2 + 0.12]}>
        <boxGeometry args={[width - 0.25, 0.11, 0.08]} />
        <meshStandardMaterial color={agent.color} emissive={agent.color} emissiveIntensity={0.65} />
      </mesh>

      <group position={[0, 0, deskZ]}>
        <DeskSetup color={agent.color} executive={executive} />
      </group>

      <group position={[-width / 2 + 0.55, 1.72, -depth / 2 + 0.16]}>
        <mesh castShadow>
          <boxGeometry args={[0.85, 0.72, 0.09]} />
          <meshStandardMaterial color="#101827" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0, 0.052]}>
          <planeGeometry args={[0.69, 0.55]} />
          <meshStandardMaterial color={agent.color} emissive={agent.color} emissiveIntensity={0.28} />
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
          <meshStandardMaterial color="#394456" roughness={0.75} />
        </mesh>
        {[0.32, 0.75, 1.18].map((y) => (
          <mesh key={y} position={[0, y, 0.285]}>
            <boxGeometry args={[0.62, 0.025, 0.02]} />
            <meshBasicMaterial color="#8b98aa" />
          </mesh>
        ))}
      </group>
      <Plant position={[width / 2 - 0.7, 0, 0.8]} />

      <Html position={[0, WALL_H + 0.18, -depth / 2]} center zIndexRange={[5, 0]}>
        <div className="office-sign" style={{ '--agent-color': agent.color } as CSSProperties}>
          <span className="office-sign__dot" />
          {agent.department}
        </div>
      </Html>
    </group>
  );
}
