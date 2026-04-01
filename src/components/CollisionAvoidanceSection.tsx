import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, AlertTriangle, Zap, Navigation, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ConjunctionEvent {
  id: string;
  time: string;
  object1: string;
  object2: string;
  minRange: number;
  risk: "low" | "medium" | "high" | "critical";
  relVelocity: number;
}

const riskColors = {
  low: "text-accent",
  medium: "text-[hsl(45,100%,60%)]",
  high: "text-[hsl(25,100%,55%)]",
  critical: "text-destructive",
};

const riskBgColors = {
  low: "bg-accent/10 border-accent/30",
  medium: "bg-[hsl(45,100%,60%)]/10 border-[hsl(45,100%,60%)]/30",
  high: "bg-[hsl(25,100%,55%)]/10 border-[hsl(25,100%,55%)]/30",
  critical: "bg-destructive/10 border-destructive/30",
};

function classifyRisk(minRangeKm: number): "low" | "medium" | "high" | "critical" {
  if (minRangeKm < 1) return "critical";
  if (minRangeKm < 5) return "high";
  if (minRangeKm < 25) return "medium";
  return "low";
}

const CollisionAvoidanceSection = () => {
  const [events, setEvents] = useState<ConjunctionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<"monitoring" | "computing" | "executing">("monitoring");

  const fetchSocrates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('keeptrack-proxy', {
        body: { endpoint: '/socrates/latest' },
      });
      if (fnError) throw fnError;

      // Parse SOCRATES data - it may be array of conjunction records
      const raw = Array.isArray(data) ? data : [];
      const parsed: ConjunctionEvent[] = raw.slice(0, 20).map((item: any, i: number) => {
        const minRange = parseFloat(item.MIN_RNG || '999');
        const relV = parseFloat(item.REL_SPEED || '0');
        const maxProb = parseFloat(item.MAX_PROB || '0');
        return {
          id: `socrates-${item.ID || i}`,
          time: item.TOCA || new Date().toISOString(),
          object1: item.SAT1_NAME || `SAT-${i}A`,
          object2: item.SAT2_NAME || `SAT-${i}B`,
          minRange: isNaN(minRange) ? 999 : minRange,
          risk: classifyRisk(isNaN(minRange) ? 999 : minRange),
          relVelocity: isNaN(relV) ? 0 : relV,
        };
      });
      
      parsed.sort((a, b) => a.minRange - b.minRange);
      setEvents(parsed);
    } catch (err: any) {
      console.error('SOCRATES fetch error:', err);
      setError(err.message || 'Failed to fetch conjunction data');
      // Fallback to simulated data
      generateFallbackEvents();
    } finally {
      setLoading(false);
    }
  }, []);

  const generateFallbackEvents = () => {
    const objectNames = ["COSMOS-1408 DEB", "FENGYUN 1C DEB", "IRIDIUM 33 DEB", "SL-8 R/B", "ARIANE 5 DEB", "DELTA 2 DEB"];
    const fallback: ConjunctionEvent[] = [];
    for (let i = 0; i < 12; i++) {
      const minRange = +(Math.random() * 50 + 0.1).toFixed(2);
      fallback.push({
        id: `sim-${i}`,
        time: new Date(Date.now() + Math.random() * 86400000 * 7).toISOString(),
        object1: objectNames[Math.floor(Math.random() * objectNames.length)],
        object2: objectNames[Math.floor(Math.random() * objectNames.length)],
        minRange,
        risk: classifyRisk(minRange),
        relVelocity: +(Math.random() * 15 + 0.5).toFixed(2),
      });
    }
    fallback.sort((a, b) => a.minRange - b.minRange);
    setEvents(fallback);
  };

  useEffect(() => {
    fetchSocrates();
    // Cycle AI status animation
    const statusInterval = setInterval(() => {
      setAiStatus(prev => prev === "monitoring" ? "computing" : prev === "computing" ? "executing" : "monitoring");
    }, 3000);
    return () => clearInterval(statusInterval);
  }, [fetchSocrates]);

  const criticalCount = events.filter(e => e.risk === "critical" || e.risk === "high").length;

  const stats = [
    { icon: Shield, label: "AI Status", value: aiStatus.charAt(0).toUpperCase() + aiStatus.slice(1), color: aiStatus === "monitoring" ? "text-accent" : aiStatus === "computing" ? "text-[hsl(45,100%,60%)]" : "text-primary" },
    { icon: AlertTriangle, label: "Conjunctions", value: events.length.toString(), color: "text-destructive" },
    { icon: Zap, label: "Critical/High", value: criticalCount.toString(), color: "text-primary" },
    { icon: Navigation, label: "Data Source", value: "SOCRATES", color: "text-accent" },
  ];

  return (
    <section id="collision-avoidance" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Live SOCRATES Data</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Collision Avoidance</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Real conjunction data from SOCRATES (CelesTrak) via KeepTrack API — identifying close approaches between tracked objects in orbit.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
              <p className={`text-xl md:text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* AI Status Indicator */}
        <motion.div className="glass-card p-4 mb-6 flex items-center gap-4" animate={{ borderColor: aiStatus === "executing" ? "hsl(199 100% 55% / 0.5)" : "hsl(225 30% 16% / 0.5)" }}>
          <div className={`w-3 h-3 rounded-full ${aiStatus === "monitoring" ? "bg-accent" : aiStatus === "computing" ? "bg-[hsl(45,100%,60%)]" : "bg-primary"} animate-pulse`} />
          <div className="flex-1">
            <p className="text-xs font-display tracking-wider text-foreground">
              AI COLLISION AVOIDANCE ENGINE — <span className={riskColors[aiStatus === "monitoring" ? "low" : aiStatus === "computing" ? "medium" : "low"]}>{aiStatus.toUpperCase()}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {aiStatus === "monitoring" && "Scanning orbital environment for potential conjunctions..."}
              {aiStatus === "computing" && "Computing optimal avoidance trajectory..."}
              {aiStatus === "executing" && "Analyzing SOCRATES data for close approaches..."}
            </p>
          </div>
          <button onClick={fetchSocrates} className="p-2 hover:bg-secondary/50 rounded-lg transition-colors" title="Refresh data">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </motion.div>

        {/* Event Log */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <p className="font-display text-xs tracking-wider text-muted-foreground">LIVE CONJUNCTION EVENT LOG (SOCRATES)</p>
            {error && <span className="text-[10px] text-muted-foreground">(using simulated data)</span>}
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Loading conjunction data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left p-3 font-display tracking-wider">TCA</th>
                    <th className="text-left p-3 font-display tracking-wider">Object 1</th>
                    <th className="text-left p-3 font-display tracking-wider">Object 2</th>
                    <th className="text-right p-3 font-display tracking-wider">Min Range (km)</th>
                    <th className="text-center p-3 font-display tracking-wider">Risk</th>
                    <th className="text-right p-3 font-display tracking-wider">Rel Vel (km/s)</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <motion.tr
                      key={e.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="p-3 font-mono text-muted-foreground">{new Date(e.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {new Date(e.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="p-3 font-mono text-foreground truncate max-w-[120px]">{e.object1}</td>
                      <td className="p-3 font-mono text-foreground truncate max-w-[120px]">{e.object2}</td>
                      <td className={`p-3 text-right font-mono ${riskColors[e.risk]}`}>{e.minRange.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-display tracking-wider border ${riskBgColors[e.risk]} ${riskColors[e.risk]}`}>
                          {e.risk.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-muted-foreground">{e.relVelocity.toFixed(2)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-3 text-[10px] text-muted-foreground border-t border-border/60">
            📡 Data from SOCRATES (Satellite Orbital Conjunction Reports) via KeepTrack API. TCA = Time of Closest Approach.
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CollisionAvoidanceSection;
