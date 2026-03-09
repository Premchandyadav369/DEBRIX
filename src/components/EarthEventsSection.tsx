import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Flame, Droplets, Wind, Mountain, Globe, ExternalLink } from "lucide-react";

interface EONETEvent {
  id: string;
  title: string;
  categories: { id: string; title: string }[];
  sources: { id: string; url: string }[];
  geometry: { date: string; type: string; coordinates: number[] }[];
}

const categoryIcon = (catId: string) => {
  if (catId === "wildfires") return <Flame className="w-4 h-4 text-primary" />;
  if (catId === "volcanoes") return <Mountain className="w-4 h-4 text-primary" />;
  if (catId === "severeStorms") return <Wind className="w-4 h-4 text-primary" />;
  if (catId === "floods") return <Droplets className="w-4 h-4 text-primary" />;
  return <Globe className="w-4 h-4 text-primary" />;
};

const EarthEventsSection = () => {
  const [events, setEvents] = useState<EONETEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=15");
        const data = await res.json();
        if (data.events) setEvents(data.events);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <section id="earth-events" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">NASA EONET</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Earth Natural Events</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Active natural events on Earth — wildfires, volcanoes, storms, and more — tracked by NASA.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-5 animate-pulse h-32" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-center text-muted-foreground">No active events right now.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((ev, i) => {
              const cat = ev.categories[0];
              const lastGeo = ev.geometry[ev.geometry.length - 1];
              const coords = lastGeo?.coordinates;
              return (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card p-5 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {categoryIcon(cat?.id || "")}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-sm font-semibold truncate">{ev.title}</h3>
                      <p className="text-xs text-muted-foreground">{cat?.title || "Unknown"}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>📍 {coords ? `${coords[1]?.toFixed(2)}°, ${coords[0]?.toFixed(2)}°` : "N/A"}</p>
                    <p>🕐 {lastGeo?.date ? new Date(lastGeo.date).toLocaleDateString() : "N/A"}</p>
                  </div>
                  {ev.sources[0]?.url && (
                    <a
                      href={ev.sources[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
                    >
                      Source <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default EarthEventsSection;

