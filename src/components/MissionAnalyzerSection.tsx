import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Satellite, Fuel, Clock, Target, Gauge, BarChart3, ArrowUpDown,
  Radio, Loader2, Sun, Wind, Rocket, Plus, X, Globe2,
} from "lucide-react";
import {
  ResponsiveContainer, Tooltip, CartesianGrid, AreaChart, Area,
  XAxis, YAxis, LineChart, Line, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

// ----- Types -----
interface MissionConfig {
  name: string;
  altitude: number;      // km
  inclination: number;   // deg
  mass: number;          // kg
  fuelMass: number;      // kg
  isp: number;           // s (specific impulse)
  solarPanelArea: number;// m²
  dragArea: number;      // m² (Cd*A used with Cd=2.2)
}
type OrbitType = "LEO" | "MEO" | "GEO" | "SSO" | "Polar" | "Molniya";

// ----- Physics helpers -----
const R_EARTH = 6371;
const MU = 398600.4418;                     // km³/s²
const OMEGA_EARTH = 360 / 86164.0905;       // deg/s (sidereal)

function detectOrbitType(alt: number, inc: number): { type: OrbitType; description: string } {
  if (Math.abs(inc - 98) < 3 && alt < 1000) return { type: "SSO", description: "Sun-Synchronous — passes over any point at the same local solar time." };
  if (inc > 85 && inc <= 100 && alt < 2000) return { type: "Polar", description: "Polar — passes near both poles; ideal for global Earth observation." };
  if (alt >= 35000 && alt <= 36500 && inc < 5) return { type: "GEO", description: "Geostationary — appears fixed above the equator." };
  if (alt > 2000 && alt < 35000) return { type: "MEO", description: "Medium Earth Orbit — GNSS constellations (GPS, Galileo, GLONASS)." };
  if (Math.abs(inc - 63.4) < 2 && alt > 500) return { type: "Molniya", description: "Molniya — highly elliptical, long dwell over high latitudes." };
  return { type: "LEO", description: "Low Earth Orbit — most satellites and the ISS operate here." };
}

function orbitalPeriodMin(alt: number): number {
  const R = R_EARTH + alt;
  return (2 * Math.PI * Math.sqrt((R ** 3) / MU)) / 60;
}
function orbitalVelocity(alt: number): number {
  return Math.sqrt(MU / (R_EARTH + alt));
}

// Simplified exponential atmospheric density (kg/m³), F10.7-modulated.
// Base coefficients from a smoothed US Standard + Jacchia-style scaling.
function atmosphericDensity(altKm: number, f107: number): number {
  if (altKm > 1500) return 0;
  // Base density at 200 km ≈ 2.5e-10 kg/m³, scale height ~50 km rising with altitude.
  const H0 = 50 + Math.max(0, altKm - 200) * 0.12; // km, grows with altitude
  const rho200 = 2.5e-10;
  const base = rho200 * Math.exp(-(altKm - 200) / H0);
  // Solar activity multiplier: doubles ~250 km at F10.7=200 vs 70
  const solarMult = 1 + 0.012 * (f107 - 70) * Math.max(0.2, Math.min(1, (altKm - 150) / 400));
  return Math.max(0, base * Math.max(0.1, solarMult));
}

// Semi-empirical orbital lifetime (years) — drag-dominated LEO.
// Uses ballistic coefficient B* ≈ Cd*A/m and integrates decay from current alt to 120 km.
function orbitalLifetime(alt: number, mass: number, dragArea: number, f107: number): number {
  if (alt > 1200) return 100; // essentially indefinite
  const Cd = 2.2;
  const BC = (Cd * dragArea) / Math.max(mass, 1); // m²/kg
  let years = 0;
  const step = 5; // km
  for (let h = alt; h > 120; h -= step) {
    const rho = atmosphericDensity(h, f107);
    const v = orbitalVelocity(h) * 1000; // m/s
    // Altitude decay rate dh/dt ≈ -rho * v * BC * (R+h)  (simplified)
    const dhdt = rho * v * BC * (R_EARTH + h) * 1000; // m/s → but treat as km/yr scale
    // Convert to km/year: rho*v*BC*R ~ decay in m/s times seconds per year, then /1000
    const decayKmPerYear = (rho * v * BC * (R_EARTH + h) * 1000 * 3.1536e7) / 1000;
    if (decayKmPerYear <= 1e-6) return 100;
    years += step / decayKmPerYear;
    if (years > 100) return 100;
  }
  return Math.max(0.01, years);
}

// Δv budget (m/s)
function deltaVBudget(cfg: MissionConfig, f107: number) {
  const v = orbitalVelocity(cfg.altitude) * 1000;
  const rho = atmosphericDensity(cfg.altitude, f107);
  const BC = (2.2 * cfg.dragArea) / Math.max(cfg.mass, 1);
  // Station-keeping to counter drag, per year (m/s)
  const dragDvPerYear = rho * v * v * BC * 3.1536e7 * 0.5;
  // Deorbit Hohmann to 100 km perigee
  const rA = R_EARTH + cfg.altitude;
  const rP = R_EARTH + 100;
  const a_t = (rA + rP) / 2;
  const dvDeorbit = Math.abs(Math.sqrt(MU / rA) - Math.sqrt(MU * (2 / rA - 1 / a_t))) * 1000;
  // Available Δv from fuel (Tsiolkovsky), assumes cfg.isp
  const g0 = 9.80665;
  const dvAvailable = cfg.fuelMass > 0
    ? cfg.isp * g0 * Math.log(cfg.mass / Math.max(1, cfg.mass - cfg.fuelMass))
    : 0;
  return {
    stationKeepingPerYear: dragDvPerYear,
    deorbit: dvDeorbit,
    available: dvAvailable,
  };
}

// Ground track — returns array of {lat, lon} for N minutes ahead
function computeGroundTrack(altKm: number, incDeg: number, minutes: number, samples: number) {
  const period = orbitalPeriodMin(altKm); // min
  const inc = (incDeg * Math.PI) / 180;
  const pts: { lat: number; lon: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const tMin = (i / samples) * minutes;
    const M = (2 * Math.PI * tMin) / period;
    const lat = Math.asin(Math.sin(inc) * Math.sin(M)) * (180 / Math.PI);
    let lon = Math.atan2(Math.cos(inc) * Math.sin(M), Math.cos(M)) * (180 / Math.PI);
    lon -= OMEGA_EARTH * tMin * 60;
    lon = ((lon + 540) % 360) - 180;
    pts.push({ lat, lon });
  }
  return pts;
}

// Coverage %
function coveragePct(alt: number, inc: number): number {
  const halfAngle = Math.acos(R_EARTH / (R_EARTH + alt)) * (180 / Math.PI);
  const footprint = 2 * halfAngle * 111;
  const latCov = Math.min(inc + halfAngle, 90);
  return Math.min(100, (latCov / 90) * (footprint / 2000) * 100);
}

// ----- Presets -----
const PRESETS: MissionConfig[] = [
  { name: "CubeSat (LEO)",          altitude: 500,   inclination: 53,   mass: 4,     fuelMass: 0,    isp: 220, solarPanelArea: 0.06, dragArea: 0.01 },
  { name: "Earth Obs (SSO)",        altitude: 705,   inclination: 98.2, mass: 2800,  fuelMass: 120,  isp: 230, solarPanelArea: 14,   dragArea: 5 },
  { name: "GPS Sat (MEO)",          altitude: 20200, inclination: 55,   mass: 2000,  fuelMass: 200,  isp: 300, solarPanelArea: 13,   dragArea: 4.5 },
  { name: "Comsat (GEO)",           altitude: 35786, inclination: 0,    mass: 6000,  fuelMass: 1500, isp: 315, solarPanelArea: 50,   dragArea: 12 },
  { name: "ISS Resupply",           altitude: 408,   inclination: 51.6, mass: 13000, fuelMass: 300,  isp: 280, solarPanelArea: 0,    dragArea: 30 },
  { name: "Polar Weather",          altitude: 850,   inclination: 99,   mass: 4000,  fuelMass: 250,  isp: 235, solarPanelArea: 20,   dragArea: 8 },
];

// F10.7 activity levels
const SOLAR_LEVELS = [
  { label: "Solar Min", f107: 70 },
  { label: "Moderate",  f107: 120 },
  { label: "Active",    f107: 170 },
  { label: "Solar Max", f107: 230 },
];

interface LiveSat { name: string; alt: number; inc: number; period: number; }

const COLORS = ["hsl(190, 85%, 52%)", "hsl(160, 70%, 48%)", "hsl(280, 70%, 60%)", "hsl(45, 90%, 55%)"];

const MissionAnalyzerSection = () => {
  const [config, setConfig] = useState<MissionConfig>({ ...PRESETS[0] });
  const [presetIdx, setPresetIdx] = useState(0);
  const [f107, setF107] = useState(120);
  const [loadingSolar, setLoadingSolar] = useState(false);
  const [liveSat, setLiveSat] = useState<LiveSat | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [compareSats, setCompareSats] = useState<MissionConfig[]>([]);
  const [trackMinutes, setTrackMinutes] = useState(180);

  // Fetch real-time F10.7 solar flux
  const fetchSolar = async () => {
    setLoadingSolar(true);
    try {
      const res = await fetch("https://services.swpc.noaa.gov/json/f107_cm_flux.json");
      if (res.ok) {
        const data = await res.json();
        const latest = Array.isArray(data) ? data[data.length - 1] : null;
        const val = Number(latest?.flux ?? latest?.f10_7 ?? 0);
        if (val > 50 && val < 400) setF107(Math.round(val));
      }
    } catch (e) {
      console.warn("F10.7 fetch failed, using default", e);
    } finally {
      setLoadingSolar(false);
    }
  };

  const fetchLiveSat = async () => {
    setLoadingLive(true);
    try {
      const { data } = await supabase.functions.invoke("keeptrack-proxy", {
        body: { endpoint: "/sat/25544/summary" },
      });
      const s: any = Array.isArray(data) ? data[0] : data;
      if (s) {
        const alt = Number(s.altitude || s.alt || s.apogee || 408);
        const inc = Number(s.inclination || s.inc || 51.6);
        setLiveSat({ name: s.name || "ISS (ZARYA)", alt, inc, period: orbitalPeriodMin(alt) });
      }
    } catch {
      setLiveSat({ name: "ISS (ZARYA)", alt: 408, inc: 51.6, period: 92.7 });
    } finally { setLoadingLive(false); }
  };

  useEffect(() => { fetchSolar(); fetchLiveSat(); }, []);

  // Derived metrics for current config
  const orbit = useMemo(() => detectOrbitType(config.altitude, config.inclination), [config.altitude, config.inclination]);
  const period = useMemo(() => orbitalPeriodMin(config.altitude), [config.altitude]);
  const velocity = useMemo(() => orbitalVelocity(config.altitude), [config.altitude]);
  const density = useMemo(() => atmosphericDensity(config.altitude, f107), [config.altitude, f107]);
  const lifetime = useMemo(() => orbitalLifetime(config.altitude, config.mass, config.dragArea, f107), [config.altitude, config.mass, config.dragArea, f107]);
  const coverage = useMemo(() => coveragePct(config.altitude, config.inclination), [config.altitude, config.inclination]);
  const dv = useMemo(() => deltaVBudget(config, f107), [config, f107]);
  const groundTrack = useMemo(() => computeGroundTrack(config.altitude, config.inclination, trackMinutes, 240), [config.altitude, config.inclination, trackMinutes]);

  // Lifetime curve across solar activity
  const lifetimeVsSolar = useMemo(() => {
    return [60, 90, 120, 150, 180, 210, 240].map((f) => ({
      f107: f,
      lifetime: Math.min(50, orbitalLifetime(config.altitude, config.mass, config.dragArea, f)),
    }));
  }, [config.altitude, config.mass, config.dragArea]);

  // Density vs altitude curve
  const densityCurve = useMemo(() => {
    const pts: { alt: number; density: number }[] = [];
    for (let h = 150; h <= 800; h += 25) {
      pts.push({ alt: h, density: atmosphericDensity(h, f107) });
    }
    return pts;
  }, [f107]);

  const updateConfig = <K extends keyof MissionConfig>(key: K, value: MissionConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: value }));
    setPresetIdx(-1);
  };
  const applyPreset = (i: number) => { setPresetIdx(i); setConfig({ ...PRESETS[i] }); };

  const addToCompare = () => {
    if (compareSats.length >= 3) return;
    setCompareSats((s) => [...s, { ...config, name: config.name || `Config ${s.length + 1}` }]);
  };
  const removeCompare = (i: number) => setCompareSats((s) => s.filter((_, idx) => idx !== i));

  // Fuel curve using station-keeping Δv per year
  const fuelCurve = useMemo(() => {
    const data: { year: number; fuel: number }[] = [];
    if (config.fuelMass <= 0) return [{ year: 0, fuel: 0 }, { year: 1, fuel: 0 }];
    // fuel consumed / year = mass * (1 - exp(-dv/(isp*g0)))
    const g0 = 9.80665;
    const yearlyBurn = config.mass * (1 - Math.exp(-dv.stationKeepingPerYear / (config.isp * g0)));
    const maxY = Math.max(1, Math.min(30, Math.ceil(config.fuelMass / Math.max(0.001, yearlyBurn))));
    for (let y = 0; y <= maxY; y += Math.max(0.25, maxY / 40)) {
      const remaining = Math.max(0, config.fuelMass - yearlyBurn * y);
      data.push({ year: +y.toFixed(2), fuel: +remaining.toFixed(2) });
      if (remaining <= 0) break;
    }
    return data;
  }, [config, dv.stationKeepingPerYear]);

  return (
    <section id="mission-analyzer" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Mission Analyzer · v2</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Satellite Mission Analyzer</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            Real-time atmospheric density, solar-flux-adjusted lifetime, ground track projection, Δv budget,
            and side-by-side multi-satellite comparison.
          </p>
        </motion.div>

        {/* Solar activity strip */}
        <div className="glass-card p-4 mb-4 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-accent" />
            <span className="font-display text-xs tracking-wider text-muted-foreground">SOLAR ACTIVITY (F10.7)</span>
            <span className="text-lg font-display font-bold text-accent">{f107}</span>
            <span className="text-[10px] text-muted-foreground font-mono">sfu</span>
            <button onClick={fetchSolar} disabled={loadingSolar}
              className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded border border-border/40 text-muted-foreground hover:text-accent hover:border-accent/40 flex items-center gap-1.5">
              {loadingSolar ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
              LIVE
            </button>
          </div>
          <div className="flex gap-1.5">
            {SOLAR_LEVELS.map((s) => (
              <button key={s.label} onClick={() => setF107(s.f107)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-all ${
                  Math.abs(f107 - s.f107) < 10 ? "bg-accent/15 border-accent/40 text-accent" : "bg-card/40 border-border/40 text-muted-foreground hover:border-accent/30"
                }`}>
                {s.label} · {s.f107}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div className="glass-card p-5">
              <p className="font-display text-xs tracking-wider text-muted-foreground mb-3">MISSION PRESETS</p>
              <div className="space-y-1.5">
                {PRESETS.map((p, i) => (
                  <button key={i} onClick={() => applyPreset(i)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                      presetIdx === i ? "bg-primary/10 border-primary/40 text-primary" : "bg-card/40 border-border/50 text-muted-foreground hover:border-primary/20"
                    }`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-5 space-y-3">
              <p className="font-display text-xs tracking-wider text-muted-foreground">PARAMETERS</p>
              {[
                { key: "altitude" as const,    label: "Altitude",       min: 200, max: 40000, step: 10,  unit: "km" },
                { key: "inclination" as const, label: "Inclination",    min: 0,   max: 180,   step: 0.1, unit: "°" },
                { key: "mass" as const,        label: "Dry Mass",       min: 1,   max: 20000, step: 10,  unit: "kg" },
                { key: "fuelMass" as const,    label: "Propellant",     min: 0,   max: 5000,  step: 5,   unit: "kg" },
                { key: "isp" as const,         label: "Isp",            min: 150, max: 450,   step: 5,   unit: "s" },
                { key: "dragArea" as const,    label: "Drag Area (A)",  min: 0.01,max: 50,    step: 0.1, unit: "m²" },
              ].map((p) => (
                <div key={p.key}>
                  <label className="text-[10px] text-muted-foreground flex justify-between">
                    <span>{p.label}</span>
                    <span className="font-mono text-foreground">{(config as any)[p.key]} {p.unit}</span>
                  </label>
                  <input type="range" min={p.min} max={p.max} step={p.step}
                    value={(config as any)[p.key]}
                    onChange={(e) => updateConfig(p.key, +e.target.value as any)}
                    className="w-full accent-[hsl(190,85%,52%)]" />
                </div>
              ))}
              <button onClick={addToCompare} disabled={compareSats.length >= 3}
                className="mt-2 w-full text-xs font-mono py-2 rounded border border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-40 flex items-center justify-center gap-2">
                <Plus className="w-3 h-3" /> ADD TO COMPARE ({compareSats.length}/3)
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Orbit type + description */}
            <motion.div key={orbit.type} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              className="glass-card p-5 border-l-4 border-l-primary">
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

            {/* Metrics grid — now includes density + Δv */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Clock, label: "Period",           value: `${period.toFixed(1)} min`,          color: "text-primary" },
                { icon: Gauge, label: "Velocity",         value: `${velocity.toFixed(2)} km/s`,       color: "text-accent" },
                { icon: Target,label: "Coverage",         value: `${coverage.toFixed(1)}%`,           color: "text-primary" },
                { icon: ArrowUpDown, label: "Lifetime",   value: lifetime > 50 ? ">50 yr" : `${lifetime.toFixed(2)} yr`, color: "text-accent" },
                { icon: Wind,  label: "Air Density",      value: density > 0 ? density.toExponential(2) : "0", color: "text-primary" },
                { icon: Rocket,label: "Δv Available",     value: `${dv.available.toFixed(0)} m/s`,    color: "text-accent" },
                { icon: Fuel,  label: "Δv Drag/yr",       value: `${dv.stationKeepingPerYear.toFixed(1)} m/s`, color: "text-primary" },
                { icon: BarChart3, label: "Δv Deorbit",   value: `${dv.deorbit.toFixed(0)} m/s`,      color: "text-accent" },
              ].map((m) => (
                <div key={m.label} className="glass-card p-3 text-center">
                  <m.icon className={`w-4 h-4 mx-auto mb-1 ${m.color}`} />
                  <p className={`text-sm font-display font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Δv Budget bar */}
            <div className="glass-card p-5">
              <p className="font-display text-xs tracking-wider text-muted-foreground mb-3">Δv BUDGET · MISSION FEASIBILITY</p>
              {(() => {
                const yearsSK = dv.available / Math.max(0.001, dv.stationKeepingPerYear);
                const canDeorbit = dv.available >= dv.deorbit;
                const remainingAfterDeorbit = dv.available - dv.deorbit;
                return (
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Station-keeping capacity</span>
                        <span className="font-mono">{yearsSK.toFixed(1)} yr @ current drag</span>
                      </div>
                      <div className="h-2 bg-card/60 rounded-full overflow-hidden">
                        <div className="h-full bg-primary/70" style={{ width: `${Math.min(100, (yearsSK / 15) * 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Deorbit reserve</span>
                        <span className={`font-mono ${canDeorbit ? "text-accent" : "text-primary/60"}`}>
                          {canDeorbit ? `+${remainingAfterDeorbit.toFixed(0)} m/s spare` : `INSUFFICIENT (need ${(dv.deorbit - dv.available).toFixed(0)} m/s more)`}
                        </span>
                      </div>
                      <div className="h-2 bg-card/60 rounded-full overflow-hidden">
                        <div className={`h-full ${canDeorbit ? "bg-accent/70" : "bg-primary/40"}`}
                          style={{ width: `${Math.min(100, (dv.available / dv.deorbit) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Ground track */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-display text-xs tracking-wider text-muted-foreground flex items-center gap-2">
                  <Globe2 className="w-3.5 h-3.5 text-primary" /> GROUND TRACK · next {trackMinutes} min
                </p>
                <div className="flex gap-1">
                  {[90, 180, 360, 720].map((m) => (
                    <button key={m} onClick={() => setTrackMinutes(m)}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-all ${
                        trackMinutes === m ? "bg-primary/15 border-primary/40 text-primary" : "border-border/40 text-muted-foreground hover:border-primary/30"
                      }`}>{m}m</button>
                  ))}
                </div>
              </div>
              <GroundTrackMap points={groundTrack} inclination={config.inclination} />
            </div>

            {/* Density vs altitude + Lifetime vs solar */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="glass-card p-5">
                <p className="font-display text-xs tracking-wider text-muted-foreground mb-3">ATMOSPHERIC DENSITY · F10.7={f107}</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={densityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 18%, 22%)" />
                    <XAxis dataKey="alt" stroke="hsl(215, 15%, 40%)" tick={{ fontSize: 9 }}
                      label={{ value: "Altitude (km)", position: "insideBottom", offset: -5, fontSize: 9, fill: "hsl(215, 15%, 40%)" }} />
                    <YAxis stroke="hsl(215, 15%, 40%)" tick={{ fontSize: 9 }} scale="log" domain={["auto", "auto"]}
                      tickFormatter={(v) => v.toExponential(0)} />
                    <Tooltip contentStyle={{ background: "hsl(220, 22%, 14%)", border: "1px solid hsl(220, 18%, 22%)", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(v: any) => (v as number).toExponential(2) + " kg/m³"} />
                    <Area type="monotone" dataKey="density" stroke="hsl(190, 85%, 52%)" fill="hsl(190, 85%, 52%)" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card p-5">
                <p className="font-display text-xs tracking-wider text-muted-foreground mb-3">LIFETIME vs SOLAR ACTIVITY</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={lifetimeVsSolar}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 18%, 22%)" />
                    <XAxis dataKey="f107" stroke="hsl(215, 15%, 40%)" tick={{ fontSize: 9 }}
                      label={{ value: "F10.7 (sfu)", position: "insideBottom", offset: -5, fontSize: 9, fill: "hsl(215, 15%, 40%)" }} />
                    <YAxis stroke="hsl(215, 15%, 40%)" tick={{ fontSize: 9 }}
                      label={{ value: "yr", angle: -90, position: "insideLeft", fontSize: 9, fill: "hsl(215, 15%, 40%)" }} />
                    <Tooltip contentStyle={{ background: "hsl(220, 22%, 14%)", border: "1px solid hsl(220, 18%, 22%)", borderRadius: "8px", fontSize: "11px" }} />
                    <Line type="monotone" dataKey="lifetime" stroke="hsl(160, 70%, 48%)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fuel curve */}
            <div className="glass-card p-5">
              <p className="font-display text-xs tracking-wider text-muted-foreground mb-3">
                PROPELLANT DEPLETION · station-keeping @ {dv.stationKeepingPerYear.toFixed(1)} m/s per year
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={fuelCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 18%, 22%)" />
                  <XAxis dataKey="year" stroke="hsl(215, 15%, 40%)" tick={{ fontSize: 9 }}
                    label={{ value: "Years", position: "insideBottom", offset: -5, fontSize: 9, fill: "hsl(215, 15%, 40%)" }} />
                  <YAxis stroke="hsl(215, 15%, 40%)" tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: "hsl(220, 22%, 14%)", border: "1px solid hsl(220, 18%, 22%)", borderRadius: "8px", fontSize: "11px" }} />
                  <Area type="monotone" dataKey="fuel" stroke="hsl(190, 85%, 52%)" fill="hsl(190, 85%, 52%)" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Multi-sat comparison */}
            {compareSats.length > 0 && (
              <div className="glass-card p-5">
                <p className="font-display text-xs tracking-wider text-muted-foreground mb-3">MULTI-SAT COMPARISON</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-[10px] text-muted-foreground uppercase">
                      <tr className="border-b border-border/40">
                        <th className="text-left p-2">Configuration</th>
                        <th className="text-right p-2">Alt</th>
                        <th className="text-right p-2">Inc</th>
                        <th className="text-right p-2">Period</th>
                        <th className="text-right p-2">Lifetime</th>
                        <th className="text-right p-2">Δv avail</th>
                        <th className="text-right p-2">Δv SK/yr</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[{ ...config, name: "◆ Current" }, ...compareSats].map((s, i) => {
                        const d = deltaVBudget(s, f107);
                        const lt = orbitalLifetime(s.altitude, s.mass, s.dragArea, f107);
                        return (
                          <tr key={i} className="border-b border-border/20 hover:bg-card/30">
                            <td className="p-2 font-display" style={{ color: i === 0 ? "hsl(190,85%,52%)" : COLORS[(i - 1) % COLORS.length] }}>{s.name}</td>
                            <td className="p-2 text-right font-mono">{s.altitude} km</td>
                            <td className="p-2 text-right font-mono">{s.inclination}°</td>
                            <td className="p-2 text-right font-mono">{orbitalPeriodMin(s.altitude).toFixed(1)}m</td>
                            <td className="p-2 text-right font-mono">{lt > 50 ? ">50y" : `${lt.toFixed(1)}y`}</td>
                            <td className="p-2 text-right font-mono">{d.available.toFixed(0)}</td>
                            <td className="p-2 text-right font-mono">{d.stationKeepingPerYear.toFixed(1)}</td>
                            <td className="p-2 text-right">
                              {i > 0 && (
                                <button onClick={() => removeCompare(i - 1)} className="text-muted-foreground hover:text-primary">
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Live benchmark */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-display text-xs tracking-wider text-muted-foreground flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-accent" /> LIVE BENCHMARK · vs {liveSat?.name || "—"}
                </p>
                <button onClick={fetchLiveSat} disabled={loadingLive}
                  className="text-[10px] font-mono px-2 py-0.5 rounded border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center gap-1.5">
                  {loadingLive ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                  REFRESH
                </button>
              </div>
              {liveSat && (
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Δ Altitude",    val: `${(config.altitude - liveSat.alt).toFixed(0)} km`, ref: `${liveSat.alt.toFixed(0)} km` },
                    { label: "Δ Inclination", val: `${(config.inclination - liveSat.inc).toFixed(1)}°`, ref: `${liveSat.inc.toFixed(1)}°` },
                    { label: "Δ Period",      val: `${(period - liveSat.period).toFixed(1)} min`, ref: `${liveSat.period.toFixed(1)} min` },
                  ].map((m) => (
                    <div key={m.label} className="p-2 rounded bg-card/40 border border-border/30">
                      <p className="text-sm font-display font-bold text-primary">{m.val}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{m.label}</p>
                      <p className="text-[9px] text-muted-foreground/60 font-mono">ref: {m.ref}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ----- Ground Track SVG (equirectangular) -----
function GroundTrackMap({ points, inclination }: { points: { lat: number; lon: number }[]; inclination: number }) {
  const W = 720, H = 320;
  const proj = (lon: number, lat: number) => ({
    x: ((lon + 180) / 360) * W,
    y: ((90 - lat) / 180) * H,
  });
  // Break the path where longitude wraps around
  const segments: string[] = [];
  let current = "";
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const { x, y } = proj(p.lon, p.lat);
    if (i === 0) current = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    else {
      const prev = points[i - 1];
      if (Math.abs(p.lon - prev.lon) > 180) { segments.push(current); current = `M ${x.toFixed(1)} ${y.toFixed(1)}`; }
      else current += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  if (current) segments.push(current);
  const last = points[points.length - 1];
  const first = points[0];
  const lastPos = proj(last.lon, last.lat);
  const firstPos = proj(first.lon, first.lat);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto rounded-lg" style={{ background: "hsl(225, 40%, 8%)" }}>
      {/* Latitude/Longitude grid */}
      {[-60, -30, 0, 30, 60].map((lat) => (
        <line key={`lat${lat}`} x1={0} x2={W} y1={((90 - lat) / 180) * H} y2={((90 - lat) / 180) * H}
          stroke={lat === 0 ? "hsl(190,85%,52%)" : "hsl(220, 18%, 22%)"} strokeWidth={lat === 0 ? 0.6 : 0.4} strokeDasharray="3 3" />
      ))}
      {[-120, -60, 0, 60, 120].map((lon) => (
        <line key={`lon${lon}`} y1={0} y2={H} x1={((lon + 180) / 360) * W} x2={((lon + 180) / 360) * W}
          stroke="hsl(220, 18%, 22%)" strokeWidth={0.4} strokeDasharray="3 3" />
      ))}
      {/* Coverage inclination band */}
      <rect x={0} y={((90 - inclination) / 180) * H} width={W} height={Math.max(1, ((2 * inclination) / 180) * H)}
        fill="hsl(160, 70%, 48%)" fillOpacity={0.05} />
      {/* Track segments */}
      {segments.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="hsl(190, 85%, 52%)" strokeWidth={1.4} opacity={0.9} />
      ))}
      {/* Start marker */}
      <circle cx={firstPos.x} cy={firstPos.y} r={3} fill="hsl(160, 70%, 48%)" />
      {/* Current satellite marker */}
      <circle cx={lastPos.x} cy={lastPos.y} r={5} fill="hsl(190, 85%, 52%)">
        <animate attributeName="r" values="4;7;4" dur="1.5s" repeatCount="indefinite" />
      </circle>
      {/* Labels */}
      <text x={8} y={14} fill="hsl(215, 15%, 55%)" fontSize={9} fontFamily="monospace">EQUIRECTANGULAR · lat/lon grid 30°</text>
      <text x={W - 8} y={14} fill="hsl(215, 15%, 55%)" fontSize={9} fontFamily="monospace" textAnchor="end">
        inc coverage band ±{inclination.toFixed(0)}°
      </text>
    </svg>
  );
}

export default MissionAnalyzerSection;
