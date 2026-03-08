import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Flame, MapPin, Clock, AlertTriangle, Globe, CalendarDays, ArrowDown } from "lucide-react";

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
    description: "Long March 5B core stage. Uncontrolled reentry expected. Large mass means significant debris may survive to ground.",
    predictedRegions: ["Atlantic Ocean", "Central Africa", "Indian Ocean", "Southeast Asia"],
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
    description: "Defunct Russian military satellite. Natural decay due to increased solar activity raising atmospheric density.",
    predictedRegions: ["Northern Hemisphere", "Southern Hemisphere"],
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
    description: "Japanese H-IIA second stage from recent launch. Lower inclination limits potential impact zones.",
    predictedRegions: ["Pacific Ocean", "South America", "Atlantic Ocean"],
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
    description: "Deorbiting Starlink satellite. Controlled descent ensures complete burnup in atmosphere. No ground risk.",
    predictedRegions: ["Complete burnup expected"],
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
    description: "Soviet-era Zenit-2 upper stage. One of the largest debris objects in LEO. Solar activity accelerating decay.",
    predictedRegions: ["Global coverage due to high inclination"],
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
    description: "ESA Earth observation satellite, decommissioned 2011. Sun-synchronous orbit means predictable ground track.",
    predictedRegions: ["Polar regions", "Mid-latitudes"],
  },
];

const ReentryPredictionSection = () => {
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("All");

  const filtered = useMemo(() => {
    if (filterStatus === "All") return REENTRY_OBJECTS;
    return REENTRY_OBJECTS.filter((o) => o.status === filterStatus);
  }, [filterStatus]);

  const selected = REENTRY_OBJECTS.find((o) => o.noradId === selectedObject);
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

        {/* Probability visualization */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-6 mb-8">
          <p className="font-display text-xs tracking-wider text-muted-foreground mb-4">RE-ENTRY GROUND TRACK PROBABILITY</p>
          <div className="relative w-full h-[220px] bg-[hsl(220,25%,8%)] rounded-lg overflow-hidden border border-border/30">
            {/* Simplified world map grid */}
            <svg viewBox="0 0 360 180" className="w-full h-full" preserveAspectRatio="none">
              {/* Grid lines */}
              {Array.from({ length: 7 }, (_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 30} x2="360" y2={i * 30} stroke="hsl(220, 18%, 18%)" strokeWidth="0.5" />
              ))}
              {Array.from({ length: 13 }, (_, i) => (
                <line key={`v${i}`} x1={i * 30} y1="0" x2={i * 30} y2="180" stroke="hsl(220, 18%, 18%)" strokeWidth="0.5" />
              ))}
              {/* Equator */}
              <line x1="0" y1="90" x2="360" y2="90" stroke="hsl(190, 85%, 52%)" strokeWidth="0.5" opacity="0.3" />
              {/* Continents (simplified outlines) */}
              <path d="M80,35 L95,32 L100,40 L110,42 L115,50 L105,55 L95,52 L85,45 Z" fill="hsl(160, 70%, 30%)" opacity="0.3" />
              <path d="M160,30 L200,25 L220,35 L230,50 L225,65 L210,75 L195,70 L180,55 L165,40 Z" fill="hsl(160, 70%, 30%)" opacity="0.3" />
              <path d="M155,65 L175,60 L185,75 L180,90 L170,95 L160,80 Z" fill="hsl(160, 70%, 30%)" opacity="0.3" />
              <path d="M270,55 L310,50 L320,70 L315,90 L290,85 L275,70 Z" fill="hsl(160, 70%, 30%)" opacity="0.3" />
              <path d="M60,75 L90,68 L100,80 L95,95 L80,105 L70,120 L55,115 L50,100 L55,85 Z" fill="hsl(160, 70%, 30%)" opacity="0.3" />
              {/* Inclination bands for each object */}
              {REENTRY_OBJECTS.filter((o) => !o.controlled).map((obj, i) => {
                const incBand = obj.inclination;
                const y1 = 90 - incBand;
                const y2 = 90 + incBand;
                return (
                  <rect
                    key={obj.noradId}
                    x="0" y={Math.max(0, y1)}
                    width="360" height={Math.min(180, y2) - Math.max(0, y1)}
                    fill={obj.riskLevel === "high" ? "hsl(0, 72%, 55%)" : "hsl(160, 70%, 48%)"}
                    opacity={0.06 + i * 0.02}
                  />
                );
              })}
              {/* Object position markers */}
              {REENTRY_OBJECTS.map((obj, i) => {
                const x = (i * 55 + 30) % 360;
                const y = 90 - obj.inclination * 0.5 * Math.sin(i * 1.2);
                return (
                  <g key={obj.noradId}>
                    <circle
                      cx={x} cy={y} r={obj.riskLevel === "high" ? 5 : 3}
                      fill={obj.riskLevel === "high" ? "hsl(0, 72%, 55%)" : obj.riskLevel === "moderate" ? "hsl(160, 70%, 48%)" : "hsl(190, 85%, 52%)"}
                      opacity={0.8}
                      className={obj.status === "Imminent" ? "animate-pulse" : ""}
                    />
                    <text x={x} y={y - 8} textAnchor="middle" fill="hsl(210, 30%, 70%)" fontSize="5" fontFamily="Space Grotesk">
                      {obj.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-destructive" /> High risk zone</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-accent" /> Moderate risk</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-primary" /> Low risk / Controlled</span>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
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

              {/* Orbit info */}
              <div className="flex items-center gap-3 text-[10px] mb-2">
                <span className="text-muted-foreground">Perigee: <span className="font-mono text-foreground">{obj.perigee}km</span></span>
                <span className="text-muted-foreground">Apogee: <span className="font-mono text-foreground">{obj.apogee}km</span></span>
              </div>

              {/* Control status */}
              <div className={`flex items-center gap-1.5 text-[10px] p-2 rounded-lg ${
                obj.controlled ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
              }`}>
                {obj.controlled ? "✓ Controlled descent" : "⚠ Uncontrolled reentry"}
              </div>

              {/* Predicted regions */}
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
