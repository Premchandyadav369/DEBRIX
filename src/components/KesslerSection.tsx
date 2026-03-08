import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  generation: number;
}

function Earth() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => { if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.03; });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#0a2a4a" emissive="#051525" emissiveIntensity={0.3} />
    </mesh>
  );
}

function KesslerParticles({ particles }: { particles: Particle[] }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(particles.length * 3);
    particles.forEach((p, i) => {
      arr[i * 3] = p.pos.x;
      arr[i * 3 + 1] = p.pos.y;
      arr[i * 3 + 2] = p.pos.z;
    });
    return arr;
  }, [particles]);

  const colors = useMemo(() => {
    const arr = new Float32Array(particles.length * 3);
    particles.forEach((p, i) => {
      if (p.generation === 0) { arr[i * 3] = 0.13; arr[i * 3 + 1] = 0.72; arr[i * 3 + 2] = 0.81; }
      else if (p.generation === 1) { arr[i * 3] = 1; arr[i * 3 + 1] = 0.42; arr[i * 3 + 2] = 0.42; }
      else { arr[i * 3] = 1; arr[i * 3 + 1] = 0.85; arr[i * 3 + 2] = 0.35; }
    });
    return arr;
  }, [particles]);

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} vertexColors transparent opacity={0.9} sizeAttenuation />
    </points>
  );
}

function KesslerScene({ particles }: { particles: Particle[] }) {
  return (
    <div className="w-full h-[400px] md:h-[500px]">
      <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={0.8} />
        <Earth />
        <KesslerParticles particles={particles} />
        <OrbitControls enableZoom enablePan={false} autoRotate autoRotateSpeed={0.2} />
      </Canvas>
    </div>
  );
}

const KesslerSection = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [collisionCount, setCollisionCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const particlesRef = useRef<Particle[]>([]);

  const initParticles = useCallback(() => {
    const ps: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.6;
      const r = 1.4 + Math.random() * 0.6;
      const pos = new THREE.Vector3(
        r * Math.cos(phi) * Math.cos(theta),
        r * Math.sin(phi),
        r * Math.cos(phi) * Math.sin(theta)
      );
      const tangent = new THREE.Vector3(-pos.z, 0, pos.x).normalize().multiplyScalar(0.002 + Math.random() * 0.001);
      ps.push({ pos, vel: tangent, generation: 0 });
    }
    particlesRef.current = ps;
    setParticles([...ps]);
    setCollisionCount(0);
  }, []);

  useEffect(() => { initParticles(); }, [initParticles]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const ps = particlesRef.current;
      const newParticles: Particle[] = [];
      let collisions = 0;

      // Move particles in orbital paths
      ps.forEach((p) => {
        p.pos.add(p.vel.clone().multiplyScalar(speed));
        // Simple gravity toward center
        const toCenter = p.pos.clone().negate().normalize().multiplyScalar(0.00001 * speed);
        p.vel.add(toCenter);
      });

      // Check collisions
      for (let i = 0; i < ps.length && ps.length < 500; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dist = ps[i].pos.distanceTo(ps[j].pos);
          if (dist < 0.08 && Math.random() > 0.7) {
            collisions++;
            // Generate fragments
            for (let k = 0; k < 3; k++) {
              const fragPos = ps[i].pos.clone().add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
              ));
              const fragVel = ps[i].vel.clone().add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.003,
                (Math.random() - 0.5) * 0.003,
                (Math.random() - 0.5) * 0.003
              ));
              newParticles.push({ pos: fragPos, vel: fragVel, generation: Math.min(ps[i].generation + 1, 2) });
            }
          }
        }
      }

      if (newParticles.length > 0) {
        particlesRef.current = [...ps, ...newParticles].slice(0, 500);
      }
      setParticles([...particlesRef.current]);
      setCollisionCount((c) => c + collisions);
    }, 50);

    return () => clearInterval(interval);
  }, [running, speed]);

  return (
    <section id="kessler" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-destructive mb-3 uppercase">Warning Scenario</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Kessler Syndrome Simulator</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Visualize cascading collisions — where each impact creates fragments that trigger more collisions.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Objects", value: particles.length },
            { label: "Collisions", value: collisionCount },
            { label: "Gen-0 (Original)", value: particles.filter((p) => p.generation === 0).length },
            { label: "Fragments", value: particles.filter((p) => p.generation > 0).length },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <p className="text-2xl font-display font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-2 mb-6 overflow-hidden">
          <KesslerScene particles={particles} />
          <div className="flex flex-wrap items-center justify-center gap-4 p-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Original objects</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" /> 1st-gen fragments</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[hsl(45,100%,60%)]" /> 2nd-gen+ fragments</span>
          </div>
        </motion.div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setRunning(!running)}
            className={`px-6 py-2 text-xs font-display tracking-wider rounded-lg border transition-all ${
              running ? "bg-destructive/20 text-destructive border-destructive/40" : "bg-primary/20 text-primary border-primary/40"
            }`}
          >
            {running ? "⏸ Pause" : "▶ Start Simulation"}
          </button>
          <button onClick={initParticles} className="px-6 py-2 text-xs font-display tracking-wider rounded-lg border bg-secondary/50 text-muted-foreground border-border/50 hover:border-primary/20 transition-all">
            ↺ Reset
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Speed:</span>
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-3 py-1 text-xs font-display rounded border transition-all ${
                  speed === s ? "bg-primary/20 text-primary border-primary/40" : "bg-secondary/50 text-muted-foreground border-border/50"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default KesslerSection;
