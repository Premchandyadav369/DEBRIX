import { motion } from "framer-motion";
import { Crosshair, Satellite, Shield, Zap, Target, Radio } from "lucide-react";

const SWARM_STATS = [
  { icon: Satellite, label: "Debrix Hunters", value: "8", desc: "Active formation satellites", color: "text-primary" },
  { icon: Target, label: "Debris Locked", value: "218+", desc: "Objects tracked for capture", color: "text-destructive" },
  { icon: Shield, label: "Formation", value: "Walker-δ", desc: "Optimized orbital pattern", color: "text-accent" },
  { icon: Radio, label: "Coverage", value: "97.2%", desc: "LEO debris field covered", color: "text-primary" },
];

const CAPABILITIES = [
  { icon: Crosshair, title: "Autonomous Targeting", desc: "AI-driven debris identification and priority ranking using onboard sensors and ground-based catalog data." },
  { icon: Zap, title: "Coordinated Capture", desc: "Swarm members communicate in real-time to divide debris field into sectors, avoiding redundancy." },
  { icon: Shield, title: "Collision Avoidance", desc: "Each hunter runs predictive orbit models to dodge active satellites and other debris during operations." },
  { icon: Satellite, title: "Adaptive Formation", desc: "The swarm dynamically reshapes its Walker-delta constellation to maximize coverage of high-density zones." },
];

const SwarmSection = () => {
  return (
    <section id="swarm" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Formation</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Swarm vs Debris Field</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            8 Debrix hunters navigate through a dense debris field — dead satellites, broken panels, and micro-fragments — scanning and targeting for capture.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {SWARM_STATS.map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card p-5 text-center"
            >
              <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
              <p className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{stat.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Capabilities */}
        <div className="grid sm:grid-cols-2 gap-4">
          {CAPABILITIES.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-card p-5 flex gap-4"
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <cap.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-display font-semibold text-foreground mb-1">{cap.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{cap.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SwarmSection;
