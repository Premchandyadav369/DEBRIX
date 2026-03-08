import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Sun, Zap, Wind, AlertTriangle } from "lucide-react";

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

type TabKey = "cme" | "flare" | "storm";

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

const SpaceWeatherSection = () => {
  const [cmes, setCmes] = useState<CMEEvent[]>([]);
  const [flares, setFlares] = useState<SolarFlare[]>([]);
  const [storms, setStorms] = useState<GeoStorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("cme");

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

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const tabs: { key: TabKey; label: string; icon: typeof Sun; count: number }[] = [
    { key: "cme", label: "CME", icon: Sun, count: cmes.length },
    { key: "flare", label: "Solar Flares", icon: Zap, count: flares.length },
    { key: "storm", label: "Geo Storms", icon: Wind, count: storms.length },
  ];

  return (
    <section id="space-weather" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">NASA DONKI</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Space Weather Monitor</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Live space weather data from NASA's DONKI — Coronal Mass Ejections, Solar Flares, and Geomagnetic Storms from the last 30 days.
          </p>
        </motion.div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {tabs.map((t) => (
            <div key={t.key} className="glass-card p-4 text-center">
              <t.icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-display font-bold text-primary">{loading ? "—" : t.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-xs font-display tracking-wider rounded-full border transition-colors ${
                activeTab === t.key ? "bg-primary/20 text-primary border-primary/40" : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="glass-card overflow-hidden">
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
                    const maxKp = g.allKpIndex ? Math.max(...g.allKpIndex.map((k) => k.kpIndex)) : 0;
                    return (
                      <tr key={g.gstID} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="p-3 font-mono text-primary">{g.gstID}</td>
                        <td className="p-3 font-mono text-foreground">{g.startTime?.replace("T", " ").slice(0, 16)}</td>
                        <td className="p-3 text-center font-mono font-bold text-accent">{maxKp || "—"}</td>
                        <td className="p-3 text-center">
                          {maxKp >= 7 ? (
                            <span className="flex items-center justify-center gap-1 text-destructive font-bold"><AlertTriangle className="w-3 h-3" /> Severe</span>
                          ) : maxKp >= 5 ? (
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
      </div>
    </section>
  );
};

export default SpaceWeatherSection;
