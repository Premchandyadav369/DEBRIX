import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Target, ArrowUpDown } from "lucide-react";

interface DebrisItem {
  id: number;
  name: string;
  size: number; // meters
  velocity: number; // km/s
  altitude: number; // km
  inclination: number;
  riskScore: number;
  priority: "critical" | "high" | "medium" | "low";
  massKg: number;
}

function generateDebris(): DebrisItem[] {
  const names = [
    "COSMOS-1408 DEB", "FENGYUN 1C DEB", "IRIDIUM 33 DEB", "COSMOS-2251 DEB",
    "SL-8 R/B", "ARIANE DEB", "DELTA 2 DEB", "CZ-6A DEB", "BREEZE-M DEB",
    "PROTON DEB", "ATLAS V DEB", "SOYUZ DEB", "H-2A DEB", "PSLV DEB",
    "FALCON 9 DEB", "ELECTRON DEB", "VEGA DEB", "LONG MARCH DEB",
    "ZENIT DEB", "CYCLONE DEB",
  ];
  return names.map((name, i) => {
    const size = +(Math.random() * 3 + 0.1).toFixed(2);
    const velocity = +(Math.random() * 4 + 6).toFixed(2);
    const altitude = Math.round(300 + Math.random() * 800);
    const massKg = +(size * 50 + Math.random() * 200).toFixed(1);
    const inclination = +(Math.random() * 98 + 28).toFixed(1);
    const riskScore = +((size * 20 + velocity * 8 + (1200 - altitude) * 0.05 + massKg * 0.02) + Math.random() * 10).toFixed(1);
    const priority = riskScore > 80 ? "critical" : riskScore > 60 ? "high" : riskScore > 40 ? "medium" : "low";
    return { id: i, name, size, velocity, altitude, inclination, riskScore, priority, massKg };
  });
}

const priorityColors = {
  critical: "text-destructive",
  high: "text-[hsl(25,100%,55%)]",
  medium: "text-[hsl(45,100%,60%)]",
  low: "text-accent",
};

const priorityBg = {
  critical: "bg-destructive/10 border-destructive/30",
  high: "bg-[hsl(25,100%,55%)]/10 border-[hsl(25,100%,55%)]/30",
  medium: "bg-[hsl(45,100%,60%)]/10 border-[hsl(45,100%,60%)]/30",
  low: "bg-accent/10 border-accent/30",
};

type SortKey = "riskScore" | "size" | "velocity" | "altitude" | "massKg";

const DebrisPrioritizationSection = () => {
  const [sortBy, setSortBy] = useState<SortKey>("riskScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [debris] = useState(generateDebris);

  const sorted = useMemo(() => {
    return [...debris].sort((a, b) => sortDir === "desc" ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]);
  }, [debris, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortBy(key); setSortDir("desc"); }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th className="p-3 font-display tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => toggleSort(field)}>
      <span className="flex items-center justify-end gap-1">
        {label}
        <ArrowUpDown className="w-3 h-3" />
        {sortBy === field && <span className="text-primary text-[8px]">{sortDir === "desc" ? "▼" : "▲"}</span>}
      </span>
    </th>
  );

  return (
    <section id="debris-priority" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">AI Analysis</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Debris Prioritization</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            AI-ranked debris objects by composite risk score — factoring size, velocity, altitude, and mass.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Critical", value: debris.filter((d) => d.priority === "critical").length, color: "text-destructive" },
            { label: "High Risk", value: debris.filter((d) => d.priority === "high").length, color: "text-[hsl(25,100%,55%)]" },
            { label: "Medium Risk", value: debris.filter((d) => d.priority === "medium").length, color: "text-[hsl(45,100%,60%)]" },
            { label: "Low Risk", value: debris.filter((d) => d.priority === "low").length, color: "text-accent" },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border/50 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <p className="font-display text-xs tracking-wider text-muted-foreground">AI PRIORITY RANKING — CLICK HEADERS TO SORT</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-right">
                  <th className="text-left p-3 font-display tracking-wider">#</th>
                  <th className="text-left p-3 font-display tracking-wider">Object</th>
                  <SortHeader label="Risk Score" field="riskScore" />
                  <th className="text-center p-3 font-display tracking-wider">Priority</th>
                  <SortHeader label="Size (m)" field="size" />
                  <SortHeader label="Vel (km/s)" field="velocity" />
                  <SortHeader label="Alt (km)" field="altitude" />
                  <SortHeader label="Mass (kg)" field="massKg" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((d, i) => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                    <td className="p-3 font-mono text-foreground">{d.name}</td>
                    <td className={`p-3 text-right font-mono font-bold ${priorityColors[d.priority]}`}>{d.riskScore}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-display tracking-wider border ${priorityBg[d.priority]} ${priorityColors[d.priority]}`}>
                        {d.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{d.size}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{d.velocity}</td>
                    <td className="p-3 text-right font-mono text-primary">{d.altitude}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{d.massKg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DebrisPrioritizationSection;
