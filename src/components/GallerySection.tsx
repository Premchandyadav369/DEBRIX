import { motion } from "framer-motion";
import SatelliteScene from "./SatelliteScene";

const GallerySection = () => {
  return (
    <section id="gallery" className="relative z-10">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Spacecraft · DEBRI-X V3</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Explore the Spacecraft</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            An autonomous SSA + debris-mitigation spacecraft — not a generic satellite. Every component answers a mission question:
            how to <span className="text-primary">detect</span>, <span className="text-primary">classify</span>, <span className="text-primary">approach</span>, and <span className="text-primary">capture</span> orbital debris.
            Drag to orbit · scroll to zoom · hover parts for callouts.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-card p-2 overflow-hidden"
        >
          <SatelliteScene />
          <div className="flex flex-wrap gap-2 justify-center p-4">
            {[
              "Cuboid Main Bus",
              "Deployable Solar Wings",
              "Sensor Deck (SSA · LiDAR · IR · HRT)",
              "6-DOF Inspection Arm",
              "4-DOF Canadarm Manipulator",
              "Body-Mounted Debris Bin",
              "Adaptive 3-Finger Gripper",
              "Debris Storage Bay",
              "High & Medium Gain Antennas",
              "8× RCS Thruster Clusters",
              "Radiator Panels",
              "Star Trackers",
            ].map((label) => (
              <span key={label} className="px-2.5 py-1 text-[10px] font-mono tracking-wider bg-primary/10 text-primary rounded-full border border-primary/20">
                {label}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default GallerySection;
