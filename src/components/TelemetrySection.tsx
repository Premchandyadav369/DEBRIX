import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Activity, Gauge, Battery, Radar, Wifi, MapPin } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const ISS_API = "https://api.wheretheiss.at/v1/satellites/25544";

interface TelemetryPoint {
  time: number;
  altitude: number;
  speed: number;
  latitude: number;
  longitude: number;
}

const TelemetrySection = () => {
  const [data, setData] = useState<TelemetryPoint[]>([]);
  const [latest, setLatest] = useState<TelemetryPoint | null>(null);
  const [status, setStatus] = useState<"live" | "error">("live");

  const fetchISS = useCallback(async () => {
    try {
      const res = await fetch(ISS_API);
      if (!res.ok) throw new Error("ISS API error");
      const json = await res.json();
      const point: TelemetryPoint = {
        time: json.timestamp,
        altitude: +json.altitude.toFixed(1),
        speed: +(json.velocity / 3600).toFixed(2), // km/h to km/s
        latitude: +json.latitude.toFixed(4),
        longitude: +json.longitude.toFixed(4),
      };
      setLatest(point);
      setData((prev) => [...prev.slice(-59), point]);
      setStatus("live");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchISS();
    const interval = setInterval(fetchISS, 5000);
    return () => clearInterval(interval);
  }, [fetchISS]);

  const stats = latest
    ? [
        { icon: Gauge, label: "Altitude", value: `${latest.altitude} km`, color: "text-primary" },
        { icon: Activity, label: "Velocity", value: `${latest.speed} km/s`, color: "text-primary" },
        { icon: MapPin, label: "Latitude", value: `${latest.latitude}°`, color: "text-accent" },
        { icon: Radar, label: "Longitude", value: `${latest.longitude}°`, color: "text-accent" },
      ]
    : [];

  const charts: { key: keyof TelemetryPoint; label: string; color: string }[] = [
    { key: "altitude", label: "Altitude (km)", color: "hsl(190, 85%, 52%)" },
    { key: "speed", label: "Velocity (km/s)", color: "hsl(160, 70%, 48%)" },
    { key: "latitude", label: "Latitude (°)", color: "hsl(45, 90%, 55%)" },
    { key: "longitude", label: "Longitude (°)", color: "hsl(280, 70%, 60%)" },
  ];

  return (
    <section id="telemetry" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className={`w-2 h-2 rounded-full ${status === "live" ? "bg-accent animate-pulse" : "bg-destructive"}`} />
            <p className="font-display text-xs tracking-[0.3em] text-primary uppercase">
              {status === "live" ? "Live ISS Telemetry" : "Connection Lost"}
            </p>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Real-Time Telemetry</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Live telemetry from the International Space Station — altitude, velocity, and position updated every 5 seconds via the Where The ISS At? API.
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
          {!latest && (
            <div className="col-span-full glass-card p-6 text-center text-muted-foreground text-sm">
              <Wifi className="w-5 h-5 mx-auto mb-2 animate-pulse text-primary" />
              Connecting to ISS...
            </div>
          )}
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
                    contentStyle={{ background: "hsl(220 22% 14%)", border: "1px solid hsl(220 18% 22%)", borderRadius: "8px", fontSize: "11px" }}
                    labelStyle={{ color: "hsl(215 15% 55%)" }}
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
