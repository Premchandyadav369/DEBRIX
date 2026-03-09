import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Flame, Zap, MapPin, Calendar, ArrowDown } from "lucide-react";

const NASA_API_KEY = "WBkaFckn04xcJlW4NoleN07iZajebOJGZpT4LrZz";

interface Fireball {
  date: string;
  energy: string;
  impactE: string;
  lat: string;
  lon: string;
  alt: string;
  vel: string;
}

const FireballTrackerSection = () => {
  const [fireballs, setFireballs] = useState<Fireball[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFireballs = async () => {
      try {
        const now = new Date();
        const past = new Date(now);
        past.setFullYear(now.getFullYear() - 1);
        const res = await fetch(
          `https://ssd-api.jpl.nasa.gov/fireball.api?date-min=${past.toISOString().split("T")[0]}&date-max=${now.toISOString().split("T")[0]}&req-loc=true&sort=-date&limit=12`
        );
        const data = await res.json();
        if (data.data) {
          const fields = data.fields as string[];
          const dateIdx = fields.indexOf("date");
          const energyIdx = fields.indexOf("energy");
          const impactIdx = fields.indexOf("impact-e");
          const latIdx = fields.indexOf("lat");
          const lonIdx = fields.indexOf("lon");
          const altIdx = fields.indexOf("alt");
          const velIdx = fields.indexOf("vel");
          const parsed: Fireball[] = data.data.map((row: string[]) => ({
            date: row[dateIdx] || "",
            energy: row[energyIdx] || "?",
            impactE: row[impactIdx] || "?",
            lat: row[latIdx] || "?",
            lon: row[lonIdx] || "?",
            alt: row[altIdx] || "?",
            vel: row[velIdx] || "?",
          }));
          setFireballs(parsed);
        }
      } catch {
        // fallback empty
      } finally {
        setLoading(false);
      }
    };
    fetchFireballs();
  }, []);

  return (
    <section id="fireball-tracker" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">NASA CNEOS</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Fireball & Bolide Tracker</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Recent bright meteor events detected by U.S. Government sensors worldwide.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-5 animate-pulse h-40" />
            ))}
          </div>
        ) : fireballs.length === 0 ? (
          <p className="text-center text-muted-foreground">No recent fireball data available.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fireballs.map((fb, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="font-mono text-xs text-muted-foreground">{fb.date}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Energy (kt)</p>
                    <p className="font-display font-bold text-primary">{fb.energy}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Impact Energy</p>
                    <p className="font-display font-bold text-foreground">{fb.impactE}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Velocity (km/s)</p>
                    <p className="font-display font-bold text-foreground">{fb.vel}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Altitude (km)</p>
                    <p className="font-display font-bold text-foreground">{fb.alt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{fb.lat}°, {fb.lon}°</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FireballTrackerSection;
