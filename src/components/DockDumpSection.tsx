import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Play, Pause, RotateCcw, ChevronRight } from "lucide-react";

function DebrixSat({ position, glow }: { position: THREE.Vector3; glow: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.lerp(position, 0.03);
      ref.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });
  return (
    <group ref={ref} position={[-3, 0, 0]}>
      <mesh>
        <boxGeometry args={[0.5, 0.25, 0.35]} />
        <meshStandardMaterial color="#e0e0e0" emissive="#4fc3f7" emissiveIntensity={glow ? 0.5 : 0.1} metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0.55, 0, 0]}>
        <boxGeometry args={[0.45, 0.02, 0.25]} />
        <meshStandardMaterial color="#1565c0" metalness={0.8} roughness={0.15} />
      </mesh>
      <mesh position={[-0.55, 0, 0]}>
        <boxGeometry args={[0.45, 0.02, 0.25]} />
        <meshStandardMaterial color="#1565c0" metalness={0.8} roughness={0.15} />
      </mesh>
      <mesh position={[0, -0.18, 0.2]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.25, 6]} />
        <meshStandardMaterial color="#bdbdbd" metalness={0.8} />
      </mesh>
      <mesh position={[0, -0.3, 0.32]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#4fc3f7" emissive="#4fc3f7" emissiveIntensity={0.6} />
      </mesh>
      <pointLight color="#4fc3f7" intensity={glow ? 1 : 0.3} distance={2} />
    </group>
  );
}

function DumpSat({ position }: { position: THREE.Vector3 }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.lerp(position, 0.03);
      ref.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });
  return (
    <group ref={ref} position={[3, 0, 0]}>
      <mesh>
        <boxGeometry args={[0.7, 0.4, 0.5]} />
        <meshStandardMaterial color="#c0c0c0" emissive="#81c784" emissiveIntensity={0.15} metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.22, 0]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.65, 0.02, 0.45]} />
        <meshStandardMaterial color="#a0a0a0" metalness={0.7} />
      </mesh>
      <mesh position={[0.65, 0, 0]}>
        <boxGeometry args={[0.5, 0.015, 0.35]} />
        <meshStandardMaterial color="#1565c0" metalness={0.8} roughness={0.15} />
      </mesh>
      <mesh position={[-0.65, 0, 0]}>
        <boxGeometry args={[0.5, 0.015, 0.35]} />
        <meshStandardMaterial color="#1565c0" metalness={0.8} roughness={0.15} />
      </mesh>
      {[-0.2, 0, 0.2].map((z, i) => (
        <mesh key={i} position={[-0.36, -0.15, z]}>
          <coneGeometry args={[0.03, 0.08, 6]} />
          <meshStandardMaterial color="#9e9e9e" metalness={0.8} />
        </mesh>
      ))}
      <pointLight color="#81c784" intensity={0.4} distance={2} />
    </group>
  );
}

function DebrisCluster({ visible, dispersing, capturedCount }: { visible: boolean; dispersing: boolean; capturedCount: number }) {
  const ref = useRef<THREE.Group>(null);
  const totalPieces = 12;
  const pieces = useRef(
    Array.from({ length: totalPieces }, () => ({
      pos: new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4),
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.02, Math.random() * 0.015, (Math.random() - 0.5) * 0.02),
      size: 0.02 + Math.random() * 0.03,
      rot: Math.random() * 6,
      captured: false,
      captureTarget: new THREE.Vector3(-0.9, 0, 0),
    }))
  ).current;

  useFrame((state) => {
    if (!ref.current) return;
    // Mark pieces as captured based on capturedCount
    pieces.forEach((p, i) => {
      if (i < capturedCount && !p.captured) {
        p.captured = true;
        p.captureTarget = new THREE.Vector3(-0.9 + (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15);
      }
    });

    ref.current.children.forEach((child, i) => {
      const p = pieces[i];
      if (p.captured) {
        // Shrink and move toward the Debrix satellite
        p.pos.lerp(p.captureTarget, 0.04);
        const scale = Math.max(0, 1 - (capturedCount - i) * 0.3);
        child.scale.setScalar(scale);
      } else if (dispersing) {
        p.pos.add(p.vel);
      }
      child.position.copy(p.pos);
      child.rotation.x = p.rot + state.clock.elapsedTime * 0.5;
      child.rotation.z = p.rot + state.clock.elapsedTime * 0.3;
    });
  });

  if (!visible) return null;

  return (
    <group ref={ref} position={[0, 0.3, 0]}>
      {pieces.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <dodecahedronGeometry args={[p.size, 0]} />
          <meshStandardMaterial color="#bdbdbd" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function DockingBeam({ active }: { active: boolean }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current && active) {
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.25 + Math.sin(state.clock.elapsedTime * 6) * 0.15;
    }
  });

  if (!active) return null;

  return (
    <group>
      <mesh ref={ref} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 1.8, 8]} />
        <meshStandardMaterial color="#4fc3f7" transparent opacity={0.3} emissive="#4fc3f7" emissiveIntensity={2} />
      </mesh>
      {[0.3, 0, -0.3].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.06, 0.008, 8, 16]} />
          <meshStandardMaterial color="#4fc3f7" transparent opacity={0.4} emissive="#4fc3f7" emissiveIntensity={1.5} />
        </mesh>
      ))}
    </group>
  );
}

function ThrusterFlame({ active, position }: { active: boolean; position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current && active) {
      const scale = 0.8 + Math.sin(state.clock.elapsedTime * 15) * 0.3;
      ref.current.scale.set(scale, 1 + Math.random() * 0.5, scale);
    }
  });

  if (!active) return null;

  return (
    <mesh ref={ref} position={position}>
      <coneGeometry args={[0.06, 0.35, 8]} />
      <meshStandardMaterial color="#ffab40" transparent opacity={0.8} emissive="#ff6d00" emissiveIntensity={3} />
    </mesh>
  );
}

function EarthSmall() {
  return (
    <group position={[0, -4, -2]}>
      {/* Ocean */}
      <mesh>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshStandardMaterial color="#1a6b9c" metalness={0.1} roughness={0.7} />
      </mesh>
      {/* Continents */}
      <mesh rotation={[0.2, 1.5, 0]}>
        <sphereGeometry args={[2.51, 32, 32]} />
        <meshStandardMaterial color="#2d7a3a" transparent opacity={0.35} />
      </mesh>
      {/* Clouds */}
      <mesh>
        <sphereGeometry args={[2.54, 24, 24]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.1} />
      </mesh>
      {/* Atmosphere */}
      <mesh>
        <sphereGeometry args={[2.65, 32, 32]} />
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function Stars() {
  const positions = useRef(
    (() => {
      const arr = new Float32Array(300 * 3);
      for (let i = 0; i < 300; i++) {
        arr[i * 3] = (Math.random() - 0.5) * 30;
        arr[i * 3 + 1] = (Math.random() - 0.5) * 30;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
      }
      return arr;
    })()
  ).current;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#ffffff" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function DockingScene({ phase, autoProgress }: { phase: number; autoProgress: number }) {
  const debrixTarget = new THREE.Vector3(
    phase === 0 ? -2.5 : phase === 1 ? -0.9 : -0.9,
    0, 0
  );
  const dumpTarget = new THREE.Vector3(
    phase === 0 ? 2.5 : phase === 1 ? 0.9 : 0.9,
    phase === 3 ? -1 - autoProgress * 2 : 0,
    0
  );

  // Calculate how many debris have been captured during phase 2
  const capturedCount = phase > 2 ? 12 : phase === 2 ? Math.floor(autoProgress * 12) : 0;

  return (
    <Canvas camera={{ position: [0, 2, 5.5], fov: 40 }}>
      <color attach="background" args={["#0a1628"]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-3, -1, -3]} intensity={0.2} color="#ffcc80" />
      <hemisphereLight args={["#b3e5fc", "#1a237e", 0.15]} />

      <DebrixSat position={debrixTarget} glow={phase === 1 || phase === 2} />
      <DumpSat position={dumpTarget} />
      <DebrisCluster visible={phase <= 2} dispersing={false} capturedCount={capturedCount} />
      <DockingBeam active={phase === 1 || phase === 2} />
      <ThrusterFlame active={phase === 3} position={[0.9, -1.5 - autoProgress * 2, 0]} />

      {phase === 3 && <EarthSmall />}
      <Stars />

      <OrbitControls enableZoom enablePan={false} autoRotate={phase === 0} autoRotateSpeed={0.3} maxDistance={10} minDistance={3} />
    </Canvas>
  );
}

const phases = [
  {
    title: "Approach & Lock-On",
    desc: "Debrix identifies the target debris cluster via LiDAR and initiates closing maneuver at 0.5 m/s relative velocity.",
    icon: "🎯",
  },
  {
    title: "Magnetic Docking",
    desc: "Electromagnetic docking clamps engage. Both satellites establish a rigid connection with sub-millimeter alignment.",
    icon: "🔗",
  },
  {
    title: "Debris Transfer",
    desc: "Robotic arm transfers captured fragments into the dump satellite's cargo bay. Each piece is cataloged in real-time.",
    icon: "📦",
  },
  {
    title: "Controlled Deorbit",
    desc: "Dump satellite fires retro-thrusters for targeted atmospheric re-entry over the South Pacific Ocean Uninhabited Area.",
    icon: "🔥",
  },
];

const DockDumpSection = () => {
  const [phase, setPhase] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoProgress, setAutoProgress] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setAutoProgress((p) => {
        if (p >= 1) {
          setPhase((prev) => {
            if (prev >= 3) {
              setIsPlaying(false);
              return 3;
            }
            return prev + 1;
          });
          return 0;
        }
        return p + 0.02;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePhaseClick = (i: number) => {
    setPhase(i);
    setAutoProgress(0);
    setIsPlaying(false);
  };

  const reset = () => {
    setPhase(0);
    setAutoProgress(0);
    setIsPlaying(false);
  };

  return (
    <section id="dock-dump" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Simulation</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Dock & Dump Mechanism</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Watch the full docking sequence — approach, magnetic lock, debris transfer, and controlled deorbit burn.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 glass-card p-1 overflow-hidden relative">
            <div className="w-full h-[420px] md:h-[480px] rounded-xl overflow-hidden">
              <DockingScene phase={phase} autoProgress={autoProgress} />
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border/40">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? "Pause docking simulation" : "Play docking simulation"}
                className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30 transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={reset}
                aria-label="Reset docking simulation"
                className="w-8 h-8 rounded-lg bg-secondary/50 text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <div className="flex-1 flex items-center gap-1">
                {phases.map((_, i) => (
                  <div key={i} className="flex-1 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: phase > i ? "100%" : phase === i ? `${autoProgress * 100}%` : "0%",
                        backgroundColor: phase >= i && (phase > i || autoProgress > 0) ? "hsl(var(--primary))" : "transparent",
                      }}
                    />
                  </div>
                ))}
              </div>

              <span className="text-[10px] font-display text-muted-foreground min-w-[60px] text-right">
                Phase {phase + 1}/4
              </span>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <AnimatePresence mode="wait">
              {phases.map((p, i) => (
                <motion.button
                  key={i}
                  onClick={() => handlePhaseClick(i)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                    phase === i
                      ? "bg-primary/10 border-primary/40 shadow-[0_0_25px_hsl(var(--primary)/0.1)]"
                      : i < phase
                      ? "bg-accent/5 border-accent/20 opacity-60"
                      : "bg-card/40 border-border/50 hover:border-primary/20"
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${
                      phase === i ? "bg-primary text-primary-foreground" : i < phase ? "bg-accent/20 text-accent" : "bg-secondary text-muted-foreground"
                    }`}>
                      {p.icon}
                    </span>
                    <div className="flex-1">
                      <span className={`font-display text-sm tracking-wider block ${phase === i ? "text-primary" : "text-foreground"}`}>
                        {p.title}
                      </span>
                      {phase === i && (
                        <div className="w-full h-0.5 bg-secondary/50 rounded mt-1.5 overflow-hidden">
                          <div className="h-full bg-primary rounded transition-all" style={{ width: `${autoProgress * 100}%` }} />
                        </div>
                      )}
                    </div>
                    {phase === i && <ChevronRight className="w-4 h-4 text-primary animate-pulse" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-12 leading-relaxed">{p.desc}</p>
                </motion.button>
              ))}
            </AnimatePresence>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handlePhaseClick(Math.max(0, phase - 1))}
                disabled={phase === 0}
                className="flex-1 py-2.5 text-xs font-display tracking-wider bg-secondary/50 text-muted-foreground rounded-lg border border-border/50 hover:border-primary/20 disabled:opacity-30 transition-all"
              >
                ← Previous
              </button>
              <button
                onClick={() => handlePhaseClick(Math.min(3, phase + 1))}
                disabled={phase === 3}
                className="flex-1 py-2.5 text-xs font-display tracking-wider bg-primary/20 text-primary rounded-lg border border-primary/40 hover:bg-primary/30 disabled:opacity-30 transition-all"
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
