import { motion } from "framer-motion";
import { Shield, Cpu, Satellite, Rocket } from "lucide-react";

const features = [
  { icon: Satellite, title: "Swarm Intelligence", desc: "Coordinated satellite swarm covering vast orbital zones autonomously." },
  { icon: Cpu, title: "AI-Powered Detection", desc: "Onboard classification and prioritization of debris for capture." },
  { icon: Shield, title: "Dock & Dump", desc: "Debris transferred to a garbage satellite for controlled deorbit." },
  { icon: Rocket, title: "Safe Deorbiting", desc: "Atmospheric reentry burns debris safely — zero ground risk." },
];

const MissionSection = () => {
  return (
    <section id="mission" className="relative z-10">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-3 tracking-tight">How it works</h2>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
            36,000+ tracked debris objects threaten operational spacecraft daily. Debrix provides an autonomous, scalable solution using swarm robotics and intelligent docking.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass-card p-5 group hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-sm mb-1.5">{f.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MissionSection;
