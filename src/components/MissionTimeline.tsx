import { useState } from "react";
import { motion } from "framer-motion";
import { Rocket, Orbit, Crosshair, Package, Link, Flame, RotateCcw, CheckCircle } from "lucide-react";

const phases = [
  { icon: Rocket, title: "Launch", desc: "Debrix launches from Earth surface to Low Earth Orbit at ~408 km altitude.", status: "complete" },
  { icon: Orbit, title: "Orbit Insertion", desc: "Satellite achieves stable orbit. Solar panels deploy, systems come online.", status: "complete" },
  { icon: Crosshair, title: "Debris Detection", desc: "AI camera module scans for orbital debris. Swarm algorithm coordinates search zones.", status: "complete" },
  { icon: Package, title: "Debris Capture", desc: "Robotic arm extends and captures targeted debris. Stored in internal chamber.", status: "active" },
  { icon: Link, title: "Docking", desc: "Storage threshold reached. Debrix navigates to garbage satellite for docking.", status: "pending" },
  { icon: Flame, title: "Controlled Deorbit", desc: "Garbage satellite performs controlled atmospheric reentry, burning debris safely.", status: "pending" },
  { icon: RotateCcw, title: "Resume Operations", desc: "Debrix resumes autonomous debris capture. Cycle repeats indefinitely.", status: "pending" },
];

const MissionTimeline = () => {
  const [activePhase, setActivePhase] = useState(3); // "Debris Capture" is active

  return (
    <section id="timeline" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Mission Progress</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Interactive Timeline</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Track mission progress from launch to debris collection. Click any phase to explore.
          </p>
        </motion.div>

        {/* Horizontal progress bar */}
        <div className="hidden md:flex items-center justify-between mb-8 px-4">
          {phases.map((p, i) => (
            <div key={p.title} className="flex items-center flex-1">
              <button
                onClick={() => setActivePhase(i)}
                aria-label={`Show phase ${i + 1}: ${p.title}`}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  i < activePhase ? "bg-primary/20 text-primary" :
                  i === activePhase ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(199_100%_55%/0.5)]" :
                  "bg-secondary text-muted-foreground"
                }`}
              >
                {i < activePhase ? <CheckCircle className="w-5 h-5" /> : <p.icon className="w-4 h-4" />}
              </button>
              {i < phases.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-colors ${i < activePhase ? "bg-primary/50" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Phase detail */}
        <motion.div
          key={activePhase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 md:p-8 max-w-2xl mx-auto text-center mb-8"
        >
          <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${
            activePhase === phases.findIndex(p => p.status === "active") ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
          }`}>
            {(() => { const Icon = phases[activePhase].icon; return <Icon className="w-6 h-6" />; })()}
          </div>
          <p className="font-display text-xs text-primary tracking-wider mb-2">PHASE {activePhase + 1} / {phases.length}</p>
          <h3 className="font-display font-bold text-xl mb-3">{phases[activePhase].title}</h3>
          <p className="text-muted-foreground text-sm">{phases[activePhase].desc}</p>
          <div className="mt-4">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-display tracking-wider ${
              phases[activePhase].status === "complete" ? "bg-accent/20 text-accent" :
              phases[activePhase].status === "active" ? "bg-primary/20 text-primary" :
              "bg-secondary text-muted-foreground"
            }`}>
              {phases[activePhase].status === "complete" ? "✓ Complete" : phases[activePhase].status === "active" ? "● Active" : "○ Pending"}
            </span>
          </div>
        </motion.div>

        {/* Mobile list */}
        <div className="md:hidden space-y-3">
          {phases.map((p, i) => (
            <button
              key={p.title}
              onClick={() => setActivePhase(i)}
              className={`w-full glass-card p-4 flex items-center gap-4 text-left transition-all ${
                i === activePhase ? "border-primary/40" : ""
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                i < activePhase ? "bg-primary/20 text-primary" :
                i === activePhase ? "bg-primary text-primary-foreground" :
                "bg-secondary text-muted-foreground"
              }`}>
                {i < activePhase ? <CheckCircle className="w-4 h-4" /> : <p.icon className="w-4 h-4" />}
              </div>
              <div>
                <p className="font-display text-xs font-semibold">{p.title}</p>
                <p className="text-muted-foreground text-xs">{p.status === "complete" ? "Complete" : p.status === "active" ? "Active" : "Pending"}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MissionTimeline;
