import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Flame, MapPin, Clock, AlertTriangle, Globe, ArrowDown, RefreshCw, Loader2 } from "lucide-react";
import * as satellite from "satellite.js";
import { supabase } from "@/integrations/supabase/client";

interface SatObject {
  name: string;
  noradId: string;
  inclination: number;
  perigee: number;
  apogee: number;
  meanMotion: number;
  eccentricity: number;
  tle1: string;
  tle2: string;
  lat: number;
  lng: number;
  altitude: number;
  velocity: number;
  riskLevel: "low" | "moderate" | "high";
}

function propagatePosition(tle1: string, tle2: string): { lat: number; lng: number; alt: number; vel: number } | null {
  try {
    const satrec = satellite.twoline2satrec(tle1, tle2);
    const now = new Date();
    const posVel = satellite.propagate(satrec, now);
    if (!posVel.position || typeof posVel.position === "boolean") return null;
    const gmst = satellite.gstime(now);
    const geo = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);
    const vel = posVel.velocity as satellite.EciVec3<number>;
    return {
      lat: satellite.degreesLat(geo.latitude),
      lng: satellite.degreesLong(geo.longitude),
      alt: Math.round(geo.height),
      vel: Math.round(Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2) * 100) / 100,
    };
  } catch {
    return null;
  }
}

const ReentryPredictionSection = () => {
  const [objects, setObjects] = useState<SatObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<string>("All");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("celestrak-proxy");
      if (fnError) throw fnError;

      const items = Array.isArray(data) ? data : [];
      const parsed: SatObject[] = items
        .map((item: any) => {
          const pos = propagatePosition(item.tle1, item.tle2);
          if (!pos) return null;

          let riskLevel: "low" | "moderate" | "high" = "low";
          if (item.perigee < 200) riskLevel = "high";
          else if (item.perigee < 300) riskLevel = "moderate";

          return {
            name: item.name,
            noradId: item.noradId,
            inclination: item.inclination,
            perigee: item.perigee,
            apogee: item.apogee,
            meanMotion: item.meanMotion,
            eccentricity: item.eccentricity,
            tle1: item.tle1,
            tle2: item.tle2,
            lat: pos.lat,
            lng: pos.lng,
            altitude: pos.alt,
            velocity: pos.vel,
            riskLevel,
          };
        })
        .filter((o: any): o is SatObject => o !== null)
        .sort((a: SatObject, b: SatObject) => a.perigee - b.perigee);

      setObjects(parsed);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("CelesTrak fetch error:", err);
      setError("Failed to fetch satellite data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (objects.length === 0) return;
    const interval = setInterval(() => {
      setObjects((prev) =>
        prev.map((obj) => {
          const pos = propagatePosition(obj.tle1, obj.tle2);
          return pos ? { ...obj, lat: pos.lat, lng: pos.lng, altitude: pos.alt, velocity: pos.vel } : obj;
        })
      );
    }, 10000);
    return () => clearInterval(interval);
  }, [objects.length]);

  const filtered = useMemo(() => {
    if (filterRisk === "All") return objects;
    return objects.filter((o) => o.riskLevel === filterRisk.toLowerCase());
  }, [filterRisk, objects]);

  const highCount = objects.filter((o) => o.riskLevel === "high").length;
  const moderateCount = objects.filter((o) => o.riskLevel === "moderate").length;

  return (
    <section id="reentry-prediction" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Live Tracking</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Re-Entry Prediction System</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Real-time tracking of {objects.length} low-perigee objects via CelesTrak. Positions propagated using SGP4 orbital mechanics every 10 seconds.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Flame, label: "Tracked Objects", value: objects.length.toString(), color: "text-primary" },
            { icon: AlertTriangle, label: "High Risk (<200km)", value: highCount.toString(), color: "text-destructive" },
            { icon: ArrowDown, label: "Moderate Risk", value: moderateCount.toString(), color: "text-accent" },
            { icon: Globe, label: "Data Source", value: "CelesTrak", color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {loading && objects.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Fetching orbital data from CelesTrak...</p>
            </div>
          </div>
        ) : error && objects.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <button onClick={fetchData} className="mt-3 gradient-button text-xs">Retry</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 flex-wrap">
                {["All", "High", "Moderate", "Low"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterRisk(s)}
                    className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded-full border transition-colors ${
                      filterRisk === s ? "bg-primary/20 text-primary border-primary/40" : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                {lastUpdated && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
                <button onClick={fetchData} disabled={loading} className="p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-colors">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.slice(0, 12).map((obj) => (
                <motion.div
                  key={obj.noradId}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  onClick={() => setSelectedObject(selectedObject === obj.noradId ? null : obj.noradId)}
                  className={`glass-card p-5 cursor-pointer transition-all ${
                    selectedObject === obj.noradId ? "border-primary/60 ring-1 ring-primary/20" : "hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-display font-semibold text-foreground text-sm">{obj.name}</h4>
                      <p className="text-[10px] text-muted-foreground">NORAD {obj.noradId}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-display tracking-wider ${
                      obj.riskLevel === "high" ? "bg-destructive/20 text-destructive" :
                      obj.riskLevel === "moderate" ? "bg-accent/15 text-accent" :
                      "bg-primary/15 text-primary"
                    }`}>
                      {obj.riskLevel.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span className="text-muted-foreground">Alt:</span>
                      <span className="font-mono text-foreground">{obj.altitude}km</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <Clock className="w-3 h-3 text-accent" />
                      <span className="text-muted-foreground">Vel:</span>
                      <span className="font-mono text-foreground">{obj.velocity} km/s</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <ArrowDown className="w-3 h-3 text-destructive" />
                      <span className="text-muted-foreground">Perigee:</span>
                      <span className="font-mono text-foreground">{obj.perigee}km</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <Globe className="w-3 h-3 text-primary" />
                      <span className="text-muted-foreground">Inc:</span>
                      <span className="font-mono text-foreground">{obj.inclination.toFixed(1)}°</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-muted-foreground">Apogee: <span className="font-mono text-foreground">{obj.apogee}km</span></span>
                    <span className="text-muted-foreground">Ecc: <span className="font-mono text-foreground">{obj.eccentricity.toFixed(4)}</span></span>
                  </div>

                  {selectedObject === obj.noradId && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 pt-3 border-t border-border/40">
                      <p className="text-[10px] text-muted-foreground mb-1">Live position:</p>
                      <p className="font-mono text-[11px] text-foreground">
                        {Math.abs(obj.lat).toFixed(4)}° {obj.lat >= 0 ? "N" : "S"}, {Math.abs(obj.lng).toFixed(4)}° {obj.lng >= 0 ? "E" : "W"}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            {filtered.length > 12 && (
              <p className="text-center text-xs text-muted-foreground mt-4">
                Showing 12 of {filtered.length} objects.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default ReentryPredictionSection;
