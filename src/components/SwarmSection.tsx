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
    color: ["#ff8a65", "#ffab91", "#ef9a9a", "#e57373", "#ffcc80", "#ffb74d"][i % 6],
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
    const drift = t * 0.03;
    ref.current.position.x = item.position.x + Math.sin(drift + item.id) * 0.1;
    ref.current.position.z = item.position.z + Math.cos(drift + item.id) * 0.1;
  });

  const s = item.scale;

  if (item.type === "sat") {
    return (
      <group ref={ref} position={item.position} rotation={item.rotation}>
        <mesh>
          <boxGeometry args={[s * 3, s * 1.5, s * 2]} />
          <meshStandardMaterial color="#9e9e9e" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[s * 3, 0, 0]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[s * 2.5, s * 0.1, s * 1.5]} />
          <meshStandardMaterial color="#1565c0" metalness={0.6} roughness={0.2} />
        </mesh>
        <mesh position={[-s * 2.5, s * 0.3, 0]} rotation={[0.5, 0, -0.4]}>
          <boxGeometry args={[s * 2, s * 0.1, s * 1.2]} />
          <meshStandardMaterial color="#1565c0" metalness={0.6} roughness={0.2} />
        </mesh>
        <mesh position={[0, s * 1.2, 0]}>
          <cylinderGeometry args={[s * 0.05, s * 0.05, s * 1.5, 6]} />
          <meshStandardMaterial color="#bdbdbd" metalness={0.7} />
        </mesh>
        <pointLight color={item.color} intensity={0.3} distance={1.5} />
      </group>
    );
  }

  if (item.type === "panel") {
    return (
      <group ref={ref} position={item.position} rotation={item.rotation}>
        <mesh>
          <boxGeometry args={[s * 4, s * 0.15, s * 2.5]} />
          <meshStandardMaterial color="#1565c0" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[s, 0, 0]}>
          <boxGeometry args={[s * 0.5, s * 0.5, s * 0.5]} />
          <meshStandardMaterial color="#9e9e9e" metalness={0.6} />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={ref} position={item.position} rotation={item.rotation}>
      <mesh>
        <dodecahedronGeometry args={[s, 0]} />
        <meshStandardMaterial color="#bdbdbd" metalness={0.7} roughness={0.4} />
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
}

const SWARM: SwarmSat[] = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  orbitRadius: 2.4 + i * 0.18,
  orbitSpeed: 0.25 + Math.random() * 0.15,
  orbitOffset: (i / 8) * Math.PI * 2,
  inclination: (Math.random() - 0.5) * 0.5,
  color: ["#4fc3f7", "#4dd0e1", "#4db6ac", "#81c784", "#4fc3f7", "#aed581", "#4dd0e1", "#90caf9"][i],
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
    () => new THREE.LineBasicMaterial({ color: sat.color, transparent: true, opacity: 0.18 }),
    [sat.color]
  );

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * sat.orbitSpeed + sat.orbitOffset;
    ref.current.position.x = Math.cos(t) * sat.orbitRadius;
    ref.current.position.y = Math.sin(t) * sat.inclination * 0.6;
    ref.current.position.z = Math.sin(t) * sat.orbitRadius;
    ref.current.rotation.y = t + Math.PI;

    if (laserRef.current) {
      const mat = laserRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.12 + Math.sin(state.clock.elapsedTime * 3 + sat.id) * 0.12;
    }
  });

  return (
    <>
      <primitive object={new THREE.Line(trailGeometry, trailMaterial)} />
      <group ref={ref}>
        {/* Reflective white/silver body */}
        <mesh>
          <boxGeometry args={[0.18, 0.08, 0.12]} />
          <meshStandardMaterial color="#e0e0e0" emissive={sat.color} emissiveIntensity={0.3} metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Golden solar panels */}
        <mesh position={[0.18, 0, 0]}>
          <boxGeometry args={[0.14, 0.01, 0.08]} />
          <meshStandardMaterial color="#1565c0" metalness={0.8} roughness={0.15} />
        </mesh>
        <mesh position={[-0.18, 0, 0]}>
          <boxGeometry args={[0.14, 0.01, 0.08]} />
          <meshStandardMaterial color="#1565c0" metalness={0.8} roughness={0.15} />
        </mesh>
        {/* Capture arm */}
        <mesh position={[0, -0.06, 0.08]} rotation={[0.3, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.012, 0.12, 6]} />
          <meshStandardMaterial color="#bdbdbd" metalness={0.8} />
        </mesh>
        {/* Scanner cone */}
        <mesh ref={laserRef} position={[0, -0.15, 0]}>
          <coneGeometry args={[0.15, 0.4, 8, 1, true]} />
          <meshStandardMaterial color={sat.color} transparent opacity={0.15} emissive={sat.color} emissiveIntensity={0.8} side={THREE.DoubleSide} />
        </mesh>
        <pointLight color={sat.color} intensity={0.4} distance={1.2} />
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
        <meshStandardMaterial color="#1a5276" emissive="#0d2b3e" emissiveIntensity={0.4} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.04, 48, 48]} />
        <meshStandardMaterial color="#4fc3f7" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.05, 1.15, 64]} />
        <meshStandardMaterial color="#4fc3f7" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

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
      <pointsMaterial size={0.018} color="#ef9a9a" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

function SwarmScene() {
  return (
    <div className="w-full h-[480px] md:h-[580px]">
      <Canvas camera={{ position: [0, 3.5, 6.5], fov: 42 }}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={1} color="#ffffff" />
        <directionalLight position={[-3, -2, -4]} intensity={0.3} color="#ffcc80" />
        <hemisphereLight args={["#b3e5fc", "#1a237e", 0.2]} />
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

          {showLegend && (
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-3 p-3 rounded-lg bg-background/80 backdrop-blur-sm border border-border/40">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4fc3f7] shadow-[0_0_6px_#4fc3f7]" />
                <span className="text-[10px] text-foreground font-display">Debrix Hunters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#9e9e9e]" />
                <span className="text-[10px] text-foreground font-display">Dead Satellites</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#1565c0]" />
                <span className="text-[10px] text-foreground font-display">Broken Panels</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ef9a9a]" />
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
