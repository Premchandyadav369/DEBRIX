import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Wind, Activity, RefreshCw, Loader2, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface KpEntry {
  0: string; // time
  1: number; // Kp
  2: string; // observed/predicted
}

const kpColor = (kp: number) => {
  if (kp >= 7) return "text-destructive";
  if (kp >= 5) return "text-orange-400";
  if (kp >= 4) return "text-accent";
  if (kp >= 3) return "text-primary";
  return "text-muted-foreground";
};

const kpBg = (kp: number) => {
  if (kp >= 7) return "bg-destructive/20";
  if (kp >= 5) return "bg-orange-400/20";
  if (kp >= 4) return "bg-accent/20";
  if (kp >= 3) return "bg-primary/20";
  return "bg-secondary/30";
};

const kpLabel = (kp: number) => {
  if (kp >= 8) return "Extreme Storm";
  if (kp >= 7) return "Severe Storm";
  if (kp >= 6) return "Strong Storm";
  if (kp >= 5) return "Minor Storm";
  if (kp >= 4) return "Active";
  if (kp >= 3) return "Unsettled";
  return "Quiet";
};

const AuroraForecastSection = () => {
  const [kpData, setKpData] = useState<KpEntry[]>([]);
  const [solarWind, setSolarWind] = useState<any>(null);
  const [auroraFrames, setAuroraFrames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentKp, setCurrentKp] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("aurora-proxy");
      if (error) throw error;

      if (data?.kpForecast?.length > 1) {
        const entries = data.kpForecast.slice(1) as KpEntry[];
        setKpData(entries);
        // Find latest observed or most recent
        const latest = entries.filter((e: KpEntry) => e[2] === "observed").pop() || entries[0];
        setCurrentKp(Number(latest?.[1]) || 0);
      }
      if (data?.solarWind) setSolarWind(data.solarWind);
      if (data?.auroraFrames?.length) setAuroraFrames(data.auroraFrames);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Show next 24 entries (3-hourly = 3 days)
  const forecast = kpData.slice(0, 24);
  const maxKpForecast = forecast.length ? Math.max(...forecast.map((e) => Number(e[1]))) : 0;

  return (
    <section id="aurora-forecast" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">NOAA Space Weather</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Aurora & Geomagnetic Forecast</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Real-time Kp index forecast from NOAA SWPC — track geomagnetic storms and aurora visibility.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Current status cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="glass-card p-4 text-center">
                <Activity className={`w-5 h-5 mx-auto mb-2 ${kpColor(currentKp)}`} />
                <p className={`text-3xl font-display font-bold ${kpColor(currentKp)}`}>{currentKp.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-1">Current Kp</p>
              </div>
              <div className="glass-card p-4 text-center">
                <Sparkles className={`w-5 h-5 mx-auto mb-2 ${kpColor(currentKp)}`} />
                <p className={`text-sm font-display font-bold ${kpColor(currentKp)}`}>{kpLabel(currentKp)}</p>
                <p className="text-xs text-muted-foreground mt-1">Status</p>
              </div>
              <div className="glass-card p-4 text-center">
                <Wind className="w-5 h-5 mx-auto mb-2 text-primary" />
                <p className="text-sm font-display font-bold text-primary">{solarWind?.Bt || "—"} nT</p>
                <p className="text-xs text-muted-foreground mt-1">IMF Magnitude</p>
              </div>
              <div className="glass-card p-4 text-center">
                <Sun className="w-5 h-5 mx-auto mb-2 text-accent" />
                <p className={`text-sm font-display font-bold ${kpColor(maxKpForecast)}`}>Kp {maxKpForecast.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Max Forecast (3d)</p>
              </div>
            </div>

            {/* Aurora oval image */}
            {auroraFrames.length > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-3 mb-8 max-w-2xl mx-auto">
                <p className="text-xs text-muted-foreground px-2 mb-2 font-display tracking-wider">OVATION AURORA MODEL — NORTHERN HEMISPHERE</p>
                <img
                  src={auroraFrames[auroraFrames.length - 1]}
                  alt="Aurora forecast northern hemisphere"
                  className="w-full rounded-lg"
                  loading="lazy"
                />
              </motion.div>
            )}

            {/* Kp forecast bar chart */}
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-sm">Kp Index Forecast</h3>
                <button onClick={fetchData} className="p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
                {forecast.map((entry, i) => {
                  const kp = Number(entry[1]);
                  const height = Math.max(8, (kp / 9) * 100);
                  const time = new Date(entry[0]);
                  const isObserved = entry[2] === "observed";
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 min-w-[24px]" title={`${entry[0]}: Kp ${kp}`}>
                      <span className={`text-[8px] font-mono ${kpColor(kp)}`}>{kp}</span>
                      <div
                        className={`w-4 rounded-sm transition-all ${kpBg(kp)} ${isObserved ? "opacity-100" : "opacity-60"}`}
                        style={{ height: `${height}%` }}
                      />
                      {i % 4 === 0 && (
                        <span className="text-[8px] text-muted-foreground font-mono whitespace-nowrap">
                          {time.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-muted-foreground/30" /> Kp 0-2 Quiet</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-primary/40" /> Kp 3 Unsettled</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-accent/40" /> Kp 4 Active</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-orange-400/40" /> Kp 5-6 Storm</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-destructive/40" /> Kp 7+ Severe</span>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
};

export default AuroraForecastSection;
