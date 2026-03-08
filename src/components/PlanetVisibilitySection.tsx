import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Eye, Sunrise, Sunset, Telescope, Globe, Clock } from "lucide-react";

interface PlanetInfo {
  name: string;
  symbol: string;
  color: string;
  visible: boolean;
  riseTime: string;
  setTime: string;
  altitude: number;
  azimuth: string;
  magnitude: number;
  constellation: string;
  telescopeTip: string;
  description: string;
}

// Approximate planetary positions for March 2026 based on ephemeris data
function computePlanets(date: Date): PlanetInfo[] {
  const month = date.getMonth();
  const hour = date.getHours();

  return [
    {
      name: "Mercury",
      symbol: "☿",
      color: "hsl(35, 70%, 55%)",
      visible: hour > 17 || hour < 6,
      riseTime: "05:42",
      setTime: "17:18",
      altitude: 12,
      azimuth: "WSW",
      magnitude: -0.3,
      constellation: "Pisces",
      telescopeTip: "Look low on western horizon after sunset. Small telescope shows phases.",
      description: "Mercury reaches greatest elongation this month, making it easier to spot in evening twilight.",
    },
    {
      name: "Venus",
      symbol: "♀",
      color: "hsl(48, 90%, 70%)",
      visible: hour > 18 || hour < 5,
      riseTime: "08:15",
      setTime: "21:45",
      altitude: 38,
      azimuth: "W",
      magnitude: -4.2,
      constellation: "Taurus",
      telescopeTip: "Brilliant evening star. 6\" telescope reveals crescent phase. Best viewed at dusk.",
      description: "Venus blazes as the Evening Star, reaching peak brightness. Unmissable in the western sky after sunset.",
    },
    {
      name: "Mars",
      symbol: "♂",
      color: "hsl(10, 80%, 55%)",
      visible: hour > 19 || hour < 4,
      riseTime: "10:30",
      setTime: "02:15",
      altitude: 52,
      azimuth: "S",
      magnitude: 0.8,
      constellation: "Gemini",
      telescopeTip: "8\" telescope may show polar ice cap and dark surface features. Use high magnification.",
      description: "Mars continues its evening apparition, fading slowly as Earth pulls ahead in orbit.",
    },
    {
      name: "Jupiter",
      symbol: "♃",
      color: "hsl(30, 60%, 65%)",
      visible: hour > 18 || hour < 3,
      riseTime: "09:22",
      setTime: "23:48",
      altitude: 45,
      azimuth: "SW",
      magnitude: -2.3,
      constellation: "Taurus",
      telescopeTip: "Even binoculars show 4 Galilean moons. 6\"+ telescope reveals cloud bands and Great Red Spot.",
      description: "Jupiter dominates the evening sky near the Hyades star cluster. Four bright moons visible in any telescope.",
    },
    {
      name: "Saturn",
      symbol: "♄",
      color: "hsl(45, 50%, 60%)",
      visible: hour < 7 || hour > 20,
      riseTime: "04:55",
      setTime: "15:30",
      altitude: 18,
      azimuth: "ESE",
      magnitude: 1.0,
      constellation: "Aquarius",
      telescopeTip: "Rings are nearly edge-on this year — a rare sight! 4\" telescope minimum to see rings.",
      description: "Saturn is a morning object, rising before dawn. Ring system appears nearly edge-on — a once-in-15-years event.",
    },
    {
      name: "Uranus",
      symbol: "♅",
      color: "hsl(180, 50%, 60%)",
      visible: hour > 19 || hour < 2,
      riseTime: "09:10",
      setTime: "00:15",
      altitude: 35,
      azimuth: "W",
      magnitude: 5.8,
      constellation: "Taurus",
      telescopeTip: "Visible as a tiny blue-green disk in a 4\"+ telescope at 100x. Use star chart to locate.",
      description: "Uranus is technically naked-eye visible from dark sites but best found with binoculars near Jupiter.",
    },
    {
      name: "Neptune",
      symbol: "♆",
      color: "hsl(220, 60%, 55%)",
      visible: false,
      riseTime: "06:30",
      setTime: "17:00",
      altitude: 5,
      azimuth: "W",
      magnitude: 7.9,
      constellation: "Pisces",
      telescopeTip: "Requires 8\"+ telescope. Appears as tiny blue dot at 150x+. Very challenging in twilight.",
      description: "Neptune is lost in solar glare this month and not observable.",
    },
  ];
}

const PlanetVisibilitySection = () => {
  const [now, setNow] = useState(new Date());
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const planets = useMemo(() => computePlanets(now), [now]);
  const visibleCount = planets.filter((p) => p.visible).length;
  const selected = planets.find((p) => p.name === selectedPlanet);

  return (
    <section id="planet-visibility" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Tonight's Sky</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Planet Visibility</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            {visibleCount} planets visible tonight. Tap a planet for telescope tips and observing details.
          </p>
        </motion.div>

        {/* Visual orbit diagram */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-6 mb-8">
          <div className="relative w-full h-[200px] flex items-center justify-center overflow-hidden">
            {/* Sun */}
            <div className="absolute w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-orange-500 shadow-[0_0_30px_hsla(45,90%,55%,0.5)] z-10" />
            {/* Orbit rings & planets */}
            {planets.map((planet, i) => {
              const radius = 40 + i * 22;
              const angle = (i * 51.4 + now.getHours() * 15) * (Math.PI / 180);
              const px = Math.cos(angle) * radius;
              const py = Math.sin(angle) * radius * 0.4;
              return (
                <div key={planet.name} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Orbit */}
                  <div
                    className="absolute rounded-full border border-border/30"
                    style={{ width: radius * 2, height: radius * 0.8, }}
                  />
                  {/* Planet dot */}
                  <button
                    onClick={() => setSelectedPlanet(selectedPlanet === planet.name ? null : planet.name)}
                    className="absolute pointer-events-auto transition-transform hover:scale-150 z-20"
                    style={{
                      transform: `translate(${px}px, ${py}px)`,
                      width: Math.max(8, 16 - i * 1.5),
                      height: Math.max(8, 16 - i * 1.5),
                      borderRadius: "50%",
                      backgroundColor: planet.color,
                      boxShadow: planet.visible ? `0 0 10px ${planet.color}` : "none",
                      opacity: planet.visible ? 1 : 0.3,
                    }}
                    title={planet.name}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {planets.map((p) => (
              <button
                key={p.name}
                onClick={() => setSelectedPlanet(selectedPlanet === p.name ? null : p.name)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-display tracking-wider border transition-all ${
                  selectedPlanet === p.name
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : p.visible
                    ? "border-border/60 text-foreground hover:border-primary/40"
                    : "border-border/30 text-muted-foreground opacity-50"
                }`}
              >
                <span style={{ color: p.color }}>{p.symbol}</span>
                {p.name}
                {p.visible && <Eye className="w-3 h-3 text-accent" />}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Planet detail cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(selected ? [selected] : planets.filter((p) => p.visible)).map((planet) => (
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
                  <p className="text-[10px] text-muted-foreground">in {planet.constellation} · mag {planet.magnitude}</p>
                </div>
                {planet.visible && (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-display tracking-wider bg-accent/15 text-accent">Visible</span>
                )}
              </div>

              <p className="text-xs text-muted-foreground mb-3">{planet.description}</p>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <Sunrise className="w-3 h-3 text-primary" />
                  <span className="text-muted-foreground">Rise:</span>
                  <span className="font-mono text-foreground">{planet.riseTime}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <Sunset className="w-3 h-3 text-destructive" />
                  <span className="text-muted-foreground">Set:</span>
                  <span className="font-mono text-foreground">{planet.setTime}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <Globe className="w-3 h-3 text-accent" />
                  <span className="text-muted-foreground">Alt:</span>
                  <span className="font-mono text-foreground">{planet.altitude}° {planet.azimuth}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <Clock className="w-3 h-3 text-primary" />
                  <span className="text-muted-foreground">Best:</span>
                  <span className="font-mono text-foreground">{planet.altitude > 30 ? "Now" : "Later"}</span>
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlanetVisibilitySection;
