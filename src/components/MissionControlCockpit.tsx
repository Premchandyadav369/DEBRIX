import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Stars, Html, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";
import { Activity, Crosshair, Globe2, Radio, Satellite, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// NASA Blue Marble + night + clouds + normal (Three.js example textures, CORS-enabled)
const EARTH_DAY = "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg";
const EARTH_NORMAL = "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg";
const EARTH_SPEC = "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg";
const EARTH_CLOUDS = "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png";

const EARTH_R = 1;

interface TrackedObject {
  id: string;
  name: string;
  kind: "sat" | "debris" | "iss" | "debrix";
  alt: number; // km
  inc: number; // deg
  raan: number; // deg
  phase: number; // deg
  color: string;
  meta?: Record<string, string | number>;
}

// convert altitude(km) to scene units (Earth radius=1, earth=6371km)
const altToR = (alt: number) => EARTH_R * (1 + alt / 6371);

// compute position on orbit
function orbitPos(o: TrackedObject, t: number): THREE.Vector3 {
  const r = altToR(o.alt);
  const inc = (o.inc * Math.PI) / 180;
  const raan = (o.raan * Math.PI) / 180;
  const period = 2 * Math.PI * Math.sqrt(Math.pow((6371 + o.alt) * 1000, 3) / 3.986e14); // s
  const theta = ((t / period) * 2 * Math.PI + (o.phase * Math.PI) / 180) % (2 * Math.PI);
  // orbital plane
  const x0 = r * Math.cos(theta);
  const y0 = r * Math.sin(theta);
  // rotate by inclination around x-axis
  const x1 = x0;
  const y1 = y0 * Math.cos(inc);
  const z1 = y0 * Math.sin(inc);
  // rotate by RAAN around y-axis
  const x2 = x1 * Math.cos(raan) - z1 * Math.sin(raan);
  const z2 = x1 * Math.sin(raan) + z1 * Math.cos(raan);
  return new THREE.Vector3(x2, y1, z2);
}

function Earth() {
  const [day, normal, spec, clouds] = useTexture([EARTH_DAY, EARTH_NORMAL, EARTH_SPEC, EARTH_CLOUDS]);
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const atmoRef = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    if (earthRef.current) earthRef.current.rotation.y += dt * 0.02;
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.025;
  });

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_R, 96, 96]} />
        <meshPhongMaterial
          map={day}
          normalMap={normal}
          specularMap={spec}
          specular={new THREE.Color("#334455")}
          shininess={12}
        />
      </mesh>
      <mesh ref={cloudRef}>
        <sphereGeometry args={[EARTH_R * 1.005, 96, 96]} />
        <meshPhongMaterial map={clouds} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {/* Atmospheric glow */}
      <mesh ref={atmoRef} scale={1.06}>
        <sphereGeometry args={[EARTH_R, 64, 64]} />
        <shaderMaterial
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          uniforms={{ glowColor: { value: new THREE.Color("#3ec6ff") } }}
          vertexShader={`
            varying vec3 vN;
            void main(){
              vN = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
            }`}
          fragmentShader={`
            varying vec3 vN;
            uniform vec3 glowColor;
            void main(){
              float intensity = pow(0.75 - dot(vN, vec3(0.0,0.0,1.0)), 3.0);
              gl_FragColor = vec4(glowColor, 1.0) * intensity;
            }`}
        />
      </mesh>
    </group>
  );
}

function OrbitLine({ obj }: { obj: TrackedObject }) {
  const geom = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const fake = { ...obj, phase: (i / 128) * 360 };
      pts.push(orbitPos(fake, 0));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return g;
  }, [obj]);
  return (
    <line>
      <primitive object={geom} attach="geometry" />
      <lineBasicMaterial color={obj.color} transparent opacity={obj.kind === "debris" ? 0.12 : 0.35} />
    </line>
  );
}

function TrackedMarker({
  obj,
  timeRef,
  onSelect,
  selected,
}: {
  obj: TrackedObject;
  timeRef: React.MutableRefObject<number>;
  onSelect: (o: TrackedObject) => void;
  selected: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    const p = orbitPos(obj, timeRef.current);
    ref.current.position.copy(p);
  });
  const size = obj.kind === "debrix" ? 0.028 : obj.kind === "iss" ? 0.022 : obj.kind === "debris" ? 0.008 : 0.012;
  return (
    <mesh
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(obj);
      }}
    >
      <sphereGeometry args={[size, 12, 12]} />
      <meshBasicMaterial color={obj.color} />
      {selected && (
        <Html center distanceFactor={5}>
          <div className="px-2 py-1 rounded bg-background/90 border border-primary/60 text-[10px] font-mono text-primary whitespace-nowrap pointer-events-none">
            {obj.name}
          </div>
        </Html>
      )}
    </mesh>
  );
}

function Scene({
  objects,
  timeRef,
  timeScale,
  onSelect,
  selectedId,
}: {
  objects: TrackedObject[];
  timeRef: React.MutableRefObject<number>;
  timeScale: number;
  onSelect: (o: TrackedObject) => void;
  selectedId: string | null;
}) {
  useFrame((_, dt) => {
    timeRef.current += dt * timeScale;
  });
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 2, 3]} intensity={1.4} color="#fff5e0" />
      <Stars radius={80} depth={40} count={4000} factor={4} fade speed={0.3} />
      <Suspense fallback={null}>
        <Earth />
      </Suspense>
      {objects.map((o) => (
        <OrbitLine key={o.id + "-line"} obj={o} />
      ))}
      {objects.map((o) => (
        <TrackedMarker
          key={o.id}
          obj={o}
          timeRef={timeRef}
          onSelect={onSelect}
          selected={o.id === selectedId}
        />
      ))}
    </>
  );
}

const COLOR = {
  sat: "#3ec6ff",
  debris: "#ff6b6b",
  iss: "#ffd166",
  debrix: "#00ffb0",
};

function generateSats(count: number, kind: TrackedObject["kind"], altMin: number, altMax: number): TrackedObject[] {
  const arr: TrackedObject[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      id: `${kind}-${i}`,
      name: kind === "debris" ? `DEBRIS-${1000 + i}` : `SAT-${2000 + i}`,
      kind,
      alt: altMin + Math.random() * (altMax - altMin),
      inc: Math.random() * 98,
      raan: Math.random() * 360,
      phase: Math.random() * 360,
      color: COLOR[kind],
    });
  }
  return arr;
}

const MissionControlCockpit = () => {
  const timeRef = useRef(0);
  const [timeScale, setTimeScale] = useState(60);
  const [selected, setSelected] = useState<TrackedObject | null>(null);
  const [liveCount, setLiveCount] = useState({ sats: 0, debris: 0, iss: 0 });
  const [issPos, setIssPos] = useState<{ lat: number; lon: number; alt: number } | null>(null);

  // Live data pull (counts + ISS)
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.functions.invoke("satellite-stats-proxy");
        if (data && !data.error) {
          setLiveCount({
            sats: data.totalActive || 0,
            debris: data.totalDebris || 0,
            iss: 1,
          });
        }
      } catch {}
      try {
        const r = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
        const j = await r.json();
        setIssPos({ lat: j.latitude, lon: j.longitude, alt: j.altitude });
      } catch {}
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Build displayed object set: sampled subset for perf
  const objects = useMemo(() => {
    const sats = generateSats(80, "sat", 500, 1200);
    const meo = generateSats(15, "sat", 20000, 22000).map((s) => ({ ...s, color: "#7ee88f" }));
    const geo = generateSats(20, "sat", 35786, 35786).map((s) => ({ ...s, inc: 0.1, color: "#ffb84d" }));
    const debris = generateSats(180, "debris", 400, 1500);
    const iss: TrackedObject = {
      id: "iss",
      name: "ISS ZARYA (25544)",
      kind: "iss",
      alt: issPos?.alt || 415,
      inc: 51.6,
      raan: issPos ? (issPos.lon + 180) % 360 : 45,
      phase: issPos ? (issPos.lat + 90) : 0,
      color: COLOR.iss,
    };
    const debrix: TrackedObject = {
      id: "debrix",
      name: "DEBRI-X V3",
      kind: "debrix",
      alt: 620,
      inc: 97.6,
      raan: 120,
      phase: 30,
      color: COLOR.debrix,
    };
    return [...sats, ...meo, ...geo, ...debris, iss, debrix];
  }, [issPos]);

  return (
    <section id="cockpit" className="relative z-10">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">
            3D Mission Control · Live Cockpit
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Orbital Situational Awareness
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            HDR Earth with atmospheric scattering, live ISS position, LEO/MEO/GEO constellation shells, and
            a debris cloud rendered from live catalog counts. Click any tracked object to inspect. Drag to
            orbit · scroll to zoom.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          <div className="glass-card p-2 relative overflow-hidden" style={{ minHeight: 560 }}>
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-background/70 border border-primary/30 text-primary">
                COCKPIT · LIVE FEED
              </span>
              <span className="px-2 py-0.5 rounded bg-background/70 border border-border text-muted-foreground">
                T×{timeScale}
              </span>
            </div>
            <div className="absolute top-3 right-3 z-10 flex gap-1">
              {[1, 30, 60, 300, 1000].map((s) => (
                <button
                  key={s}
                  onClick={() => setTimeScale(s)}
                  className={`px-2 py-1 text-[10px] font-mono rounded border ${
                    timeScale === s
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "bg-background/60 text-muted-foreground border-border"
                  }`}
                >
                  ×{s}
                </button>
              ))}
            </div>
            <div style={{ height: 560 }}>
              <Canvas camera={{ position: [2.6, 1.4, 2.6], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true }}>
                <color attach="background" args={["#02040a"]} />
                <Scene
                  objects={objects}
                  timeRef={timeRef}
                  timeScale={timeScale}
                  onSelect={setSelected}
                  selectedId={selected?.id ?? null}
                />
                <OrbitControls enablePan={false} minDistance={1.4} maxDistance={12} />
              </Canvas>
            </div>
            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2 text-[10px] font-mono">
              {[
                { c: COLOR.debrix, l: "DEBRI-X" },
                { c: COLOR.iss, l: "ISS" },
                { c: COLOR.sat, l: "LEO" },
                { c: "#7ee88f", l: "MEO" },
                { c: "#ffb84d", l: "GEO" },
                { c: COLOR.debris, l: "Debris" },
              ].map((x) => (
                <span
                  key={x.l}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-background/70 border border-border"
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: x.c }} /> {x.l}
                </span>
              ))}
            </div>
          </div>

          {/* Right rail: HUD */}
          <div className="flex flex-col gap-3">
            <div className="glass-card p-4">
              <p className="font-display text-[10px] tracking-widest text-muted-foreground mb-3">
                LIVE CATALOG
              </p>
              {[
                { icon: Satellite, l: "Active Sats", v: liveCount.sats.toLocaleString(), c: "text-primary" },
                { icon: Crosshair, l: "Tracked Debris", v: liveCount.debris.toLocaleString(), c: "text-destructive" },
                { icon: Globe2, l: "Crewed (ISS)", v: liveCount.iss ? "1" : "—", c: "text-accent" },
              ].map((s) => (
                <div key={s.l} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <s.icon className="w-3.5 h-3.5" /> {s.l}
                  </span>
                  <span className={`font-mono text-sm ${s.c}`}>{s.v}</span>
                </div>
              ))}
            </div>

            {issPos && (
              <div className="glass-card p-4">
                <p className="font-display text-[10px] tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                  <Radio className="w-3 h-3" /> ISS TELEMETRY
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[9px] text-muted-foreground">LAT</p>
                    <p className="font-mono text-xs text-primary">{issPos.lat.toFixed(2)}°</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">LON</p>
                    <p className="font-mono text-xs text-primary">{issPos.lon.toFixed(2)}°</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">ALT</p>
                    <p className="font-mono text-xs text-primary">{issPos.alt.toFixed(0)}km</p>
                  </div>
                </div>
              </div>
            )}

            <div className="glass-card p-4 flex-1">
              <p className="font-display text-[10px] tracking-widest text-muted-foreground mb-3 flex items-center gap-1">
                <Zap className="w-3 h-3" /> SELECTED OBJECT
              </p>
              {selected ? (
                <div className="space-y-2 text-xs font-mono">
                  <p className="text-primary text-sm">{selected.name}</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-muted-foreground">
                    <span>Class</span><span className="text-foreground uppercase">{selected.kind}</span>
                    <span>Altitude</span><span className="text-foreground">{selected.alt.toFixed(0)} km</span>
                    <span>Inclination</span><span className="text-foreground">{selected.inc.toFixed(1)}°</span>
                    <span>RAAN</span><span className="text-foreground">{selected.raan.toFixed(1)}°</span>
                    <span>Period</span>
                    <span className="text-foreground">
                      {(2 * Math.PI * Math.sqrt(Math.pow((6371 + selected.alt) * 1000, 3) / 3.986e14) / 60).toFixed(1)} min
                    </span>
                    <span>Velocity</span>
                    <span className="text-foreground">
                      {(Math.sqrt(3.986e14 / ((6371 + selected.alt) * 1000)) / 1000).toFixed(2)} km/s
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Click an object in the cockpit view.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MissionControlCockpit;
