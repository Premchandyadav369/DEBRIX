import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Sunrise, Sunset, Telescope, Globe, Clock, MapPin, RefreshCw, Loader2, Maximize2, Orbit, Rocket, Timer, Fuel, CalendarClock } from "lucide-react";
import * as Astronomy from "astronomy-engine";

interface LaunchWindowInfo {
  nextWindowDate: Date;
  transferTimeDays: number;
  deltaV: number; // km/s total
  arrivalDate: Date;
  synodicPeriodDays: number;
  phaseAngleDeg: number;
}

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
  distanceKm: number;
  angularDiameter: number;
  telescopeTip: string;
  orbitalPeriodYears: number;
  meanRadiusKm: number;
  launchWindow: LaunchWindowInfo;
}

const PLANET_CONFIG = [
  { name: "Mercury", symbol: "☿", color: "hsl(35, 70%, 55%)", body: Astronomy.Body.Mercury, diamKm: 4879, orbYrs: 0.24, tip: "Look low on the horizon near sunrise/sunset. Small telescope shows phases like the Moon." },
  { name: "Venus", symbol: "♀", color: "hsl(48, 90%, 70%)", body: Astronomy.Body.Venus, diamKm: 12104, orbYrs: 0.62, tip: "Brilliant! A 6\" telescope reveals crescent or gibbous phases. Best viewed at twilight." },
  { name: "Mars", symbol: "♂", color: "hsl(10, 80%, 55%)", body: Astronomy.Body.Mars, diamKm: 6779, orbYrs: 1.88, tip: "8\" telescope may show polar ice cap and dark surface features. Use high magnification." },
  { name: "Jupiter", symbol: "♃", color: "hsl(30, 60%, 65%)", body: Astronomy.Body.Jupiter, diamKm: 139820, orbYrs: 11.86, tip: "Even binoculars show 4 Galilean moons. 6\"+ telescope reveals cloud bands and Great Red Spot." },
  { name: "Saturn", symbol: "♄", color: "hsl(45, 50%, 60%)", body: Astronomy.Body.Saturn, diamKm: 116460, orbYrs: 29.46, tip: "4\"+ telescope reveals the rings. Look for the Cassini Division in the ring gap." },
  { name: "Uranus", symbol: "♅", color: "hsl(180, 50%, 60%)", body: Astronomy.Body.Uranus, diamKm: 50724, orbYrs: 84.01, tip: "Visible as a tiny blue-green disk in a 4\"+ telescope at 100x. Use star chart to locate." },
  { name: "Neptune", symbol: "♆", color: "hsl(220, 60%, 55%)", body: Astronomy.Body.Neptune, diamKm: 49244, orbYrs: 164.8, tip: "Requires 8\"+ telescope. Appears as tiny blue dot at 150x+. Very challenging." },
];

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
function formatDistance(km: number): string {
  if (km >= 1e9) return `${(km / 1e9).toFixed(2)}B km`;
  if (km >= 1e6) return `${(km / 1e6).toFixed(1)}M km`;
  return `${(km / 1e3).toFixed(0)}K km`;
}

// Hohmann transfer orbit calculations
const EARTH_ORBIT_AU = 1.0;
const MU_SUN = 1.327124e20; // m³/s² gravitational parameter of the Sun
const AU_M = 1.496e11; // meters per AU

// Semi-major axes in AU (mean orbital radii)
const PLANET_SMA: Record<string, number> = {
  Mercury: 0.387, Venus: 0.723, Mars: 1.524, Jupiter: 5.203,
  Saturn: 9.537, Uranus: 19.19, Neptune: 30.07,
};

// Approximate delta-v for Hohmann transfer from Earth (km/s, departure + arrival burns)
const PLANET_DV: Record<string, number> = {
  Mercury: 13.4, Venus: 7.5, Mars: 5.7, Jupiter: 14.0,
  Saturn: 15.7, Uranus: 15.9, Neptune: 16.0,
};

function computeHohmannTransfer(planetName: string): { transferTimeDays: number; deltaV: number } {
  const r2 = PLANET_SMA[planetName] || 1;
  const r1 = EARTH_ORBIT_AU;
  const a = (r1 + r2) / 2; // semi-major axis of transfer orbit in AU
  const a_m = a * AU_M;
  const transferTimeSec = Math.PI * Math.sqrt((a_m ** 3) / MU_SUN); // half orbital period
  const transferTimeDays = transferTimeSec / 86400;
  const deltaV = PLANET_DV[planetName] || 10;
  return { transferTimeDays, deltaV };
}

function computeLaunchWindow(body: Astronomy.Body, planetName: string, now: Date, orbYrs: number): LaunchWindowInfo {
  const hohmann = computeHohmannTransfer(planetName);
  
  // Synodic period: 1/|1/T_earth - 1/T_planet|
  const T_earth = 1.0; // years
  const T_planet = orbYrs;
  const synodicPeriodYears = 1 / Math.abs(1 / T_earth - 1 / T_planet);
  const synodicPeriodDays = synodicPeriodYears * 365.25;
  
  // Phase angle for Hohmann transfer
  const r2 = PLANET_SMA[planetName] || 1;
  const r1 = EARTH_ORBIT_AU;
  const a = (r1 + r2) / 2;
  const transferAngle = Math.PI * Math.sqrt((a ** 3) / (r2 ** 3)); // angle planet travels during transfer
  const phaseAngleDeg = (180 - (transferAngle * 180 / Math.PI)) % 360;
  
  // Search for next launch window by finding when Earth-planet ecliptic longitude difference
  // matches the required phase angle. We scan day-by-day over the next synodic period.
  const searchDays = Math.ceil(synodicPeriodDays) + 30;
  let bestDate = new Date(now.getTime() + synodicPeriodDays * 86400000 / 2);
  let bestError = 999;
  
  const targetPhase = ((phaseAngleDeg % 360) + 360) % 360;
  
  for (let d = 1; d <= searchDays; d += 1) {
    const testDate = new Date(now.getTime() + d * 86400000);
    try {
      const earthPos = Astronomy.EclipticGeoMoon(testDate); // we need heliocentric, use HelioVector
      const earthVec = Astronomy.HelioVector(Astronomy.Body.Earth, testDate);
      const planetVec = Astronomy.HelioVector(body, testDate);
      
      // Ecliptic longitudes
      const earthLon = (Math.atan2(earthVec.y, earthVec.x) * 180 / Math.PI + 360) % 360;
      const planetLon = (Math.atan2(planetVec.y, planetVec.x) * 180 / Math.PI + 360) % 360;
      
      // Current phase angle (planet ahead of Earth in orbit)
      let currentPhase: number;
      if (r2 > r1) {
        // Outer planet: planet needs to be BEHIND Earth by phase angle
        currentPhase = ((planetLon - earthLon) + 360) % 360;
      } else {
        // Inner planet: planet needs to be AHEAD
        currentPhase = ((earthLon - planetLon) + 360) % 360;
      }
      
      const error = Math.abs(currentPhase - targetPhase);
      const wrappedError = Math.min(error, 360 - error);
      
      if (wrappedError < bestError) {
        bestError = wrappedError;
        bestDate = testDate;
      }
    } catch {
      continue;
    }
  }
  
  const arrivalDate = new Date(bestDate.getTime() + hohmann.transferTimeDays * 86400000);
  
  return {
    nextWindowDate: bestDate,
    transferTimeDays: Math.round(hohmann.transferTimeDays),
    deltaV: hohmann.deltaV,
    arrivalDate,
    synodicPeriodDays: Math.round(synodicPeriodDays),
    phaseAngleDeg: Math.round(Math.abs(phaseAngleDeg)),
  };
}

function computePlanets(date: Date, lat: number, lon: number): PlanetInfo[] {
  const observer = new Astronomy.Observer(lat, lon, 0);
  return PLANET_CONFIG.map(cfg => {
    const equatorial = Astronomy.Equator(cfg.body, date, observer, true, true);
    const horizontal = Astronomy.Horizon(date, observer, equatorial.ra, equatorial.dec, 'normal');
    const elong = Astronomy.Elongation(cfg.body, date);
    const illum = Astronomy.Illumination(cfg.body, date);
    let riseTime: string | null = null;
    let setTime: string | null = null;
    try { const rise = Astronomy.SearchRiseSet(cfg.body, observer, +1, date, 1); riseTime = formatTime(rise?.date || null); } catch { /* */ }
    try { const set = Astronomy.SearchRiseSet(cfg.body, observer, -1, date, 1); setTime = formatTime(set?.date || null); } catch { /* */ }
    const constellation = getConstellation(equatorial.ra);
    const distKm = equatorial.dist * 149597870.7;
    const angularDiameter = (cfg.diamKm / distKm) * 206265;
    const launchWindow = computeLaunchWindow(cfg.body, cfg.name, date, cfg.orbYrs);
    return {
      name: cfg.name, symbol: cfg.symbol, color: cfg.color, body: cfg.body,
      azimuth: horizontal.azimuth, altitude: horizontal.altitude, magnitude: illum.mag,
      constellation, riseTime, setTime, elongation: elong.elongation,
      illumination: illum.phase_fraction * 100, distanceAU: equatorial.dist,
      distanceKm: distKm, angularDiameter, telescopeTip: cfg.tip,
      orbitalPeriodYears: cfg.orbYrs, meanRadiusKm: cfg.diamKm / 2,
      launchWindow,
    };
  });
}

/* ── Solar System Orrery (top-down view) ──────────────────── */
const Orrery = ({ planets }: { planets: PlanetInfo[] }) => {
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  // Log scale for orbit radii to fit inner + outer planets
  const logScale = (au: number) => {
    const minR = 22;
    const maxR = cx - 20;
    const minAU = 0.3;
    const maxAU = 35;
    return minR + (maxR - minR) * (Math.log(au / minAU) / Math.log(maxAU / minAU));
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[360px] mx-auto" aria-label="Solar system orrery">
      {/* Background grid circles */}
      {[1, 2, 5, 10, 20, 30].map(au => (
        <circle key={au} cx={cx} cy={cy} r={logScale(au)} fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" strokeDasharray="2 3" />
      ))}
      {/* AU labels */}
      {[1, 5, 20].map(au => (
        <text key={au} x={cx + logScale(au) + 2} y={cy - 2} fill="hsl(var(--muted-foreground))" fontSize="6" opacity="0.5">{au} AU</text>
      ))}
      {/* Sun */}
      <circle cx={cx} cy={cy} r="8" fill="url(#sunGrad)" />
      <defs>
        <radialGradient id="sunGrad">
          <stop offset="0%" stopColor="hsl(45, 95%, 70%)" />
          <stop offset="100%" stopColor="hsl(35, 90%, 50%)" />
        </radialGradient>
      </defs>
      {/* Planet orbits + dots */}
      {planets.map((p) => {
        const r = logScale(p.distanceAU);
        // Use elongation angle for rough positioning
        const angle = (p.elongation * Math.PI) / 180;
        const px = cx + Math.cos(angle) * r;
        const py = cy - Math.sin(angle) * r;
        const dotR = Math.max(3, Math.min(7, 5 * (p.meanRadiusKm / 30000)));
        const isVisible = p.altitude > 0;
        return (
          <g key={p.name}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={p.color} strokeWidth="0.5" opacity="0.2" />
            <circle cx={px} cy={py} r={dotR} fill={p.color} opacity={isVisible ? 1 : 0.35} />
            {isVisible && <circle cx={px} cy={py} r={dotR + 3} fill="none" stroke={p.color} strokeWidth="0.5" opacity="0.4" />}
            <text x={px} y={py - dotR - 3} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="7" fontWeight="600" opacity={isVisible ? 0.9 : 0.4}>
              {p.symbol}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/* ── Distance Scale Bar ───────────────────────────────────── */
const DistanceScale = ({ planets }: { planets: PlanetInfo[] }) => {
  const maxAU = Math.max(...planets.map(p => p.distanceAU));
  return (
    <div className="space-y-1.5">
      {planets.map((p) => {
        const pct = (p.distanceAU / maxAU) * 100;
        const isVisible = p.altitude > 0;
        return (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-5 text-center text-sm" style={{ color: p.color, opacity: isVisible ? 1 : 0.4 }}>{p.symbol}</span>
            <div className="flex-1 h-2.5 rounded-full bg-secondary/40 overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${Math.max(2, pct)}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ backgroundColor: p.color, opacity: isVisible ? 0.8 : 0.3 }}
              />
            </div>
            <span className="text-[9px] font-mono text-muted-foreground w-20 text-right">
              {formatDistance(p.distanceKm)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/* ── Launch Windows View ──────────────────────────────────── */
const LaunchWindows = ({ planets }: { planets: PlanetInfo[] }) => {
  const sorted = [...planets].sort((a, b) => a.launchWindow.nextWindowDate.getTime() - b.launchWindow.nextWindowDate.getTime());
  const now = Date.now();
  
  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <p className="text-[11px] text-muted-foreground">Hohmann transfer windows calculated from current planetary positions</p>
      </div>
      {sorted.map((p) => {
        const lw = p.launchWindow;
        const daysUntil = Math.max(0, Math.round((lw.nextWindowDate.getTime() - now) / 86400000));
        const isImminent = daysUntil < 60;
        const isSoon = daysUntil < 180;
        
        return (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/40 hover:border-primary/40 transition-all"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: `${p.color}20`, color: p.color }}>
              {p.symbol}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display font-semibold text-sm text-foreground">{p.name}</span>
                {isImminent && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-display tracking-wider bg-accent/20 text-accent animate-pulse">WINDOW OPEN</span>
                )}
                {!isImminent && isSoon && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-display tracking-wider bg-primary/20 text-primary">UPCOMING</span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1">
                <div className="flex items-center gap-1 text-[10px]">
                  <CalendarClock className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-muted-foreground">Launch:</span>
                  <span className="font-mono text-foreground">{lw.nextWindowDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <Timer className="w-3 h-3 text-accent shrink-0" />
                  <span className="text-muted-foreground">Travel:</span>
                  <span className="font-mono text-foreground">{lw.transferTimeDays}d</span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <Fuel className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-muted-foreground">Δv:</span>
                  <span className="font-mono text-foreground">{lw.deltaV} km/s</span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <Rocket className="w-3 h-3 text-accent shrink-0" />
                  <span className="text-muted-foreground">In:</span>
                  <span className={`font-mono ${isImminent ? 'text-accent font-bold' : 'text-foreground'}`}>{daysUntil}d</span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
      <p className="text-[9px] text-muted-foreground text-center mt-2">
        🚀 Based on Hohmann minimum-energy transfers · Synodic period alignment via VSOP87 ephemeris
      </p>
    </div>
  );
};

const PlanetVisibilitySection = () => {
  const [now, setNow] = useState(new Date());
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState("Locating...");
  const [viewMode, setViewMode] = useState<"orrery" | "distances">("orrery");

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setLocationName(`${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`); },
        () => { setLocation({ lat: 28.6139, lon: 77.209 }); setLocationName("New Delhi (default)"); },
        { timeout: 5000 }
      );
    } else { setLocation({ lat: 28.6139, lon: 77.209 }); setLocationName("New Delhi (default)"); }
  }, []);

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(id); }, []);

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
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Solar System & Planet Visibility</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            {planets.length > 0
              ? `${visiblePlanets.length} planet${visiblePlanets.length !== 1 ? 's' : ''} currently above your horizon. Real-time positions computed from VSOP87 theory.`
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
            {/* View mode toggle */}
            <div className="flex justify-center gap-2 mb-6">
              <button onClick={() => setViewMode("orrery")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display tracking-wider border transition-all ${viewMode === "orrery" ? "border-primary bg-primary/15 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/40"}`}>
                <Orbit className="w-3.5 h-3.5" /> Orrery
              </button>
              <button onClick={() => setViewMode("distances")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display tracking-wider border transition-all ${viewMode === "distances" ? "border-primary bg-primary/15 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/40"}`}>
                <Maximize2 className="w-3.5 h-3.5" /> Distances
              </button>
            </div>

            {/* Solar system visualization */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-6 mb-8">
              <AnimatePresence mode="wait">
                {viewMode === "orrery" ? (
                  <motion.div key="orrery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Orrery planets={planets} />
                  </motion.div>
                ) : (
                  <motion.div key="distances" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <DistanceScale planets={planets} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Planet buttons */}
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                {planets.map((p) => {
                  const isVisible = p.altitude > 0;
                  return (
                    <button
                      key={p.name}
                      onClick={() => setSelectedPlanet(selectedPlanet === p.name ? null : p.name)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-display tracking-wider border transition-all ${
                        selectedPlanet === p.name ? "border-primary/60 bg-primary/15 text-primary"
                        : isVisible ? "border-border/60 text-foreground hover:border-primary/40"
                        : "border-border/30 text-muted-foreground opacity-50"
                      }`}
                    >
                      <span style={{ color: p.color }}>{p.symbol}</span>
                      {p.name}
                      {isVisible && <Eye className="w-3 h-3 text-accent" />}
                      <span className="font-mono text-[9px] text-muted-foreground">{p.distanceAU.toFixed(2)} AU</span>
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
                  <motion.div key={planet.name} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 hover:border-primary/40 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: `${planet.color}20`, color: planet.color, boxShadow: `0 0 15px ${planet.color}40` }}>
                        {planet.symbol}
                      </div>
                      <div>
                        <h4 className="font-display font-semibold text-foreground">{planet.name}</h4>
                        <p className="text-[10px] text-muted-foreground">in {planet.constellation} · mag {planet.magnitude.toFixed(1)}</p>
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
                        <span className={`font-mono ${isVisible ? 'text-accent' : 'text-muted-foreground'}`}>{planet.altitude.toFixed(1)}° {azToDir(planet.azimuth)}</span>
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
                        <Maximize2 className="w-3 h-3 text-primary" />
                        <span className="text-muted-foreground">Dist:</span>
                        <span className="font-mono text-foreground">{formatDistance(planet.distanceKm)}</span>
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
              🔭 Positions computed using VSOP87 theory via Astronomy Engine · Orbital periods: Mercury 88d → Neptune 165y
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default PlanetVisibilitySection;
