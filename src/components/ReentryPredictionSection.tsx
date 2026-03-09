import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Flame, MapPin, Clock, AlertTriangle, Globe, CalendarDays, ArrowDown } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ReentryObject {
  name: string;
  noradId: string;
  type: "Rocket Body" | "Satellite" | "Debris";
  origin: string;
  estimatedDate: string;
  uncertainty: string;
  mass: number;
  inclination: number;
  perigee: number;
  apogee: number;
  status: "Imminent" | "This Week" | "This Month" | "Monitoring";
  controlled: boolean;
  riskLevel: "low" | "moderate" | "high";
  description: string;
  predictedRegions: string[];
  lat: number;
  lng: number;
}

const REENTRY_OBJECTS: ReentryObject[] = [
  {
    name: "CZ-5B R/B",
    noradId: "54217",
    type: "Rocket Body",
    origin: "🇨🇳 China",
    estimatedDate: "2026-03-15",
    uncertainty: "±36 hours",
    mass: 21000,
    inclination: 41.5,
    perigee: 175,
    apogee: 190,
    status: "This Week",
    controlled: false,
    riskLevel: "high",
    description: "Long March 5B core stage. Uncontrolled reentry expected.",
    predictedRegions: ["Atlantic Ocean", "Central Africa", "Indian Ocean", "Southeast Asia"],
    lat: 12.5,
    lng: -25.3,
  },
  {
    name: "COSMOS 2560",
    noradId: "54890",
    type: "Satellite",
    origin: "🇷🇺 Russia",
    estimatedDate: "2026-03-22",
    uncertainty: "±5 days",
    mass: 3200,
    inclination: 64.8,
    perigee: 210,
    apogee: 235,
    status: "This Month",
    controlled: false,
    riskLevel: "moderate",
    description: "Defunct Russian military satellite. Natural decay.",
    predictedRegions: ["Northern Hemisphere", "Southern Hemisphere"],
    lat: 52.1,
    lng: 45.8,
  },
  {
    name: "H-IIA R/B",
    noradId: "55102",
    type: "Rocket Body",
    origin: "🇯🇵 Japan",
    estimatedDate: "2026-03-12",
    uncertainty: "±18 hours",
    mass: 2800,
    inclination: 28.5,
    perigee: 168,
    apogee: 172,
    status: "Imminent",
    controlled: false,
    riskLevel: "moderate",
    description: "Japanese H-IIA second stage from recent launch.",
    predictedRegions: ["Pacific Ocean", "South America", "Atlantic Ocean"],
    lat: -8.2,
    lng: -155.4,
  },
  {
    name: "Starlink-2145",
    noradId: "48901",
    type: "Satellite",
    origin: "🇺🇸 USA",
    estimatedDate: "2026-03-18",
    uncertainty: "±2 days",
    mass: 260,
    inclination: 53.0,
    perigee: 220,
    apogee: 228,
    status: "This Week",
    controlled: true,
    riskLevel: "low",
    description: "Deorbiting Starlink satellite. Controlled descent.",
    predictedRegions: ["Complete burnup expected"],
    lat: 35.2,
    lng: -120.5,
  },
  {
    name: "SL-16 R/B",
    noradId: "22285",
    type: "Rocket Body",
    origin: "🇷🇺 Russia",
    estimatedDate: "2026-04-05",
    uncertainty: "±10 days",
    mass: 8200,
    inclination: 71.0,
    perigee: 285,
    apogee: 310,
    status: "Monitoring",
    controlled: false,
    riskLevel: "high",
    description: "Soviet-era Zenit-2 upper stage. One of the largest debris in LEO.",
    predictedRegions: ["Global coverage due to high inclination"],
    lat: 62.3,
    lng: 78.1,
  },
  {
    name: "ERS-2",
    noradId: "23560",
    type: "Satellite",
    origin: "🇪🇺 ESA",
    estimatedDate: "2026-03-28",
    uncertainty: "±7 days",
    mass: 2516,
    inclination: 98.5,
    perigee: 250,
    apogee: 260,
    status: "This Month",
    controlled: false,
    riskLevel: "moderate",
    description: "ESA Earth observation satellite, decommissioned 2011.",
    predictedRegions: ["Polar regions", "Mid-latitudes"],
    lat: -45.6,
    lng: 168.2,
  },
];

function ReentryMap({ objects, selected, onSelect }: { objects: ReentryObject[]; selected: string | null; onSelect: (id: string | null) => void }) {
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

    // Draw inclination bands for uncontrolled objects
    objects.filter(o => !o.controlled).forEach((obj) => {
      const color = obj.riskLevel === "high" ? "#ef4444" : obj.riskLevel === "moderate" ? "#f59e0b" : "#22d3ee";
      const bounds: L.LatLngBoundsExpression = [[-obj.inclination, -180], [obj.inclination, 180]];
      L.rectangle(bounds, {
        color: color,
        weight: 1,
        opacity: 0.15,
        fillColor: color,
        fillOpacity: 0.04,
        interactive: false,
      }).addTo(bandsRef.current!);
    });

    // Add markers
    objects.forEach((obj) => {
      const color = obj.riskLevel === "high" ? "#ef4444" : obj.riskLevel === "moderate" ? "#f59e0b" : "#22d3ee";
      const radius = obj.riskLevel === "high" ? 8 : 6;
      const isSelected = selected === obj.noradId;

      const marker = L.circleMarker([obj.lat, obj.lng], {
        radius: isSelected ? radius + 3 : radius,
        fillColor: color,
        color: isSelected ? "#ffffff" : color,
        weight: isSelected ? 2 : 1,
        opacity: 0.9,
        fillOpacity: obj.status === "Imminent" ? 0.9 : 0.7,
      });

      marker.bindTooltip(
        `<div style="font-family:Space Grotesk,sans-serif;font-size:11px;line-height:1.4">
          <strong>${obj.name}</strong><br/>
          ${obj.type} · ${obj.origin}<br/>
          <span style="color:${color}">● ${obj.status}</span> · ${obj.estimatedDate}<br/>
          Mass: ${obj.mass >= 1000 ? (obj.mass / 1000).toFixed(1) + "t" : obj.mass + "kg"} · Inc: ${obj.inclination}°<br/>
          Perigee: ${obj.perigee}km · Apogee: ${obj.apogee}km
        </div>`,
        { className: "reentry-tooltip", direction: "top", offset: [0, -8] }
      );

      marker.on("click", () => onSelect(selected === obj.noradId ? null : obj.noradId));
      marker.addTo(markersRef.current!);
    });
  }, [objects, selected, onSelect]);

  return <div ref={mapRef} className="w-full h-[320px] md:h-[400px] rounded-lg z-0" />;
}

const ReentryPredictionSection = () => {
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("All");

  const filtered = useMemo(() => {
    if (filterStatus === "All") return REENTRY_OBJECTS;
    return REENTRY_OBJECTS.filter((o) => o.status === filterStatus);
  }, [filterStatus]);

  const imminentCount = REENTRY_OBJECTS.filter((o) => o.status === "Imminent").length;
  const uncontrolledCount = REENTRY_OBJECTS.filter((o) => !o.controlled).length;
  const totalMass = REENTRY_OBJECTS.reduce((s, o) => s + o.mass, 0);

  return (
    <section id="reentry-prediction" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Prediction</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Re-Entry Prediction System</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Tracking {REENTRY_OBJECTS.length} objects predicted to re-enter Earth's atmosphere. {uncontrolledCount} are uncontrolled descents.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Flame, label: "Tracked Objects", value: REENTRY_OBJECTS.length.toString(), color: "text-primary" },
            { icon: AlertTriangle, label: "Imminent", value: imminentCount.toString(), color: "text-destructive" },
            { icon: ArrowDown, label: "Uncontrolled", value: uncontrolledCount.toString(), color: "text-accent" },
            { icon: Globe, label: "Total Mass", value: `${(totalMass / 1000).toFixed(1)}t`, color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Leaflet Map */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-3 mb-8 overflow-hidden">
          <p className="font-display text-xs tracking-wider text-muted-foreground mb-3 px-2">RE-ENTRY GROUND TRACK & INCLINATION BANDS</p>
          <ReentryMap objects={filtered} selected={selectedObject} onSelect={setSelectedObject} />
          <div className="flex flex-wrap justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-destructive" /> High risk</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-[#f59e0b]" /> Moderate risk</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-primary" /> Low / Controlled</span>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {["All", "Imminent", "This Week", "This Month", "Monitoring"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded-full border transition-colors ${
                filterStatus === s ? "bg-primary/20 text-primary border-primary/40" : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Object cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((obj) => (
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
                  <h4 className="font-display font-semibold text-foreground">{obj.name}</h4>
                  <p className="text-[10px] text-muted-foreground">{obj.origin} · {obj.type} · NORAD {obj.noradId}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-display tracking-wider ${
                  obj.status === "Imminent" ? "bg-destructive/20 text-destructive animate-pulse" :
                  obj.status === "This Week" ? "bg-accent/15 text-accent" :
                  "bg-primary/15 text-primary"
                }`}>
                  {obj.status}
                </span>
              </div>

              <p className="text-xs text-muted-foreground mb-3">{obj.description}</p>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <CalendarDays className="w-3 h-3 text-primary" />
                  <span className="text-muted-foreground">Est:</span>
                  <span className="font-mono text-foreground">{obj.estimatedDate}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <Clock className="w-3 h-3 text-accent" />
                  <span className="text-muted-foreground">±</span>
                  <span className="font-mono text-foreground">{obj.uncertainty}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <Globe className="w-3 h-3 text-primary" />
                  <span className="text-muted-foreground">Mass:</span>
                  <span className="font-mono text-foreground">{obj.mass >= 1000 ? `${(obj.mass / 1000).toFixed(1)}t` : `${obj.mass}kg`}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <MapPin className="w-3 h-3 text-destructive" />
                  <span className="text-muted-foreground">Inc:</span>
                  <span className="font-mono text-foreground">{obj.inclination}°</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[10px] mb-2">
                <span className="text-muted-foreground">Perigee: <span className="font-mono text-foreground">{obj.perigee}km</span></span>
                <span className="text-muted-foreground">Apogee: <span className="font-mono text-foreground">{obj.apogee}km</span></span>
              </div>

              <div className={`flex items-center gap-1.5 text-[10px] p-2 rounded-lg ${
                obj.controlled ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
              }`}>
                {obj.controlled ? "✓ Controlled descent" : "⚠ Uncontrolled reentry"}
              </div>

              {selectedObject === obj.noradId && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 pt-3 border-t border-border/40">
                  <p className="text-[10px] text-muted-foreground mb-1">Predicted impact regions:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {obj.predictedRegions.map((r) => (
                      <span key={r} className="px-2 py-0.5 rounded-full text-[10px] bg-secondary/50 text-foreground">{r}</span>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReentryPredictionSection;
