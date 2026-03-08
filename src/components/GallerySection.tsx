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
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">3D Viewer</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Explore the Satellite</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Rotate, zoom, and inspect the Debrix satellite model. Observe the robotic arm, solar panels, docking port, and debris chamber.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-card p-2 overflow-hidden"
        >
          <SatelliteScene />
          <div className="flex flex-wrap gap-3 justify-center p-4">
            {["Robotic Arm", "Solar Panels", "Docking Port", "Debris Chamber", "Camera Module"].map((label) => (
              <span key={label} className="px-3 py-1 text-xs font-display tracking-wider bg-primary/10 text-primary rounded-full border border-primary/20">
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
