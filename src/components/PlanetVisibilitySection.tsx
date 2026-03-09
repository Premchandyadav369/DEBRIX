import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Eye, Sunrise, Sunset, Telescope, Globe, Clock, MapPin, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PlanetData {
  name: string;
  symbol: string;
  ra: string;
  dec: string;
  azimuth: number;
  elevation: number;
  magnitude: number;
  constellation: string;
  riseTime: string | null;
  setTime: string | null;
  transitTime: string | null;
  angularDiameter: number;
  sunElongation: number;
  illumination: number;
}

const PLANET_COLORS: Record<string, string> = {
  Mercury: "hsl(35, 70%, 55%)",
  Venus: "hsl(48, 90%, 70%)",
  Mars: "hsl(10, 80%, 55%)",
  Jupiter: "hsl(30, 60%, 65%)",
  Saturn: "hsl(45, 50%, 60%)",
  Uranus: "hsl(180, 50%, 60%)",
  Neptune: "hsl(220, 60%, 55%)",
};

const TELESCOPE_TIPS: Record<string, string> = {
  Mercury: "Look low on the horizon near sunrise/sunset. Small telescope shows phases like the Moon.",
  Venus: "Brilliant! A 6\" telescope reveals crescent or gibbous phases. Best viewed at twilight.",
  Mars: "8\" telescope may show polar ice cap and dark surface features. Use high magnification.",
  Jupiter: "Even binoculars show 4 Galilean moons. 6\"+ telescope reveals cloud bands and Great Red Spot.",
  Saturn: "4\"+ telescope reveals the rings. Look for the Cassini Division in the ring gap.",
  Uranus: "Visible as a tiny blue-green disk in a 4\"+ telescope at 100x. Use star chart to locate.",
  Neptune: "Requires 8\"+ telescope. Appears as tiny blue dot at 150x+. Very challenging.",
};

const azimuthToDir = (az: number): string => {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(az / 22.5) % 16];
};

const PlanetVisibilitySection = () => {
  const [planets, setPlanets] = useState<PlanetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState("Default Location");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Get user geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setLocationName(`${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`);
        },
        () => {
          // Fallback to default
          setLocation({ lat: 28.6139, lon: 77.209 });
          setLocationName("New Delhi (default)");
        },
        { timeout: 5000 }
      );
    } else {
      setLocation({ lat: 28.6139, lon: 77.209 });
      setLocationName("New Delhi (default)");
    }
  }, []);

  // Fetch planet data when location is available
  useEffect(() => {
    if (!location) return;

    const fetchPlanets = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('planets-ephemeris', {
          body: { lat: location.lat, lon: location.lon, elevation: 0 },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);
        setPlanets(data.planets || []);
        setLastUpdated(new Date());
      } catch (err: any) {
        console.error('Planets fetch error:', err);
        setError(err.message || 'Failed to fetch planet data');
      } finally {
        setLoading(false);
      }
    };

    fetchPlanets();
    const interval = setInterval(fetchPlanets, 600000); // refresh every 10 min
    return () => clearInterval(interval);
  }, [location]);

  const visiblePlanets = planets.filter(p => p.elevation > 0);
  const selected = planets.find(p => p.name === selectedPlanet);
  const now = new Date();

  return (
    <section id="planet-visibility" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Live Ephemeris</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Planet Visibility</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Real-time planetary positions from NASA JPL Horizons. {visiblePlanets.length > 0 ? `${visiblePlanets.length} planet${visiblePlanets.length > 1 ? 's' : ''} currently above your horizon.` : 'Calculating positions...'}
          </p>
          <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{locationName}</span>
            {lastUpdated && (
              <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" />Updated {lastUpdated.toLocaleTimeString()}</span>
            )}
          </div>
        </motion.div>

        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Computing planetary ephemeris from JPL Horizons...</p>
          </div>
        ) : error ? (
          <div className="glass-card p-8 text-center">
            <Globe className="w-8 h-8 text-destructive mx-auto mb-3" />
            <p className="text-destructive text-sm mb-2">{error}</p>
            <button onClick={() => setLocation(loc => loc ? {...loc} : null)} className="gradient-button text-xs">Retry</button>
          </div>
        ) : (
          <>
            {/* Visual orbit diagram */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-6 mb-8">
              <div className="relative w-full h-[200px] flex items-center justify-center overflow-hidden">
                {/* Sun */}
                <div className="absolute w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-orange-500 shadow-[0_0_30px_hsla(45,90%,55%,0.5)] z-10" />
                {/* Orbit rings & planets */}
                {planets.map((planet, i) => {
                  const radius = 40 + i * 22;
                  const angle = ((planet.azimuth || i * 51.4) + now.getHours() * 15) * (Math.PI / 180);
                  const px = Math.cos(angle) * radius;
                  const py = Math.sin(angle) * radius * 0.4;
                  const color = PLANET_COLORS[planet.name] || "hsl(200, 50%, 50%)";
                  const isVisible = planet.elevation > 0;
                  return (
                    <div key={planet.name} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="absolute rounded-full border border-border/30" style={{ width: radius * 2, height: radius * 0.8 }} />
                      <button
                        onClick={() => setSelectedPlanet(selectedPlanet === planet.name ? null : planet.name)}
                        className="absolute pointer-events-auto transition-transform hover:scale-150 z-20"
                        style={{
                          transform: `translate(${px}px, ${py}px)`,
                          width: Math.max(8, 16 - i * 1.5),
                          height: Math.max(8, 16 - i * 1.5),
                          borderRadius: "50%",
                          backgroundColor: color,
                          boxShadow: isVisible ? `0 0 10px ${color}` : "none",
                          opacity: isVisible ? 1 : 0.3,
                        }}
                        title={`${planet.name} — ${isVisible ? `Alt: ${planet.elevation.toFixed(1)}°` : 'Below horizon'}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {planets.map((p) => {
                  const isVisible = p.elevation > 0;
                  return (
                    <button
                      key={p.name}
                      onClick={() => setSelectedPlanet(selectedPlanet === p.name ? null : p.name)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-display tracking-wider border transition-all ${
                        selectedPlanet === p.name
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : isVisible
                          ? "border-border/60 text-foreground hover:border-primary/40"
                          : "border-border/30 text-muted-foreground opacity-50"
                      }`}
                    >
                      <span style={{ color: PLANET_COLORS[p.name] }}>{p.symbol}</span>
                      {p.name}
                      {isVisible && <Eye className="w-3 h-3 text-accent" />}
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {p.elevation > 0 ? `${p.elevation.toFixed(0)}°` : 'set'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Planet detail cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(selected ? [selected] : planets.filter(p => p.elevation > 0).length > 0 ? planets.filter(p => p.elevation > 0) : planets.slice(0, 3)).map((planet) => {
                const color = PLANET_COLORS[planet.name] || "hsl(200, 50%, 50%)";
                const isVisible = planet.elevation > 0;
                return (
                  <motion.div
                    key={planet.name}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-5 hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                        style={{ backgroundColor: `${color}20`, color, boxShadow: `0 0 15px ${color}40` }}
                      >
                        {planet.symbol}
                      </div>
                      <div>
                        <h4 className="font-display font-semibold text-foreground">{planet.name}</h4>
                        <p className="text-[10px] text-muted-foreground">
                          in {planet.constellation} · mag {planet.magnitude.toFixed(1)}
                        </p>
                      </div>
                      {isVisible ? (
                        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-display tracking-wider bg-accent/15 text-accent">Visible</span>
                      ) : (
                        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-display tracking-wider bg-secondary/50 text-muted-foreground">Below Horizon</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <Globe className="w-3 h-3 text-accent" />
                        <span className="text-muted-foreground">Alt:</span>
                        <span className={`font-mono ${isVisible ? 'text-accent' : 'text-muted-foreground'}`}>{planet.elevation.toFixed(1)}° {azimuthToDir(planet.azimuth)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <Eye className="w-3 h-3 text-primary" />
                        <span className="text-muted-foreground">Elong:</span>
                        <span className="font-mono text-foreground">{planet.sunElongation.toFixed(1)}°</span>
                      </div>
                      {planet.riseTime && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <Sunrise className="w-3 h-3 text-primary" />
                          <span className="text-muted-foreground">Rise:</span>
                          <span className="font-mono text-foreground">{planet.riseTime}</span>
                        </div>
                      )}
                      {planet.setTime && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <Sunset className="w-3 h-3 text-destructive" />
                          <span className="text-muted-foreground">Set:</span>
                          <span className="font-mono text-foreground">{planet.setTime}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <Clock className="w-3 h-3 text-primary" />
                        <span className="text-muted-foreground">Illum:</span>
                        <span className="font-mono text-foreground">{planet.illumination.toFixed(1)}%</span>
                      </div>
                      {planet.transitTime && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <Clock className="w-3 h-3 text-accent" />
                          <span className="text-muted-foreground">Transit:</span>
                          <span className="font-mono text-foreground">{planet.transitTime}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/40">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Telescope className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-display tracking-wider text-primary uppercase">Telescope Tip</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {TELESCOPE_TIPS[planet.name] || 'Use a star chart app to locate this planet.'}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-4 text-center text-[10px] text-muted-foreground">
              📡 Data from NASA JPL Horizons System. Positions computed for your location in real-time.
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default PlanetVisibilitySection;
