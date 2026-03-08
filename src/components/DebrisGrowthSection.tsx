import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

const historicalData = [
  { year: 1960, objects: 50, events: "" },
  { year: 1965, objects: 200, events: "" },
  { year: 1970, objects: 1800, events: "" },
  { year: 1975, objects: 3200, events: "" },
  { year: 1978, objects: 4600, events: "COSMOS-954 re-entry" },
  { year: 1980, objects: 5000, events: "" },
  { year: 1985, objects: 6200, events: "US ASAT test" },
  { year: 1990, objects: 7500, events: "" },
  { year: 1995, objects: 8500, events: "" },
  { year: 2000, objects: 9200, events: "" },
  { year: 2005, objects: 10000, events: "" },
  { year: 2007, objects: 13000, events: "China ASAT test (+3,400)" },
  { year: 2009, objects: 16000, events: "Iridium-Cosmos collision (+2,000)" },
  { year: 2010, objects: 16500, events: "" },
  { year: 2012, objects: 17000, events: "" },
  { year: 2015, objects: 18000, events: "" },
  { year: 2018, objects: 20000, events: "" },
  { year: 2020, objects: 23000, events: "Mega-constellation era begins" },
  { year: 2021, objects: 27000, events: "Russia ASAT test (+1,500)" },
  { year: 2022, objects: 30000, events: "" },
  { year: 2023, objects: 35000, events: "" },
  { year: 2024, objects: 40000, events: "Record launch year" },
  { year: 2025, objects: 44000, events: "" },
  { year: 2026, objects: 48000, events: "Projected" },
];

const milestones = [
  { year: 2007, event: "China ASAT Test", desc: "China's anti-satellite missile test destroyed Fengyun-1C, creating 3,400+ trackable fragments." },
  { year: 2009, event: "Iridium-Cosmos Collision", desc: "First accidental hypervelocity collision between two intact satellites created 2,000+ debris." },
  { year: 2021, event: "Russia ASAT Test", desc: "Russia destroyed Cosmos-1408, creating 1,500+ trackable debris fragments threatening ISS." },
  { year: 2024, event: "Record Launch Year", desc: "Over 2,600 objects launched in a single year, mostly Starlink satellites." },
];

const DebrisGrowthSection = () => {
  return (
    <section id="debris-growth" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Historical Data</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Debris Population Growth</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Tracked objects in orbit from 1960 to 2026 — a crisis accelerating faster each decade.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-6 mb-8">
          <p className="font-display text-xs tracking-wider text-muted-foreground mb-4">TRACKED OBJECTS IN EARTH ORBIT (1960–2026)</p>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={historicalData}>
              <defs>
                <linearGradient id="debrisGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(199, 100%, 55%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(199, 100%, 55%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 30%, 16%)" />
              <XAxis dataKey="year" stroke="hsl(215, 20%, 40%)" tick={{ fontSize: 10 }} />
              <YAxis stroke="hsl(215, 20%, 40%)" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(225, 45%, 10%)", border: "1px solid hsl(225, 30%, 16%)", borderRadius: "8px", fontSize: "11px" }}
                labelStyle={{ color: "hsl(215, 20%, 60%)" }}
                formatter={(value: number, _: string) => [`${value.toLocaleString()} objects`, "Tracked"]}
              />
              <Area type="monotone" dataKey="objects" stroke="hsl(199, 100%, 55%)" strokeWidth={2} fill="url(#debrisGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4">
          {milestones.map((m, i) => (
            <motion.div
              key={m.year}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-display font-bold text-primary bg-primary/10 px-2 py-1 rounded">{m.year}</span>
                <span className="font-display text-sm font-bold text-foreground">{m.event}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DebrisGrowthSection;
