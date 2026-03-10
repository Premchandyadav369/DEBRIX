import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from "recharts";

// NRLMSISE-00 inspired exponential atmosphere model (scale heights by altitude band)
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
  const RE = 6371; // Earth radius km
  const GM = 3.986004418e14; // m^3/s^2

  // Solar activity multiplier (F10.7 proxy: low=70, moderate=150, high=250)
  const solarMultiplier = 0.5 + (solarActivity / 150) * 1.5;

  const dtSeconds = 86400; // 1 day step
  const maxDays = 7300; // 20 years

  for (let day = 0; day <= maxDays && alt > 80; day++) {
    if (day % Math.max(1, Math.floor((maxDays - day) / 500 + 1)) === 0 || day <= 30 || alt < 200) {
      data.push({ day, altitude: Math.round(alt * 100) / 100 });
    }

    const r = (RE + alt) * 1000; // meters
    const v = Math.sqrt(GM / r); // orbital velocity m/s
    const rho = atmosphericDensity(alt) * solarMultiplier; // kg/m^3
    const dragAccel = 0.5 * rho * v * v * CD * area / mass; // m/s^2
    
    // Semi-major axis decay rate: da/dt ≈ -2*a^2 * rho * CD * A/m * v / (r)
    // Simplified: altitude loss per orbit period
    const period = 2 * Math.PI * Math.sqrt(r * r * r / GM); // seconds
    const orbitsPerDay = dtSeconds / period;
    const deltaAPerOrbit = 2 * Math.PI * r * dragAccel / (v); // meters per orbit
    const altLossKm = (deltaAPerOrbit * orbitsPerDay) / 1000;

    alt -= altLossKm;
    if (alt < 80) alt = 80;
  }

  // Ensure last point is included
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
            Physically-modeled atmospheric drag decay using altitude-dependent density profiles and solar activity.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div className="glass-card p-5">
              <p className="font-display text-xs tracking-wider text-muted-foreground mb-4">PRESETS</p>
              <div className="space-y-2">
                {presets.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => applyPreset(i)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                      preset === i ? "bg-primary/10 border-primary/40 text-primary" : "bg-card/40 border-border/50 text-muted-foreground hover:border-primary/20"
                    }`}
                  >
                    {p.label} — {p.alt} km
                  </button>
                ))}
              </div>
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
                  <span className="ml-2 text-primary/60">
                    ({solarActivity < 100 ? "Low" : solarActivity < 180 ? "Moderate" : "High"})
                  </span>
                </label>
                <input type="range" min={70} max={300} value={solarActivity} onChange={(e) => setSolarActivity(+e.target.value)} className="w-full accent-[hsl(199,100%,55%)]" />
              </div>
            </div>

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
            <p className="font-display text-xs tracking-wider text-muted-foreground mb-4">ALTITUDE vs TIME</p>
            <ResponsiveContainer width="100%" height={450}>
              <LineChart data={decayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 30%, 16%)" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(215, 20%, 40%)"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(d: number) => d < 365 ? `${d}d` : `${(d / 365.25).toFixed(1)}y`}
                />
                <YAxis stroke="hsl(215, 20%, 40%)" tick={{ fontSize: 10 }} domain={[0, "auto"]} unit=" km" />
                <Tooltip
                  contentStyle={{ background: "hsl(225, 45%, 10%)", border: "1px solid hsl(225, 30%, 16%)", borderRadius: "8px", fontSize: "11px" }}
                  labelStyle={{ color: "hsl(215, 20%, 60%)" }}
                  formatter={(value: number) => [`${value.toFixed(1)} km`, "Altitude"]}
                  labelFormatter={(day: number) => `Day ${day} (${(day / 365.25).toFixed(2)} yr)`}
                />
                <ReferenceLine y={120} stroke="hsl(0, 84%, 60%)" strokeDasharray="5 5" label={{ value: "Re-entry ~120 km", position: "right", fill: "hsl(0, 84%, 60%)", fontSize: 10 }} />
                <ReferenceLine y={200} stroke="hsl(45, 80%, 50%)" strokeDasharray="3 3" label={{ value: "Rapid decay zone", position: "right", fill: "hsl(45, 80%, 50%)", fontSize: 10 }} />
                <Line type="monotone" dataKey="altitude" stroke="hsl(199, 100%, 55%)" strokeWidth={2} dot={false} animationDuration={800} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground mt-3 text-center">
              Model uses altitude-band density profiles · CD = 2.2 · Solar F10.7 = {solarActivity} SFU · Circular orbit assumption
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrbitalDecaySection;
