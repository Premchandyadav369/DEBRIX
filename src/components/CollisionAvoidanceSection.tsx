import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, AlertTriangle, Zap, Navigation } from "lucide-react";

interface TrajectoryEvent {
  id: number;
  time: string;
  object: string;
  missDistance: number;
  risk: "low" | "medium" | "high" | "critical";
  action: string;
  deltaV: number;
}

const riskColors = {
  low: "text-accent",
  medium: "text-[hsl(45,100%,60%)]",
  high: "text-[hsl(25,100%,55%)]",
  critical: "text-destructive",
};

const riskBgColors = {
  low: "bg-accent/10 border-accent/30",
  medium: "bg-[hsl(45,100%,60%)]/10 border-[hsl(45,100%,60%)]/30",
  high: "bg-[hsl(25,100%,55%)]/10 border-[hsl(25,100%,55%)]/30",
  critical: "bg-destructive/10 border-destructive/30",
};

const objectNames = [
  "COSMOS-1408 DEB", "FENGYUN 1C DEB", "IRIDIUM 33 DEB", "SL-8 R/B",
  "ARIANE 5 DEB", "DELTA 2 DEB", "BREEZE-M DEB", "CZ-6A DEB",
];

const actions = [
  "Lateral burn +X", "Altitude raise", "Phase shift delay", "Emergency dodge",
  "Predictive path shift", "Orbit lower maneuver",
];

const CollisionAvoidanceSection = () => {
  const [events, setEvents] = useState<TrajectoryEvent[]>([]);
  const [totalAvoided, setTotalAvoided] = useState(0);
  const [aiStatus, setAiStatus] = useState<"monitoring" | "computing" | "executing">("monitoring");

  const generateEvent = useCallback(() => {
    const risks: Array<"low" | "medium" | "high" | "critical"> = ["low", "low", "medium", "medium", "high", "critical"];
    const risk = risks[Math.floor(Math.random() * risks.length)];
    const missDistance =
      risk === "critical" ? +(Math.random() * 0.5 + 0.1).toFixed(2)
      : risk === "high" ? +(Math.random() * 2 + 0.5).toFixed(2)
      : risk === "medium" ? +(Math.random() * 5 + 2).toFixed(2)
      : +(Math.random() * 20 + 5).toFixed(2);

    const event: TrajectoryEvent = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      object: objectNames[Math.floor(Math.random() * objectNames.length)],
      missDistance,
      risk,
      action: actions[Math.floor(Math.random() * actions.length)],
      deltaV: +(Math.random() * 2 + 0.1).toFixed(3),
    };

    setEvents((prev) => [event, ...prev].slice(0, 12));
    setTotalAvoided((prev) => prev + 1);

    setAiStatus("computing");
    setTimeout(() => setAiStatus("executing"), 800);
    setTimeout(() => setAiStatus("monitoring"), 2000);
  }, []);

  useEffect(() => {
    // Generate initial events
    for (let i = 0; i < 5; i++) {
      setTimeout(() => generateEvent(), i * 200);
    }
    const interval = setInterval(generateEvent, 4000);
    return () => clearInterval(interval);
  }, [generateEvent]);

  const stats = [
    { icon: Shield, label: "AI Status", value: aiStatus.charAt(0).toUpperCase() + aiStatus.slice(1), color: aiStatus === "monitoring" ? "text-accent" : aiStatus === "computing" ? "text-[hsl(45,100%,60%)]" : "text-primary" },
    { icon: AlertTriangle, label: "Threats Detected", value: events.length.toString(), color: "text-destructive" },
    { icon: Zap, label: "Maneuvers Executed", value: totalAvoided.toString(), color: "text-primary" },
    { icon: Navigation, label: "Fuel Efficiency", value: "98.2%", color: "text-accent" },
  ];

  return (
    <section id="collision-avoidance" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">AI System</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Collision Avoidance</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Real-time AI-powered trajectory analysis and autonomous collision avoidance maneuvers.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
              <p className={`text-xl md:text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* AI Status Indicator */}
        <motion.div className="glass-card p-4 mb-6 flex items-center gap-4" animate={{ borderColor: aiStatus === "executing" ? "hsl(199 100% 55% / 0.5)" : "hsl(225 30% 16% / 0.5)" }}>
          <div className={`w-3 h-3 rounded-full ${aiStatus === "monitoring" ? "bg-accent" : aiStatus === "computing" ? "bg-[hsl(45,100%,60%)]" : "bg-primary"} animate-pulse`} />
          <div className="flex-1">
            <p className="text-xs font-display tracking-wider text-foreground">
              AI COLLISION AVOIDANCE ENGINE — <span className={riskColors[aiStatus === "monitoring" ? "low" : aiStatus === "computing" ? "medium" : "low"]}>{aiStatus.toUpperCase()}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {aiStatus === "monitoring" && "Scanning orbital environment for potential conjunctions..."}
              {aiStatus === "computing" && "Computing optimal avoidance trajectory..."}
              {aiStatus === "executing" && "Executing delta-V burn for collision avoidance..."}
            </p>
          </div>
        </motion.div>

        {/* Event Log */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <p className="font-display text-xs tracking-wider text-muted-foreground">LIVE CONJUNCTION EVENT LOG</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-3 font-display tracking-wider">Time</th>
                  <th className="text-left p-3 font-display tracking-wider">Object</th>
                  <th className="text-right p-3 font-display tracking-wider">Miss Dist (km)</th>
                  <th className="text-center p-3 font-display tracking-wider">Risk</th>
                  <th className="text-left p-3 font-display tracking-wider">AI Action</th>
                  <th className="text-right p-3 font-display tracking-wider">ΔV (m/s)</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <motion.tr
                    key={e.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="p-3 font-mono text-muted-foreground">{e.time}</td>
                    <td className="p-3 font-mono text-foreground">{e.object}</td>
                    <td className={`p-3 text-right font-mono ${riskColors[e.risk]}`}>{e.missDistance}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-display tracking-wider border ${riskBgColors[e.risk]} ${riskColors[e.risk]}`}>
                        {e.risk.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-primary">{e.action}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{e.deltaV}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CollisionAvoidanceSection;
