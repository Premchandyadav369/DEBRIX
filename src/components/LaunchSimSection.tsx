import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { Rocket, RotateCcw, Gauge, Thermometer, Radio, MapPin } from "lucide-react";

// ─── Telemetry data per phase ───
type Phase = "preflight" | "ignition" | "maxq" | "meco" | "stage2" | "fairing" | "orbit";

interface TelemetryData {
  altitude: number;
  velocity: number;
  acceleration: number;
  downrange: number;
  fuel: number;
  temp: number;
  status: string;
  substatus: string;
  tPlus: string;
}

const phaseTelemetry: Record<Phase, TelemetryData> = {
  preflight:  { altitude: 0, velocity: 0, acceleration: 0, downrange: 0, fuel: 100, temp: 22, status: "PRE-FLIGHT", substatus: "All systems nominal. Ready for launch.", tPlus: "T-00:10" },
  ignition:   { altitude: 0.2, velocity: 120, acceleration: 1.3, downrange: 0.1, fuel: 98, temp: 1200, status: "LIFTOFF", substatus: "Main engines ignition confirmed. Vehicle has cleared the tower.", tPlus: "T+00:03" },
  maxq:       { altitude: 12.5, velocity: 1250, acceleration: 2.8, downrange: 8.2, fuel: 72, temp: 2100, status: "MAX-Q", substatus: "Maximum aerodynamic pressure. Throttle down.", tPlus: "T+01:12" },
  meco:       { altitude: 68, velocity: 6200, acceleration: 5.5, downrange: 72, fuel: 8, temp: 800, status: "MECO", substatus: "Main engine cutoff. Stage separation confirmed.", tPlus: "T+02:33" },
  stage2:     { altitude: 142, velocity: 14800, acceleration: 3.1, downrange: 320, fuel: 85, temp: 1600, status: "S2 BURN", substatus: "Second stage Merlin vacuum engine nominal.", tPlus: "T+04:45" },
  fairing:    { altitude: 195, velocity: 22400, acceleration: 1.2, downrange: 680, fuel: 52, temp: 600, status: "FAIRING SEP", substatus: "Payload fairing jettisoned. Debrix satellite exposed.", tPlus: "T+06:18" },
  orbit:      { altitude: 408, velocity: 27580, acceleration: 0, downrange: 1850, fuel: 12, temp: 180, status: "ORBIT INSERTION", substatus: "Debrix deployed. Commencing debris survey operations.", tPlus: "T+08:42" },
};

const phaseSequence: Phase[] = ["preflight", "ignition", "maxq", "meco", "stage2", "fairing", "orbit"];
const phaseTimings = [0, 3000, 6000, 9000, 12000, 15000, 18000]; // ms after launch

// ─── Interpolation helper ───
function lerpTelemetry(from: TelemetryData, to: TelemetryData, t: number): TelemetryData {
  const l = (a: number, b: number) => a + (b - a) * t;
  return {
    altitude: l(from.altitude, to.altitude),
    velocity: l(from.velocity, to.velocity),
    acceleration: l(from.acceleration, to.acceleration),
    downrange: l(from.downrange, to.downrange),
    fuel: l(from.fuel, to.fuel),
    temp: l(from.temp, to.temp),
    status: to.status,
    substatus: to.substatus,
    tPlus: to.tPlus,
  };
}

// ─── 3D Rocket with staging ───
function RocketModel({ phase, elapsed }: { phase: Phase; elapsed: number }) {
  const bodyRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const flame2Ref = useRef<THREE.Mesh>(null);
  const boosterLRef = useRef<THREE.Group>(null);
  const boosterRRef = useRef<THREE.Group>(null);
  const fairingLRef = useRef<THREE.Mesh>(null);
  const fairingRRef = useRef<THREE.Mesh>(null);
  const satRef = useRef<THREE.Group>(null);

  const phaseIdx = phaseSequence.indexOf(phase);
  const hasStage1 = phaseIdx < 3; // before MECO
  const hasFairing = phaseIdx < 5;
  const deployed = phaseIdx >= 6;
  const isFlying = phaseIdx >= 1 && phaseIdx < 6;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!bodyRef.current) return;

    if (phase === "preflight") {
      bodyRef.current.position.set(0, -1.5, 0);
      bodyRef.current.rotation.set(0, t * 0.15, 0);
    } else if (isFlying) {
      const progress = Math.min(elapsed / 18000, 1);
      bodyRef.current.position.y = THREE.MathUtils.lerp(-1.5, 3, progress);
      bodyRef.current.rotation.y = t * 0.3;
      // Slight pitch during ascent
      bodyRef.current.rotation.z = Math.sin(t * 0.5) * 0.02;
    } else if (deployed) {
      bodyRef.current.position.y = 2.5 + Math.sin(t * 0.4) * 0.15;
      bodyRef.current.rotation.y = t * 0.6;
    }

    // Flame flicker
    if (flameRef.current) {
      const active = phaseIdx >= 1 && phaseIdx <= 2;
      flameRef.current.visible = active;
      if (active) {
        flameRef.current.scale.y = 1.0 + Math.sin(t * 30) * 0.3 + Math.sin(t * 47) * 0.15;
        flameRef.current.scale.x = 1.0 + Math.sin(t * 25) * 0.1;
      }
    }
    if (flame2Ref.current) {
      const active = phaseIdx >= 4 && phaseIdx <= 5;
      flame2Ref.current.visible = active;
      if (active) {
        flame2Ref.current.scale.y = 0.8 + Math.sin(t * 35) * 0.2;
      }
    }

    // Booster separation animation
    if (boosterLRef.current && boosterRRef.current) {
      if (phase === "meco") {
        const sep = Math.min((elapsed - 9000) / 2000, 1);
        boosterLRef.current.position.x = -0.45 - sep * 2;
        boosterLRef.current.position.y = -sep * 3;
        boosterLRef.current.rotation.z = sep * 0.5;
        boosterRRef.current.position.x = 0.45 + sep * 2;
        boosterRRef.current.position.y = -sep * 3;
        boosterRRef.current.rotation.z = -sep * 0.5;
      }
    }

    // Fairing separation
    if (fairingLRef.current && fairingRRef.current && phase === "fairing") {
      const sep = Math.min((elapsed - 15000) / 2000, 1);
      fairingLRef.current.position.x = -0.15 - sep * 1.5;
      fairingLRef.current.rotation.z = sep * 0.3;
      fairingRRef.current.position.x = 0.15 + sep * 1.5;
      fairingRRef.current.rotation.z = -sep * 0.3;
    }

    // Satellite deployment
    if (satRef.current && deployed) {
      const dep = Math.min((elapsed - 18000) / 3000, 1);
      satRef.current.position.y = dep * 1.5;
      satRef.current.rotation.y = t * 1.2;
      satRef.current.visible = true;
    } else if (satRef.current) {
      satRef.current.visible = false;
    }
  });

  return (
    <group ref={bodyRef} position={[0, -1.5, 0]}>
      {/* Second stage body */}
      <mesh>
        <cylinderGeometry args={[0.12, 0.14, 0.8, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.7} roughness={0.25} />
      </mesh>

      {/* Black interstage band */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.145, 0.145, 0.1, 16]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* First stage (visible before MECO) */}
      {hasStage1 && (
        <mesh position={[0, -0.9, 0]}>
          <cylinderGeometry args={[0.16, 0.18, 1.0, 16]} />
          <meshStandardMaterial color="#f0f0f0" metalness={0.6} roughness={0.3} />
        </mesh>
      )}

      {/* Grid fins on first stage */}
      {hasStage1 && [0, 1, 2, 3].map((i) => (
        <mesh key={`fin-${i}`} position={[
          Math.cos((i * Math.PI) / 2) * 0.19,
          -1.2,
          Math.sin((i * Math.PI) / 2) * 0.19
        ]} rotation={[0, (i * Math.PI) / 2, 0]}>
          <boxGeometry args={[0.01, 0.12, 0.1]} />
          <meshStandardMaterial color="#333" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Landing legs (folded) */}
      {hasStage1 && [0, 1, 2, 3].map((i) => (
        <mesh key={`leg-${i}`} position={[
          Math.cos((i * Math.PI) / 2 + 0.4) * 0.17,
          -1.35,
          Math.sin((i * Math.PI) / 2 + 0.4) * 0.17
        ]} rotation={[0.15, (i * Math.PI) / 2, 0]}>
          <boxGeometry args={[0.015, 0.15, 0.02]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}

      {/* Side boosters */}
      {hasStage1 && (
        <>
          <group ref={boosterLRef} position={[-0.45, -0.7, 0]}>
            <mesh>
              <cylinderGeometry args={[0.08, 0.1, 0.8, 12]} />
              <meshStandardMaterial color="#ddd" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.45, 0]}>
              <coneGeometry args={[0.08, 0.15, 12]} />
              <meshStandardMaterial color="#ccc" metalness={0.5} />
            </mesh>
          </group>
          <group ref={boosterRRef} position={[0.45, -0.7, 0]}>
            <mesh>
              <cylinderGeometry args={[0.08, 0.1, 0.8, 12]} />
              <meshStandardMaterial color="#ddd" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.45, 0]}>
              <coneGeometry args={[0.08, 0.15, 12]} />
              <meshStandardMaterial color="#ccc" metalness={0.5} />
            </mesh>
          </group>
        </>
      )}

      {/* Payload fairing */}
      {hasFairing && (
        <>
          <mesh ref={fairingLRef} position={[-0.06, 0.65, 0]}>
            <cylinderGeometry args={[0.01, 0.14, 0.5, 8, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#fff" metalness={0.4} roughness={0.3} side={THREE.DoubleSide} />
          </mesh>
          <mesh ref={fairingRRef} position={[0.06, 0.65, 0]}>
            <cylinderGeometry args={[0.01, 0.14, 0.5, 8, 1, false, Math.PI, Math.PI]} />
            <meshStandardMaterial color="#fff" metalness={0.4} roughness={0.3} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}

      {/* Debrix satellite (deployed) */}
      <group ref={satRef} visible={false}>
        <mesh>
          <boxGeometry args={[0.15, 0.1, 0.15]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Solar panels */}
        <mesh position={[-0.25, 0, 0]}>
          <boxGeometry args={[0.2, 0.005, 0.12]} />
          <meshStandardMaterial color="#1a3a8a" metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0.25, 0, 0]}>
          <boxGeometry args={[0.2, 0.005, 0.12]} />
          <meshStandardMaterial color="#1a3a8a" metalness={0.3} roughness={0.5} />
        </mesh>
        {/* Robotic arm */}
        <mesh position={[0, 0.08, 0.1]} rotation={[0.3, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.15, 6]} />
          <meshStandardMaterial color="#888" metalness={0.7} />
        </mesh>
      </group>

      {/* Main engine flame (stage 1) */}
      <mesh ref={flameRef} position={[0, -1.5, 0]} visible={false}>
        <coneGeometry args={[0.14, 0.8, 8]} />
        <meshStandardMaterial color="#ff8833" emissive="#ff5500" emissiveIntensity={3} transparent opacity={0.85} />
      </mesh>
      {/* Outer flame glow */}
      {(phaseSequence.indexOf(phase) >= 1 && phaseSequence.indexOf(phase) <= 2) && (
        <mesh position={[0, -1.7, 0]}>
          <coneGeometry args={[0.22, 1.2, 8]} />
          <meshStandardMaterial color="#ff4400" emissive="#ff2200" emissiveIntensity={1.5} transparent opacity={0.25} />
        </mesh>
      )}

      {/* Stage 2 engine flame */}
      <mesh ref={flame2Ref} position={[0, -0.55, 0]} visible={false}>
        <coneGeometry args={[0.08, 0.5, 8]} />
        <meshStandardMaterial color="#4488ff" emissive="#2266ff" emissiveIntensity={3} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

// ─── Earth with atmosphere ───
function Earth({ phase, elapsed }: { phase: Phase; elapsed: number }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.children[0].rotation.y = t * 0.03;

    const phaseIdx = phaseSequence.indexOf(phase);
    if (phaseIdx >= 1) {
      const progress = Math.min(elapsed / 18000, 1);
      ref.current.position.y = THREE.MathUtils.lerp(-2.2, -6, progress);
      ref.current.scale.setScalar(THREE.MathUtils.lerp(1, 0.6, progress));
    } else {
      ref.current.position.y = -2.2;
      ref.current.scale.setScalar(1);
    }
  });

  return (
    <group ref={ref} position={[0, -2.2, 0]}>
      <mesh>
        <sphereGeometry args={[1.8, 64, 64]} />
        <meshStandardMaterial color="#0d3b66" metalness={0.1} roughness={0.8} />
      </mesh>
      {/* Continents hint */}
      <mesh>
        <sphereGeometry args={[1.81, 64, 64]} />
        <meshStandardMaterial color="#1a5c3a" transparent opacity={0.3} />
      </mesh>
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[1.88, 64, 64]} />
        <meshStandardMaterial color="#4dc9f6" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.95, 32, 32]} />
        <meshStandardMaterial color="#4dc9f6" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// ─── Exhaust Particles ───
function ExhaustParticles({ active }: { active: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const count = 200;
  const positions = useRef(new Float32Array(count * 3));
  const velocities = useRef(new Float32Array(count * 3));

  useEffect(() => {
    for (let i = 0; i < count; i++) {
      positions.current[i * 3] = (Math.random() - 0.5) * 0.3;
      positions.current[i * 3 + 1] = -2 - Math.random() * 2;
      positions.current[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      velocities.current[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities.current[i * 3 + 1] = -0.03 - Math.random() * 0.05;
      velocities.current[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
  }, []);

  useFrame(() => {
    if (!ref.current || !active) {
      if (ref.current) ref.current.visible = false;
      return;
    }
    ref.current.visible = true;
    const pos = ref.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      positions.current[i * 3] += velocities.current[i * 3];
      positions.current[i * 3 + 1] += velocities.current[i * 3 + 1];
      positions.current[i * 3 + 2] += velocities.current[i * 3 + 2];
      if (positions.current[i * 3 + 1] < -5) {
        positions.current[i * 3] = (Math.random() - 0.5) * 0.2;
        positions.current[i * 3 + 1] = -1.8;
        positions.current[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      }
    }
    pos.array.set(positions.current);
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions.current} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#ff8844" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

// ─── Full 3D Scene ───
function LaunchScene({ phase, elapsed }: { phase: Phase; elapsed: number }) {
  const phaseIdx = phaseSequence.indexOf(phase);
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }} dpr={[1, 2]}>
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} color="#fff" />
      <pointLight position={[-3, 2, -3]} intensity={0.5} color="#4dc9f6" />
      {(phaseIdx >= 1 && phaseIdx <= 2) && (
        <pointLight position={[0, -2, 0]} intensity={2} color="#ff6622" distance={8} />
      )}
      <Stars radius={50} depth={60} count={2500} factor={3} saturation={0} fade speed={0.3} />
      <Earth phase={phase} elapsed={elapsed} />
      <RocketModel phase={phase} elapsed={elapsed} />
      <ExhaustParticles active={phaseIdx >= 1 && phaseIdx <= 2} />
    </Canvas>
  );
}

// ─── Telemetry Gauge ───
function TelemetryGauge({ label, value, unit, icon: Icon, color = "text-primary" }: { label: string; value: string; unit: string; icon: any; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">{label}</p>
        <p className="font-mono text-sm font-bold text-foreground leading-tight">
          {value} <span className="text-[10px] text-muted-foreground font-normal">{unit}</span>
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───
const LaunchSimSection = () => {
  const [phase, setPhase] = useState<Phase>("preflight");
  const [elapsed, setElapsed] = useState(0);
  const [telemetry, setTelemetry] = useState<TelemetryData>(phaseTelemetry.preflight);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const [running, setRunning] = useState(false);

  const tick = useCallback(() => {
    const now = Date.now();
    const el = now - startRef.current;
    setElapsed(el);

    // Determine phase
    let currentPhase: Phase = "preflight";
    for (let i = phaseTimings.length - 1; i >= 0; i--) {
      if (el >= phaseTimings[i]) {
        currentPhase = phaseSequence[i];
        break;
      }
    }
    setPhase(currentPhase);

    // Interpolate telemetry
    const idx = phaseSequence.indexOf(currentPhase);
    if (idx < phaseSequence.length - 1) {
      const phaseStart = phaseTimings[idx];
      const phaseEnd = phaseTimings[idx + 1];
      const t = Math.min((el - phaseStart) / (phaseEnd - phaseStart), 1);
      setTelemetry(lerpTelemetry(phaseTelemetry[phaseSequence[idx]], phaseTelemetry[phaseSequence[idx + 1]], t));
    } else {
      setTelemetry(phaseTelemetry.orbit);
    }

    if (el < 22000) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setRunning(false);
    }
  }, []);

  const handleLaunch = useCallback(() => {
    if (running) return;
    startRef.current = Date.now();
    setRunning(true);
    setPhase("ignition");
    rafRef.current = requestAnimationFrame(tick);
  }, [running, tick]);

  const handleReset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
    setPhase("preflight");
    setElapsed(0);
    setTelemetry(phaseTelemetry.preflight);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const phaseIdx = phaseSequence.indexOf(phase);
  const progress = (phaseIdx / (phaseSequence.length - 1)) * 100;

  return (
    <section id="launch-sim" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Mission Control</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Launch Simulation</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Full launch sequence with stage separation, fairing deployment, and Debrix orbital insertion.
          </p>
        </motion.div>

        <div className="glass-card overflow-hidden">
          {/* 3D Viewport */}
          <div className="h-[420px] md:h-[520px] relative bg-[hsl(220,30%,5%)]">
            <LaunchScene phase={phase} elapsed={elapsed} />

            {/* Status HUD top-left */}
            <div className="absolute top-3 left-3 pointer-events-none">
              <AnimatePresence mode="wait">
                <motion.div key={phase} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="glass-card p-3 border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${running ? "bg-green-400 animate-pulse" : phase === "orbit" ? "bg-accent" : "bg-muted-foreground"}`} />
                    <p className="font-mono text-xs font-bold text-primary tracking-wider">{telemetry.status}</p>
                  </div>
                  <p className="text-muted-foreground text-[11px] max-w-[220px]">{telemetry.substatus}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* T+ Clock top-right */}
            <div className="absolute top-3 right-3 glass-card px-3 py-2 border border-border/30">
              <p className="font-mono text-lg font-bold text-foreground">{telemetry.tPlus}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider text-center">Mission Time</p>
            </div>

            {/* Phase progress bar */}
            <div className="absolute bottom-16 left-3 right-3 pointer-events-none">
              <div className="flex items-center justify-between mb-1.5 px-1">
                {phaseSequence.map((p, i) => (
                  <div key={p} className={`text-[8px] font-mono uppercase tracking-wider transition-colors ${i <= phaseIdx ? "text-primary" : "text-muted-foreground/40"}`}>
                    {p === "preflight" ? "PRE" : p === "ignition" ? "IGN" : p === "maxq" ? "MAX-Q" : p === "meco" ? "MECO" : p === "stage2" ? "S2" : p === "fairing" ? "FAIR" : "ORB"}
                  </div>
                ))}
              </div>
              <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
              </div>
            </div>

            {/* Launch / Reset Controls */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
              <button
                onClick={handleLaunch}
                disabled={running || phase === "orbit"}
                className="gradient-button text-xs flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed pointer-events-auto"
              >
                <Rocket className="w-3.5 h-3.5" />
                {phase === "preflight" ? "INITIATE LAUNCH" : phase === "orbit" ? "ORBIT ACHIEVED" : "LAUNCHING..."}
              </button>
              {phase !== "preflight" && (
                <button onClick={handleReset} className="glass-card px-4 py-2 text-xs font-display text-muted-foreground hover:text-primary transition-colors pointer-events-auto flex items-center gap-1.5">
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Telemetry Panel */}
          <div className="p-4 border-t border-border/30 bg-card/50">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              <TelemetryGauge icon={MapPin} label="Altitude" value={telemetry.altitude.toFixed(1)} unit="km" />
              <TelemetryGauge icon={Gauge} label="Velocity" value={telemetry.velocity.toFixed(0)} unit="m/s" />
              <TelemetryGauge icon={Rocket} label="Accel" value={telemetry.acceleration.toFixed(1)} unit="G" />
              <TelemetryGauge icon={MapPin} label="Downrange" value={telemetry.downrange.toFixed(0)} unit="km" color="text-accent" />
              <TelemetryGauge icon={Thermometer} label="Temp" value={telemetry.temp.toFixed(0)} unit="°C" color="text-orange-400" />
              <TelemetryGauge icon={Radio} label="Fuel" value={telemetry.fuel.toFixed(0)} unit="%" color={telemetry.fuel < 20 ? "text-red-400" : "text-accent"} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LaunchSimSection;
