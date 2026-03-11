import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  generation: number;
  alive: boolean;
}

function Earth() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => { if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.03; });
  return (
    <group>
      <mesh ref={ref}><sphereGeometry args={[1, 64, 64]} /><meshStandardMaterial color="#1a6b9c" metalness={0.1} roughness={0.7} /></mesh>
      <mesh rotation={[0.1, 0.5, 0]}><sphereGeometry args={[1.003, 64, 64]} /><meshStandardMaterial color="#2d7a3a" transparent opacity={0.35} /></mesh>
      <mesh><sphereGeometry args={[1.015, 32, 32]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.12} /></mesh>
      <mesh><sphereGeometry args={[1.06, 32, 32]} /><meshStandardMaterial color="#87ceeb" transparent opacity={0.1} side={THREE.BackSide} /></mesh>
    </group>
  );
}

function KesslerParticles({ particles }: { particles: Particle[] }) {
  const ref = useRef<THREE.Points>(null);
  const alive = particles.filter((p) => p.alive);
  const positions = useMemo(() => { const a = new Float32Array(alive.length * 3); alive.forEach((p, i) => { a[i*3]=p.pos.x; a[i*3+1]=p.pos.y; a[i*3+2]=p.pos.z; }); return a; }, [alive]);
  const colors = useMemo(() => { const a = new Float32Array(alive.length * 3); alive.forEach((p, i) => { if(p.generation===0){a[i*3]=0.31;a[i*3+1]=0.76;a[i*3+2]=0.97;}else if(p.generation===1){a[i*3]=1;a[i*3+1]=0.42;a[i*3+2]=0.42;}else{a[i*3]=1;a[i*3+1]=0.85;a[i*3+2]=0.35;}}); return a; }, [alive]);
  return (<points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /><bufferAttribute attach="attributes-color" args={[colors, 3]} /></bufferGeometry><pointsMaterial size={0.04} vertexColors transparent opacity={0.9} sizeAttenuation /></points>);
}

function CollisionFlashes({ flashes }: { flashes: THREE.Vector3[] }) {
  return (<>{flashes.map((pos, i) => (<mesh key={i} position={pos}><sphereGeometry args={[0.05, 8, 8]} /><meshBasicMaterial color="#ff6b6b" transparent opacity={0.8} /></mesh>))}</>);
}

function OrbitRings() {
  return (<group>{[1.5, 1.7, 2.0].map((r, i) => (<mesh key={i} rotation={[Math.PI / 2, 0, i * 0.3]}><torusGeometry args={[r, 0.003, 8, 64]} /><meshBasicMaterial color="#4fc3f7" transparent opacity={0.1} /></mesh>))}</group>);
}

function KesslerScene({ particles, flashes }: { particles: Particle[]; flashes: THREE.Vector3[] }) {
  return (
    <div className="w-full h-[400px] md:h-[500px]">
      <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
        <color attach="background" args={["#050d1a"]} />
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 3, 5]} intensity={1} color="#ffffff" />
        <directionalLight position={[-3, 1, -2]} intensity={0.15} color="#4fc3f7" />
        <Earth /><OrbitRings /><KesslerParticles particles={particles} /><CollisionFlashes flashes={flashes} />
        <OrbitControls enableZoom enablePan={false} autoRotate autoRotateSpeed={0.3} />
      </Canvas>
    </div>
  );
}

const KesslerSection = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [collisionCount, setCollisionCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [flashes, setFlashes] = useState<THREE.Vector3[]>([]);
  const [debrixActive, setDebrixActive] = useState(false);
  const [removedCount, setRemovedCount] = useState(0);
  const [initialCount, setInitialCount] = useState(60);
  const [collisionRadius, setCollisionRadius] = useState(0.08);
  const [fragPerCollision, setFragPerCollision] = useState(3);
  const [elapsedSteps, setElapsedSteps] = useState(0);
  const [history, setHistory] = useState<{ step: number; total: number; fragments: number; collisions: number }[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  const initParticles = useCallback(() => {
    const ps: Particle[] = [];
    for (let i = 0; i < initialCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.6;
      const r = 1.4 + Math.random() * 0.6;
      const pos = new THREE.Vector3(r * Math.cos(phi) * Math.cos(theta), r * Math.sin(phi), r * Math.cos(phi) * Math.sin(theta));
      const tangent = new THREE.Vector3(-pos.z, 0, pos.x).normalize().multiplyScalar(0.002 + Math.random() * 0.001);
      ps.push({ pos, vel: tangent, generation: 0, alive: true });
    }
    particlesRef.current = ps;
    setParticles([...ps]);
    setCollisionCount(0);
    setRemovedCount(0);
    setFlashes([]);
    setDebrixActive(false);
    setElapsedSteps(0);
    setHistory([]);
  }, [initialCount]);

  useEffect(() => { initParticles(); }, [initParticles]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const ps = particlesRef.current;
      const newParticles: Particle[] = [];
      let collisions = 0;
      const newFlashes: THREE.Vector3[] = [];

      ps.forEach((p) => {
        if (!p.alive) return;
        p.pos.add(p.vel.clone().multiplyScalar(speed));
        const toCenter = p.pos.clone().negate().normalize().multiplyScalar(0.00001 * speed);
        p.vel.add(toCenter);
        if (p.pos.length() < 1.05) p.alive = false;
      });

      if (debrixActive) {
        const aliveFragments = ps.filter((p) => p.alive && p.generation > 0);
        const toRemove = Math.max(1, Math.floor(aliveFragments.length * 0.03 * speed));
        let removed = 0;
        for (const p of aliveFragments) { if (removed >= toRemove) break; p.alive = false; removed++; }
        if (removed > 0) setRemovedCount((c) => c + removed);
      }

      const alivePs = ps.filter((p) => p.alive);
      for (let i = 0; i < alivePs.length && alivePs.length + newParticles.length < 800; i++) {
        for (let j = i + 1; j < alivePs.length; j++) {
          const dist = alivePs[i].pos.distanceTo(alivePs[j].pos);
          if (dist < collisionRadius && Math.random() > 0.75) {
            collisions++;
            newFlashes.push(alivePs[i].pos.clone());
            for (let k = 0; k < fragPerCollision; k++) {
              const fragPos = alivePs[i].pos.clone().add(new THREE.Vector3((Math.random()-0.5)*0.1,(Math.random()-0.5)*0.1,(Math.random()-0.5)*0.1));
              const fragVel = alivePs[i].vel.clone().add(new THREE.Vector3((Math.random()-0.5)*0.003,(Math.random()-0.5)*0.003,(Math.random()-0.5)*0.003));
              newParticles.push({ pos: fragPos, vel: fragVel, generation: Math.min(alivePs[i].generation + 1, 2), alive: true });
            }
          }
        }
      }

      if (newParticles.length > 0) particlesRef.current = [...ps, ...newParticles];
      if (newFlashes.length > 0) { setFlashes(newFlashes); setTimeout(() => setFlashes([]), 200); }

      setParticles([...particlesRef.current]);
      setCollisionCount((c) => c + collisions);
      setElapsedSteps((s) => {
        const newStep = s + 1;
        const aliveCurrent = particlesRef.current.filter(p => p.alive);
        setHistory((h) => {
          const newH = [...h, { step: newStep, total: aliveCurrent.length, fragments: aliveCurrent.filter(p => p.generation > 0).length, collisions: collisions }];
          return newH.length > 200 ? newH.slice(-200) : newH;
        });
        return newStep;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [running, speed, debrixActive, collisionRadius, fragPerCollision]);

  const aliveParticles = particles.filter((p) => p.alive);
  const cascadeRisk = aliveParticles.length > 200 ? "CRITICAL" : aliveParticles.length > 100 ? "HIGH" : aliveParticles.length > 60 ? "MODERATE" : "LOW";
  const cascadeColor = cascadeRisk === "CRITICAL" ? "text-destructive" : cascadeRisk === "HIGH" ? "text-[hsl(45,100%,60%)]" : cascadeRisk === "MODERATE" ? "text-[hsl(30,90%,55%)]" : "text-accent";

  return (
    <section id="kessler" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-destructive mb-3 uppercase">Warning Scenario</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Kessler Syndrome Simulator</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Interactive cascading collision simulation — tweak parameters and activate DEBRIX cleanup.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Active Objects", value: aliveParticles.length, color: "text-primary" },
            { label: "Collisions", value: collisionCount, color: "text-destructive" },
            { label: "Gen-0 (Original)", value: aliveParticles.filter((p) => p.generation === 0).length, color: "text-primary" },
            { label: "Fragments", value: aliveParticles.filter((p) => p.generation > 0).length, color: "text-[hsl(45,100%,60%)]" },
            { label: "DEBRIX Removed", value: removedCount, color: "text-accent" },
            { label: "Cascade Risk", value: cascadeRisk, color: cascadeColor },
          ].map((s) => (
            <div key={s.label} className="glass-card p-3 text-center">
              <p className={`text-xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Controls sidebar */}
          <div className="space-y-4">
            <div className="glass-card p-5 space-y-4">
              <p className="font-display text-xs tracking-wider text-muted-foreground">SCENARIO PARAMETERS</p>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Initial Objects: {initialCount}</label>
                <input type="range" min={20} max={150} value={initialCount} onChange={(e) => setInitialCount(+e.target.value)} className="w-full accent-[hsl(199,100%,55%)]" disabled={running} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Collision Radius: {collisionRadius.toFixed(2)}</label>
                <input type="range" min={0.03} max={0.2} step={0.01} value={collisionRadius} onChange={(e) => setCollisionRadius(+e.target.value)} className="w-full accent-[hsl(199,100%,55%)]" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Fragments per Collision: {fragPerCollision}</label>
                <input type="range" min={1} max={8} value={fragPerCollision} onChange={(e) => setFragPerCollision(+e.target.value)} className="w-full accent-[hsl(199,100%,55%)]" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={() => setRunning(!running)}
                className={`w-full px-4 py-2.5 text-xs font-display tracking-wider rounded-lg border transition-all ${running ? "bg-destructive/20 text-destructive border-destructive/40" : "bg-primary/20 text-primary border-primary/40"}`}>
                {running ? "⏸ Pause" : "▶ Start Simulation"}
              </button>
              <button onClick={() => setDebrixActive(!debrixActive)} disabled={!running}
                className={`w-full px-4 py-2.5 text-xs font-display tracking-wider rounded-lg border transition-all ${debrixActive ? "bg-accent/20 text-accent border-accent/40 animate-pulse" : "bg-accent/10 text-accent border-accent/30 hover:bg-accent/20 disabled:opacity-30"}`}>
                {debrixActive ? "🛰️ DEBRIX Cleaning..." : "🛰️ Deploy DEBRIX"}
              </button>
              <button onClick={() => { setRunning(false); initParticles(); }} className="w-full px-4 py-2 text-xs font-display tracking-wider rounded-lg border bg-secondary/50 text-muted-foreground border-border/50 hover:border-primary/20 transition-all">
                ↺ Reset
              </button>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">Speed:</span>
                {[1, 2, 5, 10].map((s) => (
                  <button key={s} onClick={() => setSpeed(s)}
                    className={`px-3 py-1 text-xs font-display rounded border transition-all ${speed === s ? "bg-primary/20 text-primary border-primary/40" : "bg-secondary/50 text-muted-foreground border-border/50"}`}>
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-4">
              <p className="font-display text-[10px] tracking-wider text-muted-foreground mb-2">SIMULATION TIME</p>
              <p className="text-sm font-mono text-foreground">{elapsedSteps} steps ({(elapsedSteps * 0.05).toFixed(1)}s)</p>
            </div>
          </div>

          {/* 3D scene */}
          <div className="lg:col-span-3">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-2 overflow-hidden">
              <KesslerScene particles={particles} flashes={flashes} />
              <div className="flex flex-wrap items-center justify-center gap-4 p-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Original objects</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" /> 1st-gen fragments</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[hsl(45,100%,60%)]" /> 2nd-gen+ fragments</span>
                {debrixActive && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> DEBRIX Active</span>}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default KesslerSection;
