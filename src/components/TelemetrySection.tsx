import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Activity, Gauge, Battery, Package } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface TelemetryPoint {
  time: number;
  altitude: number;
  speed: number;
  battery: number;
  debris: number;
}

const TelemetrySection = () => {
  const [data, setData] = useState<TelemetryPoint[]>([]);
  const [latest, setLatest] = useState<TelemetryPoint>({ time: 0, altitude: 408, speed: 7.66, battery: 100, debris: 0 });

  const tick = useCallback(() => {
    setLatest((prev) => {
      const t = prev.time + 1;
      const alt = 408 + Math.sin(t * 0.05) * 15 + (Math.random() - 0.5) * 3;
      const spd = 7.66 + Math.sin(t * 0.03) * 0.15 + (Math.random() - 0.5) * 0.05;
      const bat = Math.max(20, prev.battery - 0.08 + Math.random() * 0.06);
      const deb = Math.min(50, prev.debris + (Math.random() > 0.85 ? 1 : 0));
      return { time: t, altitude: +alt.toFixed(1), speed: +spd.toFixed(2), battery: +bat.toFixed(1), debris: deb };
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  useEffect(() => {
    setData((prev) => [...prev.slice(-59), latest]);
  }, [latest]);

  const stats = [
    { icon: Gauge, label: "Altitude", value: `${latest.altitude} km`, color: "text-primary" },
    { icon: Activity, label: "Velocity", value: `${latest.speed} km/s`, color: "text-primary" },
    { icon: Battery, label: "Battery", value: `${latest.battery}%`, color: latest.battery < 40 ? "text-destructive" : "text-accent" },
    { icon: Package, label: "Debris Captured", value: latest.debris.toString(), color: "text-primary" },
  ];

  const charts: { key: keyof TelemetryPoint; label: string; color: string }[] = [
    { key: "altitude", label: "Altitude (km)", color: "hsl(199, 100%, 55%)" },
    { key: "speed", label: "Velocity (km/s)", color: "hsl(170, 80%, 50%)" },
    { key: "battery", label: "Battery (%)", color: "hsl(45, 100%, 60%)" },
    { key: "debris", label: "Debris Captured", color: "hsl(280, 80%, 65%)" },
  ];

  return (
    <section id="telemetry" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Live Simulation</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Telemetry Dashboard</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Simulated real-time satellite telemetry — altitude, velocity, battery, and debris capture count.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
              <p className={`text-xl md:text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          {charts.map((c) => (
            <motion.div key={c.key} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card p-4">
              <p className="font-display text-xs tracking-wider text-muted-foreground mb-3">{c.label}</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={data}>
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ background: "hsl(225 45% 10%)", border: "1px solid hsl(225 30% 16%)", borderRadius: "8px", fontSize: "11px" }}
                    labelStyle={{ color: "hsl(215 20% 60%)" }}
                    itemStyle={{ color: c.color }}
                  />
                  <Line type="monotone" dataKey={c.key} stroke={c.color} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TelemetrySection;
