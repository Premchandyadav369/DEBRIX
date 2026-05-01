import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Rocket, Clock, MapPin, Radio, ExternalLink, RefreshCw, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Launch {
  id: string;
  name: string;
  net: string;
  status: string;
  statusAbbrev: string;
  provider: string;
  rocket: string;
  mission: string | null;
  missionType: string | null;
  missionDescription: string | null;
  orbit: string | null;
  pad: string | null;
  padLocation: string | null;
  image: string | null;
  webcastLive: boolean;
}

function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('NOW'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d > 0 ? d + 'd ' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return <span className="font-mono text-primary font-bold tabular-nums">{timeLeft}</span>;
}

function HeroCountdown({ targetDate }: { targetDate: string }) {
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0, live: false });

  useEffect(() => {
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setParts({ d: 0, h: 0, m: 0, s: 0, live: true }); return; }
      setParts({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        live: false,
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (parts.live) {
    return <div className="text-center text-3xl font-display font-bold text-accent animate-pulse">🔴 LIFTOFF</div>;
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {[
        { v: parts.d, l: 'DAYS' },
        { v: parts.h, l: 'HOURS' },
        { v: parts.m, l: 'MINUTES' },
        { v: parts.s, l: 'SECONDS' },
      ].map((p) => (
        <div key={p.l} className="text-center px-2 py-3 rounded-lg bg-background/60 border border-primary/30 backdrop-blur-sm">
          <div className="font-mono font-bold text-2xl sm:text-3xl text-primary tabular-nums">{String(p.v).padStart(2, '0')}</div>
          <div className="text-[9px] tracking-[0.2em] text-muted-foreground mt-1">{p.l}</div>
        </div>
      ))}
    </div>
  );
}

const UpcomingLaunchesSection = () => {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('launches-proxy');
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setLaunches(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Launches fetch error:', err);
      setError(err.message || 'Failed to fetch launch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getStatusColor = (abbrev: string) => {
    switch (abbrev) {
      case 'Go': return 'bg-green-500/15 text-green-400';
      case 'TBD': return 'bg-yellow-500/15 text-yellow-400';
      case 'Hold': return 'bg-orange-500/15 text-orange-400';
      case 'Success': return 'bg-accent/15 text-accent';
      default: return 'bg-secondary/50 text-muted-foreground';
    }
  };

  return (
    <section id="upcoming-launches" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Launch Schedule</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Upcoming Rocket Launches</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Real-time launch schedule from TheSpaceDevs — countdown timers, mission details, and launch providers worldwide.
          </p>
        </motion.div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Loading launch manifest...</p>
          </div>
        ) : error ? (
          <div className="glass-card p-8 text-center">
            <Rocket className="w-8 h-8 text-destructive mx-auto mb-3" />
            <p className="text-destructive text-sm">{error}</p>
            <button onClick={fetchData} className="mt-4 gradient-button text-xs">Retry</button>
          </div>
        ) : (
          <>
            {launches[0] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-card p-6 mb-6 border-primary/40 bg-gradient-to-br from-primary/5 via-card to-card relative overflow-hidden"
              >
                <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-display tracking-[0.2em] text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  NEXT LAUNCH
                </div>
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getStatusColor(launches[0].statusAbbrev)}`}>
                        {launches[0].statusAbbrev}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{launches[0].provider}</span>
                      {launches[0].webcastLive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 animate-pulse">🔴 LIVE WEBCAST</span>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-lg sm:text-xl text-foreground mb-2">{launches[0].name}</h3>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Rocket className="w-3 h-3" />{launches[0].rocket}</div>
                      {launches[0].padLocation && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{launches[0].padLocation}</div>}
                      <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />{new Date(launches[0].net).toUTCString()}</div>
                    </div>
                  </div>
                  <HeroCountdown targetDate={launches[0].net} />
                </div>
              </motion.div>
            )}
            <div className="space-y-4">
              {launches.map((launch, i) => (
              <motion.div
                key={launch.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-card overflow-hidden"
              >
                <div
                  className="p-5 cursor-pointer hover:bg-secondary/20 transition-colors"
                  onClick={() => setExpanded(expanded === launch.id ? null : launch.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getStatusColor(launch.statusAbbrev)}`}>
                          {launch.statusAbbrev}
                        </span>
                        {launch.webcastLive && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 animate-pulse">🔴 LIVE</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">{launch.provider}</span>
                      </div>
                      <h3 className="font-display font-semibold text-foreground text-sm truncate">{launch.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Rocket className="w-3 h-3" />{launch.rocket}</span>
                        {launch.padLocation && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{launch.padLocation}</span>}
                        {launch.orbit && <span className="flex items-center gap-1"><Radio className="w-3 h-3" />{launch.orbit}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Countdown targetDate={launch.net} />
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center justify-end gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(launch.net).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>

                {expanded === launch.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="border-t border-border/60 p-5 bg-card/50"
                  >
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        {launch.mission && (
                          <div className="mb-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Mission</p>
                            <p className="text-sm text-foreground font-semibold">{launch.mission}</p>
                            {launch.missionType && <p className="text-[10px] text-primary mt-0.5">{launch.missionType}</p>}
                          </div>
                        )}
                        {launch.missionDescription && (
                          <p className="text-xs text-muted-foreground leading-relaxed">{launch.missionDescription}</p>
                        )}
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">Launch Provider</span><span className="text-foreground">{launch.provider}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Vehicle</span><span className="text-foreground">{launch.rocket}</span></div>
                        {launch.pad && <div className="flex justify-between"><span className="text-muted-foreground">Launch Pad</span><span className="text-foreground">{launch.pad}</span></div>}
                        <div className="flex justify-between"><span className="text-muted-foreground">NET</span><span className="text-foreground font-mono">{new Date(launch.net).toUTCString()}</span></div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default UpcomingLaunchesSection;
