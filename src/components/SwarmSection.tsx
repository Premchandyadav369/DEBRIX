import { useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

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
  orbitRadius: 2 + i * 0.15,
  orbitSpeed: 0.3 + Math.random() * 0.2,
  orbitOffset: (i / 8) * Math.PI * 2,
  inclination: (Math.random() - 0.5) * 0.4,
  color: ["#22b8cf", "#38d9a9", "#4dabf7", "#74c0fc", "#22b8cf", "#69db7c", "#38d9a9", "#91a7ff"][i],
}));

function SwarmSatellite({ sat }: { sat: SwarmSat }) {
  const ref = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Line>(null);

  const trailGeometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = sat.orbitOffset + (i / 64) * Math.PI * 2;
      const x = Math.cos(angle) * sat.orbitRadius;
      const y = Math.sin(angle) * sat.inclination;
      const z = Math.sin(angle) * sat.orbitRadius;
      pts.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [sat]);

  const trailMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: sat.color, transparent: true, opacity: 0.15 }),
    [sat.color]
  );

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime * sat.orbitSpeed + sat.orbitOffset;
      ref.current.position.x = Math.cos(t) * sat.orbitRadius;
      ref.current.position.y = Math.sin(t) * sat.inclination;
      ref.current.position.z = Math.sin(t) * sat.orbitRadius;
      ref.current.rotation.y = t;
    }
  });

  return (
    <>
      <primitive object={new THREE.Line(trailGeometry, trailMaterial)} />
      <group ref={ref}>
        <mesh>
          <boxGeometry args={[0.12, 0.06, 0.08]} />
          <meshStandardMaterial color={sat.color} emissive={sat.color} emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.12, 0, 0]}>
          <boxGeometry args={[0.1, 0.01, 0.06]} />
          <meshStandardMaterial color="#1a5a8a" />
        </mesh>
        <mesh position={[-0.12, 0, 0]}>
          <boxGeometry args={[0.1, 0.01, 0.06]} />
          <meshStandardMaterial color="#1a5a8a" />
        </mesh>
        <pointLight color={sat.color} intensity={0.3} distance={1} />
      </group>
    </>
  );
}

function Earth() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.05;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#0a2a4a" emissive="#051525" emissiveIntensity={0.3} />
      <mesh>
        <sphereGeometry args={[1.02, 32, 32]} />
        <meshStandardMaterial color="#22b8cf" transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>
    </mesh>
  );
}

function AvoidanceLines() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshBasicMaterial({
          color: "#ff6b6b",
          transparent: true,
          opacity: Math.sin(state.clock.elapsedTime * 2 + i) * 0.3 + 0.1,
        });
      });
    }
  });
  return <group ref={ref} />;
}

function SwarmScene() {
  return (
    <div className="w-full h-[450px] md:h-[550px]">
      <Canvas camera={{ position: [0, 3, 6], fov: 45 }}>
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 3, 5]} intensity={0.8} />
        <Earth />
        {SWARM.map((sat) => (
          <SwarmSatellite key={sat.id} sat={sat} />
        ))}
        <AvoidanceLines />
        <OrbitControls enableZoom enablePan={false} autoRotate autoRotateSpeed={0.2} />
      </Canvas>
    </div>
  );
}

const SwarmSection = () => {
  return (
    <section id="swarm" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Formation</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Swarm Coordination</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            8 Debrix satellites orbiting in coordinated formation with real-time collision avoidance.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-2 mb-8 overflow-hidden">
          <SwarmScene />
          <div className="flex flex-wrap items-center justify-center gap-4 p-3 text-xs text-muted-foreground">
            {SWARM.slice(0, 4).map((s) => (
              <span key={s.id} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                Debrix-{s.id + 1}
              </span>
            ))}
            <span className="text-muted-foreground">+{SWARM.length - 4} more</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Active Units", value: "8" },
            { label: "Formation Type", value: "Walker" },
            { label: "Avg Separation", value: "~50 km" },
            { label: "Collision Events Avoided", value: "0" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4 text-center">
              <p className="text-2xl font-display font-bold text-primary">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SwarmSection;
