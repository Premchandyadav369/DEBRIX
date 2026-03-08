import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Sun, Zap, Wind, AlertTriangle, Shield, Wifi, Navigation, Satellite, Radio, Activity } from "lucide-react";

const NASA_API_KEY = "WBkaFckn04xcJlW4NoleN07iZajebOJGZpT4LrZz";

interface CMEEvent {
  activityID: string;
  startTime: string;
  sourceLocation?: string;
  note: string;
}

interface SolarFlare {
  flrID: string;
  beginTime: string;
  peakTime?: string;
  classType: string;
  sourceLocation?: string;
}

interface GeoStorm {
  gstID: string;
  startTime: string;
  allKpIndex?: { kpIndex: number; observedTime: string }[];
}

type TabKey = "overview" | "cme" | "flare" | "storm";

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

// Compute threat level from recent data
function computeThreatLevel(flares: SolarFlare[], storms: GeoStorm[]): { level: string; color: string; description: string } {
  const recentXFlare = flares.some((f) => f.classType?.startsWith("X"));
  const recentMFlare = flares.some((f) => f.classType?.startsWith("M"));
  const maxKp = Math.max(0, ...storms.flatMap((s) => s.allKpIndex?.map((k) => k.kpIndex) || []));

  if (recentXFlare || maxKp >= 7) return { level: "SEVERE", color: "text-destructive", description: "X-class flares or severe geomagnetic storms detected. High risk to satellites, GPS, and HF radio." };
  if (recentMFlare || maxKp >= 5) return { level: "MODERATE", color: "text-accent", description: "M-class flares or moderate storms. Possible GPS degradation and increased drag on LEO satellites." };
  if (maxKp >= 3) return { level: "MINOR", color: "text-primary", description: "Minor geomagnetic activity. Minimal impact on most systems." };
  return { level: "QUIET", color: "text-muted-foreground", description: "Solar activity is low. No significant impact on satellite or communication systems." };
}

// Impact assessment cards
function ImpactCard({ icon: Icon, system, impact, riskLevel }: { icon: any; system: string; impact: string; riskLevel: "low" | "moderate" | "high" | "severe" }) {
  const riskColors = { low: "bg-primary/10 text-primary", moderate: "bg-accent/15 text-accent", high: "bg-destructive/15 text-destructive", severe: "bg-destructive/25 text-destructive animate-pulse" };
  const riskLabels = { low: "Low Risk", moderate: "Moderate", high: "High Risk", severe: "Severe" };

  return (
    <div className="glass-card p-4 hover:border-primary/40 transition-all">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h4 className="font-display font-semibold text-sm text-foreground">{system}</h4>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${riskColors[riskLevel]}`}>{riskLabels[riskLevel]}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{impact}</p>
    </div>
  );
}

// Solar activity gauge visualization
function SolarGauge({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value}</span>
      </div>
      <div className="w-full h-2 bg-secondary/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

const SpaceWeatherSection = () => {
  const [cmes, setCmes] = useState<CMEEvent[]>([]);
  const [flares, setFlares] = useState<SolarFlare[]>([]);
  const [storms, setStorms] = useState<GeoStorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const fetchAll = useCallback(async () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    const s = formatDate(start);
    const e = formatDate(end);

    const [cmeRes, flrRes, gstRes] = await Promise.allSettled([
      fetch(`https://api.nasa.gov/DONKI/CME?startDate=${s}&endDate=${e}&api_key=${NASA_API_KEY}`).then((r) => r.json()),
      fetch(`https://api.nasa.gov/DONKI/FLR?startDate=${s}&endDate=${e}&api_key=${NASA_API_KEY}`).then((r) => r.json()),
      fetch(`https://api.nasa.gov/DONKI/GST?startDate=${s}&endDate=${e}&api_key=${NASA_API_KEY}`).then((r) => r.json()),
    ]);

    if (cmeRes.status === "fulfilled" && Array.isArray(cmeRes.value)) setCmes(cmeRes.value.slice(-15).reverse());
    if (flrRes.status === "fulfilled" && Array.isArray(flrRes.value)) setFlares(flrRes.value.slice(-15).reverse());
    if (gstRes.status === "fulfilled" && Array.isArray(gstRes.value)) setStorms(gstRes.value.slice(-15).reverse());
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const threat = computeThreatLevel(flares, storms);
  const maxKp = Math.max(0, ...storms.flatMap((s) => s.allKpIndex?.map((k) => k.kpIndex) || []));
  const xFlareCount = flares.filter((f) => f.classType?.startsWith("X")).length;
  const mFlareCount = flares.filter((f) => f.classType?.startsWith("M")).length;

  const tabs: { key: TabKey; label: string; icon: typeof Sun }[] = [
    { key: "overview", label: "Overview", icon: Shield },
    { key: "cme", label: "CME", icon: Sun },
    { key: "flare", label: "Solar Flares", icon: Zap },
    { key: "storm", label: "Geo Storms", icon: Wind },
  ];

  // Compute risk levels for impact cards
  const gpsRisk = maxKp >= 7 ? "severe" as const : maxKp >= 5 ? "high" as const : maxKp >= 3 ? "moderate" as const : "low" as const;
  const satRisk = xFlareCount > 0 ? "severe" as const : mFlareCount > 0 ? "high" as const : cmes.length > 5 ? "moderate" as const : "low" as const;
  const hfRisk = maxKp >= 5 || xFlareCount > 0 ? "high" as const : mFlareCount > 0 ? "moderate" as const : "low" as const;
  const powerRisk = maxKp >= 8 ? "severe" as const : maxKp >= 6 ? "high" as const : maxKp >= 4 ? "moderate" as const : "low" as const;

  return (
    <section id="space-weather" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">NASA DONKI + NOAA</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Space Weather Intelligence</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Live solar activity monitoring with satellite risk assessment, GPS impact predictions, and communication system alerts.
          </p>
        </motion.div>

        {/* Threat level banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className={`glass-card p-5 mb-8 border-l-4 ${
            threat.level === "SEVERE" ? "border-l-destructive" : threat.level === "MODERATE" ? "border-l-accent" : "border-l-primary"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              threat.level === "SEVERE" ? "bg-destructive/15" : threat.level === "MODERATE" ? "bg-accent/15" : "bg-primary/15"
            }`}>
              <Shield className={`w-6 h-6 ${threat.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-display tracking-[0.2em] text-muted-foreground uppercase">Current Threat Level</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold tracking-wider ${
                  threat.level === "SEVERE" ? "bg-destructive/20 text-destructive" :
                  threat.level === "MODERATE" ? "bg-accent/20 text-accent" :
                  "bg-primary/20 text-primary"
                }`}>
                  {threat.level}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{threat.description}</p>
            </div>
          </div>
        </motion.div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { icon: Sun, label: "CMEs (30d)", value: loading ? "—" : cmes.length.toString(), color: "text-primary" },
            { icon: Zap, label: "Solar Flares", value: loading ? "—" : flares.length.toString(), color: "text-accent" },
            { icon: Wind, label: "Geo Storms", value: loading ? "—" : storms.length.toString(), color: "text-primary" },
            { icon: AlertTriangle, label: "X-Class Flares", value: loading ? "—" : xFlareCount.toString(), color: "text-destructive" },
            { icon: Activity, label: "Max Kp Index", value: loading ? "—" : maxKp.toString(), color: maxKp >= 5 ? "text-destructive" : "text-accent" },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-display tracking-wider rounded-full border transition-colors ${
                  activeTab === t.key ? "bg-primary/20 text-primary border-primary/40" : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === "overview" ? (
          <div className="space-y-6">
            {/* Impact assessment grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ImpactCard icon={Navigation} system="GPS Navigation" impact={
                gpsRisk === "low" ? "GPS accuracy nominal. No degradation expected." :
                gpsRisk === "moderate" ? "Minor GPS accuracy degradation possible in polar regions." :
                gpsRisk === "high" ? "GPS positioning errors up to 10m possible. WAAS may be affected." :
                "Severe GPS disruption. Navigation systems unreliable. Use backup systems."
              } riskLevel={gpsRisk} />
              <ImpactCard icon={Satellite} system="Satellite Operations" impact={
                satRisk === "low" ? "Normal operations. No increased drag or charging risk." :
                satRisk === "moderate" ? "Slightly increased atmospheric drag on LEO satellites." :
                satRisk === "high" ? "Surface charging risk. Operators should monitor telemetry closely." :
                "Critical risk. Possible satellite anomalies and single-event upsets expected."
              } riskLevel={satRisk} />
              <ImpactCard icon={Radio} system="HF Radio Communications" impact={
                hfRisk === "low" ? "HF propagation normal. All frequencies usable." :
                hfRisk === "moderate" ? "Possible HF radio blackouts on sunlit side of Earth." :
                "Widespread HF radio blackouts. Aviation and maritime comms affected."
              } riskLevel={hfRisk} />
              <ImpactCard icon={Wifi} system="Power Grid" impact={
                powerRisk === "low" ? "No geomagnetically induced current (GIC) risk." :
                powerRisk === "moderate" ? "Weak GIC effects possible. Grid operators alerted." :
                powerRisk === "high" ? "Moderate GIC risk. Transformer heating possible at high latitudes." :
                "Major GIC event possible. Power grid instability at high latitudes."
              } riskLevel={powerRisk} />
            </div>

            {/* Solar activity gauges */}
            <div className="glass-card p-6">
              <p className="font-display text-xs tracking-wider text-muted-foreground mb-4">SOLAR ACTIVITY INDICATORS</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <SolarGauge label="Kp Index (Geomagnetic)" value={maxKp} max={9} color={maxKp >= 7 ? "hsl(0, 72%, 55%)" : maxKp >= 5 ? "hsl(160, 70%, 48%)" : "hsl(190, 85%, 52%)"} />
                <SolarGauge label="X-Class Flares (30d)" value={xFlareCount} max={5} color="hsl(0, 72%, 55%)" />
                <SolarGauge label="M-Class Flares (30d)" value={mFlareCount} max={20} color="hsl(160, 70%, 48%)" />
                <SolarGauge label="CME Events (30d)" value={cmes.length} max={30} color="hsl(190, 85%, 52%)" />
                <SolarGauge label="Geomagnetic Storms (30d)" value={storms.length} max={10} color="hsl(45, 90%, 55%)" />
                <SolarGauge label="Active Flares (All)" value={flares.length} max={50} color="hsl(280, 70%, 60%)" />
              </div>
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading DONKI data...</div>
            ) : activeTab === "cme" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left p-3 font-display tracking-wider">ID</th>
                      <th className="text-left p-3 font-display tracking-wider">Start Time</th>
                      <th className="text-left p-3 font-display tracking-wider">Source</th>
                      <th className="text-left p-3 font-display tracking-wider">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cmes.map((c) => (
                      <tr key={c.activityID} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="p-3 font-mono text-primary">{c.activityID}</td>
                        <td className="p-3 font-mono text-foreground">{c.startTime?.replace("T", " ").slice(0, 16)}</td>
                        <td className="p-3 font-mono text-muted-foreground">{c.sourceLocation || "—"}</td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate">{c.note?.slice(0, 80) || "—"}</td>
                      </tr>
                    ))}
                    {cmes.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No CME events in the last 30 days</td></tr>}
                  </tbody>
                </table>
              </div>
            ) : activeTab === "flare" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left p-3 font-display tracking-wider">ID</th>
                      <th className="text-left p-3 font-display tracking-wider">Begin</th>
                      <th className="text-left p-3 font-display tracking-wider">Peak</th>
                      <th className="text-center p-3 font-display tracking-wider">Class</th>
                      <th className="text-left p-3 font-display tracking-wider">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flares.map((f) => (
                      <tr key={f.flrID} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="p-3 font-mono text-primary">{f.flrID}</td>
                        <td className="p-3 font-mono text-foreground">{f.beginTime?.replace("T", " ").slice(0, 16)}</td>
                        <td className="p-3 font-mono text-muted-foreground">{f.peakTime?.replace("T", " ").slice(0, 16) || "—"}</td>
                        <td className="p-3 text-center">
                          <span className={`font-display font-bold ${f.classType?.startsWith("X") ? "text-destructive" : f.classType?.startsWith("M") ? "text-accent" : "text-primary"}`}>
                            {f.classType}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">{f.sourceLocation || "—"}</td>
                      </tr>
                    ))}
                    {flares.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No solar flares in the last 30 days</td></tr>}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left p-3 font-display tracking-wider">ID</th>
                      <th className="text-left p-3 font-display tracking-wider">Start Time</th>
                      <th className="text-center p-3 font-display tracking-wider">Kp Index</th>
                      <th className="text-center p-3 font-display tracking-wider">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storms.map((g) => {
                      const stormKp = g.allKpIndex ? Math.max(...g.allKpIndex.map((k) => k.kpIndex)) : 0;
                      return (
                        <tr key={g.gstID} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="p-3 font-mono text-primary">{g.gstID}</td>
                          <td className="p-3 font-mono text-foreground">{g.startTime?.replace("T", " ").slice(0, 16)}</td>
                          <td className="p-3 text-center font-mono font-bold text-accent">{stormKp || "—"}</td>
                          <td className="p-3 text-center">
                            {stormKp >= 7 ? (
                              <span className="flex items-center justify-center gap-1 text-destructive font-bold"><AlertTriangle className="w-3 h-3" /> Severe</span>
                            ) : stormKp >= 5 ? (
                              <span className="text-accent font-bold">Moderate</span>
                            ) : (
                              <span className="text-muted-foreground">Minor</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {storms.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No geomagnetic storms in the last 30 days</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default SpaceWeatherSection;
