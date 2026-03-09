import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
const phaseTimings = [0, 3000, 6000, 9000, 12000, 15000, 18000];

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

    let currentPhase: Phase = "preflight";
    for (let i = phaseTimings.length - 1; i >= 0; i--) {
      if (el >= phaseTimings[i]) {
        currentPhase = phaseSequence[i];
        break;
      }
    }
    setPhase(currentPhase);

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
          {/* Status & Mission Time Panel */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Status + Clock row */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <AnimatePresence mode="wait">
                <motion.div key={phase} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${running ? "bg-green-400 animate-pulse" : phase === "orbit" ? "bg-accent" : "bg-muted-foreground"}`} />
                    <p className="font-mono text-lg font-bold text-primary tracking-wider">{telemetry.status}</p>
                  </div>
                  <p className="text-muted-foreground text-sm max-w-md">{telemetry.substatus}</p>
                </motion.div>
              </AnimatePresence>

              <div className="text-right">
                <p className="font-mono text-3xl md:text-4xl font-bold text-foreground">{telemetry.tPlus}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Mission Time</p>
              </div>
            </div>

            {/* Phase progress bar */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                {phaseSequence.map((p, i) => (
                  <div key={p} className={`text-[9px] md:text-[10px] font-mono uppercase tracking-wider transition-colors ${i <= phaseIdx ? "text-primary font-bold" : "text-muted-foreground/40"}`}>
                    {p === "preflight" ? "PRE" : p === "ignition" ? "IGN" : p === "maxq" ? "MAX-Q" : p === "meco" ? "MECO" : p === "stage2" ? "S2" : p === "fairing" ? "FAIR" : "ORB"}
                  </div>
                ))}
              </div>
              <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-3">
              <button
                onClick={handleLaunch}
                disabled={running || phase === "orbit"}
                className="gradient-button text-xs flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Rocket className="w-3.5 h-3.5" />
                {phase === "preflight" ? "INITIATE LAUNCH" : phase === "orbit" ? "ORBIT ACHIEVED" : "LAUNCHING..."}
              </button>
              {phase !== "preflight" && (
                <button onClick={handleReset} className="glass-card px-4 py-2 text-xs font-display text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
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
