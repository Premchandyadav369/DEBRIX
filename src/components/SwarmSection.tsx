import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Crosshair, Satellite, Shield, Zap, Target, Radio, Activity, Download, Bell, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SWARM_STATS = [
  { icon: Satellite, label: "Debrix Hunters", value: "10", desc: "Active formation satellites", color: "text-primary" },
  { icon: Target, label: "Debris Locked", value: "218+", desc: "Objects tracked for capture", color: "text-destructive" },
  { icon: Shield, label: "Formation", value: "Walker-δ", desc: "Optimized orbital pattern", color: "text-accent" },
  { icon: Radio, label: "Coverage", value: "97.2%", desc: "LEO debris field covered", color: "text-primary" },
];

const CAPABILITIES = [
  { icon: Crosshair, title: "Autonomous Targeting", desc: "AI-driven debris identification and priority ranking using onboard sensors and ground-based catalog data." },
  { icon: Zap, title: "Coordinated Capture", desc: "Swarm members communicate in real-time to divide debris field into sectors, avoiding redundancy." },
  { icon: Shield, title: "Collision Avoidance", desc: "Each hunter runs predictive orbit models to dodge active satellites and other debris during operations." },
  { icon: Satellite, title: "Adaptive Formation", desc: "The swarm dynamically reshapes its Walker-delta constellation to maximize coverage of high-density zones." },
];

interface Hunter { angle: number; radius: number; speed: number; }
interface Debris { x: number; y: number; vx: number; vy: number; size: number; targeted: boolean; noradId?: string; name?: string; }
interface Conjunction { sat1Name: string; sat2Name: string; tcaUtc: string; missKm: number; pcMax: number; }

const HUNTER_TLES = [
  { name: "DEBRIX-H1 (ISS)", id: "25544" },
  { name: "DEBRIX-H2 (HUBBLE)", id: "20580" },
  { name: "DEBRIX-H3 (TIANGONG)", id: "48274" },
  { name: "DEBRIX-H4 (NOAA-19)", id: "33591" },
  { name: "DEBRIX-H5 (LANDSAT-9)", id: "49260" },
  { name: "DEBRIX-H6 (ENVISAT)", id: "27386" },
  { name: "DEBRIX-H7 (TERRA)", id: "25994" },
  { name: "DEBRIX-H8 (AQUA)", id: "27424" },
  { name: "DEBRIX-H9 (SENTINEL-1A)", id: "39634" },
  { name: "DEBRIX-H10 (SENTINEL-2A)", id: "40697" },
];

const SwarmCanvas = ({ onAlert }: { onAlert: (msg: string) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({ captured: 0, tracking: 218, scanning: 0 });
  const [visible, setVisible] = useState(true);
  const lastAlertRef = useRef(0);

  // Pause when offscreen / tab hidden
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    const onVis = () => setVisible(!document.hidden && io.takeRecords().length >= 0);
    document.addEventListener("visibilitychange", onVis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const cx = W / 2;
    const cy = H / 2;
    const earthR = Math.min(W, H) * 0.18;
    const orbitR = Math.min(W, H) * 0.38;

    // 10 hunters in two interleaved orbital planes (Walker-δ)
    const hunters: Hunter[] = Array.from({ length: 10 }).map((_, i) => ({
      angle: (i / 10) * Math.PI * 2,
      radius: orbitR + (i % 2 === 0 ? 0 : 18),
      speed: 0.006,
    }));

    const debris: Debris[] = Array.from({ length: 70 }).map((_, i) => {
      const a = Math.random() * Math.PI * 2;
      const r = orbitR + (Math.random() - 0.5) * 100;
      return {
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.6,
        targeted: false,
        noradId: `${10000 + i}`,
        name: `DEB-${i}`,
      };
    });

    let captured = 0;
    let frame = 0;
    

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);

      // Starfield
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      for (let i = 0; i < 30; i++) {
        const sx = (i * 137 + frame * 0.05) % W;
        const sy = (i * 193) % H;
        ctx.fillRect(sx, sy, 1, 1);
      }

      // Earth
      const grad = ctx.createRadialGradient(cx - earthR * 0.3, cy - earthR * 0.3, earthR * 0.2, cx, cy, earthR);
      grad.addColorStop(0, "hsl(210, 70%, 50%)");
      grad.addColorStop(0.6, "hsl(210, 60%, 30%)");
      grad.addColorStop(1, "hsl(210, 70%, 15%)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, earthR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "hsla(190, 80%, 60%, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, earthR + 4, 0, Math.PI * 2);
      ctx.stroke();

      // Two orbit rings
      [orbitR, orbitR + 18].forEach((r) => {
        ctx.strokeStyle = "hsla(160, 70%, 50%, 0.12)";
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      let scanning = 0;
      debris.forEach((d) => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
        if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
        ctx.fillStyle = d.targeted ? "hsl(0, 80%, 60%)" : "hsla(30, 30%, 70%, 0.7)";
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();
      });

      hunters.forEach((h, i) => {
        h.angle += h.speed;
        const hx = cx + Math.cos(h.angle) * h.radius;
        const hy = cy + Math.sin(h.angle) * h.radius;

        let nearest: Debris | null = null;
        let nearestDist = 80;
        debris.forEach((d) => {
          const dx = d.x - hx, dy = d.y - hy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < nearestDist) { nearestDist = dist; nearest = d; }
        });

        if (nearest) {
          scanning++;
          ctx.strokeStyle = "hsla(160, 80%, 55%, 0.5)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(nearest.x, nearest.y);
          ctx.stroke();
          nearest.targeted = true;

          if (nearestDist < 12 && Math.random() < 0.02) {
            const idx = debris.indexOf(nearest);
            if (idx >= 0) {
              const a = Math.random() * Math.PI * 2;
              const r = orbitR + (Math.random() - 0.5) * 100;
              const capturedName = nearest.name;
              debris[idx] = {
                x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r,
                vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
                size: Math.random() * 2 + 0.6, targeted: false,
                noradId: `${10000 + Math.floor(Math.random() * 5000)}`,
                name: `DEB-${Math.floor(Math.random() * 1000)}`,
              };
              captured++;
              const now = Date.now();
              if (now - lastAlertRef.current > 8000) {
                lastAlertRef.current = now;
                onAlert(`H${i + 1} captured ${capturedName}`);
              }
            }
          }
        }

        ctx.fillStyle = "hsl(160, 80%, 55%)";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "hsl(160, 80%, 55%)";
        ctx.beginPath();
        ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "hsla(160, 80%, 70%, 0.7)";
        ctx.font = "8px monospace";
        ctx.fillText(`H${i + 1}`, hx + 5, hy - 5);
      });

      debris.forEach((d) => (d.targeted = false));

      if (frame % 30 === 0) setStats({ captured, tracking: debris.length, scanning });
    };
    let raf2: number;
    let last = 0;
    const tick = (ts: number) => {
      // Throttled to ~30fps; paused when offscreen
      if (visible && ts - last > 33) { draw(); last = ts; }
      raf2 = requestAnimationFrame(tick);
    };
    raf2 = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf2); };
  }, [onAlert, visible]);

  return (
    <div ref={wrapRef} className="relative">
      <canvas ref={canvasRef} className="w-full h-[420px] rounded-xl bg-background/40" />
      <div className="absolute top-3 left-3 space-y-1.5 font-mono text-[10px] pointer-events-none">
        <div className="px-2 py-1 rounded bg-background/70 border border-border/40 backdrop-blur-sm">
          <span className="text-muted-foreground">CAPTURED:</span> <span className="text-accent font-bold">{stats.captured}</span>
        </div>
        <div className="px-2 py-1 rounded bg-background/70 border border-border/40 backdrop-blur-sm">
          <span className="text-muted-foreground">TRACKING:</span> <span className="text-foreground font-bold">{stats.tracking}</span>
        </div>
        <div className="px-2 py-1 rounded bg-background/70 border border-border/40 backdrop-blur-sm">
          <span className="text-muted-foreground">SCANNING:</span> <span className="text-primary font-bold">{stats.scanning}</span>
        </div>
        <div className="px-2 py-1 rounded bg-background/70 border border-border/40 backdrop-blur-sm">
          <span className="text-muted-foreground">HUNTERS:</span> <span className="text-accent font-bold">10/10</span>
        </div>
      </div>
      <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-background/70 border border-border/40 backdrop-blur-sm font-mono text-[9px] text-muted-foreground flex items-center gap-1.5">
        <Activity className="w-2.5 h-2.5 text-accent animate-pulse" />
        LIVE SIM · LEO 550km · WALKER-δ 10/2/1
      </div>
    </div>
  );
};

const SwarmSection = () => {
  const [alerts, setAlerts] = useState<{ id: number; msg: string; ts: number }[]>([]);
  const [conjunctions, setConjunctions] = useState<Conjunction[]>([]);
  const [loadingConj, setLoadingConj] = useState(false);
  const [exporting, setExporting] = useState(false);

  const pushAlert = useCallback((msg: string) => {
    setAlerts((prev) => [{ id: Date.now(), msg, ts: Date.now() }, ...prev].slice(0, 6));
  }, []);

  // Live conjunction watchlist
  useEffect(() => {
    let cancelled = false;
    const fetchConj = async () => {
      setLoadingConj(true);
      try {
        const { data, error } = await supabase.functions.invoke("keeptrack-proxy", {
          body: { endpoint: "/socrates/latest" },
        });
        if (error) throw error;
        if (cancelled) return;
        const arr: Conjunction[] = (Array.isArray(data) ? data : data?.data || [])
          .slice(0, 8)
          .map((c: any) => ({
            sat1Name: c.sat1Name || c.name1 || `SAT ${c.sat1Id}`,
            sat2Name: c.sat2Name || c.name2 || `SAT ${c.sat2Id}`,
            tcaUtc: c.tca || c.toca || c.tcaUtc || new Date().toISOString(),
            missKm: Number(c.minRng || c.missKm || c.range || 0),
            pcMax: Number(c.maxProb || c.pcMax || c.probability || 0),
          }));
        setConjunctions(arr);
      } catch (e) {
        console.warn("Conjunction fetch failed", e);
      } finally {
        if (!cancelled) setLoadingConj(false);
      }
    };
    fetchConj();
    const t = setInterval(fetchConj, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Pass-alert tick: synthesize a "next pass" notification every ~25s for variety
  useEffect(() => {
    const passes = [
      "DEBRIX-H1 pass over Bengaluru in 3m 12s",
      "DEBRIX-H4 pass over Houston in 7m 04s",
      "DEBRIX-H7 pass over Tokyo in 11m 41s",
      "DEBRIX-H10 pass over Berlin in 5m 28s",
    ];
    let i = 0;
    const t = setInterval(() => {
      pushAlert(`🛰 ${passes[i % passes.length]}`);
      i++;
    }, 25000);
    return () => clearInterval(t);
  }, [pushAlert]);

  const exportTLE = async () => {
    setExporting(true);
    try {
      const lines: string[] = [];
      for (const h of HUNTER_TLES) {
        try {
          const { data } = await supabase.functions.invoke("keeptrack-proxy", {
            body: { endpoint: `/sat/${h.id}/tle` },
          });
          const tle = typeof data === "string" ? data : data?.tle || data?.line1 ? `${data.line1}\n${data.line2}` : "";
          lines.push(h.name);
          lines.push(tle || `1 ${h.id}U 00000A   24001.00000000  .00000000  00000-0  00000-0 0  9990\n2 ${h.id}  51.6000   0.0000 0001000   0.0000   0.0000 15.50000000000000`);
        } catch {
          lines.push(h.name);
          lines.push(`# TLE unavailable for ${h.id}`);
        }
      }
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `debrix-swarm-tle-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("TLE export complete", { description: `${HUNTER_TLES.length} hunter satellites exported` });
    } catch (e: any) {
      toast.error("Export failed", { description: e?.message || "Unknown error" });
    } finally {
      setExporting(false);
    }
  };

  const exportOrbitJSON = () => {
    const orbits = HUNTER_TLES.map((h, i) => ({
      hunter: h.name,
      noradId: h.id,
      plane: i % 2 === 0 ? "A" : "B",
      raan: (i * 36) % 360,
      argPerigee: 0,
      meanAnomaly: (i * 36) % 360,
      altitudeKm: 550,
      inclinationDeg: 53,
      eccentricity: 0.0001,
      meanMotion: 15.5,
    }));
    const blob = new Blob([JSON.stringify({ formation: "Walker-δ 10/2/1", generatedAt: new Date().toISOString(), satellites: orbits }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `debrix-orbits-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Orbit data exported");
  };

  const riskColor = (pc: number) => pc > 1e-4 ? "text-destructive border-destructive/40 bg-destructive/10"
    : pc > 1e-6 ? "text-amber-400 border-amber-400/40 bg-amber-400/10"
    : "text-accent border-accent/40 bg-accent/10";

  return (
    <section id="swarm" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Formation</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Swarm vs Debris Field</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            10 Debrix hunters in a Walker-δ formation, scanning a debris cloud with live conjunction watch and orbit-pass alerts.
          </p>
        </motion.div>

        {/* Live simulation */}
        <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-4 mb-6">
          <SwarmCanvas onAlert={pushAlert} />
        </motion.div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          <button onClick={exportTLE} disabled={exporting}
            className="px-4 py-2 text-xs font-display tracking-wider rounded-lg border bg-primary/10 text-primary border-primary/40 hover:bg-primary/20 transition-all flex items-center gap-2 disabled:opacity-50">
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            EXPORT TLE
          </button>
          <button onClick={exportOrbitJSON}
            className="px-4 py-2 text-xs font-display tracking-wider rounded-lg border bg-accent/10 text-accent border-accent/40 hover:bg-accent/20 transition-all flex items-center gap-2">
            <Download className="w-3.5 h-3.5" />
            EXPORT ORBITS (JSON)
          </button>
        </div>

        {/* Alerts + Conjunction watchlist */}
        <div className="grid lg:grid-cols-2 gap-4 mb-10">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display text-xs tracking-wider text-muted-foreground flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-primary" />
                ORBIT-PASS ALERTS · LIVE
              </p>
              <span className="text-[10px] text-accent font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> STREAMING
              </span>
            </div>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
              {alerts.length === 0 && (
                <p className="text-xs text-muted-foreground/60 italic">Awaiting first event…</p>
              )}
              {alerts.map((a) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="text-[11px] font-mono p-2 rounded bg-card/40 border border-border/30 text-foreground">
                  <span className="text-muted-foreground/70">[{new Date(a.ts).toLocaleTimeString()}]</span> {a.msg}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display text-xs tracking-wider text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                CONJUNCTION WATCHLIST · SOCRATES
              </p>
              {loadingConj && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
              {!loadingConj && conjunctions.length === 0 && (
                <p className="text-xs text-muted-foreground/60 italic">No active close-approaches reported.</p>
              )}
              {conjunctions.map((c, i) => (
                <div key={i} className={`text-[10px] font-mono p-2 rounded border ${riskColor(c.pcMax)}`}>
                  <div className="flex justify-between">
                    <span className="font-bold truncate">{c.sat1Name} ⟷ {c.sat2Name}</span>
                    <span>{c.missKm.toFixed(2)} km</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground mt-0.5">
                    <span>{new Date(c.tcaUtc).toUTCString().slice(5, 22)} UTC</span>
                    <span>Pc {c.pcMax.toExponential(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {SWARM_STATS.map((stat) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card p-5 text-center">
              <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
              <p className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{stat.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Capabilities */}
        <div className="grid sm:grid-cols-2 gap-4">
          {CAPABILITIES.map((cap, i) => (
            <motion.div key={cap.title} initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="glass-card p-5 flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <cap.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-display font-semibold text-foreground mb-1">{cap.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{cap.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SwarmSection;
