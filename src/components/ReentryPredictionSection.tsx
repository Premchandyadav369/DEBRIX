import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Flame, MapPin, Clock, AlertTriangle, Globe, ArrowDown, RefreshCw, Loader2 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as satellite from "satellite.js";
import { supabase } from "@/integrations/supabase/client";

interface SatObject {
  name: string;
  noradId: string;
  objectType: string;
  inclination: number;
  perigee: number;
  apogee: number;
  meanMotion: number;
  eccentricity: number;
  epoch: string;
  tle1: string;
  tle2: string;
  lat: number;
  lng: number;
  altitude: number;
  velocity: number;
  riskLevel: "low" | "moderate" | "high";
}

function parseGPtoSatObject(gp: any): SatObject | null {
  try {
    const n = gp.MEAN_MOTION || 0;
    const e = gp.ECCENTRICITY || 0;
    const GM = 398600.4418;
    const nRadPerSec = (n * 2 * Math.PI) / 86400;
    const a = Math.pow(GM / (nRadPerSec * nRadPerSec), 1 / 3);
    const perigee = a * (1 - e) - 6371;
    const apogee = a * (1 + e) - 6371;

    if (!gp.TLE_LINE1 || !gp.TLE_LINE2) return null;

    const satrec = satellite.twoline2satrec(gp.TLE_LINE1, gp.TLE_LINE2);
    const now = new Date();
    const posVel = satellite.propagate(satrec, now);

    if (!posVel.position || typeof posVel.position === "boolean") return null;

    const gmst = satellite.gstime(now);
    const geo = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);
    const lat = satellite.degreesLat(geo.latitude);
    const lng = satellite.degreesLong(geo.longitude);
    const alt = geo.height;

    const vel = posVel.velocity as satellite.EciVec3<number>;
    const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);

    let riskLevel: "low" | "moderate" | "high" = "low";
    if (perigee < 200) riskLevel = "high";
    else if (perigee < 300) riskLevel = "moderate";

    return {
      name: (gp.OBJECT_NAME || "UNKNOWN").trim(),
      noradId: String(gp.NORAD_CAT_ID || ""),
      objectType: gp.OBJECT_TYPE || "UNKNOWN",
      inclination: gp.INCLINATION || 0,
      perigee: Math.round(perigee),
      apogee: Math.round(apogee),
      meanMotion: n,
      eccentricity: e,
      epoch: gp.EPOCH || "",
      tle1: gp.TLE_LINE1,
      tle2: gp.TLE_LINE2,
      lat,
      lng,
      altitude: Math.round(alt),
      velocity: Math.round(speed * 100) / 100,
      riskLevel,
    };
  } catch {
    return null;
  }
}

function ReentryMap({
  objects,
  selected,
  onSelect,
}: {
  objects: SatObject[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const bandsRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 6,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nopoi/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    mapInstance.current = map;
    markersRef.current = L.layerGroup().addTo(map);
    bandsRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !markersRef.current || !bandsRef.current) return;
    markersRef.current.clearLayers();
    bandsRef.current.clearLayers();

    // Draw inclination bands for high-risk objects
    const highRisk = objects.filter((o) => o.riskLevel === "high");
    const uniqueInclinations = [...new Set(highRisk.map((o) => Math.round(o.inclination)))];
    uniqueInclinations.forEach((inc) => {
      const bounds: L.LatLngBoundsExpression = [[-inc, -180], [inc, 180]];
      L.rectangle(bounds, {
        color: "#ef4444",
        weight: 1,
        opacity: 0.1,
        fillColor: "#ef4444",
        fillOpacity: 0.03,
        interactive: false,
      }).addTo(bandsRef.current!);
    });

    // Add markers for each object
    objects.forEach((obj) => {
      const color =
        obj.riskLevel === "high" ? "#ef4444" : obj.riskLevel === "moderate" ? "#f59e0b" : "#22d3ee";
      const radius = obj.riskLevel === "high" ? 7 : obj.riskLevel === "moderate" ? 5 : 4;
      const isSelected = selected === obj.noradId;

      const marker = L.circleMarker([obj.lat, obj.lng], {
        radius: isSelected ? radius + 3 : radius,
        fillColor: color,
        color: isSelected ? "#ffffff" : color,
        weight: isSelected ? 2 : 1,
        opacity: 0.9,
        fillOpacity: obj.riskLevel === "high" ? 0.9 : 0.7,
      });

      marker.bindTooltip(
        `<div style="font-family:Space Grotesk,sans-serif;font-size:11px;line-height:1.5">
          <strong>${obj.name}</strong><br/>
          NORAD ${obj.noradId} · ${obj.objectType}<br/>
          <span style="color:${color}">● Perigee: ${obj.perigee}km</span><br/>
          Alt: ${obj.altitude}km · Inc: ${obj.inclination.toFixed(1)}°<br/>
          Vel: ${obj.velocity} km/s
        </div>`,
        { className: "reentry-tooltip", direction: "top", offset: [0, -8] }
      );

      marker.on("click", () => onSelect(selected === obj.noradId ? null : obj.noradId));
      marker.addTo(markersRef.current!);
    });
  }, [objects, selected, onSelect]);

  return <div ref={mapRef} className="w-full h-[320px] md:h-[420px] rounded-lg z-0" />;
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

      const gpArray = Array.isArray(data) ? data : [];
      const parsed = gpArray
        .map(parseGPtoSatObject)
        .filter((o): o is SatObject => o !== null)
        .sort((a, b) => a.perigee - b.perigee);

      setObjects(parsed);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("CelesTrak fetch error:", err);
      setError("Failed to fetch satellite data. Retrying...");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 2 minutes
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Update positions every 10 seconds without re-fetching
  useEffect(() => {
    if (objects.length === 0) return;
    const interval = setInterval(() => {
      setObjects((prev) =>
        prev.map((obj) => {
          try {
            const satrec = satellite.twoline2satrec(obj.tle1, obj.tle2);
            const now = new Date();
            const posVel = satellite.propagate(satrec, now);
            if (!posVel.position || typeof posVel.position === "boolean") return obj;
            const gmst = satellite.gstime(now);
            const geo = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);
            const vel = posVel.velocity as satellite.EciVec3<number>;
            return {
              ...obj,
              lat: satellite.degreesLat(geo.latitude),
              lng: satellite.degreesLong(geo.longitude),
              altitude: Math.round(geo.height),
              velocity: Math.round(Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2) * 100) / 100,
            };
          } catch {
            return obj;
          }
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
  const selected = objects.find((o) => o.noradId === selectedObject);

  return (
    <section id="reentry-prediction" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Live Tracking</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Re-Entry Prediction System</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Real-time tracking of {objects.length} low-perigee objects from CelesTrak. Positions propagated using SGP4 orbital mechanics.
          </p>
        </motion.div>

        {/* Stats */}
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

        {/* Map */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-3 mb-8 overflow-hidden">
          <div className="flex items-center justify-between px-2 mb-3">
            <p className="font-display text-xs tracking-wider text-muted-foreground">LIVE SATELLITE POSITIONS · SGP4 PROPAGATION</p>
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

          {loading && objects.length === 0 ? (
            <div className="w-full h-[320px] md:h-[420px] flex items-center justify-center bg-[hsl(220,25%,8%)] rounded-lg">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Fetching orbital data from CelesTrak...</p>
              </div>
            </div>
          ) : error && objects.length === 0 ? (
            <div className="w-full h-[320px] md:h-[420px] flex items-center justify-center bg-[hsl(220,25%,8%)] rounded-lg">
              <div className="text-center">
                <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <button onClick={fetchData} className="mt-3 gradient-button text-xs">Retry</button>
              </div>
            </div>
          ) : (
            <ReentryMap objects={filtered} selected={selectedObject} onSelect={setSelectedObject} />
          )}

          <div className="flex flex-wrap justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-destructive" /> High risk (&lt;200km perigee)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-[#f59e0b]" /> Moderate (&lt;300km)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-primary" /> Low (&lt;400km)</span>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
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

        {/* Object list */}
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
                  <p className="text-[10px] text-muted-foreground">NORAD {obj.noradId} · {obj.objectType}</p>
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
                  <p className="text-[10px] text-muted-foreground mb-1">Current position:</p>
                  <p className="font-mono text-[11px] text-foreground">
                    {obj.lat.toFixed(4)}° {obj.lat >= 0 ? "N" : "S"}, {obj.lng.toFixed(4)}° {obj.lng >= 0 ? "E" : "W"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2">Epoch: <span className="font-mono text-foreground">{obj.epoch}</span></p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {filtered.length > 12 && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Showing 12 of {filtered.length} objects. All objects plotted on map.
          </p>
        )}
      </div>
    </section>
  );
};

export default ReentryPredictionSection;
