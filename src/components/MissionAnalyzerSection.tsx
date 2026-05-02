import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Satellite, Fuel, Clock, Target, Gauge, BarChart3, ArrowUpDown, Radio, Loader2, MapPin } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface MissionConfig {
  altitude: number;
  inclination: number;
  mass: number;
  fuelMass: number;
  solarPanelArea: number;
  dragArea: number;
}

type OrbitType = "LEO" | "MEO" | "GEO" | "SSO" | "Polar" | "Molniya";

function detectOrbitType(alt: number, inc: number): { type: OrbitType; description: string } {
  if (Math.abs(inc - 98) < 3 && alt < 1000) return { type: "SSO", description: "Sun-Synchronous Orbit — passes over any given point at the same local solar time" };
  if (inc > 85 && inc <= 100 && alt < 2000) return { type: "Polar", description: "Polar Orbit — passes near both poles, useful for Earth observation" };
  if (alt >= 35000 && alt <= 36500 && inc < 5) return { type: "GEO", description: "Geostationary — appears fixed above a point on the equator" };
  if (alt > 2000 && alt < 35000) return { type: "MEO", description: "Medium Earth Orbit — used by GPS, Galileo, and GLONASS constellations" };
  if (Math.abs(inc - 63.4) < 2 && alt > 500) return { type: "Molniya", description: "Molniya Orbit — highly elliptical, long dwell time over high latitudes" };
  return { type: "LEO", description: "Low Earth Orbit — most satellites and the ISS operate here" };
}

function estimateLifetime(alt: number, mass: number, dragArea: number): number {
  if (alt > 800) return 25 + (alt - 800) * 0.1;
  if (alt > 600) return 5 + (alt - 600) * 0.1;
  if (alt > 400) return 1 + (alt - 400) * 0.02;
  return Math.max(0.1, (alt - 200) * 0.005) * (mass / Math.max(0.01, dragArea));
}

function computeOrbitalPeriod(alt: number): number {
  const R = 6371 + alt;
  return 2 * Math.PI * Math.sqrt(R ** 3 / 398600.4418) / 60;
}

function computeVelocity(alt: number): number {
  return Math.sqrt(398600.4418 / (6371 + alt));
}

function computeCoverage(alt: number, inc: number): number {
  const earthRadius = 6371;
  const halfAngle = Math.acos(earthRadius / (earthRadius + alt)) * (180 / Math.PI);
  const footprintDiameter = 2 * halfAngle * 111;
  const latCoverage = Math.min(inc + halfAngle, 90);
  return Math.min(100, (latCoverage / 90) * (footprintDiameter / 2000) * 100);
}

function generateFuelCurve(fuelMass: number, lifetimeYears: number): { year: number; fuel: number }[] {
  const data: { year: number; fuel: number }[] = [];
  const consumptionRate = fuelMass / Math.max(lifetimeYears, 0.5);
  for (let y = 0; y <= Math.ceil(lifetimeYears); y += 0.5) {
    const remaining = Math.max(0, fuelMass - consumptionRate * y);
    data.push({ year: y, fuel: Math.round(remaining * 10) / 10 });
    if (remaining <= 0) break;
  }
  return data;
}

function generateCoverageOverTime(alt: number, inc: number): { orbit: number; coverage: number }[] {
  const data: { orbit: number; coverage: number }[] = [];
  const maxCoverage = computeCoverage(alt, inc);
  for (let i = 0; i <= 16; i++) {
    const orbits = i;
    const cov = Math.min(maxCoverage, maxCoverage * (1 - Math.exp(-orbits * 0.3)));
    data.push({ orbit: orbits, coverage: Math.round(cov * 10) / 10 });
  }
  return data;
}

const PRESETS: { label: string; config: MissionConfig }[] = [
  { label: "CubeSat (LEO)", config: { altitude: 500, inclination: 53, mass: 4, fuelMass: 0, solarPanelArea: 0.06, dragArea: 0.01 } },
  { label: "Earth Observation (SSO)", config: { altitude: 705, inclination: 98.2, mass: 2800, fuelMass: 120, solarPanelArea: 14, dragArea: 5 } },
  { label: "GPS Satellite (MEO)", config: { altitude: 20200, inclination: 55, mass: 2000, fuelMass: 200, solarPanelArea: 13, dragArea: 4.5 } },
  { label: "Communications (GEO)", config: { altitude: 35786, inclination: 0, mass: 6000, fuelMass: 1500, solarPanelArea: 50, dragArea: 12 } },
  { label: "ISS Resupply (LEO)", config: { altitude: 408, inclination: 51.6, mass: 13000, fuelMass: 300, solarPanelArea: 0, dragArea: 30 } },
  { label: "Polar Weather Sat", config: { altitude: 850, inclination: 99, mass: 4000, fuelMass: 250, solarPanelArea: 20, dragArea: 8 } },
];

const MissionAnalyzerSection = () => {
  const [config, setConfig] = useState<MissionConfig>(PRESETS[0].config);
  const [preset, setPreset] = useState<number>(0);

  const orbit = useMemo(() => detectOrbitType(config.altitude, config.inclination), [config.altitude, config.inclination]);
  const lifetime = useMemo(() => estimateLifetime(config.altitude, config.mass, config.dragArea), [config.altitude, config.mass, config.dragArea]);
  const period = useMemo(() => computeOrbitalPeriod(config.altitude), [config.altitude]);
  const velocity = useMemo(() => computeVelocity(config.altitude), [config.altitude]);
  const coverage = useMemo(() => computeCoverage(config.altitude, config.inclination), [config.altitude, config.inclination]);
  const fuelCurve = useMemo(() => generateFuelCurve(config.fuelMass, lifetime), [config.fuelMass, lifetime]);
  const coverageCurve = useMemo(() => generateCoverageOverTime(config.altitude, config.inclination), [config.altitude, config.inclination]);

  const updateConfig = (key: keyof MissionConfig, value: number) => {
    setConfig((c) => ({ ...c, [key]: value }));
    setPreset(-1);
  };

  const applyPreset = (i: number) => {
    setPreset(i);
    setConfig(PRESETS[i].config);
  };

  return (
    <section id="mission-analyzer" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Analysis Tool</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Satellite Mission Analyzer</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Configure mission parameters and analyze orbit type, lifetime, coverage, and fuel depletion in real time.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div className="glass-card p-5">
              <p className="font-display text-xs tracking-wider text-muted-foreground mb-3">MISSION PRESETS</p>
              <div className="space-y-1.5">
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => applyPreset(i)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                      preset === i ? "bg-primary/10 border-primary/40 text-primary" : "bg-card/40 border-border/50 text-muted-foreground hover:border-primary/20"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-5 space-y-3">
              <p className="font-display text-xs tracking-wider text-muted-foreground">PARAMETERS</p>
              {[
                { key: "altitude" as const, label: "Altitude", min: 200, max: 40000, step: 10, unit: "km", val: config.altitude },
                { key: "inclination" as const, label: "Inclination", min: 0, max: 180, step: 0.1, unit: "°", val: config.inclination },
                { key: "mass" as const, label: "Satellite Mass", min: 1, max: 20000, step: 10, unit: "kg", val: config.mass },
                { key: "fuelMass" as const, label: "Fuel Mass", min: 0, max: 5000, step: 5, unit: "kg", val: config.fuelMass },
                { key: "dragArea" as const, label: "Drag Area", min: 0.01, max: 50, step: 0.1, unit: "m²", val: config.dragArea },
              ].map((p) => (
                <div key={p.key}>
                  <label className="text-[10px] text-muted-foreground flex justify-between">
                    <span>{p.label}</span>
                    <span className="font-mono text-foreground">{p.val} {p.unit}</span>
                  </label>
                  <input
                    type="range"
                    min={p.min} max={p.max} step={p.step} value={p.val}
                    onChange={(e) => updateConfig(p.key, +e.target.value)}
                    className="w-full accent-[hsl(190,85%,52%)]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Orbit type banner */}
            <motion.div
              key={orbit.type}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-5 border-l-4 border-l-primary"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Satellite className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-display font-bold bg-primary/20 text-primary">{orbit.type}</span>
                    <span className="text-xs text-muted-foreground">{config.altitude.toLocaleString()} km · {config.inclination}°</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{orbit.description}</p>
                </div>
              </div>
            </motion.div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { icon: Clock, label: "Orbital Period", value: `${period.toFixed(1)} min`, color: "text-primary" },
                { icon: Gauge, label: "Velocity", value: `${velocity.toFixed(2)} km/s`, color: "text-accent" },
                { icon: Target, label: "Coverage", value: `${coverage.toFixed(1)}%`, color: "text-primary" },
                { icon: ArrowUpDown, label: "Lifetime", value: lifetime > 25 ? ">25 yr" : `${lifetime.toFixed(1)} yr`, color: "text-accent" },
                { icon: Fuel, label: "Fuel Reserve", value: `${config.fuelMass} kg`, color: "text-primary" },
                { icon: BarChart3, label: "Orbits/Day", value: (1440 / period).toFixed(1), color: "text-accent" },
              ].map((m) => (
                <div key={m.label} className="glass-card p-3 text-center">
                  <m.icon className={`w-4 h-4 mx-auto mb-1 ${m.color}`} />
                  <p className={`text-lg font-display font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="glass-card p-5">
                <p className="font-display text-xs tracking-wider text-muted-foreground mb-3">FUEL DEPLETION</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={fuelCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 18%, 22%)" />
                    <XAxis dataKey="year" stroke="hsl(215, 15%, 40%)" tick={{ fontSize: 9 }} label={{ value: "Years", position: "insideBottom", offset: -5, fontSize: 9, fill: "hsl(215, 15%, 40%)" }} />
                    <YAxis stroke="hsl(215, 15%, 40%)" tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ background: "hsl(220, 22%, 14%)", border: "1px solid hsl(220, 18%, 22%)", borderRadius: "8px", fontSize: "11px" }} />
                    <Area type="monotone" dataKey="fuel" stroke="hsl(190, 85%, 52%)" fill="hsl(190, 85%, 52%)" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card p-5">
                <p className="font-display text-xs tracking-wider text-muted-foreground mb-3">COVERAGE BUILDUP (per orbit)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={coverageCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 18%, 22%)" />
                    <XAxis dataKey="orbit" stroke="hsl(215, 15%, 40%)" tick={{ fontSize: 9 }} label={{ value: "Orbits", position: "insideBottom", offset: -5, fontSize: 9, fill: "hsl(215, 15%, 40%)" }} />
                    <YAxis stroke="hsl(215, 15%, 40%)" tick={{ fontSize: 9 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: "hsl(220, 22%, 14%)", border: "1px solid hsl(220, 18%, 22%)", borderRadius: "8px", fontSize: "11px" }} />
                    <Area type="monotone" dataKey="coverage" stroke="hsl(160, 70%, 48%)" fill="hsl(160, 70%, 48%)" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Coverage visualization */}
            <div className="glass-card p-5">
              <p className="font-display text-xs tracking-wider text-muted-foreground mb-3">GROUND TRACK COVERAGE</p>
              <div className="relative w-full h-[160px] bg-[hsl(220,25%,8%)] rounded-lg overflow-hidden border border-border/30">
                <svg viewBox="0 0 360 180" className="w-full h-full" preserveAspectRatio="none">
                  {Array.from({ length: 7 }, (_, i) => (
                    <line key={`h${i}`} x1="0" y1={i * 30} x2="360" y2={i * 30} stroke="hsl(220, 18%, 18%)" strokeWidth="0.5" />
                  ))}
                  <line x1="0" y1="90" x2="360" y2="90" stroke="hsl(190, 85%, 52%)" strokeWidth="0.3" opacity="0.3" />
                  {/* Coverage band */}
                  <rect
                    x="0" y={Math.max(0, 90 - config.inclination)}
                    width="360" height={Math.min(180, config.inclination * 2)}
                    fill="hsl(160, 70%, 48%)" opacity="0.1"
                  />
                  {/* Ground track sinusoid */}
                  <path
                    d={Array.from({ length: 361 }, (_, i) => {
                      const lon = i;
                      const lat = 90 - config.inclination * Math.sin((i / 360) * Math.PI * 2 * (1440 / period));
                      return `${i === 0 ? "M" : "L"}${lon},${lat}`;
                    }).join(" ")}
                    fill="none" stroke="hsl(190, 85%, 52%)" strokeWidth="0.8" opacity="0.6"
                  />
                  {/* Continents hint */}
                  <path d="M80,35 L95,32 L100,40 L110,42 L115,50 L105,55 L95,52 L85,45 Z" fill="hsl(160, 70%, 30%)" opacity="0.2" />
                  <path d="M160,30 L200,25 L220,35 L230,50 L225,65 L210,75 L195,70 L180,55 Z" fill="hsl(160, 70%, 30%)" opacity="0.2" />
                  <path d="M270,55 L310,50 L320,70 L315,90 L290,85 L275,70 Z" fill="hsl(160, 70%, 30%)" opacity="0.2" />
                </svg>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Ground Track</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent opacity-40" /> Coverage Band (±{config.inclination}°)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MissionAnalyzerSection;
