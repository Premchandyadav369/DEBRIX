import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function Satellite({ position, color, label }: { position: [number, number, number]; color: string; label: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });
  return (
    <group ref={ref} position={position}>
      <mesh>
        <boxGeometry args={[0.4, 0.2, 0.3]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Solar panels */}
      <mesh position={[0.5, 0, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.3]} />
        <meshStandardMaterial color="#1a5a8a" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.5, 0, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.3]} />
        <meshStandardMaterial color="#1a5a8a" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function DebrisParticles({ visible }: { visible: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = new Float32Array(30 * 3);
  for (let i = 0; i < 30; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 0.5;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }
  useFrame((state) => {
    if (ref.current && visible) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });
  if (!visible) return null;
  return (
    <points ref={ref} position={[0, 0.5, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#ff6b6b" transparent opacity={0.8} />
    </points>
  );
}

function TransferBeam({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.02, 0.02, 2, 8]} />
      <meshStandardMaterial color="#22b8cf" transparent opacity={0.6} emissive="#22b8cf" emissiveIntensity={2} />
    </mesh>
  );
}

function DockingScene({ phase }: { phase: number }) {
  return (
    <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={1} />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#22b8cf" />
      <Satellite
        position={phase >= 1 ? [-1, 0, 0] : [-3, 0, 0]}
        color="#22b8cf"
        label="Debrix"
      />
      <Satellite
        position={phase >= 1 ? [1, 0, 0] : [3, 0, 0]}
        color="#38d9a9"
        label="Dump Sat"
      />
      <DebrisParticles visible={phase < 2} />
      <TransferBeam active={phase === 2} />
      {phase >= 3 && (
        <mesh position={[1, -2, 0]}>
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshStandardMaterial color="#0a2a4a" transparent opacity={0.3} />
        </mesh>
      )}
      <OrbitControls enableZoom enablePan={false} autoRotate autoRotateSpeed={0.5} />
    </Canvas>
  );
}

const phases = [
  { title: "Approach", desc: "Debrix approaches the garbage satellite with captured debris onboard." },
  { title: "Docking", desc: "Both satellites align and establish a secure magnetic dock connection." },
  { title: "Debris Transfer", desc: "Captured debris is transferred from Debrix to the dump satellite storage bay." },
  { title: "Controlled Deorbit", desc: "The dump satellite fires retro-thrusters for controlled atmospheric re-entry." },
];

const DockDumpSection = () => {
  const [phase, setPhase] = useState(0);

  return (
    <section id="dock-dump" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Simulation</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Dock & Dump Mechanism</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Watch the full docking sequence — from approach to controlled deorbit of captured debris.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 glass-card p-2 overflow-hidden">
            <div className="w-full h-[400px] md:h-[450px]">
              <DockingScene phase={phase} />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {phases.map((p, i) => (
              <motion.button
                key={i}
                onClick={() => setPhase(i)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                  phase === i
                    ? "bg-primary/10 border-primary/40 shadow-[0_0_20px_hsl(199_100%_55%/0.15)]"
                    : "bg-card/40 border-border/50 hover:border-primary/20"
                }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-bold ${
                    phase === i ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}>
                    {i + 1}
                  </span>
                  <span className={`font-display text-sm tracking-wider ${phase === i ? "text-primary" : "text-foreground"}`}>
                    {p.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pl-11">{p.desc}</p>
              </motion.button>
            ))}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setPhase((p) => Math.max(0, p - 1))}
                disabled={phase === 0}
                className="flex-1 py-2 text-xs font-display tracking-wider bg-secondary/50 text-muted-foreground rounded-lg border border-border/50 hover:border-primary/20 disabled:opacity-30 transition-all"
              >
                ← Previous
              </button>
              <button
                onClick={() => setPhase((p) => Math.min(3, p + 1))}
                disabled={phase === 3}
                className="flex-1 py-2 text-xs font-display tracking-wider bg-primary/20 text-primary rounded-lg border border-primary/40 hover:bg-primary/30 disabled:opacity-30 transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DockDumpSection;
