import { motion } from "framer-motion";
import SatelliteScene from "./SatelliteScene";

const HeroSection = () => {
  return (
    <section id="home" className="relative min-h-screen flex flex-col items-center justify-center pt-16">
      <div className="section-container text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-[10px] tracking-wider text-primary/80">
              Tracking 36,000+ orbital objects
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-5 leading-[1.1]">
            <span className="gradient-text">DEBRIX</span>
            <span className="sr-only"> — The Orbital Debris Collector</span>
          </h1>
          <p aria-hidden="true" className="text-foreground text-lg md:text-xl lg:text-2xl font-display font-light mb-4 tracking-tight">
            The Orbital Debris Collector
          </p>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8 text-sm leading-relaxed">
            Autonomous swarm satellites that capture, collect, and safely deorbit space debris — protecting humanity's path to the stars.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="#workflow" className="gradient-button text-xs">
              View Simulation
            </a>
            <a href="#artemis-tracker" className="glass-card px-6 py-2.5 font-display font-medium tracking-wider text-xs text-foreground hover:border-primary/50 transition-all inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Artemis II Live
            </a>
          </div>
        </motion.div>
      </div>

      <motion.div
        className="w-full max-w-4xl mx-auto -mt-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
      >
        <SatelliteScene />
      </motion.div>
    </section>
  );
};

export default HeroSection;
