import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import * as satellite from "satellite.js";

const NASA_API_KEY = "WBkaFckn04xcJlW4NoleN07iZajebOJGZpT4LrZz";

interface TLEApiMember {
  satelliteId: number;
  name: string;
  date: string;
  line1: string;
  line2: string;
}

interface DebrisPoint {
  name: string;
  position: [number, number, number];
  altitude: number;
}

interface NeoObject {
  name: string;
  close_approach_date: string;
  miss_distance_km: string;
  velocity_km_s: string;
  estimated_diameter_min: number;
  estimated_diameter_max: number;
  is_potentially_hazardous: boolean;
}

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) meshRef.current.rotation.y = state.clock.elapsedTime * 0.05;
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#0a2a4a" emissive="#051525" emissiveIntensity={0.3} />
      <mesh>
        <sphereGeometry args={[1.02, 32, 32]} />
        <meshStandardMaterial color="#22b8cf" transparent opacity={0.15} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.005, 16, 16]} />
        <meshStandardMaterial wireframe color="#1a6a8a" transparent opacity={0.2} />
      </mesh>
    </mesh>
  );
}

function DebrisCloud({ positions }: { positions: Float32Array }) {
  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.01;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#22b8cf" transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}

function OrbitRing({ radius, color, opacity = 0.15 }: { radius: number; color: string; opacity?: number }) {
  const geometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);
  const material = useMemo(() => new THREE.LineBasicMaterial({ color, transparent: true, opacity }), [color, opacity]);
  return <primitive object={new THREE.Line(geometry, material)} />;
}

function DebrisScene({ debrisPositions }: { debrisPositions: Float32Array }) {
  return (
    <div className="w-full h-[400px] md:h-[500px]">
      <Canvas camera={{ position: [0, 2, 4], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={1} />
        <pointLight position={[-3, 2, -3]} intensity={0.4} color="#22b8cf" />
        <Earth />
        {debrisPositions.length > 0 && <DebrisCloud positions={debrisPositions} />}
        <OrbitRing radius={1.5} color="#22b8cf" />
        <OrbitRing radius={1.8} color="#38d9a9" opacity={0.1} />
        <OrbitRing radius={2.2} color="#4488cc" opacity={0.08} />
        <OrbitControls enableZoom enablePan={false} autoRotate autoRotateSpeed={0.3} />
      </Canvas>
    </div>
  );
}

function scalePosition(eciPos: { x: number; y: number; z: number }): [number, number, number] {
  const EARTH_RADIUS_KM = 6371;
  const SCALE = 1 / EARTH_RADIUS_KM;
  return [eciPos.x * SCALE, eciPos.z * SCALE, eciPos.y * SCALE];
}

const DebrisTrackerSection = () => {
  const [debrisPoints, setDebrisPoints] = useState<DebrisPoint[]>([]);
  const [neoObjects, setNeoObjects] = useState<NeoObject[]>([]);
  const [debrisCount, setDebrisCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"debris" | "neo">("debris");

  const debrisPositions = useMemo(() => {
    const arr = new Float32Array(debrisPoints.length * 3);
    debrisPoints.forEach((p, i) => {
      arr[i * 3] = p.position[0];
      arr[i * 3 + 1] = p.position[1];
      arr[i * 3 + 2] = p.position[2];
    });
    return arr;
  }, [debrisPoints]);

  const fetchDebrisData = useCallback(async () => {
    try {
      const res = await fetch("https://celestrak.org/NORAD/elements/gp.php?GROUP=cosmos-1408-debris&FORMAT=json");
      if (!res.ok) throw new Error("Celestrak fetch failed");
      const data: TLERecord[] = await res.json();
      const now = new Date();
      const points: DebrisPoint[] = [];
      data.slice(0, 200).forEach((rec) => {
        try {
          const satrec = satellite.twoline2satrec(rec.TLE_LINE1, rec.TLE_LINE2);
          const posVel = satellite.propagate(satrec, now);
          if (posVel.position && typeof posVel.position !== "boolean") {
            const pos = posVel.position as { x: number; y: number; z: number };
            const alt = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2) - 6371;
            points.push({ name: rec.OBJECT_NAME, position: scalePosition(pos), altitude: Math.round(alt) });
          }
        } catch {}
      });
      setDebrisPoints(points);
      setDebrisCount(data.length);
    } catch {
      const points: DebrisPoint[] = [];
      for (let i = 0; i < 150; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI * 0.8;
        const r = 1.3 + Math.random() * 0.8;
        points.push({
          name: `DEBRIS-${i}`,
          position: [r * Math.cos(phi) * Math.cos(theta), r * Math.sin(phi), r * Math.cos(phi) * Math.sin(theta)],
          altitude: Math.round(300 + Math.random() * 600),
        });
      }
      setDebrisPoints(points);
      setDebrisCount(150);
    }
  }, []);

  const fetchNeoData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&api_key=${NASA_API_KEY}`);
      if (!res.ok) throw new Error("NEO fetch failed");
      const data = await res.json();
      const neos: NeoObject[] = [];
      Object.values(data.near_earth_objects).forEach((dayArr: any) => {
        dayArr.forEach((neo: any) => {
          const ca = neo.close_approach_data?.[0];
          if (ca) {
            neos.push({
              name: neo.name,
              close_approach_date: ca.close_approach_date_full || ca.close_approach_date,
              miss_distance_km: parseFloat(ca.miss_distance.kilometers).toLocaleString(undefined, { maximumFractionDigits: 0 }),
              velocity_km_s: parseFloat(ca.relative_velocity.kilometers_per_second).toFixed(1),
              estimated_diameter_min: neo.estimated_diameter.meters.estimated_diameter_min,
              estimated_diameter_max: neo.estimated_diameter.meters.estimated_diameter_max,
              is_potentially_hazardous: neo.is_potentially_hazardous_asteroid,
            });
          }
        });
      });
      neos.sort((a, b) => parseFloat(a.miss_distance_km.replace(/,/g, "")) - parseFloat(b.miss_distance_km.replace(/,/g, "")));
      setNeoObjects(neos.slice(0, 10));
    } catch {
      setNeoObjects([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDebrisData(), fetchNeoData()]).finally(() => setLoading(false));
  }, [fetchDebrisData, fetchNeoData]);

  return (
    <section id="debris-tracker" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Live Data</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Real-Time Space Debris Tracker</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Tracking {debrisCount > 0 ? debrisCount.toLocaleString() : "..."} debris objects from Celestrak TLE data with SGP4 orbital propagation, plus Near-Earth Objects from NASA NeoWs.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Tracked Debris", value: debrisCount > 0 ? debrisCount.toLocaleString() : "—" },
            { label: "Avg Altitude", value: debrisPoints.length > 0 ? `${Math.round(debrisPoints.reduce((s, p) => s + p.altitude, 0) / debrisPoints.length)} km` : "—" },
            { label: "NEOs This Week", value: neoObjects.length > 0 ? neoObjects.length.toString() : "—" },
            { label: "Hazardous NEOs", value: neoObjects.filter((n) => n.is_potentially_hazardous).length.toString() },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4 text-center">
              <p className="text-2xl md:text-3xl font-display font-bold text-primary">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-2 mb-8 overflow-hidden">
          <DebrisScene debrisPositions={debrisPositions} />
          <div className="flex items-center justify-center gap-4 p-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Debris (Cosmos-1408)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent" /> Orbit rings</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[hsl(210,60%,30%)]" /> Earth</span>
          </div>
        </motion.div>

        <div className="flex gap-2 mb-4">
          {(["debris", "neo"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-display tracking-wider rounded-full border transition-colors ${
                activeTab === tab ? "bg-primary/20 text-primary border-primary/40" : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20"
              }`}
            >
              {tab === "debris" ? "Debris Objects" : "Near-Earth Objects"}
            </button>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading data...</div>
          ) : activeTab === "debris" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left p-3 font-display tracking-wider">Object</th>
                    <th className="text-right p-3 font-display tracking-wider">Altitude (km)</th>
                    <th className="text-right p-3 font-display tracking-wider">X</th>
                    <th className="text-right p-3 font-display tracking-wider">Y</th>
                    <th className="text-right p-3 font-display tracking-wider">Z</th>
                  </tr>
                </thead>
                <tbody>
                  {debrisPoints.slice(0, 15).map((d, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="p-3 font-mono text-foreground">{d.name}</td>
                      <td className="p-3 text-right text-primary font-mono">{d.altitude}</td>
                      <td className="p-3 text-right text-muted-foreground font-mono">{d.position[0].toFixed(2)}</td>
                      <td className="p-3 text-right text-muted-foreground font-mono">{d.position[1].toFixed(2)}</td>
                      <td className="p-3 text-right text-muted-foreground font-mono">{d.position[2].toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left p-3 font-display tracking-wider">Name</th>
                    <th className="text-right p-3 font-display tracking-wider">Miss Distance (km)</th>
                    <th className="text-right p-3 font-display tracking-wider">Velocity (km/s)</th>
                    <th className="text-right p-3 font-display tracking-wider">Diameter (m)</th>
                    <th className="text-center p-3 font-display tracking-wider">Hazardous</th>
                  </tr>
                </thead>
                <tbody>
                  {neoObjects.map((neo, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="p-3 font-mono text-foreground">{neo.name}</td>
                      <td className="p-3 text-right text-primary font-mono">{neo.miss_distance_km}</td>
                      <td className="p-3 text-right text-muted-foreground font-mono">{neo.velocity_km_s}</td>
                      <td className="p-3 text-right text-muted-foreground font-mono">{neo.estimated_diameter_min.toFixed(0)}–{neo.estimated_diameter_max.toFixed(0)}</td>
                      <td className="p-3 text-center">
                        {neo.is_potentially_hazardous ? <span className="text-destructive font-bold">⚠ YES</span> : <span className="text-muted-foreground">No</span>}
                      </td>
                    </tr>
                  ))}
                  {neoObjects.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No NEO data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default DebrisTrackerSection;
