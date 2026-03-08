import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Users, Satellite } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ISSPosition {
  latitude: string;
  longitude: string;
  altitude: number;
  velocity: number;
}

interface Astronaut {
  name: string;
  craft: string;
}

const ISSTrackerSection = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [position, setPosition] = useState<ISSPosition | null>(null);
  const [astronauts, setAstronauts] = useState<Astronaut[]>([]);
  const [peopleCount, setPeopleCount] = useState(0);

  const fetchISS = useCallback(async () => {
    try {
      // Use Where the ISS At API (HTTPS) as primary source
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

  const fetchAstronauts = useCallback(async () => {
    try {
      // open-notify is HTTP only; use corsproxy to fetch
      const res = await fetch("https://corsproxy.io/?http://api.open-notify.org/astros.json");
      const data = await res.json();
      if (data.message === "success") {
        setPeopleCount(data.number);
        setAstronauts(data.people);
      }
    } catch {
      // Fallback: just show count as unknown
    }
  }, []);

  useEffect(() => {
    fetchAstronauts();
  }, [fetchAstronauts]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [0, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
    }).addTo(map);

    const issIcon = L.divIcon({
      html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 0 8px hsl(199,100%,55%))">🚀</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      className: "",
    });

    markerRef.current = L.marker([0, 0], { icon: issIcon }).addTo(map);
    markerRef.current.bindPopup("Loading ISS data...", {
      className: "iss-popup",
      closeButton: true,
    });
    mapInstance.current = map;

    fetchISS();
    const interval = setInterval(fetchISS, 5000);
    return () => {
      clearInterval(interval);
      map.remove();
      mapInstance.current = null;
    };
  }, [fetchISS]);

  return (
    <section id="iss-tracker" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Live Tracking</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">International Space Station</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Real-time ISS position updated every 5 seconds, plus current humans in space.
          </p>
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
            <p className="text-lg font-display font-bold text-primary">{peopleCount || "—"}</p>
            <p className="text-xs text-muted-foreground">Humans in Space</p>
          </div>
        </div>

        {/* Map */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-2 mb-8 overflow-hidden">
          <div ref={mapRef} className="w-full h-[350px] md:h-[450px] rounded-lg" style={{ background: "hsl(225 50% 6%)" }} />
        </motion.div>

        {/* Astronauts */}
        {astronauts.length > 0 && (
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="glass-card p-6">
            <h3 className="font-display font-semibold text-sm mb-4 text-center">People Currently in Space</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {astronauts.map((a) => (
                <div key={a.name} className="flex items-center gap-3 bg-secondary/30 rounded-lg px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-mono text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.craft}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default ISSTrackerSection;
