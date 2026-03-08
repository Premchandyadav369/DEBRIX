import { motion } from "framer-motion";
import { Shield, Cpu, Satellite, Rocket } from "lucide-react";

const features = [
  { icon: Satellite, title: "Swarm Intelligence", desc: "Multiple Debrix satellites work as a coordinated swarm to cover vast orbital zones." },
  { icon: Cpu, title: "AI-Powered Detection", desc: "Onboard AI identifies, classifies, and prioritizes debris for capture." },
  { icon: Shield, title: "Dock & Dump", desc: "Captured debris is transferred to a garbage satellite for controlled deorbit." },
  { icon: Rocket, title: "Safe Deorbiting", desc: "The dump satellite performs atmospheric reentry, burning up debris safely." },
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
          className="text-center mb-16"
        >
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Our Mission</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Cleaning Earth's Orbit</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            With over 36,000 tracked debris objects in LEO, Debrix provides an autonomous, scalable solution for orbital debris removal using swarm robotics and intelligent docking.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card p-6 group hover:border-primary/40 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-sm mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MissionSection;
