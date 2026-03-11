import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Users, Satellite, Video, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ISSPosition {
  latitude: string;
  longitude: string;
  altitude: number;
  velocity: number;
}

interface CrewMember {
  name: string;
  totalTimeLabel: string;
  launchDate: Date;
  totalSecondsAtLaunch: number;
}

interface Mission {
  station: string;
  vehicle: string;
  launchDateStr: string;
  launchDate: Date;
  crew: CrewMember[];
}

const MISSIONS: Mission[] = [
  {
    station: "ISS",
    vehicle: "Soyuz MS-28",
    launchDateStr: "November 27, 2025, 09:27:57 UTC",
    launchDate: new Date("2025-11-27T09:27:57Z"),
    crew: [
      { name: "Christopher Williams", totalTimeLabel: "", launchDate: new Date("2025-11-27T09:27:57Z"), totalSecondsAtLaunch: 0 },
      { name: "Sergey Kud-Sverchkov", totalTimeLabel: "", launchDate: new Date("2025-11-27T09:27:57Z"), totalSecondsAtLaunch: 184 * 86400 + 23 * 3600 + 10 * 60 + 27 },
      { name: "Sergei Mikayev", totalTimeLabel: "", launchDate: new Date("2025-11-27T09:27:57Z"), totalSecondsAtLaunch: 0 },
    ],
  },
  {
    station: "ISS",
    vehicle: "SpaceX Crew-12",
    launchDateStr: "February 13, 2026, 10:15:56 UTC",
    launchDate: new Date("2026-02-13T10:15:56Z"),
    crew: [
      { name: "Jessica Meir", totalTimeLabel: "", launchDate: new Date("2026-02-13T10:15:56Z"), totalSecondsAtLaunch: 204 * 86400 + 15 * 3600 + 19 * 60 + 30 },
      { name: "Jack Hathaway", totalTimeLabel: "", launchDate: new Date("2026-02-13T10:15:56Z"), totalSecondsAtLaunch: 0 },
      { name: "Sophie Adenot", totalTimeLabel: "", launchDate: new Date("2026-02-13T10:15:56Z"), totalSecondsAtLaunch: 0 },
      { name: "Andrey Fedyaev", totalTimeLabel: "", launchDate: new Date("2026-02-13T10:15:56Z"), totalSecondsAtLaunch: 186 * 86400 + 3 * 3600 + 39 * 60 + 44 },
    ],
  },
  {
    station: "Tiangong Station",
    vehicle: "Shenzhou 21",
    launchDateStr: "October 31, 2025, 15:44:46 UTC",
    launchDate: new Date("2025-10-31T15:44:46Z"),
    crew: [
      { name: "Zhang Lu", totalTimeLabel: "", launchDate: new Date("2025-10-31T15:44:46Z"), totalSecondsAtLaunch: 186 * 86400 + 7 * 3600 + 24 * 60 + 28 },
      { name: "Wu Fei", totalTimeLabel: "", launchDate: new Date("2025-10-31T15:44:46Z"), totalSecondsAtLaunch: 0 },
      { name: "Zhang Hongzhang", totalTimeLabel: "", launchDate: new Date("2025-10-31T15:44:46Z"), totalSecondsAtLaunch: 0 },
    ],
  },
];

function formatDuration(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

function getMissionTime(launchDate: Date): number {
  return Math.max(0, (Date.now() - launchDate.getTime()) / 1000);
}

function getTotalTime(crew: CrewMember): number {
  const missionSeconds = getMissionTime(crew.launchDate);
  return crew.totalSecondsAtLaunch + missionSeconds;
}

const ISSTrackerSection = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [position, setPosition] = useState<ISSPosition | null>(null);
  const [showLiveFeed, setShowLiveFeed] = useState(false);
  const [, setTick] = useState(0);

  // Live timer tick every second
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const totalPeople = MISSIONS.reduce((sum, m) => sum + m.crew.length, 0);

  const fetchISS = useCallback(async () => {
    try {
      const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
      const data = await res.json();
      if (data.latitude !== undefined) {
        setPosition({
          latitude: String(data.latitude),
          longitude: String(data.longitude),
          altitude: data.altitude || 0,
          velocity: data.velocity || 0,
        });
        const lat = data.latitude;
        const lon = data.longitude;
        if (markerRef.current && mapInstance.current) {
          markerRef.current.setLatLng([lat, lon]);
          markerRef.current.setPopupContent(
            `<div style="font-family:monospace;font-size:12px;line-height:1.6;color:#fff;background:hsl(225,45%,10%);padding:8px 12px;border-radius:8px;min-width:160px">
              <div style="font-size:14px;margin-bottom:4px">🛰️ <b>ISS</b></div>
              <div>Lat: <b>${data.latitude.toFixed(4)}°</b></div>
              <div>Lon: <b>${data.longitude.toFixed(4)}°</b></div>
              <div>Alt: <b>${data.altitude.toFixed(1)} km</b></div>
              <div>Speed: <b>${data.velocity.toFixed(0)} km/h</b></div>
            </div>`
          );
          mapInstance.current.panTo([lat, lon]);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { center: [0, 0], zoom: 2, zoomControl: true, attributionControl: false });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 18 }).addTo(map);
    const issIcon = L.divIcon({
      html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 0 8px hsl(199,100%,55%))">🚀</div>`,
      iconSize: [28, 28], iconAnchor: [14, 14], className: "",
    });
    markerRef.current = L.marker([0, 0], { icon: issIcon }).addTo(map);
    markerRef.current.bindPopup("Loading ISS data...", { className: "iss-popup", closeButton: true });
    mapInstance.current = map;
    fetchISS();
    const interval = setInterval(fetchISS, 5000);
    return () => { clearInterval(interval); map.remove(); mapInstance.current = null; };
  }, [fetchISS]);

  return (
    <section id="iss-tracker" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Live Tracking</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">International Space Station</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">Real-time ISS position updated every 5 seconds, plus current humans in space.</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-4 text-center">
            <MapPin className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-lg font-display font-bold text-primary">{position ? `${parseFloat(position.latitude).toFixed(2)}°` : "—"}</p>
            <p className="text-xs text-muted-foreground">Latitude</p>
          </div>
          <div className="glass-card p-4 text-center">
            <Satellite className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-lg font-display font-bold text-primary">{position ? `${parseFloat(position.longitude).toFixed(2)}°` : "—"}</p>
            <p className="text-xs text-muted-foreground">Longitude</p>
          </div>
          <div className="glass-card p-4 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-lg font-display font-bold text-primary">{totalPeople}</p>
            <p className="text-xs text-muted-foreground">Humans in Space</p>
          </div>
        </div>

        {/* Map */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-2 mb-8 overflow-hidden">
          <div ref={mapRef} className="w-full h-[350px] md:h-[450px] rounded-lg" style={{ background: "hsl(225 50% 6%)" }} />
        </motion.div>

        {/* ISS Live Feed */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="glass-card p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" />
              <h3 className="font-display font-semibold text-sm">ISS Live Earth View</h3>
              <span className="flex items-center gap-1 text-[10px] text-destructive">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" /> LIVE
              </span>
            </div>
            <button onClick={() => setShowLiveFeed(!showLiveFeed)} className="px-3 py-1.5 text-[10px] font-display tracking-wider rounded-full border transition-colors bg-primary/20 text-primary border-primary/40 hover:bg-primary/30">
              {showLiveFeed ? "Hide Feed" : "Show Feed"}
            </button>
          </div>
          {showLiveFeed && (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe src="https://www.youtube.com/embed/vytmBNhc9ig?si=NXkGTcMV62c3vz-Z" className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" title="ISS Live Camera - YouTube" />
            </div>
          )}
          {!showLiveFeed && (
            <p className="text-xs text-muted-foreground text-center py-6">Click "Show Feed" to watch the live ISS camera stream.</p>
          )}
        </motion.div>

        {/* Crew grouped by mission */}
        {MISSIONS.map((mission) => (
          <motion.div key={mission.vehicle} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card p-6 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Rocket className="w-5 h-5 text-primary" />
              <h3 className="font-display font-semibold text-sm">{mission.station} — {mission.vehicle}</h3>
            </div>
            <p className="text-[10px] text-muted-foreground mb-1">Launched {mission.launchDateStr}</p>
            <p className="text-xs text-primary font-mono mb-4">Mission Time: {formatDuration(getMissionTime(mission.launchDate))}</p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {mission.crew.map((c) => (
                <div key={c.name} className="flex items-center gap-3 bg-secondary/30 rounded-lg px-4 py-3 border border-border/30">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">Total time in space</p>
                    <p className="text-[10px] text-primary font-mono">{formatDuration(getTotalTime(c))}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default ISSTrackerSection;
