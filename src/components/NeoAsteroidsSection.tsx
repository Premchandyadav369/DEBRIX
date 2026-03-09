import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Zap, Target, Globe, RefreshCw, ExternalLink, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Asteroid {
  id: string;
  name: string;
  nasaUrl: string;
  absoluteMagnitude: number;
  estimatedDiameterMin: number;
  estimatedDiameterMax: number;
  isPotentiallyHazardous: boolean;
  closeApproachDate: string;
  relativeVelocityKmh: number;
  relativeVelocityKms: number;
  missDistanceKm: number;
  missDistanceLunar: number;
  orbitingBody: string;
}

const NeoAsteroidsSection = () => {
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('neo-proxy');
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setAsteroids(data.asteroids || []);
      setTotalCount(data.count || 0);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('NEO fetch error:', err);
      setError(err.message || 'Failed to fetch asteroid data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const hazardous = asteroids.filter(a => a.isPotentiallyHazardous);
  const closest = asteroids[0];

  const formatDistance = (km: number) => {
    if (km > 1e6) return `${(km / 1e6).toFixed(2)}M km`;
    return `${Math.round(km).toLocaleString()} km`;
  };

  const formatVelocity = (kmh: number) => `${Math.round(kmh).toLocaleString()} km/h`;

  const getThreatColor = (hazardous: boolean, distLunar: number) => {
    if (hazardous && distLunar < 5) return "text-red-400";
    if (hazardous) return "text-orange-400";
    if (distLunar < 10) return "text-yellow-400";
    return "text-accent";
  };

  return (
    <section id="neo-asteroids" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Planetary Defense</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Near-Earth Asteroids</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Real-time tracking of asteroids approaching Earth this week — powered by NASA's NeoWs API.
          </p>
          {lastUpdated && (
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <RefreshCw className="w-3 h-3" /> Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </motion.div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Scanning near-Earth space...</p>
          </div>
        ) : error ? (
          <div className="glass-card p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-3" />
            <p className="text-destructive text-sm">{error}</p>
            <button onClick={fetchData} className="mt-4 gradient-button text-xs">Retry</button>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { icon: Target, label: "NEOs This Week", value: totalCount.toString(), color: "text-primary" },
                { icon: AlertTriangle, label: "Potentially Hazardous", value: hazardous.length.toString(), color: "text-red-400" },
                { icon: Globe, label: "Closest Approach", value: closest ? `${closest.missDistanceLunar.toFixed(1)} LD` : "N/A", color: "text-accent" },
                { icon: Zap, label: "Fastest Approach", value: asteroids.length > 0 ? formatVelocity(Math.max(...asteroids.map(a => a.relativeVelocityKmh))) : "N/A", color: "text-orange-400" },
              ].map((s) => (
                <div key={s.label} className="glass-card p-4 text-center">
                  <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
                  <p className={`text-xl md:text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Asteroid Table */}
            <div className="glass-card overflow-hidden">
              <div className="p-5 border-b border-border/60">
                <h3 className="font-display font-semibold text-foreground">Close Approach Timeline</h3>
                <p className="text-xs text-muted-foreground mt-1">Sorted by closest miss distance. LD = Lunar Distance (384,400 km).</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left p-3 font-display tracking-wider">Asteroid</th>
                      <th className="text-right p-3 font-display tracking-wider">Diameter (m)</th>
                      <th className="text-right p-3 font-display tracking-wider">Velocity</th>
                      <th className="text-right p-3 font-display tracking-wider">Miss Distance</th>
                      <th className="text-center p-3 font-display tracking-wider">Hazard</th>
                      <th className="text-right p-3 font-display tracking-wider">Approach Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asteroids.slice(0, 15).map((a) => (
                      <tr key={a.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${a.isPotentiallyHazardous ? 'bg-red-500/5' : ''}`}>
                        <td className="p-3">
                          <a href={a.nasaUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-foreground hover:text-primary transition-colors flex items-center gap-1">
                            {a.name.replace(/[()]/g, '')}
                            <ExternalLink className="w-3 h-3 opacity-50" />
                          </a>
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground">
                          {Math.round(a.estimatedDiameterMin)}–{Math.round(a.estimatedDiameterMax)}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground">
                          {a.relativeVelocityKms.toFixed(1)} km/s
                        </td>
                        <td className={`p-3 text-right font-mono ${getThreatColor(a.isPotentiallyHazardous, a.missDistanceLunar)}`}>
                          {a.missDistanceLunar.toFixed(2)} LD
                          <span className="block text-[9px] text-muted-foreground">{formatDistance(a.missDistanceKm)}</span>
                        </td>
                        <td className="p-3 text-center">
                          {a.isPotentiallyHazardous ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold">⚠ PHA</span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                              <Shield className="w-3 h-3 inline" /> Safe
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground text-[10px]">
                          {a.closeApproachDate || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 text-[10px] text-muted-foreground border-t border-border/60">
                💡 PHA = Potentially Hazardous Asteroid (≥140m diameter, MOID ≤0.05 AU). Data from NASA JPL Center for Near-Earth Object Studies.
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default NeoAsteroidsSection;
