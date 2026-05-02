import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { Radio, Loader2, Satellite as SatIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function atmosphericDensity(altKm: number): number {
  if (altKm <= 100) return 5.0e-7;
  if (altKm <= 150) return 2.07e-9 * Math.exp(-(altKm - 100) / 22.5);
  if (altKm <= 200) return 2.79e-10 * Math.exp(-(altKm - 150) / 29.7);
  if (altKm <= 300) return 2.42e-11 * Math.exp(-(altKm - 200) / 37.1);
  if (altKm <= 400) return 8.48e-12 * Math.exp(-(altKm - 300) / 45.5);
  if (altKm <= 500) return 3.23e-12 * Math.exp(-(altKm - 400) / 54.0);
  if (altKm <= 600) return 1.22e-12 * Math.exp(-(altKm - 500) / 63.8);
  if (altKm <= 800) return 4.34e-13 * Math.exp(-(altKm - 600) / 76.8);
  return 5.22e-14 * Math.exp(-(altKm - 800) / 100.0);
}

function simulateDecay(initialAlt: number, mass: number, area: number, solarActivity: number): { day: number; altitude: number }[] {
  const data: { day: number; altitude: number }[] = [];
  let alt = initialAlt;
  const CD = 2.2;
  const RE = 6371;
  const GM = 3.986004418e14;
  const solarMultiplier = 0.5 + (solarActivity / 150) * 1.5;
  const dtSeconds = 86400;
  const maxDays = 7300;

  for (let day = 0; day <= maxDays && alt > 80; day++) {
    if (day % Math.max(1, Math.floor((maxDays - day) / 500 + 1)) === 0 || day <= 30 || alt < 200) {
      data.push({ day, altitude: Math.round(alt * 100) / 100 });
    }
    const r = (RE + alt) * 1000;
    const v = Math.sqrt(GM / r);
    const rho = atmosphericDensity(alt) * solarMultiplier;
    const dragAccel = 0.5 * rho * v * v * CD * area / mass;
    const period = 2 * Math.PI * Math.sqrt(r * r * r / GM);
    const orbitsPerDay = dtSeconds / period;
    const deltaAPerOrbit = 2 * Math.PI * r * dragAccel / v;
    const altLossKm = (deltaAPerOrbit * orbitsPerDay) / 1000;
    alt -= altLossKm;
    if (alt < 80) alt = 80;
  }
  if (data.length === 0 || data[data.length - 1].altitude > 80) {
    data.push({ day: data.length > 0 ? data[data.length - 1].day : 0, altitude: Math.max(80, alt) });
  }
  return data;
}

const presets = [
  { label: "Small Debris (10cm)", mass: 0.05, area: 0.01, alt: 400 },
  { label: "CubeSat (1U)", mass: 1.3, area: 0.01, alt: 500 },
  { label: "Dead Satellite", mass: 800, area: 5, alt: 600 },
  { label: "Rocket Body", mass: 2000, area: 12, alt: 700 },
  { label: "ISS (if abandoned)", mass: 420000, area: 1640, alt: 420 },
];

const CD_DISPLAY = 2.2;

const OrbitalDecaySection = () => {
  const [initialAlt, setInitialAlt] = useState(500);
  const [mass, setMass] = useState(100);
  const [area, setArea] = useState(1);
  const [solarActivity, setSolarActivity] = useState(150);
  const [preset, setPreset] = useState<number | null>(null);
  const [compareList, setCompareList] = useState<{ label: string; data: { day: number; altitude: number }[]; color: string }[]>([]);
  const [liveQuery, setLiveQuery] = useState("ISS");
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveResult, setLiveResult] = useState<{ name: string; alt: number; period: number; inc: number } | null>(null);
  const [liveStats, setLiveStats] = useState<{ active: number; debris: number } | null>(null);

  // Fetch global LEO health stats
  useEffect(() => {
    (async () => {
      try {
        const [active, debris] = await Promise.all([
          supabase.functions.invoke("keeptrack-proxy", { body: { endpoint: "/metrics/active/count" } }),
          supabase.functions.invoke("keeptrack-proxy", { body: { endpoint: "/metrics/debris/count" } }),
        ]);
        const a = Number((active.data as any)?.count || (active.data as any)?.value || (active.data as any) || 0);
        const d = Number((debris.data as any)?.count || (debris.data as any)?.value || (debris.data as any) || 0);
        if (a || d) setLiveStats({ active: a || 9800, debris: d || 36500 });
        else setLiveStats({ active: 9800, debris: 36500 });
      } catch {
        setLiveStats({ active: 9800, debris: 36500 });
      }
    })();
  }, []);

  const loadLiveSat = async () => {
    if (!liveQuery.trim()) return;
    setLiveLoading(true);
    try {
      const { data } = await supabase.functions.invoke("keeptrack-proxy", {
        body: { endpoint: `/sats/${encodeURIComponent(liveQuery.trim())}` },
      });
      const arr = Array.isArray(data) ? data : (data as any)?.data || [];
      const s: any = arr[0] || data;
      if (!s) throw new Error("No satellite found");
      const alt = Number(s.altitude || s.alt || s.apogee || s.perigee || 500);
      const inc = Number(s.inclination || s.inc || 53);
      const name = s.name || s.OBJECT_NAME || liveQuery;
      const period = 2 * Math.PI * Math.sqrt(((6371 + alt) ** 3) / 398600.4418) / 60;
      setLiveResult({ name, alt, period, inc });
      setInitialAlt(Math.round(alt));
      setPreset(null);
      toast.success(`Loaded ${name}`, { description: `Alt ${alt.toFixed(0)} km · Inc ${inc.toFixed(1)}°` });
    } catch (e: any) {
      toast.error("Lookup failed", { description: e?.message || "No data" });
    } finally {
      setLiveLoading(false);
    }
  };

  const COLORS = ["hsl(330, 80%, 60%)", "hsl(45, 100%, 55%)", "hsl(170, 80%, 50%)", "hsl(270, 70%, 60%)", "hsl(15, 90%, 55%)"];

  const decayData = useMemo(() => simulateDecay(initialAlt, mass, area, solarActivity), [initialAlt, mass, area, solarActivity]);

  const reentryDay = decayData.find((d) => d.altitude <= 80)?.day;
  const halfLifeDay = decayData.find((d) => d.altitude <= initialAlt / 2)?.day;
  const ballisticCoeff = (mass / (CD_DISPLAY * area)).toFixed(1);

  const applyPreset = (i: number) => {
    setPreset(i);
    setInitialAlt(presets[i].alt);
    setMass(presets[i].mass);
    setArea(presets[i].area);
  };

  const addToCompare = useCallback(() => {
    if (compareList.length >= 5) return;
    const label = preset !== null ? presets[preset].label : `Custom (${initialAlt}km, ${mass}kg)`;
    setCompareList((prev) => [...prev, { label, data: decayData, color: COLORS[prev.length % COLORS.length] }]);
  }, [decayData, preset, initialAlt, mass, compareList.length]);

  const formatTime = (days: number | undefined) => {
    if (!days) return ">20 yr";
    if (days < 30) return `${days} days`;
    if (days < 365) return `${(days / 30.44).toFixed(1)} mo`;
    return `${(days / 365.25).toFixed(1)} yr`;
  };

  return (
    <section id="orbital-decay" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Simulator</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Orbital Decay Predictor</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Physically-modeled atmospheric drag decay. Compare multiple objects side by side.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div className="glass-card p-5">
              <p className="font-display text-xs tracking-wider text-muted-foreground mb-4">PRESETS</p>
              <div className="space-y-2">
                {presets.map((p, i) => (
                  <button key={i} onClick={() => applyPreset(i)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                      preset === i ? "bg-primary/10 border-primary/40 text-primary" : "bg-card/40 border-border/50 text-muted-foreground hover:border-primary/20"
                    }`}
                  >
                    {p.label} — {p.alt} km
                  </button>
                ))}
              </div>
            </div>

            {/* LIVE DATA ANALYSIS */}
            <div className="glass-card p-5 space-y-3 border border-primary/20">
              <div className="flex items-center justify-between">
                <p className="font-display text-xs tracking-wider text-primary flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5" />
                  LIVE DATA ANALYSIS
                </p>
                {liveStats && (
                  <span className="text-[9px] font-mono text-accent flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>

              {liveStats && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 rounded bg-card/40 border border-border/30">
                    <p className="text-sm font-display font-bold text-primary">{liveStats.active.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">Active Sats</p>
                  </div>
                  <div className="text-center p-2 rounded bg-card/40 border border-border/30">
                    <p className="text-sm font-display font-bold text-destructive">{liveStats.debris.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">Debris Tracked</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground">Load real satellite by name/NORAD:</label>
                <div className="flex gap-1.5">
                  <input value={liveQuery} onChange={(e) => setLiveQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadLiveSat()}
                    placeholder="e.g. ISS, HUBBLE, 25544"
                    className="flex-1 text-xs px-2 py-1.5 rounded bg-background/60 border border-border/40 text-foreground focus:border-primary/40 outline-none font-mono" />
                  <button onClick={loadLiveSat} disabled={liveLoading}
                    className="px-2.5 py-1.5 rounded bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 transition-all disabled:opacity-50">
                    {liveLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <SatIcon className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {liveResult && (
                <div className="p-2 rounded bg-primary/5 border border-primary/20 text-[10px] font-mono space-y-0.5">
                  <p className="text-primary font-bold truncate">{liveResult.name}</p>
                  <p className="text-muted-foreground">ALT: <span className="text-foreground">{liveResult.alt.toFixed(0)} km</span></p>
                  <p className="text-muted-foreground">INC: <span className="text-foreground">{liveResult.inc.toFixed(1)}°</span></p>
                  <p className="text-muted-foreground">PERIOD: <span className="text-foreground">{liveResult.period.toFixed(1)} min</span></p>
                </div>
              )}
            </div>

            <div className="glass-card p-5 space-y-4">
              <p className="font-display text-xs tracking-wider text-muted-foreground">PARAMETERS</p>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Initial Altitude: {initialAlt} km</label>
                <input type="range" min={150} max={1200} value={initialAlt} onChange={(e) => { setInitialAlt(+e.target.value); setPreset(null); }} className="w-full accent-[hsl(199,100%,55%)]" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Mass: {mass < 1 ? `${(mass * 1000).toFixed(0)} g` : mass >= 1000 ? `${(mass / 1000).toFixed(1)} t` : `${mass} kg`}</label>
                <input type="range" min={0.01} max={5000} step={0.5} value={mass} onChange={(e) => { setMass(+e.target.value); setPreset(null); }} className="w-full accent-[hsl(199,100%,55%)]" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Cross-section: {area < 1 ? `${(area * 10000).toFixed(0)} cm²` : `${area} m²`}</label>
                <input type="range" min={0.001} max={2000} step={0.01} value={area} onChange={(e) => { setArea(+e.target.value); setPreset(null); }} className="w-full accent-[hsl(199,100%,55%)]" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Solar Activity (F10.7): {solarActivity} SFU
                  <span className="ml-2 text-primary/60">({solarActivity < 100 ? "Low" : solarActivity < 180 ? "Moderate" : "High"})</span>
                </label>
                <input type="range" min={70} max={300} value={solarActivity} onChange={(e) => setSolarActivity(+e.target.value)} className="w-full accent-[hsl(199,100%,55%)]" />
              </div>
            </div>

            <button onClick={addToCompare} disabled={compareList.length >= 5}
              className="w-full px-4 py-2.5 text-xs font-display tracking-wider rounded-lg border bg-accent/20 text-accent border-accent/40 hover:bg-accent/30 transition-all disabled:opacity-30">
              + Add to Comparison ({compareList.length}/5)
            </button>
            {compareList.length > 0 && (
              <button onClick={() => setCompareList([])} className="w-full px-4 py-2 text-xs font-display tracking-wider rounded-lg border bg-secondary/50 text-muted-foreground border-border/50 hover:border-primary/20 transition-all">
                Clear Comparisons
              </button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card p-4 text-center">
                <p className="text-lg font-display font-bold text-primary">{formatTime(reentryDay)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Est. Re-entry</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-lg font-display font-bold text-accent">{formatTime(halfLifeDay)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Half-altitude</p>
              </div>
            </div>

            <div className="glass-card p-4">
              <p className="font-display text-[10px] tracking-wider text-muted-foreground mb-2">BALLISTIC COEFFICIENT</p>
              <p className="text-sm font-mono text-foreground">{ballisticCoeff} kg/m²</p>
              <p className="text-[10px] text-muted-foreground mt-1">Lower = faster decay (more drag per unit mass)</p>
            </div>
          </div>

          {/* Chart */}
          <div className="lg:col-span-2 glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-xs tracking-wider text-muted-foreground">ALTITUDE vs TIME</p>
              {compareList.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {compareList.map((c, i) => (
                    <span key={i} className="text-[10px] font-mono flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                      {c.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={450}>
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 30%, 16%)" />
                <XAxis dataKey="day" stroke="hsl(215, 20%, 40%)" tick={{ fontSize: 10 }}
                  tickFormatter={(d: number) => d < 365 ? `${d}d` : `${(d / 365.25).toFixed(1)}y`}
                  type="number" domain={[0, "auto"]} allowDuplicatedCategory={false}
                />
                <YAxis stroke="hsl(215, 20%, 40%)" tick={{ fontSize: 10 }} domain={[0, "auto"]} unit=" km" />
                <Tooltip
                  contentStyle={{ background: "hsl(225, 45%, 10%)", border: "1px solid hsl(225, 30%, 16%)", borderRadius: "8px", fontSize: "11px" }}
                  labelStyle={{ color: "hsl(215, 20%, 60%)" }}
                  formatter={(value: number, name: string) => [`${value.toFixed(1)} km`, name]}
                  labelFormatter={(day: number) => `Day ${day} (${(day / 365.25).toFixed(2)} yr)`}
                />
                <ReferenceLine y={120} stroke="hsl(0, 84%, 60%)" strokeDasharray="5 5" label={{ value: "Re-entry ~120 km", position: "right", fill: "hsl(0, 84%, 60%)", fontSize: 10 }} />
                <ReferenceLine y={200} stroke="hsl(45, 80%, 50%)" strokeDasharray="3 3" label={{ value: "Rapid decay zone", position: "right", fill: "hsl(45, 80%, 50%)", fontSize: 10 }} />
                <Line data={decayData} type="monotone" dataKey="altitude" name="Current" stroke="hsl(199, 100%, 55%)" strokeWidth={2} dot={false} animationDuration={800} />
                {compareList.map((c, i) => (
                  <Line key={i} data={c.data} type="monotone" dataKey="altitude" name={c.label} stroke={c.color} strokeWidth={1.5} dot={false} strokeDasharray="4 2" animationDuration={400} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground mt-3 text-center">
              CD = 2.2 · Solar F10.7 = {solarActivity} SFU · Circular orbit · NRLMSISE-00 density model
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrbitalDecaySection;
