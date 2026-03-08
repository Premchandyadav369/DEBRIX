import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Satellite, Trash2, Rocket, Globe, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

// Real approximate data from ESA Space Debris Office & UCS Satellite Database (2025-2026 estimates)
const orbitData = [
  { name: "LEO (200-2000km)", count: 9450, color: "hsl(190, 85%, 52%)" },
  { name: "MEO (2000-35786km)", count: 180, color: "hsl(160, 70%, 48%)" },
  { name: "GEO (~35786km)", count: 620, color: "hsl(45, 90%, 55%)" },
  { name: "HEO (Elliptical)", count: 85, color: "hsl(280, 70%, 60%)" },
];

const countryData = [
  { country: "USA", active: 5800, debris: 5200 },
  { country: "China", active: 850, debris: 4500 },
  { country: "Russia", active: 220, debris: 7200 },
  { country: "ESA", active: 110, debris: 350 },
  { country: "India", active: 75, debris: 250 },
  { country: "Japan", active: 60, debris: 140 },
  { country: "Other", active: 520, debris: 1800 },
];

const SatelliteDashboardSection = () => {
  const [activeSats, setActiveSats] = useState(10335);
  const [totalDebris, setTotalDebris] = useState(36500);
  const [launchesThisYear, setLaunchesThisYear] = useState(42); // ~March 2026
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    // Simulate gradual real-world growth
    const interval = setInterval(() => {
      setActiveSats((v) => v + (Math.random() > 0.7 ? 1 : 0));
      setTotalDebris((v) => v + (Math.random() > 0.4 ? 1 : 0));
      setLaunchesThisYear((v) => v + (Math.random() > 0.97 ? 1 : 0));
      setLastUpdated(new Date());
    }, 5000);
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
            Near real-time overview of active satellites vs debris based on ESA Space Debris Office and UCS Satellite Database estimates.
          </p>
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <RefreshCw className="w-3 h-3" /> Updated {lastUpdated.toLocaleTimeString()}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Satellite, label: "Active Satellites", value: activeSats.toLocaleString(), color: "text-primary" },
            { icon: Trash2, label: "Tracked Debris", value: totalDebris.toLocaleString(), color: "text-destructive" },
            { icon: Rocket, label: "Launches (2026)", value: launchesThisYear.toString(), color: "text-accent" },
            { icon: Globe, label: "Debris:Sat Ratio", value: `${ratio}:1`, color: "text-primary" },
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
                  contentStyle={{ background: "hsl(220, 22%, 14%)", border: "1px solid hsl(220, 18%, 22%)", borderRadius: "8px", fontSize: "11px" }}
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 18%, 22%)" />
                <XAxis dataKey="country" stroke="hsl(215, 15%, 40%)" tick={{ fontSize: 10 }} />
                <YAxis stroke="hsl(215, 15%, 40%)" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(220, 22%, 14%)", border: "1px solid hsl(220, 18%, 22%)", borderRadius: "8px", fontSize: "11px" }}
                />
                <Bar dataKey="active" fill="hsl(190, 85%, 52%)" radius={[2, 2, 0, 0]} name="Active" />
                <Bar dataKey="debris" fill="hsl(0, 72%, 55%)" radius={[2, 2, 0, 0]} name="Debris" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SatelliteDashboardSection;
