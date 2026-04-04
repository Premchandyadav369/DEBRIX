import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Radio, Users, ChevronRight, Gauge, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ── Types ─────────────────────────────────────────────── */
interface Telemetry {
  phase: string;
  phaseDescription: string;
  phaseProgress: number;
  distanceFromEarthKm: number;
  distanceFromMoonKm: number;
  velocityKmh: number;
  velocityMach: number;
}

interface MissionData {
  mission: {
    name: string;
    status: string;
    launchTime: string;
    tliTime: string;
    missionElapsedSeconds: number;
    missionElapsedHours: number;
    totalMissionHours: number;
    overallProgress: number;
  };
  telemetry: Telemetry;
  crew: { name: string; role: string; agency: string; nation: string }[];
  updates: { title: string; link: string; date: string; excerpt: string }[];
  links: { arow: string; nasaLive: string; blog: string };
}

/* ── Mission phases for the timeline ─────────────────── */
const PHASES = [
  { id: "earth-orbit", label: "Earth Orbit", day: "Day 1", icon: "🌍" },
  { id: "outbound-transit", label: "Trans-Lunar Coast", day: "Day 2–4", icon: "🚀" },
  { id: "lunar-flyby", label: "Lunar Flyby", day: "Day 4–5", icon: "🌙" },
  { id: "return-transit", label: "Return Coast", day: "Day 5–9", icon: "↩️" },
  { id: "reentry", label: "Re-Entry & Splashdown", day: "Day 10", icon: "🪂" },
];

/* ── Helpers ──────────────────────────────────────────── */
function formatDistance(km: number): string {
  if (km >= 1000000) return `${(km / 1000000).toFixed(2)}M km`;
  if (km >= 1000) return `${(km / 1000).toFixed(1)}K km`;
  return `${Math.round(km)} km`;
}

function formatMET(totalSeconds: number): string {
  if (totalSeconds < 0) return "T-00:00:00:00";
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `T+${String(d).padStart(2, "0")}:${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getPhaseColor(phase: string): string {
  const map: Record<string, string> = {
    "pre-launch": "text-muted-foreground",
    "earth-orbit": "text-primary",
    "outbound-transit": "text-accent",
    "lunar-flyby": "text-primary",
    "return-transit": "text-accent",
    "reentry": "text-destructive",
    "complete": "text-accent",
  };
  return map[phase] || "text-primary";
}

/* ── Live MET counter (client-side, updates every second) ── */
function useLiveMET(launchTime: string | undefined) {
  const [met, setMet] = useState(0);
  useEffect(() => {
    if (!launchTime) return;
    const launch = new Date(launchTime).getTime();
    const tick = () => setMet(Math.floor((Date.now() - launch) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [launchTime]);
  return met;
}

/* ── Main Component ──────────────────────────────────── */
const ArtemisTrackerSection = () => {
  const [data, setData] = useState<MissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCrew, setExpandedCrew] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: res, error: err } = await supabase.functions.invoke("artemis-proxy");
      if (err) throw err;
      setData(res as MissionData);
      setError(null);
    } catch (e: any) {
      console.error("Artemis fetch error:", e);
      setError(e.message || "Failed to fetch mission data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh telemetry every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const met = useLiveMET(data?.mission.launchTime);

  if (loading) {
    return (
      <section id="artemis-tracker" className="relative z-10">
        <div className="section-container">
          <div className="glass-card p-8 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-48 mx-auto" />
              <div className="h-8 bg-muted rounded w-72 mx-auto" />
              <div className="h-3 bg-muted rounded w-96 mx-auto" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section id="artemis-tracker" className="relative z-10">
        <div className="section-container">
          <div className="glass-card p-8 text-center">
            <p className="text-destructive font-mono text-sm">Mission data unavailable</p>
            <p className="text-muted-foreground text-xs mt-2">{error}</p>
            <button onClick={fetchData} className="mt-4 px-4 py-2 text-xs font-mono border border-primary/40 text-primary rounded hover:bg-primary/10 transition-colors">
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  const { mission, telemetry, crew, links } = data;
  const activePhaseIndex = PHASES.findIndex((p) => p.id === telemetry.phase);

  return (
    <section id="artemis-tracker" className="relative z-10">
      <div className="section-container">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Radio className="w-3 h-3 text-accent animate-pulse" />
              <span className="font-mono text-[10px] tracking-widest text-accent uppercase">Live Mission</span>
            </div>
          </div>
          <h2 className="text-2xl md:text-4xl font-display font-bold text-foreground tracking-tight">
            Artemis II
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">
            First crewed lunar mission since Apollo 17. Four astronauts aboard Orion on a ~10-day free-return flyby of the Moon.
          </p>
        </div>

        {/* ── Mission Elapsed Time + Status Bar ── */}
        <div className="glass-card p-4 md:p-6 mb-6 border-primary/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">MISSION ELAPSED TIME</p>
              <p className="text-2xl md:text-4xl font-mono font-bold text-foreground tabular-nums tracking-tight">
                {formatMET(met)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono tracking-wider ${
                mission.status === "ACTIVE"
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "bg-muted text-muted-foreground border border-border"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${mission.status === "ACTIVE" ? "bg-accent animate-pulse" : "bg-muted-foreground"}`} />
                {mission.status}
              </span>
              <a
                href={links.arow}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 rounded text-[10px] font-mono text-primary border border-primary/30 hover:bg-primary/10 transition-colors"
              >
                NASA AROW <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-[9px] font-mono text-muted-foreground mb-1">
              <span>Launch</span>
              <span>{mission.overallProgress}% complete</span>
              <span>Splashdown</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                initial={{ width: 0 }}
                animate={{ width: `${mission.overallProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* ── Telemetry Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "From Earth", value: formatDistance(telemetry.distanceFromEarthKm), icon: "🌍" },
            { label: "From Moon", value: formatDistance(telemetry.distanceFromMoonKm), icon: "🌙" },
            { label: "Velocity", value: `${(telemetry.velocityKmh / 1000).toFixed(1)}K km/h`, icon: "⚡" },
            { label: "Phase", value: telemetry.phase.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()), icon: "📡" },
          ].map((card) => (
            <div key={card.label} className="glass-card p-3 md:p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{card.icon}</span>
                <span className="text-[9px] font-mono text-muted-foreground tracking-wider uppercase">{card.label}</span>
              </div>
              <p className="text-sm md:text-base font-mono font-semibold text-foreground tabular-nums">{card.value}</p>
            </div>
          ))}
        </div>

        {/* ── Trajectory Visualization + Timeline ── */}
        <div className="grid lg:grid-cols-5 gap-6 mb-6">
          {/* Trajectory map — 3 cols */}
          <div className="lg:col-span-3 glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-display font-semibold text-foreground">Trajectory</span>
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">Free-return path</span>
            </div>
            <div className="relative h-[200px] md:h-[260px] w-full overflow-hidden">
              {/* Earth */}
              <div className="absolute left-[8%] top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary/70 to-accent/50 shadow-[0_0_30px_hsl(var(--primary)/0.3)]" />
                <span className="text-[9px] font-mono text-muted-foreground mt-1">Earth</span>
              </div>
              {/* Moon */}
              <div className="absolute right-[8%] top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-muted-foreground/80 to-muted/60 shadow-[0_0_20px_hsl(var(--muted-foreground)/0.2)]" />
                <span className="text-[9px] font-mono text-muted-foreground mt-1">Moon</span>
              </div>
              {/* SVG trajectory */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 220" fill="none" preserveAspectRatio="xMidYMid meet">
                {/* Outbound arc */}
                <path
                  d="M 100 110 C 220 20, 400 20, 510 110"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                  opacity="0.5"
                />
                {/* Return arc */}
                <path
                  d="M 510 110 C 400 200, 220 200, 100 110"
                  stroke="hsl(var(--accent))"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                  opacity="0.5"
                />
                {/* Orion position - computed from phase */}
                <OrionDot phase={telemetry.phase} phaseProgress={telemetry.phaseProgress} />
              </svg>
              {/* Labels */}
              <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[8px] font-mono text-primary/60 tracking-wider">OUTBOUND</span>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-mono text-accent/60 tracking-wider">RETURN</span>
            </div>
          </div>

          {/* Timeline — 2 cols */}
          <div className="lg:col-span-2 glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-display font-semibold text-foreground">Mission Phases</span>
            </div>
            <div className="space-y-1">
              {PHASES.map((phase, i) => {
                const isActive = phase.id === telemetry.phase;
                const isPast = i < activePhaseIndex;
                return (
                  <div
                    key={phase.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                      isActive
                        ? "bg-primary/10 border border-primary/25"
                        : isPast
                        ? "opacity-50"
                        : "opacity-70"
                    }`}
                  >
                    <span className="text-base w-6 text-center">{phase.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-display font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>
                        {phase.label}
                      </p>
                      <p className="text-[9px] font-mono text-muted-foreground">{phase.day}</p>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                    {isPast && (
                      <span className="text-[9px] font-mono text-accent">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className={`text-[10px] mt-3 px-2 ${getPhaseColor(telemetry.phase)} font-mono`}>
              {telemetry.phaseDescription}
            </p>
          </div>
        </div>

        {/* ── Crew ── */}
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-display font-semibold text-foreground">Crew</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {crew.map((c, i) => (
              <button
                key={c.name}
                onClick={() => setExpandedCrew(expandedCrew === i ? null : i)}
                className={`text-left p-3 rounded-lg transition-all border ${
                  expandedCrew === i
                    ? "bg-primary/10 border-primary/25"
                    : "bg-secondary/20 border-transparent hover:border-border/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{c.nation === "CA" ? "🇨🇦" : "🇺🇸"}</span>
                  <span className="text-[9px] font-mono text-primary/80 tracking-wider">{c.agency}</span>
                </div>
                <p className="text-xs font-display font-semibold text-foreground truncate">{c.name}</p>
                <p className="text-[9px] font-mono text-muted-foreground">{c.role}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Footer links ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[9px] font-mono text-muted-foreground">
            Telemetry computed from NASA mission timeline · Launch: April 1, 2026 22:35 UTC
          </p>
          <div className="flex gap-2">
            <a
              href={links.nasaLive}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[9px] font-mono text-primary hover:text-primary/80 transition-colors"
            >
              NASA Live <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href={links.blog}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[9px] font-mono text-primary hover:text-primary/80 transition-colors"
            >
              Mission Blog <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ── Orion dot on trajectory SVG ─────────────────────── */
function OrionDot({ phase, phaseProgress }: { phase: string; phaseProgress: number }) {
  // Map phase + progress to position on the two arcs
  let cx = 100, cy = 110;
  const p = phaseProgress / 100;

  if (phase === "earth-orbit" || phase === "pre-launch") {
    cx = 100; cy = 110;
  } else if (phase === "outbound-transit") {
    // Bezier: M 100 110 C 220 20, 400 20, 510 110
    const t = p;
    cx = (1-t)**3*100 + 3*(1-t)**2*t*220 + 3*(1-t)*t**2*400 + t**3*510;
    cy = (1-t)**3*110 + 3*(1-t)**2*t*20 + 3*(1-t)*t**2*20 + t**3*110;
  } else if (phase === "lunar-flyby") {
    cx = 510; cy = 110;
  } else if (phase === "return-transit") {
    // Bezier: M 510 110 C 400 200, 220 200, 100 110
    const t = p;
    cx = (1-t)**3*510 + 3*(1-t)**2*t*400 + 3*(1-t)*t**2*220 + t**3*100;
    cy = (1-t)**3*110 + 3*(1-t)**2*t*200 + 3*(1-t)*t**2*200 + t**3*110;
  } else if (phase === "reentry" || phase === "complete") {
    cx = 100; cy = 110;
  }

  return (
    <g>
      <circle cx={cx} cy={cy} r="6" fill="hsl(var(--primary))" opacity="0.2">
        <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r="3" fill="hsl(var(--primary))" />
      {/* Label */}
      <text x={cx} y={cy - 10} textAnchor="middle" fill="hsl(var(--primary))" fontSize="8" fontFamily="monospace">
        ORION
      </text>
    </g>
  );
}

export default ArtemisTrackerSection;
