import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import * as THREE from "three";
import * as satellite from "satellite.js";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Loader2, Radio, Satellite as SatIcon, Target } from "lucide-react";

// Earth scale: 1 unit = 1000 km. Earth radius ~6.371.
const EARTH_R = 6.371;
const KM_TO_UNITS = 1 / 1000;

type Propagated = {
  name: string;
  noradId: string;
  satrec: satellite.SatRec;
  category: "debris" | "hunter";
};

const HUNTER_IDS = ["25544", "20580", "48274", "33591", "49260", "27386", "25994", "27424", "39634", "40697"];
const HUNTER_LABELS: Record<string, string> = {
  "25544": "H1·ISS", "20580": "H2·HST", "48274": "H3·TIA", "33591": "H4·NOA",
  "49260": "H5·LSAT", "27386": "H6·ENV", "25994": "H7·TER", "27424": "H8·AQU",
  "39634": "H9·S1A", "40697": "H10·S2A",
};

function eciToUnits(pos: satellite.EciVec3<number>, gmst: number) {
  // Convert ECI (km) to ECEF (km) to keep Earth static, then scale.
  const ecef = satellite.eciToEcf(pos, gmst);
  return new THREE.Vector3(ecef.x * KM_TO_UNITS, ecef.z * KM_TO_UNITS, -ecef.y * KM_TO_UNITS);
}

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (meshRef.current) meshRef.current.rotation.y += dt * 0.02;
  });
  return (
    <group>
      {/* Ocean sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[EARTH_R, 64, 64]} />
        <meshStandardMaterial color="#0b3d66" roughness={0.9} metalness={0.05} emissive="#04213b" emissiveIntensity={0.35} />
      </mesh>
      {/* Continents (procedural noise via wireframe overlay for depth) */}
      <mesh>
        <sphereGeometry args={[EARTH_R * 1.001, 48, 48]} />
        <meshBasicMaterial color="#1a6b3f" wireframe transparent opacity={0.18} />
      </mesh>
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[EARTH_R * 1.06, 48, 48]} />
        <meshBasicMaterial color="#4fb3ff" transparent opacity={0.09} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[EARTH_R * 1.12, 48, 48]} />
        <meshBasicMaterial color="#4fb3ff" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function OrbitRing({ altitudeKm, inclinationDeg, color, opacity = 0.15 }: { altitudeKm: number; inclinationDeg: number; color: string; opacity?: number }) {
  const points = useMemo(() => {
    const r = (6371 + altitudeKm) * KM_TO_UNITS;
    const inc = (inclinationDeg * Math.PI) / 180;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * Math.sin(inc) * r;
      const z = Math.sin(a) * Math.cos(inc) * r;
      pts.push(new THREE.Vector3(x, y, z));
    }
    return pts;
  }, [altitudeKm, inclinationDeg]);
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  return (
    <line>
      <primitive object={geo} attach="geometry" />
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </line>
  );
}

function SatelliteSwarm({ objects, onCapture }: { objects: Propagated[]; onCapture: (name: string) => void }) {
  const debrisRef = useRef<THREE.InstancedMesh>(null);
  const hunterRef = useRef<THREE.InstancedMesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const lineGeo = useMemo(() => new THREE.BufferGeometry(), []);
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color: "#22d3ee", transparent: true, opacity: 0.4 }), []);
  const debrisList = useMemo(() => objects.filter((o) => o.category === "debris"), [objects]);
  const hunterList = useMemo(() => objects.filter((o) => o.category === "hunter"), [objects]);
  const lastCaptureRef = useRef(0);

  useFrame(() => {
    const now = new Date();
    const gmst = satellite.gstime(now);
    const debrisPos: THREE.Vector3[] = [];
    const hunterPos: THREE.Vector3[] = [];

    debrisList.forEach((o, i) => {
      try {
        const pv = satellite.propagate(o.satrec, now);
        if (pv.position && typeof pv.position !== "boolean") {
          const p = eciToUnits(pv.position as satellite.EciVec3<number>, gmst);
          debrisPos[i] = p;
          tmp.position.copy(p);
          tmp.scale.setScalar(0.045);
          tmp.updateMatrix();
          debrisRef.current?.setMatrixAt(i, tmp.matrix);
        }
      } catch {}
    });
    hunterList.forEach((o, i) => {
      try {
        const pv = satellite.propagate(o.satrec, now);
        if (pv.position && typeof pv.position !== "boolean") {
          const p = eciToUnits(pv.position as satellite.EciVec3<number>, gmst);
          hunterPos[i] = p;
          tmp.position.copy(p);
          tmp.scale.setScalar(0.09);
          tmp.updateMatrix();
          hunterRef.current?.setMatrixAt(i, tmp.matrix);
        }
      } catch {}
    });
    if (debrisRef.current) debrisRef.current.instanceMatrix.needsUpdate = true;
    if (hunterRef.current) hunterRef.current.instanceMatrix.needsUpdate = true;

    // Draw scan lines from each hunter to nearest debris within threshold
    const linePts: number[] = [];
    let captured = "";
    hunterPos.forEach((hp, hi) => {
      if (!hp) return;
      let nearest = -1;
      let nearestDist = 0.6; // scene units (~600 km)
      debrisPos.forEach((dp, di) => {
        if (!dp) return;
        const d = hp.distanceTo(dp);
        if (d < nearestDist) { nearestDist = d; nearest = di; }
      });
      if (nearest >= 0) {
        const dp = debrisPos[nearest];
        linePts.push(hp.x, hp.y, hp.z, dp.x, dp.y, dp.z);
        if (nearestDist < 0.15 && Math.random() < 0.005) {
          captured = `${HUNTER_LABELS[hunterList[hi].noradId] || hunterList[hi].name} → ${debrisList[nearest].name}`;
        }
      }
    });
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePts, 3));
    lineGeo.attributes.position.needsUpdate = true;

    if (captured && Date.now() - lastCaptureRef.current > 6000) {
      lastCaptureRef.current = Date.now();
      onCapture(captured);
    }
  });

  return (
    <>
      <instancedMesh ref={debrisRef} args={[undefined, undefined, Math.max(debrisList.length, 1)]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#c4a97a" roughness={0.8} metalness={0.4} emissive="#5c3a12" emissiveIntensity={0.2} />
      </instancedMesh>
      <instancedMesh ref={hunterRef} args={[undefined, undefined, Math.max(hunterList.length, 1)]}>
        <boxGeometry args={[1, 1, 1.4]} />
        <meshStandardMaterial color="#e6f6ff" emissive="#22d3ee" emissiveIntensity={0.9} metalness={0.6} roughness={0.3} />
      </instancedMesh>
      <lineSegments ref={linesRef}>
        <primitive object={lineGeo} attach="geometry" />
        <primitive object={lineMat} attach="material" />
      </lineSegments>
      {/* Hunter labels */}
      {hunterList.map((h, i) => (
        <HunterLabel key={h.noradId} satrec={h.satrec} label={HUNTER_LABELS[h.noradId] || `H${i + 1}`} />
      ))}
    </>
  );
}

function HunterLabel({ satrec, label }: { satrec: satellite.SatRec; label: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    try {
      const now = new Date();
      const gmst = satellite.gstime(now);
      const pv = satellite.propagate(satrec, now);
      if (pv.position && typeof pv.position !== "boolean") {
        const p = eciToUnits(pv.position as satellite.EciVec3<number>, gmst);
        ref.current.position.copy(p);
      }
    } catch {}
  });
  return (
    <group ref={ref}>
      <Html center distanceFactor={12} style={{ pointerEvents: "none" }}>
        <div className="px-1.5 py-0.5 text-[8px] font-mono rounded bg-background/70 border border-primary/40 text-primary whitespace-nowrap">
          {label}
        </div>
      </Html>
    </group>
  );
}

export default function SwarmScene3D({ onAlert }: { onAlert: (msg: string) => void }) {
  const [objects, setObjects] = useState<Propagated[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ debris: 0, hunters: 0, source: "" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const propagated: Propagated[] = [];
      let source = "CelesTrak · live";

      // Fetch hunter TLEs
      for (const id of HUNTER_IDS) {
        try {
          const { data } = await supabase.functions.invoke("keeptrack-proxy", { body: { endpoint: `/sat/${id}/tle` } });
          const raw: any = data;
          let l1 = "", l2 = "", name = HUNTER_LABELS[id] || `H-${id}`;
          if (typeof raw === "string") {
            const lines = raw.trim().split(/\r?\n/);
            if (lines.length >= 3) { name = lines[0].trim(); l1 = lines[1]; l2 = lines[2]; }
            else if (lines.length === 2) { l1 = lines[0]; l2 = lines[1]; }
          } else if (raw) {
            name = raw.name || raw.OBJECT_NAME || name;
            l1 = raw.line1 || raw.TLE_LINE1 || raw.tleLine1 || "";
            l2 = raw.line2 || raw.TLE_LINE2 || raw.tleLine2 || "";
          }
          if (l1 && l2) {
            propagated.push({ name, noradId: id, satrec: satellite.twoline2satrec(l1, l2), category: "hunter" });
          }
        } catch {}
      }

      // Fetch debris (reentry candidates from CelesTrak proxy)
      try {
        const { data } = await supabase.functions.invoke("celestrak-proxy");
        const arr: any[] = Array.isArray(data) ? data : [];
        arr.slice(0, 80).forEach((sat) => {
          if (sat.tle1 && sat.tle2) {
            try {
              propagated.push({
                name: sat.name || `DEB-${sat.noradId}`,
                noradId: String(sat.noradId),
                satrec: satellite.twoline2satrec(sat.tle1, sat.tle2),
                category: "debris",
              });
            } catch {}
          }
        });
      } catch {}

      if (propagated.filter((p) => p.category === "debris").length === 0) {
        // Fallback: synthesize plausible LEO debris orbits
        source = "Synthesized · LEO envelope";
        const epoch = new Date();
        const dayOfYear = (epoch.getTime() - Date.UTC(epoch.getUTCFullYear(), 0, 0)) / 86400000;
        const epochStr = `${(epoch.getUTCFullYear() % 100).toString().padStart(2, "0")}${dayOfYear.toFixed(8).padStart(12, "0")}`;
        for (let i = 0; i < 60; i++) {
          const inc = (30 + (i * 7) % 70).toFixed(4).padStart(8, " ");
          const raan = ((i * 17) % 360).toFixed(4).padStart(8, " ");
          const mm = (14.5 + Math.random() * 1.5).toFixed(8).padStart(11, " ");
          const noradId = (90000 + i).toString().padStart(5, "0");
          const l1 = `1 ${noradId}U 00000A   ${epochStr}  .00000000  00000-0  00000-0 0  9990`;
          const l2 = `2 ${noradId} ${inc} ${raan} 0001000   0.0000 ${((i * 36) % 360).toFixed(4).padStart(8, " ")} ${mm}00000`;
          try {
            propagated.push({ name: `DEB-${noradId}`, noradId, satrec: satellite.twoline2satrec(l1, l2), category: "debris" });
          } catch {}
        }
      }

      if (!cancelled) {
        setObjects(propagated);
        setStats({
          debris: propagated.filter((p) => p.category === "debris").length,
          hunters: propagated.filter((p) => p.category === "hunter").length,
          source,
        });
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="relative">
      <div className="w-full h-[480px] rounded-xl overflow-hidden bg-gradient-to-b from-[#020817] to-[#060f24] border border-border/40">
        <Canvas camera={{ position: [0, 8, 22], fov: 45 }} dpr={[1, 1.6]}>
          <color attach="background" args={["#020817"]} />
          <ambientLight intensity={0.35} />
          <directionalLight position={[15, 8, 10]} intensity={1.4} color="#ffffff" />
          <pointLight position={[-20, -10, -15]} intensity={0.3} color="#4fb3ff" />
          <Suspense fallback={null}>
            <Stars radius={100} depth={50} count={3000} factor={3} fade speed={0.3} />
            <Earth />
            {/* Reference orbit shells */}
            <OrbitRing altitudeKm={420} inclinationDeg={51.6} color="#22d3ee" opacity={0.25} />
            <OrbitRing altitudeKm={550} inclinationDeg={53} color="#22d3ee" opacity={0.2} />
            <OrbitRing altitudeKm={800} inclinationDeg={98} color="#94a3b8" opacity={0.15} />
            {objects.length > 0 && <SatelliteSwarm objects={objects} onCapture={onAlert} />}
          </Suspense>
          <OrbitControls
            enablePan={false}
            minDistance={9}
            maxDistance={40}
            autoRotate
            autoRotateSpeed={0.25}
            enableDamping
          />
        </Canvas>
      </div>

      {/* HUD */}
      <div className="absolute top-3 left-3 space-y-1.5 font-mono text-[10px] pointer-events-none">
        <div className="px-2 py-1 rounded bg-background/70 border border-border/40 backdrop-blur-sm flex items-center gap-1.5">
          <SatIcon className="w-2.5 h-2.5 text-primary" />
          <span className="text-muted-foreground">HUNTERS:</span>
          <span className="text-primary font-bold">{stats.hunters}/10</span>
        </div>
        <div className="px-2 py-1 rounded bg-background/70 border border-border/40 backdrop-blur-sm flex items-center gap-1.5">
          <Target className="w-2.5 h-2.5 text-destructive" />
          <span className="text-muted-foreground">DEBRIS:</span>
          <span className="text-destructive font-bold">{stats.debris}</span>
        </div>
        <div className="px-2 py-1 rounded bg-background/70 border border-border/40 backdrop-blur-sm flex items-center gap-1.5">
          <Radio className="w-2.5 h-2.5 text-accent" />
          <span className="text-muted-foreground">SRC:</span>
          <span className="text-accent">{stats.source || "…"}</span>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-background/70 border border-border/40 backdrop-blur-sm font-mono text-[9px] text-muted-foreground flex items-center gap-1.5">
        <Activity className="w-2.5 h-2.5 text-accent animate-pulse" />
        LIVE SGP4 · ECEF FRAME · DRAG TO ORBIT
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm rounded-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
            Fetching live TLEs & propagating…
          </div>
        </div>
      )}
    </div>
  );
}
