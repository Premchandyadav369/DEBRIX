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
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-4 uppercase">
            Orbital Debris Removal System
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight">
            <span className="gradient-text">DEBRIX</span>
            <br />
            <span className="text-foreground text-2xl md:text-3xl lg:text-4xl font-light">
              The Orbital Debris Collector
            </span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8 text-sm md:text-base">
            A swarm-based satellite system that captures, collects, and safely deorbits space debris — keeping our orbital highways clean.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="#workflow" className="gradient-button">
              View Simulation
            </a>
            <a href="#gallery" className="glass-card px-8 py-3 font-display font-semibold tracking-wider uppercase text-sm text-foreground hover:border-primary/50 transition-all">
              Explore 3D Model
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
