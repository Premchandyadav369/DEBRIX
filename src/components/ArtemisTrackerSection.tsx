import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Rocket, Users, Calendar, Clock, MapPin, ChevronRight, Zap, Globe, Timer, Target } from "lucide-react";

/* ── Artemis II Mission Data ─────────────────────────────── */
const LAUNCH_DATE = new Date("2026-09-01T12:00:00Z"); // NET September 2026

const CREW = [
  { name: "Reid Wiseman", role: "Commander", agency: "NASA", flag: "🇺🇸", bio: "Navy test pilot, ISS Expedition 41. 165 days in space." },
  { name: "Victor Glover", role: "Pilot", agency: "NASA", flag: "🇺🇸", bio: "Navy fighter pilot, SpaceX Crew-1 mission. 167 days in space." },
  { name: "Christina Koch", role: "Mission Specialist 1", agency: "NASA", flag: "🇺🇸", bio: "Holds record for longest single spaceflight by a woman — 328 days." },
  { name: "Jeremy Hansen", role: "Mission Specialist 2", agency: "CSA", flag: "🇨🇦", bio: "CF-18 fighter pilot. First Canadian to fly beyond low Earth orbit." },
];

const MILESTONES = [
  { label: "Launch", day: 0, icon: "🚀", desc: "SLS Block 1 lifts off from LC-39B, Kennedy Space Center" },
  { label: "TLI Burn", day: 0.08, icon: "🔥", desc: "Trans-Lunar Injection — ICPS upper stage fires for ~18 min" },
  { label: "Outbound Coast", day: 1, icon: "🌑", desc: "Orion cruises toward the Moon, ~4 day transit" },
  { label: "Lunar Flyby", day: 4, icon: "🌙", desc: "Closest approach: ~8,900 km above the lunar far side" },
  { label: "Return Coast", day: 5, icon: "🌍", desc: "Free-return trajectory brings crew back to Earth" },
  { label: "Re-Entry & Splashdown", day: 10, icon: "🪂", desc: "Orion capsule splashes down in the Pacific Ocean" },
];

const VEHICLE_STATS = [
  { label: "Vehicle", value: "SLS Block 1 + Orion" },
  { label: "Total Thrust", value: "8.8M lbs" },
  { label: "Duration", value: "~10 days" },
  { label: "Distance", value: "~1.3M km" },
  { label: "Lunar Closest", value: "~8,900 km" },
  { label: "Max Speed", value: "~40,000 km/h" },
];

function useCountdown(target: Date) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, isPast: diff === 0 };
}

const ArtemisTrackerSection = () => {
  const countdown = useCountdown(LAUNCH_DATE);
  const [activeMilestone, setActiveMilestone] = useState(0);

  const countdownUnits = useMemo(() => [
    { label: "Days", value: countdown.days },
    { label: "Hours", value: countdown.hours },
    { label: "Min", value: countdown.minutes },
    { label: "Sec", value: countdown.seconds },
  ], [countdown]);

  return (
    <section id="artemis-tracker" className="relative z-10">
      <div className="section-container">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Return to the Moon</p>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-3 bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
            Artemis II
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm leading-relaxed">
            The first crewed mission to fly around the Moon in over 50 years. Four astronauts will test Orion's life support and navigation systems on a ~10-day lunar flyby.
          </p>
        </motion.div>

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-card p-6 md:p-8 mb-8 text-center border-primary/20"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Timer className="w-4 h-4 text-primary" />
            <span className="font-display text-xs tracking-[0.25em] text-primary uppercase">
              {countdown.isPast ? "Mission In Progress" : "Countdown to Launch"}
            </span>
          </div>

          <div className="flex justify-center gap-3 md:gap-6">
            {countdownUnits.map((u) => (
              <div key={u.label} className="flex flex-col items-center">
                <motion.span
                  key={u.value}
                  initial={{ y: -5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-3xl md:text-5xl font-mono font-bold text-foreground tabular-nums"
                >
                  {String(u.value).padStart(2, "0")}
                </motion.span>
                <span className="text-[10px] md:text-xs text-muted-foreground font-display tracking-wider mt-1 uppercase">{u.label}</span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground mt-4">
            NET {LAUNCH_DATE.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · LC-39B, Kennedy Space Center
          </p>
        </motion.div>

        {/* Crew + Stats Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Crew */}
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="font-display text-sm tracking-wider uppercase text-foreground">Crew</h3>
            </div>
            <div className="space-y-3">
              {CREW.map((c, i) => (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30 hover:border-primary/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
                    {c.flag}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-semibold text-sm text-foreground">{c.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-display tracking-wider bg-primary/10 text-primary">{c.agency}</span>
                    </div>
                    <p className="text-[10px] text-accent font-display tracking-wider uppercase">{c.role}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{c.bio}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Vehicle Stats + Mission Timeline */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Rocket className="w-4 h-4 text-primary" />
                <h3 className="font-display text-sm tracking-wider uppercase text-foreground">Vehicle & Mission</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {VEHICLE_STATS.map((s) => (
                  <div key={s.label} className="p-2.5 rounded-lg bg-secondary/30 border border-border/30">
                    <p className="text-[10px] text-muted-foreground font-display tracking-wider uppercase">{s.label}</p>
                    <p className="text-sm font-mono font-semibold text-foreground mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Trajectory milestones */}
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="font-display text-sm tracking-wider uppercase text-foreground">Mission Phases</h3>
              </div>
              <div className="space-y-2">
                {MILESTONES.map((m, i) => (
                  <button
                    key={m.label}
                    onClick={() => setActiveMilestone(i)}
                    className={`w-full text-left flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                      activeMilestone === i
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-secondary/20 border border-transparent hover:border-border/40"
                    }`}
                  >
                    <span className="text-lg">{m.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xs font-semibold text-foreground">{m.label}</span>
                        <span className="text-[9px] font-mono text-muted-foreground">T+{m.day < 1 ? `${(m.day * 24).toFixed(0)}h` : `${m.day}d`}</span>
                      </div>
                      {activeMilestone === i && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="text-[10px] text-muted-foreground mt-1 leading-relaxed"
                        >
                          {m.desc}
                        </motion.p>
                      )}
                    </div>
                    <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${activeMilestone === i ? "rotate-90 text-primary" : ""}`} />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Trajectory visual */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-5 mb-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="font-display text-sm tracking-wider uppercase text-foreground">Free-Return Trajectory</h3>
          </div>
          <div className="relative h-[180px] md:h-[220px] w-full overflow-hidden">
            {/* Earth */}
            <div className="absolute left-[12%] top-1/2 -translate-y-1/2">
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-blue-500 to-green-600 shadow-[0_0_25px_hsla(210,70%,50%,0.4)]" />
              <p className="text-[9px] text-muted-foreground text-center mt-1 font-display">Earth</p>
            </div>
            {/* Moon */}
            <div className="absolute right-[12%] top-1/2 -translate-y-1/2">
              <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 shadow-[0_0_15px_hsla(0,0%,70%,0.3)]" />
              <p className="text-[9px] text-muted-foreground text-center mt-1 font-display">Moon</p>
            </div>
            {/* Trajectory arc */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 200" fill="none" preserveAspectRatio="xMidYMid meet">
              {/* Outbound */}
              <path
                d="M 120 100 C 250 20, 400 20, 490 100"
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                opacity="0.6"
              />
              {/* Return */}
              <path
                d="M 490 100 C 400 180, 250 180, 120 100"
                stroke="hsl(var(--accent))"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                opacity="0.6"
              />
              {/* Orion capsule moving along path */}
              <motion.circle
                r="4"
                fill="hsl(var(--primary))"
                filter="url(#glow)"
                animate={{
                  cx: [120, 250, 400, 490, 400, 250, 120],
                  cy: [100, 30, 30, 100, 170, 170, 100],
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              />
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
            </svg>
            {/* Labels */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] text-primary font-display tracking-wider">OUTBOUND →</div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-accent font-display tracking-wider">← RETURN</div>
          </div>
        </motion.div>

        <p className="text-center text-[10px] text-muted-foreground">
          Mission data from NASA Artemis program. Launch date is NET (No Earlier Than) and subject to change.
        </p>
      </div>
    </section>
  );
};

export default ArtemisTrackerSection;
