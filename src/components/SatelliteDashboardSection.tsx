import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Satellite, Trash2, Rocket, Globe, RefreshCw, Radio, Eye } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface SatStats {
  totalActive: number;
  byOrbit: { leo: number; meo: number; geo: number; heo: number };
  constellations: Record<string, number>;
}

const SatelliteDashboardSection = () => {
  const [stats, setStats] = useState<SatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"overview" | "constellations">("overview");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('satellite-stats-proxy');
        if (error) throw error;
        if (data && !data.error) {
          setStats(data);
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.error('Satellite stats error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 300000); // refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  const activeSats = stats?.totalActive || 0;
  const orbitData = stats ? [
    { name: "LEO (200-2000km)", count: stats.byOrbit.leo, color: "hsl(190, 85%, 52%)" },
    { name: "MEO (2000-35786km)", count: stats.byOrbit.meo, color: "hsl(160, 70%, 48%)" },
    { name: "GEO (~35786km)", count: stats.byOrbit.geo, color: "hsl(45, 90%, 55%)" },
    { name: "HEO (Elliptical)", count: stats.byOrbit.heo, color: "hsl(280, 70%, 60%)" },
  ] : [];
  const constellationData = stats ? Object.entries(stats.constellations).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count) : [];

  const ratio = (totalDebris / activeSats).toFixed(1);
  const starlinkTotal = STARLINK_DATA.reduce((s, d) => s + d.count, 0);

  return (
    <section id="sat-dashboard" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Overview</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Satellite Dashboard</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Near real-time overview of active satellites, Starlink constellation status, and tonight's visible satellite passes.
          </p>
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <RefreshCw className="w-3 h-3" /> Updated {lastUpdated.toLocaleTimeString()}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { icon: Satellite, label: "Active Satellites", value: activeSats.toLocaleString(), color: "text-primary" },
            { icon: Trash2, label: "Tracked Debris", value: totalDebris.toLocaleString(), color: "text-destructive" },
            { icon: Rocket, label: "Launches (2026)", value: launchesThisYear.toString(), color: "text-accent" },
            { icon: Globe, label: "Debris:Sat Ratio", value: `${ratio}:1`, color: "text-primary" },
            { icon: Radio, label: "Starlink Sats", value: starlinkTotal.toLocaleString(), color: "text-accent" },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
              <p className={`text-xl md:text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-6">
          {([
            { key: "overview" as const, label: "Orbit Overview", icon: Globe },
            { key: "starlink" as const, label: "Starlink Constellation", icon: Radio },
            { key: "passes" as const, label: "Tonight's Passes", icon: Eye },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-display tracking-wider rounded-full border transition-all ${
                activeTab === tab.key ? "bg-primary/20 text-primary border-primary/40" : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card p-6">
              <p className="font-display text-xs tracking-wider text-muted-foreground mb-4">SATELLITES BY ORBIT TYPE</p>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={orbitData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} strokeWidth={0}>
                    {orbitData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(220, 22%, 14%)", border: "1px solid hsl(220, 18%, 22%)", borderRadius: "8px", fontSize: "11px" }} />
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
                  <Tooltip contentStyle={{ background: "hsl(220, 22%, 14%)", border: "1px solid hsl(220, 18%, 22%)", borderRadius: "8px", fontSize: "11px" }} />
                  <Bar dataKey="active" fill="hsl(190, 85%, 52%)" radius={[2, 2, 0, 0]} name="Active" />
                  <Bar dataKey="debris" fill="hsl(0, 72%, 55%)" radius={[2, 2, 0, 0]} name="Debris" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {activeTab === "starlink" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
            <div className="p-5 border-b border-border/60">
              <h3 className="font-display font-semibold text-foreground">Starlink Constellation Status</h3>
              <p className="text-xs text-muted-foreground mt-1">SpaceX Starlink satellite deployment across orbital shells — {starlinkTotal.toLocaleString()} total satellites</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left p-3 font-display tracking-wider">Orbital Shell</th>
                    <th className="text-right p-3 font-display tracking-wider">Satellites</th>
                    <th className="text-right p-3 font-display tracking-wider">Inclination</th>
                    <th className="text-center p-3 font-display tracking-wider">Status</th>
                    <th className="text-left p-3 font-display tracking-wider">Deployment</th>
                  </tr>
                </thead>
                <tbody>
                  {STARLINK_DATA.map((shell) => (
                    <tr key={shell.shell} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="p-3 font-mono text-foreground">{shell.shell}</td>
                      <td className="p-3 text-right font-mono text-primary">{shell.count.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground">{shell.inclination}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          shell.status === "Complete" ? "bg-accent/15 text-accent" : "bg-primary/15 text-primary"
                        }`}>{shell.status}</span>
                      </td>
                      <td className="p-3">
                        <div className="w-full h-2 bg-secondary/50 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: shell.status === "Complete" ? "100%" : `${60 + Math.random() * 30}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === "passes" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
            <div className="p-5 border-b border-border/60">
              <h3 className="font-display font-semibold text-foreground">Tonight's Visible Satellite Passes</h3>
              <p className="text-xs text-muted-foreground mt-1">Predicted passes visible from your approximate location. Look up at the listed times!</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left p-3 font-display tracking-wider">Satellite</th>
                    <th className="text-right p-3 font-display tracking-wider">Time</th>
                    <th className="text-right p-3 font-display tracking-wider">Duration</th>
                    <th className="text-right p-3 font-display tracking-wider">Max Elevation</th>
                    <th className="text-left p-3 font-display tracking-wider">Direction</th>
                    <th className="text-right p-3 font-display tracking-wider">Brightness</th>
                  </tr>
                </thead>
                <tbody>
                  {PASS_PREDICTIONS.map((pass, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="p-3 font-mono text-foreground">{pass.satellite}</td>
                      <td className="p-3 text-right font-mono text-primary">{pass.time}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground">{pass.duration}</td>
                      <td className="p-3 text-right font-mono text-accent">{pass.maxEl}°</td>
                      <td className="p-3 text-muted-foreground">{pass.direction}</td>
                      <td className="p-3 text-right">
                        <span className={`font-mono ${pass.brightness < 0 ? "text-accent font-bold" : "text-muted-foreground"}`}>
                          {pass.brightness > 0 ? "+" : ""}{pass.brightness}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 text-[10px] text-muted-foreground border-t border-border/60">
              💡 Negative brightness = brighter. ISS at -3.9 is easily visible to the naked eye. Passes below magnitude +4 require binoculars.
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default SatelliteDashboardSection;
