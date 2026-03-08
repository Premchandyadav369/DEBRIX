import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from "recharts";

function simulateDecay(initialAlt: number, mass: number, area: number): { day: number; altitude: number }[] {
  const data: { day: number; altitude: number }[] = [];
  let alt = initialAlt;
  const CD = 2.2; // drag coefficient

  for (let day = 0; day <= 3650 && alt > 80; day += 10) {
    data.push({ day, altitude: Math.round(alt * 10) / 10 });
    // Simplified exponential atmospheric drag
    const rho = 1.58e-8 * Math.exp(-(alt - 200) / 50); // simplified density
    const dragAccel = 0.5 * rho * (7800 ** 2) * CD * area / mass;
    const altLoss = dragAccel * 86400 * 10 * 0.001; // 10 days in km
    alt -= altLoss * (alt < 300 ? 3 : alt < 400 ? 1.5 : 1);
    if (alt < 80) alt = 80;
  }
  return data;
}

const presets = [
  { label: "Small Debris (10cm)", mass: 1, area: 0.01, alt: 400 },
  { label: "CubeSat (1U)", mass: 1.3, area: 0.01, alt: 500 },
  { label: "Dead Satellite", mass: 800, area: 5, alt: 600 },
  { label: "Rocket Body", mass: 2000, area: 12, alt: 700 },
];

const OrbitalDecaySection = () => {
  const [initialAlt, setInitialAlt] = useState(500);
  const [mass, setMass] = useState(100);
  const [area, setArea] = useState(1);
  const [preset, setPreset] = useState<number | null>(null);

  const decayData = useMemo(() => simulateDecay(initialAlt, mass, area), [initialAlt, mass, area]);

  const reentryDay = decayData.find((d) => d.altitude <= 80)?.day;
  const halfLifeDay = decayData.find((d) => d.altitude <= initialAlt / 2)?.day;

  const applyPreset = (i: number) => {
    setPreset(i);
    setInitialAlt(presets[i].alt);
    setMass(presets[i].mass);
    setArea(presets[i].area);
  };

  return (
    <section id="orbital-decay" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Simulator</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Orbital Decay Predictor</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Simulate how debris altitude decreases over time due to atmospheric drag.
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
                <input type="range" min={200} max={1000} value={initialAlt} onChange={(e) => { setInitialAlt(+e.target.value); setPreset(null); }} className="w-full accent-[hsl(199,100%,55%)]" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Mass: {mass} kg</label>
                <input type="range" min={0.5} max={5000} step={0.5} value={mass} onChange={(e) => { setMass(+e.target.value); setPreset(null); }} className="w-full accent-[hsl(199,100%,55%)]" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Cross-section Area: {area} m²</label>
                <input type="range" min={0.01} max={20} step={0.01} value={area} onChange={(e) => { setArea(+e.target.value); setPreset(null); }} className="w-full accent-[hsl(199,100%,55%)]" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card p-4 text-center">
                <p className="text-lg font-display font-bold text-primary">{reentryDay ? `${(reentryDay / 365).toFixed(1)} yr` : ">10 yr"}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Est. Re-entry</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-lg font-display font-bold text-accent">{halfLifeDay ? `${(halfLifeDay / 365).toFixed(1)} yr` : ">10 yr"}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Half-altitude</p>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="lg:col-span-2 glass-card p-6">
            <p className="font-display text-xs tracking-wider text-muted-foreground mb-4">ALTITUDE vs TIME (DAYS)</p>
            <ResponsiveContainer width="100%" height={450}>
              <LineChart data={decayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 30%, 16%)" />
                <XAxis dataKey="day" stroke="hsl(215, 20%, 40%)" tick={{ fontSize: 10 }} />
                <YAxis stroke="hsl(215, 20%, 40%)" tick={{ fontSize: 10 }} domain={[0, "auto"]} />
                <Tooltip
                  contentStyle={{ background: "hsl(225, 45%, 10%)", border: "1px solid hsl(225, 30%, 16%)", borderRadius: "8px", fontSize: "11px" }}
                  labelStyle={{ color: "hsl(215, 20%, 60%)" }}
                  formatter={(value: number) => [`${value.toFixed(1)} km`, "Altitude"]}
                  labelFormatter={(day: number) => `Day ${day} (${(day / 365).toFixed(1)} yr)`}
                />
                <ReferenceLine y={120} stroke="hsl(0, 84%, 60%)" strokeDasharray="5 5" label={{ value: "Re-entry zone", position: "right", fill: "hsl(0, 84%, 60%)", fontSize: 10 }} />
                <Line type="monotone" dataKey="altitude" stroke="hsl(199, 100%, 55%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrbitalDecaySection;
