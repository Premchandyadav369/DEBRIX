import { useState } from "react";
import { motion } from "framer-motion";
import { Sun, Eye, RefreshCw } from "lucide-react";

const SDO_BASE = "https://sdo.gsfc.nasa.gov/assets/img/latest";

const wavelengths = [
  { id: "0171", label: "171 Å", color: "text-yellow-400", desc: "Coronal loops, 600K K" },
  { id: "0193", label: "193 Å", color: "text-orange-400", desc: "Corona & flares, 1.2M K" },
  { id: "0211", label: "211 Å", color: "text-purple-400", desc: "Active regions, 2M K" },
  { id: "0304", label: "304 Å", color: "text-red-400", desc: "Chromosphere, 50K K" },
  { id: "0094", label: "94 Å", color: "text-green-400", desc: "Flaring regions, 6M K" },
  { id: "0131", label: "131 Å", color: "text-cyan-400", desc: "Flare plasma, 10M K" },
  { id: "0335", label: "335 Å", color: "text-blue-400", desc: "Active regions, 2.5M K" },
  { id: "1600", label: "1600 Å", color: "text-amber-300", desc: "Upper photosphere" },
  { id: "HMIIF", label: "HMI Intensitygram", color: "text-foreground", desc: "Visible light sunspots" },
  { id: "HMIBC", label: "HMI Magnetogram", color: "text-foreground", desc: "Magnetic field" },
];

const SolarImagerySection = () => {
  const [selected, setSelected] = useState(wavelengths[0]);
  const [key, setKey] = useState(0);

  const imgUrl = `${SDO_BASE}/latest_1024_${selected.id}.jpg?t=${key}`;

  return (
    <section id="solar-imagery" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">NASA SDO</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Live Solar Imagery</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Near real-time images of the Sun from NASA's Solar Dynamics Observatory across multiple wavelengths.
          </p>
        </motion.div>

        {/* Wavelength selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {wavelengths.map((w) => (
            <button
              key={w.id}
              onClick={() => { setSelected(w); setKey((k) => k + 1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all border ${
                selected.id === w.id
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-primary/40"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        {/* Image display */}
        <motion.div
          key={selected.id + key}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-2 max-w-2xl mx-auto"
        >
          <div className="relative">
            <img
              src={imgUrl}
              alt={`Sun in ${selected.label}`}
              className="w-full rounded-lg bg-black"
              loading="lazy"
            />
            <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className={`font-display font-bold text-sm ${selected.color}`}>{selected.label}</p>
              <p className="text-xs text-muted-foreground">{selected.desc}</p>
            </div>
            <button
              onClick={() => setKey((k) => k + 1)}
              className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-primary/20 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-primary" />
            </button>
          </div>
        </motion.div>

        {/* Info */}
        <div className="grid sm:grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto">
          <div className="glass-card p-4 text-center">
            <Sun className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xs font-display font-semibold">10 Wavelengths</p>
            <p className="text-xs text-muted-foreground">EUV to visible light</p>
          </div>
          <div className="glass-card p-4 text-center">
            <Eye className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xs font-display font-semibold">Near Real-Time</p>
            <p className="text-xs text-muted-foreground">Updated every ~15 min</p>
          </div>
          <div className="glass-card p-4 text-center">
            <RefreshCw className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xs font-display font-semibold">SDO Mission</p>
            <p className="text-xs text-muted-foreground">Since Feb 2010</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolarImagerySection;
