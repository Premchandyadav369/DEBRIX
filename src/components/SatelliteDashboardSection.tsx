import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Satellite, Trash2, Rocket, Globe } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const orbitData = [
  { name: "LEO (200-2000km)", count: 8200, color: "hsl(199, 100%, 55%)" },
  { name: "MEO (2000-35786km)", count: 150, color: "hsl(170, 80%, 50%)" },
  { name: "GEO (~35786km)", count: 580, color: "hsl(45, 100%, 60%)" },
  { name: "HEO (Elliptical)", count: 70, color: "hsl(280, 80%, 65%)" },
];

const countryData = [
  { country: "USA", active: 4500, debris: 5000 },
  { country: "China", active: 700, debris: 4200 },
  { country: "Russia", active: 200, debris: 7000 },
  { country: "ESA", active: 90, debris: 300 },
  { country: "India", active: 60, debris: 200 },
  { country: "Japan", active: 50, debris: 120 },
  { country: "Other", active: 400, debris: 1500 },
];

const SatelliteDashboardSection = () => {
  const [activeSats, setActiveSats] = useState(9000);
  const [totalDebris, setTotalDebris] = useState(36000);
  const [launchesThisYear, setLaunchesThisYear] = useState(187);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSats((v) => v + (Math.random() > 0.7 ? 1 : 0));
      setTotalDebris((v) => v + (Math.random() > 0.5 ? 1 : 0));
      setLaunchesThisYear((v) => v + (Math.random() > 0.95 ? 1 : 0));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const ratio = (totalDebris / activeSats).toFixed(1);

  return (
    <section id="sat-dashboard" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Overview</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Satellite Dashboard</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Live overview of active satellites vs debris — the growing challenge of orbital sustainability.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Satellite, label: "Active Satellites", value: activeSats.toLocaleString(), color: "text-primary" },
            { icon: Trash2, label: "Tracked Debris", value: totalDebris.toLocaleString(), color: "text-destructive" },
            { icon: Rocket, label: "Launches (2026)", value: launchesThisYear.toString(), color: "text-accent" },
            { icon: Globe, label: "Debris:Sat Ratio", value: `${ratio}:1`, color: "text-[hsl(45,100%,60%)]" },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
              <p className={`text-xl md:text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card p-6">
            <p className="font-display text-xs tracking-wider text-muted-foreground mb-4">SATELLITES BY ORBIT TYPE</p>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={orbitData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} strokeWidth={0}>
                  {orbitData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(225, 45%, 10%)", border: "1px solid hsl(225, 30%, 16%)", borderRadius: "8px", fontSize: "11px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {orbitData.map((d) => (
                <span key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card p-6">
            <p className="font-display text-xs tracking-wider text-muted-foreground mb-4">ACTIVE vs DEBRIS BY COUNTRY</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={countryData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 30%, 16%)" />
                <XAxis dataKey="country" stroke="hsl(215, 20%, 40%)" tick={{ fontSize: 10 }} />
                <YAxis stroke="hsl(215, 20%, 40%)" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(225, 45%, 10%)", border: "1px solid hsl(225, 30%, 16%)", borderRadius: "8px", fontSize: "11px" }}
                />
                <Bar dataKey="active" fill="hsl(199, 100%, 55%)" radius={[2, 2, 0, 0]} name="Active" />
                <Bar dataKey="debris" fill="hsl(0, 84%, 60%)" radius={[2, 2, 0, 0]} name="Debris" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SatelliteDashboardSection;
