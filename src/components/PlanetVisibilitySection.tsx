import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Eye, Sunrise, Sunset, Telescope, Globe, Clock, MapPin, RefreshCw, Loader2 } from "lucide-react";
import * as Astronomy from "astronomy-engine";

interface PlanetInfo {
  name: string;
  symbol: string;
  color: string;
  body: Astronomy.Body;
  azimuth: number;
  altitude: number;
  magnitude: number;
  constellation: string;
  riseTime: string | null;
  setTime: string | null;
  elongation: number;
  illumination: number;
  distanceAU: number;
  angularDiameter: number;
  telescopeTip: string;
}

const PLANET_CONFIG = [
  { name: "Mercury", symbol: "☿", color: "hsl(35, 70%, 55%)", body: Astronomy.Body.Mercury, diamKm: 4879, tip: "Look low on the horizon near sunrise/sunset. Small telescope shows phases like the Moon." },
  { name: "Venus", symbol: "♀", color: "hsl(48, 90%, 70%)", body: Astronomy.Body.Venus, diamKm: 12104, tip: "Brilliant! A 6\" telescope reveals crescent or gibbous phases. Best viewed at twilight." },
  { name: "Mars", symbol: "♂", color: "hsl(10, 80%, 55%)", body: Astronomy.Body.Mars, diamKm: 6779, tip: "8\" telescope may show polar ice cap and dark surface features. Use high magnification." },
  { name: "Jupiter", symbol: "♃", color: "hsl(30, 60%, 65%)", body: Astronomy.Body.Jupiter, diamKm: 139820, tip: "Even binoculars show 4 Galilean moons. 6\"+ telescope reveals cloud bands and Great Red Spot." },
  { name: "Saturn", symbol: "♄", color: "hsl(45, 50%, 60%)", body: Astronomy.Body.Saturn, diamKm: 116460, tip: "4\"+ telescope reveals the rings. Look for the Cassini Division in the ring gap." },
  { name: "Uranus", symbol: "♅", color: "hsl(180, 50%, 60%)", body: Astronomy.Body.Uranus, diamKm: 50724, tip: "Visible as a tiny blue-green disk in a 4\"+ telescope at 100x. Use star chart to locate." },
  { name: "Neptune", symbol: "♆", color: "hsl(220, 60%, 55%)", body: Astronomy.Body.Neptune, diamKm: 49244, tip: "Requires 8\"+ telescope. Appears as tiny blue dot at 150x+. Very challenging." },
];

// RA to constellation (simplified ecliptic zodiac mapping)
const ZODIAC: { name: string; raStart: number; raEnd: number }[] = [
  { name: "Pisces", raStart: 0, raEnd: 1.87 }, { name: "Aries", raStart: 1.87, raEnd: 3.43 },
  { name: "Taurus", raStart: 3.43, raEnd: 5.73 }, { name: "Gemini", raStart: 5.73, raEnd: 8.03 },
  { name: "Cancer", raStart: 8.03, raEnd: 9.37 }, { name: "Leo", raStart: 9.37, raEnd: 11.83 },
  { name: "Virgo", raStart: 11.83, raEnd: 14.47 }, { name: "Libra", raStart: 14.47, raEnd: 15.93 },
  { name: "Scorpius", raStart: 15.93, raEnd: 17.0 }, { name: "Ophiuchus", raStart: 17.0, raEnd: 18.27 },
  { name: "Sagittarius", raStart: 18.27, raEnd: 20.07 }, { name: "Capricornus", raStart: 20.07, raEnd: 21.47 },
  { name: "Aquarius", raStart: 21.47, raEnd: 23.73 }, { name: "Pisces", raStart: 23.73, raEnd: 24 },
];

function getConstellation(raHours: number): string {
  return ZODIAC.find(z => raHours >= z.raStart && raHours < z.raEnd)?.name || "Unknown";
}

function azToDir(az: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(az / 22.5) % 16];
}

function formatTime(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function computePlanets(date: Date, lat: number, lon: number): PlanetInfo[] {
  const observer = new Astronomy.Observer(lat, lon, 0);

  return PLANET_CONFIG.map(cfg => {
    // Get equatorial coordinates
    const equatorial = Astronomy.Equator(cfg.body, date, observer, true, true);
    // Convert to horizontal (az/alt)
    const horizontal = Astronomy.Horizon(date, observer, equatorial.ra, equatorial.dec, 'normal');

    // Elongation from sun
    const elong = Astronomy.Elongation(cfg.body, date);

    // Visual magnitude
    const illum = Astronomy.Illumination(cfg.body, date);

    // Rise/Set times
    let riseTime: string | null = null;
    let setTime: string | null = null;
    try {
      const rise = Astronomy.SearchRiseSet(cfg.body, observer, +1, date, 1);
      riseTime = formatTime(rise?.date || null);
    } catch { /* planet may not rise */ }
    try {
      const set = Astronomy.SearchRiseSet(cfg.body, observer, -1, date, 1);
      setTime = formatTime(set?.date || null);
    } catch { /* planet may not set */ }

    // Constellation from RA
    const constellation = getConstellation(equatorial.ra);

    // Angular diameter in arcseconds
    const distKm = equatorial.dist * 149597870.7;
    const angularDiameter = (cfg.diamKm / distKm) * 206265;

    return {
      name: cfg.name,
      symbol: cfg.symbol,
      color: cfg.color,
      body: cfg.body,
      azimuth: horizontal.azimuth,
      altitude: horizontal.altitude,
      magnitude: illum.mag,
      constellation,
      riseTime,
      setTime,
      elongation: elong.elongation,
      illumination: illum.phase_fraction * 100,
      distanceAU: equatorial.dist,
      angularDiameter,
      telescopeTip: cfg.tip,
    };
  });
}

const PlanetVisibilitySection = () => {
  const [now, setNow] = useState(new Date());
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState("Locating...");

  // Get user geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setLocationName(`${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`);
        },
        () => {
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

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const planets = useMemo(() => {
    if (!location) return [];
    return computePlanets(now, location.lat, location.lon);
  }, [now, location]);

  const visiblePlanets = planets.filter(p => p.altitude > 0);
  const selected = planets.find(p => p.name === selectedPlanet);

  return (
    <section id="planet-visibility" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Live Ephemeris</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Planet Visibility</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            {planets.length > 0
              ? `${visiblePlanets.length} planet${visiblePlanets.length !== 1 ? 's' : ''} currently above your horizon. Tap a planet for details.`
              : 'Computing planetary positions...'}
          </p>
          <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{locationName}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{now.toLocaleTimeString()}</span>
          </div>
        </motion.div>

        {!location ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Getting your location...</p>
          </div>
        ) : (
          <>
            {/* Visual orbit diagram */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-6 mb-8">
              <div className="relative w-full h-[200px] flex items-center justify-center overflow-hidden">
                <div className="absolute w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-orange-500 shadow-[0_0_30px_hsla(45,90%,55%,0.5)] z-10" />
                {planets.map((planet, i) => {
                  const radius = 40 + i * 22;
                  const angle = (planet.azimuth * Math.PI) / 180;
                  const px = Math.cos(angle) * radius;
                  const py = Math.sin(angle) * radius * 0.4;
                  const isVisible = planet.altitude > 0;
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
                          backgroundColor: planet.color,
                          boxShadow: isVisible ? `0 0 10px ${planet.color}` : "none",
                          opacity: isVisible ? 1 : 0.3,
                        }}
                        title={`${planet.name} — ${isVisible ? `Alt: ${planet.altitude.toFixed(1)}°` : 'Below horizon'}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {planets.map((p) => {
                  const isVisible = p.altitude > 0;
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
                      <span style={{ color: p.color }}>{p.symbol}</span>
                      {p.name}
                      {isVisible && <Eye className="w-3 h-3 text-accent" />}
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {isVisible ? `${p.altitude.toFixed(0)}°` : 'set'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Planet detail cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(selected ? [selected] : visiblePlanets.length > 0 ? visiblePlanets : planets.slice(0, 3)).map((planet) => {
                const isVisible = planet.altitude > 0;
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
                        style={{ backgroundColor: `${planet.color}20`, color: planet.color, boxShadow: `0 0 15px ${planet.color}40` }}
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
                        <span className="text-muted-foreground">Alt/Az:</span>
                        <span className={`font-mono ${isVisible ? 'text-accent' : 'text-muted-foreground'}`}>
                          {planet.altitude.toFixed(1)}° {azToDir(planet.azimuth)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <Eye className="w-3 h-3 text-primary" />
                        <span className="text-muted-foreground">Elong:</span>
                        <span className="font-mono text-foreground">{planet.elongation.toFixed(1)}°</span>
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
                        <span className="text-muted-foreground">Dist:</span>
                        <span className="font-mono text-foreground">{planet.distanceAU.toFixed(3)} AU</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <RefreshCw className="w-3 h-3 text-accent" />
                        <span className="text-muted-foreground">Phase:</span>
                        <span className="font-mono text-foreground">{planet.illumination.toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/40">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Telescope className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-display tracking-wider text-primary uppercase">Telescope Tip</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{planet.telescopeTip}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-4 text-center text-[10px] text-muted-foreground">
              🔭 Positions computed using VSOP87 theory via Astronomy Engine. Updates every minute for your location.
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default PlanetVisibilitySection;
