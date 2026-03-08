import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

// ─── 3D Launch Scene ───
function LaunchRocket({ phase }: { phase: "idle" | "launch" | "orbit" }) {
  const ref = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;

    if (phase === "idle") {
      ref.current.position.set(0, -1.8, 0);
      ref.current.rotation.set(0, t * 0.3, 0);
    } else if (phase === "launch") {
      const progress = Math.min(t * 0.15, 1);
      ref.current.position.y = THREE.MathUtils.lerp(-1.8, 4, progress);
      ref.current.rotation.y = t * 0.5;
      if (flameRef.current) {
        flameRef.current.scale.y = 1 + Math.sin(t * 20) * 0.3;
        flameRef.current.visible = true;
      }
    } else {
      ref.current.position.y = Math.sin(t * 0.5) * 0.3 + 2;
      ref.current.rotation.y = t * 0.8;
      if (flameRef.current) flameRef.current.visible = false;
    }
  });

  return (
    <group ref={ref} position={[0, -1.8, 0]}>
      {/* Body */}
      <mesh>
        <cylinderGeometry args={[0.15, 0.2, 1.2, 12]} />
        <meshStandardMaterial color="#8899aa" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Nose */}
      <mesh position={[0, 0.8, 0]}>
        <coneGeometry args={[0.15, 0.4, 12]} />
        <meshStandardMaterial color="#22b8cf" emissive="#22b8cf" emissiveIntensity={0.3} />
      </mesh>
      {/* Fins */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos((i * Math.PI) / 2) * 0.2, -0.5, Math.sin((i * Math.PI) / 2) * 0.2]} rotation={[0, (i * Math.PI) / 2, 0]}>
          <boxGeometry args={[0.02, 0.3, 0.15]} />
          <meshStandardMaterial color="#1a3a5c" />
        </mesh>
      ))}
      {/* Flame */}
      <mesh ref={flameRef} position={[0, -0.8, 0]} visible={false}>
        <coneGeometry args={[0.12, 0.6, 8]} />
        <meshStandardMaterial color="#ff9944" emissive="#ff6622" emissiveIntensity={2} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function Earth3D({ phase }: { phase: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.05;
    if (phase === "launch" || phase === "orbit") {
      const progress = Math.min(state.clock.elapsedTime * 0.1, 1);
      ref.current.position.y = THREE.MathUtils.lerp(-2.5, -5, progress);
    }
  });
  return (
    <mesh ref={ref} position={[0, -2.5, 0]}>
      <sphereGeometry args={[1.5, 32, 32]} />
      <meshStandardMaterial color="#0a2a4a" emissive="#051525" emissiveIntensity={0.3} />
      <mesh>
        <sphereGeometry args={[1.52, 32, 32]} />
        <meshStandardMaterial color="#22b8cf" transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>
    </mesh>
  );
}

function LaunchScene({ phase }: { phase: "idle" | "launch" | "orbit" }) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 3]} intensity={1} />
      <pointLight position={[-2, 2, -2]} intensity={0.4} color="#22b8cf" />
      <Stars radius={30} depth={40} count={1500} factor={2} saturation={0} fade speed={0.5} />
      <Earth3D phase={phase} />
      <LaunchRocket phase={phase} />
    </Canvas>
  );
}

// ─── Status messages ───
const phaseMessages = {
  idle: { title: "Ready for Launch", sub: "Systems nominal. Awaiting command." },
  launch: { title: "Launching...", sub: "Debrix ascending to LEO — 408 km altitude" },
  orbit: { title: "Orbit Achieved!", sub: "Debrix operational. Beginning debris scan." },
};

const LaunchSimSection = () => {
  const [phase, setPhase] = useState<"idle" | "launch" | "orbit">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleLaunch = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("launch");
    timerRef.current = setTimeout(() => setPhase("orbit"), 7000);
  }, [phase]);

  const handleReset = useCallback(() => {
    clearTimeout(timerRef.current);
    setPhase("idle");
  }, []);

  const msg = phaseMessages[phase];

  return (
    <section id="launch-sim" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Interactive</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Launch Simulation</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Initiate Debrix launch sequence and watch it ascend to Low Earth Orbit.
          </p>
        </motion.div>

        <div className="glass-card overflow-hidden">
          <div className="h-[400px] md:h-[500px] relative">
            <LaunchScene phase={phase} />

            {/* HUD overlay */}
            <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none">
              <div>
                <AnimatePresence mode="wait">
                  <motion.div key={phase} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-3 pointer-events-auto">
                    <p className="font-display text-xs text-primary tracking-wider">{msg.title}</p>
                    <p className="text-muted-foreground text-xs mt-1">{msg.sub}</p>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="glass-card px-3 py-2">
                <p className="text-xs font-mono text-muted-foreground">
                  Phase: <span className={`font-bold ${phase === "orbit" ? "text-accent" : "text-primary"}`}>{phase.toUpperCase()}</span>
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
              <button
                onClick={handleLaunch}
                disabled={phase !== "idle"}
                className="gradient-button text-xs disabled:opacity-40 disabled:cursor-not-allowed pointer-events-auto"
              >
                {phase === "idle" ? "🚀 Launch Debrix" : phase === "launch" ? "Launching..." : "In Orbit"}
              </button>
              {phase !== "idle" && (
                <button onClick={handleReset} className="glass-card px-4 py-2 text-xs font-display text-muted-foreground hover:text-primary transition-colors pointer-events-auto">
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LaunchSimSection;
