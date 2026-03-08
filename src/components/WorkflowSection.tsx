import { motion } from "framer-motion";
import { Eye, Brain, Hand, Gauge, Link, Flame, RotateCcw } from "lucide-react";

const steps = [
  { icon: Eye, title: "Debris Detection", desc: "Camera & AI detect objects in LEO orbit" },
  { icon: Brain, title: "Decision Algorithm", desc: "AI selects target debris; swarm avoids collision" },
  { icon: Hand, title: "Capture", desc: "Robotic arm collects debris into internal chamber" },
  { icon: Gauge, title: "Threshold Check", desc: "Storage capacity monitored; triggers docking when full" },
  { icon: Link, title: "Dock & Transfer", desc: "Satellite docks with garbage satellite; transfers debris" },
  { icon: Flame, title: "Deorbit", desc: "Garbage satellite performs controlled atmospheric reentry" },
  { icon: RotateCcw, title: "Resume Operation", desc: "Debrix continues autonomous debris capture in orbit" },
];

const WorkflowSection = () => {
  return (
    <section id="workflow" className="relative z-10">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">How It Works</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Dock & Dump Workflow</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            A 7-step autonomous cycle from detection to deorbit.
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/60 via-primary/30 to-transparent hidden md:block" />

          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`flex items-start gap-6 md:gap-12 ${
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                <div className={`flex-1 ${i % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                  <div className={`glass-card p-5 inline-block ${i % 2 === 0 ? "md:ml-auto" : ""}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <step.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-display text-xs text-primary tracking-wider">STEP {i + 1}</span>
                    </div>
                    <h3 className="font-display font-semibold text-sm mb-1">{step.title}</h3>
                    <p className="text-muted-foreground text-xs">{step.desc}</p>
                  </div>
                </div>

                <div className="hidden md:flex w-4 h-4 rounded-full bg-primary shrink-0 mt-6 shadow-[0_0_15px_hsl(199_100%_55%/0.5)]" />

                <div className="flex-1" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
