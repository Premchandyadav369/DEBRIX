import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Cpu, Loader2, Play, Target, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Orbital mechanics helpers
const MU = 398600.4418; // km^3/s^2
const R_EARTH = 6371;

interface DebrisTarget {
  name: string;
  noradId: string;
  perigee: number;
  apogee: number;
  inclination: number;
  eccentricity: number;
}

interface CapturePlan {
  phase: string;
  desc: string;
  dv: number; // m/s
  duration: number; // s
  status: "queued" | "burn" | "coast" | "capture";
}

// Hohmann transfer delta-v from r1 to r2 (km)
function hohmannDv(r1: number, r2: number) {
  const a_t = (r1 + r2) / 2;
  const v1 = Math.sqrt(MU / r1);
  const v2 = Math.sqrt(MU / r2);
  const v_p = Math.sqrt(MU * (2 / r1 - 1 / a_t));
  const v_a = Math.sqrt(MU * (2 / r2 - 1 / a_t));
  const dv1 = Math.abs(v_p - v1);
  const dv2 = Math.abs(v2 - v_a);
  const t = Math.PI * Math.sqrt((a_t * a_t * a_t) / MU); // s
  return { dv1: dv1 * 1000, dv2: dv2 * 1000, total: (dv1 + dv2) * 1000, t };
}

// inclination change delta-v
function planeChangeDv(v: number, dInc: number) {
  return 2 * v * Math.sin((dInc * Math.PI) / 180 / 2) * 1000;
}

// DEBRI-X reference orbit
const DEBRIX_ALT = 620;
const DEBRIX_INC = 97.6;

function computePlan(target: DebrisTarget): {
  plan: CapturePlan[];
  totals: { dv: number; duration: number; feasibility: number };
} {
  const r1 = R_EARTH + DEBRIX_ALT;
  const targetAlt = (target.perigee + target.apogee) / 2;
  const r2 = R_EARTH + targetAlt;
  const h = hohmannDv(r1, r2);
  const v_at_r1 = Math.sqrt(MU / r1);
  const dInc = Math.abs(target.inclination - DEBRIX_INC);
  const dv_plane = planeChangeDv(v_at_r1, dInc);

  const plan: CapturePlan[] = [
    { phase: "T-00", desc: "Mission arm · target lock via HRT sensor", dv: 0, duration: 300, status: "queued" },
    {
      phase: "T-01",
      desc: `Phasing burn · align RAAN & true anomaly (Δv=${(h.dv1 * 0.3).toFixed(1)} m/s)`,
      dv: h.dv1 * 0.3,
      duration: 900,
      status: "burn",
    },
    {
      phase: "T-02",
      desc: `Hohmann transfer to ${targetAlt.toFixed(0)}km · perigee burn`,
      dv: h.dv1,
      duration: h.t / 2,
      status: "burn",
    },
    { phase: "T-03", desc: "Coast on transfer ellipse · attitude for arrival", dv: 0, duration: h.t / 2, status: "coast" },
    {
      phase: "T-04",
      desc: `Circularization at ${targetAlt.toFixed(0)}km (Δv=${h.dv2.toFixed(1)} m/s)`,
      dv: h.dv2,
      duration: 600,
      status: "burn",
    },
    ...(dInc > 0.3
      ? [
          {
            phase: "T-05",
            desc: `Plane change ${dInc.toFixed(2)}° (Δv=${dv_plane.toFixed(1)} m/s)`,
            dv: dv_plane,
            duration: 600,
            status: "burn" as const,
          },
        ]
      : []),
    { phase: "T-06", desc: "R-Bar approach · LIDAR / IR proximity ops", dv: 25, duration: 1800, status: "coast" },
    { phase: "T-07", desc: "Station-keep 5m · 4-DOF arm deploy", dv: 5, duration: 300, status: "capture" },
    { phase: "T-08", desc: "3-finger gripper capture · momentum sync", dv: 3, duration: 180, status: "capture" },
    { phase: "T-09", desc: "Debris stow in body bin · secure latch", dv: 0, duration: 240, status: "capture" },
    { phase: "T-10", desc: "Retrograde deorbit burn · target atmospheric entry", dv: 120, duration: 300, status: "burn" },
  ];

  const totalDv = plan.reduce((s, p) => s + p.dv, 0);
  const totalDur = plan.reduce((s, p) => s + p.duration, 0);
  const budget = 850; // m/s
  const feasibility = Math.max(0, Math.min(100, 100 - ((totalDv - budget) / budget) * 100));

  return { plan, totals: { dv: totalDv, duration: totalDur, feasibility } };
}

/* ============ 3D REPLAY SCENE ============ */

function CaptureReplay({ progress, targetAlt }: { progress: number; targetAlt: number }) {
  const chaserRef = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!chaserRef.current) return;
    // Target orbit radius (scaled), Debrix ends at target
    const rD = 1 + DEBRIX_ALT / 6371;
    const rT = 1 + targetAlt / 6371;

    // Chaser starts on rD, transfers to rT along ellipse
    const p = progress;
    let r: number, ang: number;
    if (p < 0.4) {
      // phasing
      r = rD;
      ang = p * Math.PI * 2;
    } else if (p < 0.7) {
      // transfer
      const tp = (p - 0.4) / 0.3;
      r = rD + (rT - rD) * tp;
      ang = Math.PI * 2 * 0.4 + tp * Math.PI;
    } else {
      // rendezvous
      const tp = (p - 0.7) / 0.3;
      r = rT - tp * (rT - rT) - tp * 0.02; // close on target
      ang = Math.PI * 2 * 0.4 + Math.PI + tp * 0.3;
    }
    chaserRef.current.position.set(r * Math.cos(ang), 0.1 * Math.sin(ang * 2), r * Math.sin(ang));
    chaserRef.current.lookAt(0, 0, 0);

    if (armRef.current) {
      // deploy arm during capture phase
      const armExt = p > 0.7 ? Math.min(1, (p - 0.7) / 0.2) : 0;
      armRef.current.rotation.x = -Math.PI / 2 * armExt;
    }
  });

  const rT = 1 + targetAlt / 6371;

  // Target debris marker (stationary in orbit angle for demo)
  const targetPos = useMemo(() => {
    const ang = Math.PI * 2 * 0.4 + Math.PI + 0.3;
    return new THREE.Vector3(rT * Math.cos(ang), 0, rT * Math.sin(ang));
  }, [rT]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 2]} intensity={1.2} />
      <Stars radius={50} depth={30} count={2000} factor={3} fade />
      {/* Earth */}
      <mesh>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color="#1a3a6e" emissive="#0a1a3a" emissiveIntensity={0.4} />
      </mesh>
      {/* DEBRI-X starting orbit */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1 + DEBRIX_ALT / 6371 - 0.003, 1 + DEBRIX_ALT / 6371 + 0.003, 128]} />
        <meshBasicMaterial color="#00ffb0" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Target orbit */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[rT - 0.003, rT + 0.003, 128]} />
        <meshBasicMaterial color="#ff6b6b" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Debris target */}
      <mesh position={targetPos}>
        <boxGeometry args={[0.04, 0.02, 0.03]} />
        <meshStandardMaterial color="#ff6b6b" emissive="#ff3030" emissiveIntensity={0.6} />
      </mesh>
      {/* Chaser (DEBRI-X) */}
      <group ref={chaserRef}>
        <mesh>
          <boxGeometry args={[0.06, 0.04, 0.04]} />
          <meshStandardMaterial color="#00ffb0" emissive="#00b080" emissiveIntensity={0.5} />
        </mesh>
        {/* Solar panels */}
        <mesh position={[0, 0, 0.08]}>
          <boxGeometry args={[0.02, 0.03, 0.08]} />
          <meshStandardMaterial color="#1a3a6e" />
        </mesh>
        <mesh position={[0, 0, -0.08]}>
          <boxGeometry args={[0.02, 0.03, 0.08]} />
          <meshStandardMaterial color="#1a3a6e" />
        </mesh>
        {/* Arm */}
        <group ref={armRef} position={[0.03, 0.02, 0]}>
          <mesh position={[0.03, 0, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.06]} />
            <meshStandardMaterial color="#cccccc" metalness={0.7} />
          </mesh>
        </group>
      </group>
    </>
  );
}

/* ============ COMPONENT ============ */

const DebrisCaptureMissionPlanner = () => {
  const [targets, setTargets] = useState<DebrisTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DebrisTarget | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.functions.invoke("celestrak-proxy");
        if (data?.reentryObjects) {
          const list: DebrisTarget[] = data.reentryObjects.slice(0, 20).map((s: any) => ({
            name: s.name,
            noradId: s.noradId,
            perigee: s.perigee,
            apogee: s.apogee,
            inclination: s.inclination,
            eccentricity: s.eccentricity,
          }));
          setTargets(list);
          if (list.length) setSelected(list[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 1) {
          setRunning(false);
          return 1;
        }
        return p + 0.006;
      });
    }, 50);
    return () => clearInterval(id);
  }, [running]);

  const analysis = useMemo(() => (selected ? computePlan(selected) : null), [selected]);

  return (
    <section id="capture-planner" className="relative z-10">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">
            Autonomous Rendezvous Planner
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Debris Capture Mission Planner
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            Pick a real reentry-candidate object from the live CelesTrak catalog. The planner computes
            Hohmann transfer, plane change, phasing, arm-capture sequence, and animates the full mission
            replay in 3D.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading live debris catalog…
          </div>
        ) : (
          <div className="grid lg:grid-cols-[280px_1fr_320px] gap-4">
            {/* Target list */}
            <div className="glass-card p-3 max-h-[600px] overflow-y-auto">
              <p className="font-display text-[10px] tracking-widest text-muted-foreground mb-3 px-1">
                LIVE TARGETS ({targets.length})
              </p>
              <div className="space-y-1">
                {targets.map((t) => (
                  <button
                    key={t.noradId}
                    onClick={() => {
                      setSelected(t);
                      setProgress(0);
                      setRunning(false);
                    }}
                    className={`w-full text-left p-2 rounded border transition text-xs ${
                      selected?.noradId === t.noradId
                        ? "bg-primary/20 border-primary/40"
                        : "bg-secondary/30 border-border hover:border-primary/30"
                    }`}
                  >
                    <p className="font-mono text-foreground truncate">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {t.perigee}×{t.apogee}km · {t.inclination.toFixed(1)}°
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* 3D Replay */}
            <div className="glass-card p-2 relative" style={{ minHeight: 480 }}>
              <div className="absolute top-3 left-3 z-10 text-[10px] font-mono flex flex-col gap-1">
                <span className="px-2 py-0.5 bg-background/70 border border-primary/30 rounded text-primary">
                  MISSION REPLAY
                </span>
                {selected && (
                  <span className="px-2 py-0.5 bg-background/70 border border-border rounded text-muted-foreground">
                    TARGET: {selected.name}
                  </span>
                )}
              </div>
              <div className="absolute top-3 right-3 z-10 flex gap-1">
                <button
                  onClick={() => {
                    setProgress(0);
                    setRunning(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1 text-[10px] font-mono rounded bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30"
                >
                  <Play className="w-3 h-3" /> RUN
                </button>
              </div>
              <div style={{ height: 480 }}>
                <Canvas camera={{ position: [2.5, 1.5, 2.5], fov: 45 }} dpr={[1, 2]}>
                  <color attach="background" args={["#020310"]} />
                  <Suspense fallback={null}>
                    {selected && (
                      <CaptureReplay progress={progress} targetAlt={(selected.perigee + selected.apogee) / 2} />
                    )}
                  </Suspense>
                  <OrbitControls enablePan={false} minDistance={1.6} maxDistance={8} />
                </Canvas>
              </div>
              {/* Timeline */}
              <div className="absolute bottom-3 left-3 right-3 z-10">
                <div className="h-1.5 bg-background/50 rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <p className="text-[9px] font-mono text-muted-foreground mt-1 text-center">
                  MISSION PROGRESS · {(progress * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Analysis panel */}
            <div className="flex flex-col gap-3">
              {analysis && selected && (
                <>
                  <div className="glass-card p-4">
                    <p className="font-display text-[10px] tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> Δv BUDGET
                    </p>
                    <p className="text-3xl font-display font-bold text-primary">
                      {analysis.totals.dv.toFixed(0)} <span className="text-sm text-muted-foreground">m/s</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Available propellant budget: 850 m/s
                    </p>
                    <div className="mt-3 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          analysis.totals.dv > 850 ? "bg-destructive" : "bg-gradient-to-r from-primary to-accent"
                        }`}
                        style={{ width: `${Math.min(100, (analysis.totals.dv / 850) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="glass-card p-4">
                    <p className="font-display text-[10px] tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                      <Target className="w-3 h-3" /> FEASIBILITY
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p
                        className={`text-3xl font-display font-bold ${
                          analysis.totals.feasibility > 60
                            ? "text-primary"
                            : analysis.totals.feasibility > 30
                            ? "text-accent"
                            : "text-destructive"
                        }`}
                      >
                        {analysis.totals.feasibility.toFixed(0)}%
                      </p>
                      {analysis.totals.feasibility < 40 && (
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Duration: {(analysis.totals.duration / 3600).toFixed(1)}h · Plane change:{" "}
                      {Math.abs(selected.inclination - DEBRIX_INC).toFixed(1)}°
                    </p>
                  </div>

                  <div className="glass-card p-4 flex-1 overflow-y-auto max-h-[280px]">
                    <p className="font-display text-[10px] tracking-widest text-muted-foreground mb-3 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> MISSION SEQUENCE
                    </p>
                    <div className="space-y-1.5">
                      {analysis.plan.map((p, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-[10px] font-mono border-l-2 pl-2 py-1"
                          style={{
                            borderColor:
                              p.status === "burn"
                                ? "hsl(0 80% 60%)"
                                : p.status === "capture"
                                ? "hsl(160 80% 50%)"
                                : "hsl(190 80% 50% / 0.4)",
                          }}
                        >
                          <span className="text-primary shrink-0">{p.phase}</span>
                          <span className="text-muted-foreground">{p.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default DebrisCaptureMissionPlanner;
