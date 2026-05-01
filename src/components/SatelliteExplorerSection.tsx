import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Satellite, AlertTriangle, TrendingUp, Loader2, X, Globe2, Calendar, Rocket, Building2, Activity, Radio, Flame, ShieldAlert, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ─── Types ───────────────────────────────────────────────── */
interface SatResult {
  NORAD_CAT_ID: string;
  NAME: string;
  ALT_NAME?: string;
  COUNTRY?: string;
  OWNER?: string;
  LAUNCH_DATE?: string;
  LAUNCH_VEHICLE?: string;
  LAUNCH_SITE?: string;
  MISSION?: string;
  PURPOSE?: string;
  MANUFACTURER?: string;
  SHAPE?: string;
  LAUNCH_MASS?: string;
  DRY_MASS?: string;
  POWER?: string;
  STATUS?: string;
  TYPE?: number;
  TLE_LINE_1?: string;
  TLE_LINE_2?: string;
}

interface SatSummary {
  NAME: string;
  NORAD_CAT_ID: string;
  ALT_NAME?: string;
  OBJECT_ID?: string;
  SUMMARY: string;
}

interface PopularSat {
  norad_cat_id: string;
  name: string | null;
  country: string;
  request_count: number;
}

interface Conjunction {
  ID: number;
  TOCA: string;
  MAX_PROB: number;
  MIN_RNG: number;       // km
  REL_SPEED: number;     // km/s
  SAT1: string; SAT1_NAME: string; SAT1_STATUS: string; SAT1_AGE_OF_TLE: number;
  SAT2: string; SAT2_NAME: string; SAT2_STATUS: string; SAT2_AGE_OF_TLE: number;
  DILUTION_THRESHOLD: number;
}

/* ─── KeepTrack proxy helper ─────────────────────────────── */
async function ktFetch<T = unknown>(endpoint: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke("keeptrack-proxy", { body: { endpoint } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/* ─── Country flag emoji from 2-letter ISO code ──────────── */
function flagEmoji(country: string | undefined | null): string {
  if (!country || country.length !== 2) return "🌐";
  const code = country.toUpperCase();
  return String.fromCodePoint(...code.split("").map((c) => 127397 + c.charCodeAt(0)));
}

function statusLabel(status: string | undefined): { text: string; color: string } {
  switch (status) {
    case "+": return { text: "Operational", color: "text-accent bg-accent/15" };
    case "P": return { text: "Partial", color: "text-[hsl(45,100%,60%)] bg-[hsl(45,100%,60%)]/15" };
    case "B": return { text: "Backup", color: "text-primary bg-primary/15" };
    case "S": return { text: "Spare", color: "text-primary bg-primary/15" };
    case "X": return { text: "Extended", color: "text-accent bg-accent/15" };
    case "D": return { text: "Decayed", color: "text-muted-foreground bg-secondary/50" };
    case "?": return { text: "Unknown", color: "text-muted-foreground bg-secondary/50" };
    default: return { text: status || "Unknown", color: "text-muted-foreground bg-secondary/50" };
  }
}

/* ─── Conjunction risk classification ────────────────────── */
function riskTier(c: Conjunction): { label: string; color: string; bg: string; border: string } {
  if (c.MAX_PROB >= 0.1 || c.MIN_RNG < 0.05) return { label: "CRITICAL", color: "text-destructive", bg: "bg-destructive/15", border: "border-destructive/40" };
  if (c.MAX_PROB >= 0.01 || c.MIN_RNG < 0.1) return { label: "HIGH", color: "text-[hsl(25,100%,55%)]", bg: "bg-[hsl(25,100%,55%)]/15", border: "border-[hsl(25,100%,55%)]/40" };
  if (c.MAX_PROB >= 0.001) return { label: "MODERATE", color: "text-[hsl(45,100%,60%)]", bg: "bg-[hsl(45,100%,60%)]/15", border: "border-[hsl(45,100%,60%)]/40" };
  return { label: "WATCH", color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" };
}

/* ─── Live countdown to TOCA ─────────────────────────────── */
const TocaCountdown = ({ toca }: { toca: string }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const diff = new Date(toca).getTime() - now;
  if (diff <= 0) return <span className="text-muted-foreground italic">passed</span>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return <span className="font-mono tabular-nums">{d}d {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>;
};

/* ─── Main component ─────────────────────────────────────── */
const SatelliteExplorerSection = () => {
  const [tab, setTab] = useState<"search" | "popular" | "conjunctions">("search");
  const [query, setQuery] = useState("ISS");
  const [results, setResults] = useState<SatResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedSat, setSelectedSat] = useState<SatResult | null>(null);
  const [summary, setSummary] = useState<SatSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [popular, setPopular] = useState<PopularSat[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(false);

  const [conjunctions, setConjunctions] = useState<Conjunction[]>([]);
  const [loadingConj, setLoadingConj] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    const term = q.trim();
    if (!term) return;
    setSearching(true);
    setSearchError(null);
    try {
      const data = await ktFetch<SatResult[]>(`/sats/${encodeURIComponent(term)}`);
      setResults(Array.isArray(data) ? data.slice(0, 30) : []);
    } catch (e: any) {
      setSearchError(e.message || "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const loadSummary = useCallback(async (sat: SatResult) => {
    setSelectedSat(sat);
    setSummary(null);
    setLoadingSummary(true);
    try {
      const data = await ktFetch<SatSummary>(`/sat/${sat.NORAD_CAT_ID}/summary`);
      setSummary(data);
    } catch {
      setSummary({ NAME: sat.NAME, NORAD_CAT_ID: sat.NORAD_CAT_ID, SUMMARY: "No detailed summary available for this object." });
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const loadPopular = useCallback(async () => {
    setLoadingPopular(true);
    try {
      const data = await ktFetch<{ satellites: PopularSat[] }>("/stats/popular");
      setPopular(data?.satellites?.slice(0, 15) || []);
    } catch { /* silent */ } finally { setLoadingPopular(false); }
  }, []);

  const loadConjunctions = useCallback(async () => {
    setLoadingConj(true);
    try {
      const data = await ktFetch<Conjunction[]>("/socrates/latest");
      const filtered = (Array.isArray(data) ? data : [])
        .filter((c) => new Date(c.TOCA).getTime() > Date.now() - 86400000)
        .sort((a, b) => b.MAX_PROB - a.MAX_PROB)
        .slice(0, 25);
      setConjunctions(filtered);
    } catch { /* silent */ } finally { setLoadingConj(false); }
  }, []);

  // Initial loads
  useEffect(() => { runSearch("ISS"); }, [runSearch]);
  useEffect(() => { if (tab === "popular" && popular.length === 0) loadPopular(); }, [tab, popular.length, loadPopular]);
  useEffect(() => { if (tab === "conjunctions" && conjunctions.length === 0) loadConjunctions(); }, [tab, conjunctions.length, loadConjunctions]);

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <section id="satellite-explorer" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">KeepTrack Catalog · 60,000+ objects</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Satellite Explorer</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            Search any satellite by name or NORAD ID, read AI-generated mission summaries, see what the world is tracking right now, and watch live close-approach alerts from the SOCRATES conjunction feed.
          </p>
        </motion.div>

        {/* Tab selector */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {[
            { id: "search" as const, icon: Search, label: "Search Catalog" },
            { id: "popular" as const, icon: TrendingUp, label: "Trending Sats" },
            { id: "conjunctions" as const, icon: AlertTriangle, label: "Conjunction Watch" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-display tracking-wider border transition-all ${
                tab === t.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-primary/40"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ─── SEARCH TAB ────────────────────────────── */}
          {tab === "search" && (
            <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <form
                onSubmit={(e) => { e.preventDefault(); runSearch(query); }}
                className="glass-card p-3 mb-4 flex gap-2 items-center"
              >
                <Search className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name (e.g. 'Hubble', 'Starlink', 'ISS') or NORAD ID..."
                  className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="px-4 py-1.5 rounded-full text-xs font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "SEARCH"}
                </button>
              </form>

              {/* Quick chips */}
              <div className="flex flex-wrap gap-2 mb-5 justify-center">
                {["ISS", "Hubble", "Starlink", "Tiangong", "James Webb", "Sentinel", "Vanguard"].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setQuery(q); runSearch(q); }}
                    className="px-2.5 py-1 rounded-full text-[10px] font-display tracking-wider border border-border/40 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {searchError && (
                <div className="glass-card p-4 text-center text-sm text-destructive mb-4">{searchError}</div>
              )}

              {results.length > 0 && (
                <div className="mb-3 text-[10px] font-display tracking-widest text-muted-foreground text-center uppercase">
                  {results.length} match{results.length === 1 ? "" : "es"} · click for full mission profile
                </div>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.map((sat, i) => {
                  const status = statusLabel(sat.STATUS);
                  return (
                    <motion.button
                      key={`${sat.NORAD_CAT_ID}-${i}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => loadSummary(sat)}
                      className="glass-card p-4 text-left hover:border-primary/40 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-display font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                            {sat.NAME}
                          </h4>
                          {sat.ALT_NAME && sat.ALT_NAME !== sat.NAME && (
                            <p className="text-[10px] text-muted-foreground truncate">{sat.ALT_NAME}</p>
                          )}
                        </div>
                        <span className="text-base shrink-0" title={sat.COUNTRY}>{flagEmoji(sat.COUNTRY)}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground">
                          #{sat.NORAD_CAT_ID}
                        </span>
                        <span className={`text-[9px] font-display tracking-wider px-1.5 py-0.5 rounded ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                      {(sat.MISSION || sat.PURPOSE) && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2">
                          {sat.MISSION || sat.PURPOSE}
                        </p>
                      )}
                      {sat.LAUNCH_DATE && (
                        <p className="text-[9px] text-primary/70 mt-1.5 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(sat.LAUNCH_DATE).getFullYear()}
                          {sat.LAUNCH_VEHICLE && <span className="text-muted-foreground">· {sat.LAUNCH_VEHICLE}</span>}
                        </p>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {!searching && results.length === 0 && !searchError && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No matches. Try a different search term.
                </div>
              )}
            </motion.div>
          )}

          {/* ─── POPULAR TAB ───────────────────────────── */}
          {tab === "popular" && (
            <motion.div key="popular" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loadingPopular ? (
                <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
              ) : (
                <div className="glass-card overflow-hidden">
                  <div className="p-4 border-b border-border/50 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[hsl(25,100%,55%)]" />
                    <p className="font-display text-xs tracking-wider text-muted-foreground">MOST QUERIED SATELLITES — PAST 7 DAYS</p>
                  </div>
                  <div className="divide-y divide-border/40">
                    {popular.map((p, i) => {
                      const max = popular[0]?.request_count || 1;
                      const pct = (p.request_count / max) * 100;
                      return (
                        <div key={`${p.norad_cat_id}-${i}`} className="p-3 flex items-center gap-3 hover:bg-secondary/20 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-mono font-bold text-primary shrink-0">
                            {i + 1}
                          </div>
                          <span className="text-base shrink-0">{flagEmoji(p.country)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-semibold text-sm text-foreground truncate">
                              {p.name || `Object #${p.norad_cat_id}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1.5 rounded-full bg-secondary/40 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, delay: i * 0.05 }}
                                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                                />
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-12 text-right">
                                {p.request_count}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => { setQuery(p.name || p.norad_cat_id); setTab("search"); runSearch(p.name || p.norad_cat_id); }}
                            className="text-[10px] font-display tracking-wider px-2 py-1 rounded border border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors shrink-0"
                          >
                            VIEW
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-3 text-center text-[9px] text-muted-foreground border-t border-border/40">
                    🔥 Live from KeepTrack API · Updated continuously
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── CONJUNCTIONS TAB ──────────────────────── */}
          {tab === "conjunctions" && (
            <motion.div key="conjunctions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loadingConj ? (
                <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
              ) : (
                <>
                  {/* Risk summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {([
                      { label: "Critical", filter: (c: Conjunction) => riskTier(c).label === "CRITICAL", color: "text-destructive" },
                      { label: "High", filter: (c: Conjunction) => riskTier(c).label === "HIGH", color: "text-[hsl(25,100%,55%)]" },
                      { label: "Moderate", filter: (c: Conjunction) => riskTier(c).label === "MODERATE", color: "text-[hsl(45,100%,60%)]" },
                      { label: "Watch", filter: (c: Conjunction) => riskTier(c).label === "WATCH", color: "text-primary" },
                    ]).map((s) => (
                      <div key={s.label} className="glass-card p-3 text-center">
                        <p className={`text-2xl font-display font-bold ${s.color}`}>{conjunctions.filter(s.filter).length}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {conjunctions.map((c, i) => {
                      const tier = riskTier(c);
                      return (
                        <motion.div
                          key={c.ID}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={`p-3 rounded-xl border ${tier.border} ${tier.bg} backdrop-blur-sm`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <ShieldAlert className={`w-4 h-4 ${tier.color}`} />
                              <span className={`text-[10px] font-display tracking-widest font-bold ${tier.color}`}>{tier.label}</span>
                              <span className="text-[10px] text-muted-foreground">·</span>
                              <span className="text-[10px] font-mono text-muted-foreground">P<sub>c</sub> = {(c.MAX_PROB * 100).toFixed(2)}%</span>
                            </div>
                            <div className="text-[10px] font-mono text-foreground flex items-center gap-1">
                              <Activity className={`w-3 h-3 ${tier.color}`} />
                              T-<TocaCountdown toca={c.TOCA} />
                            </div>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-2 mb-2">
                            <div className="p-2 rounded bg-background/40 border border-border/30">
                              <p className="text-[10px] text-muted-foreground">Object 1</p>
                              <p className="text-xs font-display font-semibold text-foreground truncate">{c.SAT1_NAME}</p>
                              <p className="text-[9px] font-mono text-muted-foreground">#{c.SAT1} · {c.SAT1_STATUS}</p>
                            </div>
                            <div className="p-2 rounded bg-background/40 border border-border/30">
                              <p className="text-[10px] text-muted-foreground">Object 2</p>
                              <p className="text-xs font-display font-semibold text-foreground truncate">{c.SAT2_NAME}</p>
                              <p className="text-[9px] font-mono text-muted-foreground">#{c.SAT2} · {c.SAT2_STATUS}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[10px]">
                            <div><span className="text-muted-foreground">Min range:</span> <span className="font-mono text-foreground">{(c.MIN_RNG * 1000).toFixed(0)} m</span></div>
                            <div><span className="text-muted-foreground">Rel. speed:</span> <span className="font-mono text-foreground">{c.REL_SPEED.toFixed(2)} km/s</span></div>
                            <div><span className="text-muted-foreground">TCA:</span> <span className="font-mono text-foreground">{new Date(c.TOCA).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-center text-muted-foreground mt-4">
                    🛰️ SOCRATES · Satellite Orbital Conjunction Reports Assessing Threatening Encounters in Space · CelesTrak via KeepTrack
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Detail modal ─────────────────────────────── */}
        <AnimatePresence>
          {selectedSat && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => setSelectedSat(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="glass-card max-w-2xl w-full max-h-[85vh] overflow-y-auto my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 z-10 p-5 border-b border-border/50 bg-card/95 backdrop-blur-sm flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-lg">{flagEmoji(selectedSat.COUNTRY)}</span>
                      <h3 className="font-display font-bold text-lg text-foreground truncate">{selectedSat.NAME}</h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                      <span className="font-mono px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground">NORAD #{selectedSat.NORAD_CAT_ID}</span>
                      <span className={`font-display tracking-wider px-1.5 py-0.5 rounded ${statusLabel(selectedSat.STATUS).color}`}>
                        {statusLabel(selectedSat.STATUS).text}
                      </span>
                      {selectedSat.OWNER && <span className="text-muted-foreground">· {selectedSat.OWNER}</span>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedSat(null)} className="p-1.5 rounded-full hover:bg-secondary/60 text-muted-foreground transition-colors shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {/* Spec grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    {[
                      { icon: Calendar, label: "Launched", value: selectedSat.LAUNCH_DATE ? new Date(selectedSat.LAUNCH_DATE).toLocaleDateString() : null },
                      { icon: Rocket, label: "Vehicle", value: selectedSat.LAUNCH_VEHICLE },
                      { icon: Globe2, label: "Site", value: selectedSat.LAUNCH_SITE },
                      { icon: Building2, label: "Manufacturer", value: selectedSat.MANUFACTURER },
                      { icon: Satellite, label: "Shape", value: selectedSat.SHAPE },
                      { icon: Activity, label: "Mission", value: selectedSat.MISSION || selectedSat.PURPOSE },
                      { icon: Radio, label: "Power", value: selectedSat.POWER },
                      { icon: Eye, label: "Mass", value: selectedSat.LAUNCH_MASS ? `${selectedSat.LAUNCH_MASS} kg` : null },
                    ].filter((s) => s.value).map((s) => (
                      <div key={s.label} className="p-2 rounded bg-secondary/30 border border-border/30">
                        <div className="flex items-center gap-1 text-muted-foreground text-[9px] uppercase tracking-wider mb-0.5">
                          <s.icon className="w-2.5 h-2.5" /> {s.label}
                        </div>
                        <p className="text-foreground truncate" title={s.value || ""}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* AI summary */}
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Satellite className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-display tracking-wider text-primary uppercase">Mission Profile</span>
                    </div>
                    {loadingSummary ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading detailed summary...
                      </div>
                    ) : (
                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">
                        {summary?.SUMMARY || "No summary available."}
                      </p>
                    )}
                  </div>

                  {/* TLE */}
                  {selectedSat.TLE_LINE_1 && selectedSat.TLE_LINE_2 && (
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                      <p className="text-[9px] font-display tracking-wider text-muted-foreground uppercase mb-2">Two-Line Element Set</p>
                      <pre className="text-[9px] font-mono text-foreground/80 overflow-x-auto whitespace-pre">{selectedSat.TLE_LINE_1}{"\n"}{selectedSat.TLE_LINE_2}</pre>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default SatelliteExplorerSection;
