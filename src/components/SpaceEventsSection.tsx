import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Satellite, Star, Newspaper, Clock, MapPin, ExternalLink, ChevronRight, RefreshCw, AlertTriangle } from "lucide-react";

// --- Types ---
interface Launch {
  id: string;
  name: string;
  net: string;
  status: string;
  pad: string;
  location: string;
  provider: string;
  rocket: string;
  mission: string;
  image: string | null;
}

interface SpaceEvent {
  id: number;
  title: string;
  type: string;
  description: string;
  date: string;
  news_url: string | null;
  feature_image: string | null;
}

interface AstroEvent {
  title: string;
  date: string;
  description: string;
}

interface NewsItem {
  id: number;
  title: string;
  url: string;
  image_url: string;
  news_site: string;
  published_at: string;
  summary: string;
}

// --- Countdown Hook ---
function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("NOW"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

// --- Sub-components ---
function CountdownBadge({ date }: { date: string }) {
  const timeLeft = useCountdown(date);
  const isNow = timeLeft === "NOW";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-display tracking-wider ${
      isNow ? "bg-accent/20 text-accent animate-pulse" : "bg-primary/15 text-primary"
    }`}>
      <Clock className="w-3 h-3" />
      {isNow ? "LIVE NOW" : `T-${timeLeft}`}
    </span>
  );
}

function LaunchCard({ launch }: { launch: Launch }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden group hover:border-primary/40 transition-all"
    >
      {launch.image && (
        <div className="h-36 overflow-hidden">
          <img src={launch.image} alt={launch.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-display font-semibold text-sm text-foreground leading-tight line-clamp-2">{launch.name}</h4>
          <CountdownBadge date={launch.net} />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{launch.mission || "Mission details pending"}</p>
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="flex items-center gap-1 text-muted-foreground"><Rocket className="w-3 h-3 text-primary" />{launch.rocket}</span>
          <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3 text-accent" />{launch.location}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground">{launch.provider}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            launch.status.includes("Go") ? "bg-accent/15 text-accent" :
            launch.status.includes("TBD") ? "bg-muted text-muted-foreground" :
            "bg-primary/15 text-primary"
          }`}>{launch.status}</span>
        </div>
      </div>
    </motion.div>
  );
}

function EventCard({ event }: { event: SpaceEvent }) {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden hover:border-primary/40 transition-all">
      {event.feature_image && (
        <div className="h-32 overflow-hidden">
          <img src={event.feature_image} alt={event.title} className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-4 space-y-2">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-display tracking-wider uppercase">{event.type}</span>
        <h4 className="font-display font-semibold text-sm text-foreground leading-tight line-clamp-2">{event.title}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground">{new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          {event.news_url && (
            <a href={event.news_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1">
              Details <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AstroCard({ event }: { event: AstroEvent }) {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 hover:border-primary/40 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Star className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-1 min-w-0">
          <h4 className="font-display font-semibold text-sm text-foreground leading-tight">{event.title}</h4>
          <p className="text-[10px] text-primary font-display tracking-wider">{event.date}</p>
          <p className="text-xs text-muted-foreground line-clamp-3">{event.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden flex hover:border-primary/40 transition-all group"
    >
      {item.image_url && (
        <div className="w-28 shrink-0 overflow-hidden">
          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        </div>
      )}
      <div className="p-3 space-y-1 min-w-0">
        <h4 className="font-display font-semibold text-xs text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h4>
        <p className="text-[10px] text-muted-foreground line-clamp-2">{item.summary}</p>
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-[10px] text-primary">{item.news_site}</span>
          <span className="text-[10px] text-muted-foreground">{new Date(item.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>
      </div>
    </motion.a>
  );
}

// --- Tabs ---
const TABS = [
  { key: "launches", label: "Launches", icon: Rocket },
  { key: "events", label: "ISS & Events", icon: Satellite },
  { key: "astro", label: "Astronomy", icon: Star },
  { key: "news", label: "Space News", icon: Newspaper },
] as const;

type TabKey = typeof TABS[number]["key"];

// --- Hardcoded astro events (free API alternatives are unreliable) ---
const ASTRO_EVENTS: AstroEvent[] = [
  { title: "Total Lunar Eclipse", date: "March 14, 2025", description: "A total eclipse of the Moon visible from the Americas, Europe, and Africa. The Moon will pass through Earth's dark umbral shadow." },
  { title: "Saturn at Opposition", date: "September 21, 2025", description: "Saturn will be at its closest to Earth and fully illuminated by the Sun — the best time to view and photograph Saturn and its moons." },
  { title: "Partial Solar Eclipse", date: "March 29, 2025", description: "A partial eclipse of the Sun visible from parts of Europe, North Africa, and western Russia." },
  { title: "Perseid Meteor Shower", date: "August 11-12, 2025", description: "One of the best meteor showers. Up to 100 meteors per hour at peak, produced by comet Swift-Tuttle debris." },
  { title: "Geminid Meteor Shower", date: "December 13-14, 2025", description: "The king of meteor showers producing up to 120 multicolored meteors per hour at peak. Produced by asteroid 3200 Phaethon." },
  { title: "Jupiter at Opposition", date: "December 6, 2025", description: "Jupiter will be at its closest approach to Earth — the best time to view the gas giant. A medium telescope should show Jupiter's four Galilean moons." },
];

// --- Main Component ---
const SpaceEventsSection = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("launches");
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [events, setEvents] = useState<SpaceEvent[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLaunches = useCallback(async () => {
    try {
      const res = await fetch("https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=8&mode=list");
      if (!res.ok) throw new Error("Launch API error");
      const data = await res.json();
      return (data.results || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        net: l.net,
        status: l.status?.name || "Unknown",
        pad: l.pad?.name || "Unknown",
        location: l.pad?.location?.name?.split(",")[0] || "Unknown",
        provider: l.launch_service_provider?.name || "Unknown",
        rocket: l.rocket?.configuration?.name || "Unknown",
        mission: l.mission?.description || "",
        image: l.image || null,
      }));
    } catch { return []; }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("https://ll.thespacedevs.com/2.2.0/event/upcoming/?limit=8&mode=list");
      if (!res.ok) throw new Error("Events API error");
      const data = await res.json();
      return (data.results || []).map((e: any) => ({
        id: e.id,
        title: e.name,
        type: e.type?.name || "Event",
        description: e.description || "",
        date: e.date,
        news_url: e.news_url || e.video_url || null,
        feature_image: e.feature_image || null,
      }));
    } catch { return []; }
  }, []);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch("https://api.spaceflightnewsapi.net/v4/articles/?limit=10");
      if (!res.ok) throw new Error("News API error");
      const data = await res.json();
      return (data.results || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        url: n.url,
        image_url: n.image_url,
        news_site: n.news_site,
        published_at: n.published_at,
        summary: n.summary,
      }));
    } catch { return []; }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [l, e, n] = await Promise.all([fetchLaunches(), fetchEvents(), fetchNews()]);
      setLaunches(l);
      setEvents(e);
      setNews(n);
      if (!l.length && !e.length && !n.length) setError("APIs may be rate-limited. Try again in a minute.");
    } catch {
      setError("Failed to load space events data.");
    } finally {
      setLoading(false);
    }
  }, [fetchLaunches, fetchEvents, fetchNews]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const nextLaunch = useMemo(() => launches[0], [launches]);

  return (
    <section id="space-events" className="relative z-10">
      <div className="section-container">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Live Feed</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Space Events & Launches</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Real-time updates on upcoming launches, ISS activities, astronomical events, and space news.
          </p>
        </motion.div>

        {/* Featured next launch banner */}
        {nextLaunch && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-5 mb-8 border-primary/30 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 pointer-events-none" />
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Rocket className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-display tracking-[0.2em] text-primary uppercase mb-1">Next Launch</p>
                <h3 className="font-display font-bold text-lg text-foreground truncate">{nextLaunch.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{nextLaunch.provider} · {nextLaunch.rocket} · {nextLaunch.location}</p>
              </div>
              <div className="text-right shrink-0">
                <CountdownBadge date={nextLaunch.net} />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(nextLaunch.net).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab bar */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-display tracking-wider rounded-full border transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
          <button
            onClick={loadAll}
            disabled={loading}
            className="ml-auto p-2 text-muted-foreground hover:text-primary transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="glass-card p-6 text-center mb-6">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <button onClick={loadAll} className="mt-3 text-xs text-primary hover:underline">Try again</button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card p-4 space-y-3 animate-pulse">
                <div className="h-32 bg-secondary/50 rounded-lg" />
                <div className="h-4 bg-secondary/50 rounded w-3/4" />
                <div className="h-3 bg-secondary/50 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "launches" && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {launches.length > 0 ? launches.map((l) => <LaunchCard key={l.id} launch={l} />) : (
                    <p className="col-span-full text-center text-sm text-muted-foreground py-12">No upcoming launches found.</p>
                  )}
                </div>
              )}
              {activeTab === "events" && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {events.length > 0 ? events.map((e) => <EventCard key={e.id} event={e} />) : (
                    <p className="col-span-full text-center text-sm text-muted-foreground py-12">No upcoming events found.</p>
                  )}
                </div>
              )}
              {activeTab === "astro" && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ASTRO_EVENTS.map((e, i) => <AstroCard key={i} event={e} />)}
                </div>
              )}
              {activeTab === "news" && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {news.length > 0 ? news.map((n) => <NewsCard key={n.id} item={n} />) : (
                    <p className="col-span-full text-center text-sm text-muted-foreground py-12">No news articles found.</p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
};

export default SpaceEventsSection;
