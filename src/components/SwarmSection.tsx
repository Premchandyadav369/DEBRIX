import { useRef, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// --- Debris (garbage satellites & fragments) ---
interface DebrisItem {
  id: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  type: "sat" | "panel" | "fragment";
  color: string;
  tumbleSpeed: THREE.Vector3;
}

const DEBRIS_ITEMS: DebrisItem[] = Array.from({ length: 18 }, (_, i) => {
  const theta = Math.random() * Math.PI * 2;
  const phi = (Math.random() - 0.5) * 1.2;
  const r = 2.5 + Math.random() * 1.8;
  const types: DebrisItem["type"][] = ["sat", "panel", "fragment"];
  const type = types[i % 3];
  return {
    id: i,
    position: new THREE.Vector3(
      Math.cos(theta) * Math.cos(phi) * r,
      Math.sin(phi) * r * 0.4,
      Math.sin(theta) * Math.cos(phi) * r
    ),
    rotation: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
    scale: type === "sat" ? 0.12 + Math.random() * 0.08 : type === "panel" ? 0.08 + Math.random() * 0.06 : 0.03 + Math.random() * 0.04,
    type,
    color: ["#ff6b6b", "#ffa94d", "#ff8787", "#e8590c", "#fa5252", "#fd7e14"][i % 6],
    tumbleSpeed: new THREE.Vector3(
      (Math.random() - 0.5) * 0.8,
      (Math.random() - 0.5) * 0.8,
      (Math.random() - 0.5) * 0.8
    ),
  };
});

function GarbageSatellite({ item }: { item: DebrisItem }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x += item.tumbleSpeed.x * 0.01;
    ref.current.rotation.y += item.tumbleSpeed.y * 0.01;
    ref.current.rotation.z += item.tumbleSpeed.z * 0.01;
    // Slight orbital drift
    const drift = t * 0.03;
    ref.current.position.x = item.position.x + Math.sin(drift + item.id) * 0.1;
    ref.current.position.z = item.position.z + Math.cos(drift + item.id) * 0.1;
  });

  const s = item.scale;

  if (item.type === "sat") {
    return (
      <group ref={ref} position={item.position} rotation={item.rotation}>
        {/* Dead satellite body */}
        <mesh>
          <boxGeometry args={[s * 3, s * 1.5, s * 2]} />
          <meshStandardMaterial color="#555" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* Broken solar panel */}
        <mesh position={[s * 3, 0, 0]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[s * 2.5, s * 0.1, s * 1.5]} />
          <meshStandardMaterial color="#1a3a5a" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* Dangling panel */}
        <mesh position={[-s * 2.5, s * 0.3, 0]} rotation={[0.5, 0, -0.4]}>
          <boxGeometry args={[s * 2, s * 0.1, s * 1.2]} />
          <meshStandardMaterial color="#1a3a5a" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* Antenna */}
        <mesh position={[0, s * 1.2, 0]}>
          <cylinderGeometry args={[s * 0.05, s * 0.05, s * 1.5, 6]} />
          <meshStandardMaterial color="#888" />
        </mesh>
        {/* Warning glow */}
        <pointLight color={item.color} intensity={0.4} distance={1.5} />
      </group>
    );
  }

  if (item.type === "panel") {
    return (
      <group ref={ref} position={item.position} rotation={item.rotation}>
        <mesh>
          <boxGeometry args={[s * 4, s * 0.15, s * 2.5]} />
          <meshStandardMaterial color="#1a3a5a" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[s, 0, 0]}>
          <boxGeometry args={[s * 0.5, s * 0.5, s * 0.5]} />
          <meshStandardMaterial color="#666" metalness={0.5} />
        </mesh>
      </group>
    );
  }

  // Fragment
  return (
    <group ref={ref} position={item.position} rotation={item.rotation}>
      <mesh>
        <dodecahedronGeometry args={[s, 0]} />
        <meshStandardMaterial color="#777" metalness={0.6} roughness={0.5} />
      </mesh>
    </group>
  );
}

// --- Debrix hunter satellites ---
interface SwarmSat {
  id: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitOffset: number;
  inclination: number;
  color: string;
  targetDebrisIdx: number;
}

const SWARM: SwarmSat[] = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  orbitRadius: 2.4 + i * 0.18,
  orbitSpeed: 0.25 + Math.random() * 0.15,
  orbitOffset: (i / 8) * Math.PI * 2,
  inclination: (Math.random() - 0.5) * 0.5,
  color: ["#22b8cf", "#38d9a9", "#4dabf7", "#74c0fc", "#22b8cf", "#69db7c", "#38d9a9", "#91a7ff"][i],
  targetDebrisIdx: i % DEBRIS_ITEMS.length,
}));

function DebrixHunter({ sat }: { sat: SwarmSat }) {
  const ref = useRef<THREE.Group>(null);
  const laserRef = useRef<THREE.Mesh>(null);

  const trailGeometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) {
      const angle = sat.orbitOffset + (i / 80) * Math.PI * 2;
      const x = Math.cos(angle) * sat.orbitRadius;
      const y = Math.sin(angle) * sat.inclination * 0.6;
      const z = Math.sin(angle) * sat.orbitRadius;
      pts.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [sat]);

  const trailMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: sat.color, transparent: true, opacity: 0.12 }),
    [sat.color]
  );

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * sat.orbitSpeed + sat.orbitOffset;
    ref.current.position.x = Math.cos(t) * sat.orbitRadius;
    ref.current.position.y = Math.sin(t) * sat.inclination * 0.6;
    ref.current.position.z = Math.sin(t) * sat.orbitRadius;
    ref.current.rotation.y = t + Math.PI;

    // Pulse the "scanner beam"
    if (laserRef.current) {
      const mat = laserRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 3 + sat.id) * 0.15;
    }
  });

  return (
    <>
      <primitive object={new THREE.Line(trailGeometry, trailMaterial)} />
      <group ref={ref}>
        {/* Main body - sleek hexagonal */}
        <mesh>
          <boxGeometry args={[0.18, 0.08, 0.12]} />
          <meshStandardMaterial color={sat.color} emissive={sat.color} emissiveIntensity={0.6} metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Solar panels */}
        <mesh position={[0.18, 0, 0]}>
          <boxGeometry args={[0.14, 0.01, 0.08]} />
          <meshStandardMaterial color="#0d3b66" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[-0.18, 0, 0]}>
          <boxGeometry args={[0.14, 0.01, 0.08]} />
          <meshStandardMaterial color="#0d3b66" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Capture arm */}
        <mesh position={[0, -0.06, 0.08]} rotation={[0.3, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.012, 0.12, 6]} />
          <meshStandardMaterial color="#aaa" metalness={0.7} />
        </mesh>
        {/* Scanner cone */}
        <mesh ref={laserRef} position={[0, -0.15, 0]} rotation={[0, 0, 0]}>
          <coneGeometry args={[0.15, 0.4, 8, 1, true]} />
          <meshStandardMaterial color={sat.color} transparent opacity={0.2} emissive={sat.color} emissiveIntensity={1} side={THREE.DoubleSide} />
        </mesh>
        {/* Active light */}
        <pointLight color={sat.color} intensity={0.5} distance={1.2} />
      </group>
    </>
  );
}

function Earth() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.04;
  });
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color="#0a2a4a" emissive="#051525" emissiveIntensity={0.3} />
      </mesh>
      {/* Atmosphere */}
      <mesh>
        <sphereGeometry args={[1.04, 48, 48]} />
        <meshStandardMaterial color="#22b8cf" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
      {/* Glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.05, 1.15, 64]} />
        <meshStandardMaterial color="#22b8cf" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Tiny particles for micro-debris field
function MicroDebris() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * 1.4;
      const r = 2.2 + Math.random() * 2.2;
      arr[i * 3] = Math.cos(theta) * Math.cos(phi) * r;
      arr[i * 3 + 1] = Math.sin(phi) * r * 0.3;
      arr[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.015;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.015} color="#ff6b6b" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

function SwarmScene() {
  return (
    <div className="w-full h-[480px] md:h-[580px]">
      <Canvas camera={{ position: [0, 3.5, 6.5], fov: 42 }}>
        <ambientLight intensity={0.15} />
        <directionalLight position={[5, 3, 5]} intensity={0.7} color="#cce5ff" />
        <directionalLight position={[-3, -2, -4]} intensity={0.2} color="#ff8866" />
        <Earth />
        <MicroDebris />
        {DEBRIS_ITEMS.map((item) => (
          <GarbageSatellite key={item.id} item={item} />
        ))}
        {SWARM.map((sat) => (
          <DebrixHunter key={sat.id} sat={sat} />
        ))}
        <OrbitControls enableZoom enablePan={false} autoRotate autoRotateSpeed={0.15} maxDistance={12} minDistance={3} />
      </Canvas>
    </div>
  );
}

const SwarmSection = () => {
  const [showLegend, setShowLegend] = useState(true);

  return (
    <section id="swarm" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Formation</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Swarm vs Debris Field</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            8 Debrix hunters navigate through a dense debris field — dead satellites, broken panels, and micro-fragments — scanning and targeting for capture.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-2 mb-8 overflow-hidden relative">
          <SwarmScene />

          {/* Legend overlay */}
          {showLegend && (
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-3 p-3 rounded-lg bg-background/70 backdrop-blur-sm border border-border/30">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22b8cf] shadow-[0_0_6px_#22b8cf]" />
                <span className="text-[10px] text-foreground font-display">Debrix Hunters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#555]" />
                <span className="text-[10px] text-foreground font-display">Dead Satellites</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#1a3a5a]" />
                <span className="text-[10px] text-foreground font-display">Broken Panels</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ff6b6b]" />
                <span className="text-[10px] text-foreground font-display">Micro-debris</span>
              </div>
              <button onClick={() => setShowLegend(false)} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground">✕</button>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Debrix Hunters", value: "8", accent: true },
            { label: "Debris Objects", value: "218+" },
            { label: "Formation", value: "Walker-δ" },
            { label: "Targets Locked", value: "18" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4 text-center">
              <p className={`text-2xl font-display font-bold ${stat.accent ? "text-primary" : "text-destructive"}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SwarmSection;
