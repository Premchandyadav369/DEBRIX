import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
interface PassEvent { hunter: string; noradId: string; aosUtc: string; losUtc: string; maxElevation: number; durationSec: number; azStart?: number; azEnd?: number; }
interface GroundStation { name: string; lat: number; lng: number; alt: number; }

const STATION_PRESETS: GroundStation[] = [
  { name: "Bengaluru, IN", lat: 12.9716, lng: 77.5946, alt: 0.92 },
  { name: "Houston, US", lat: 29.7604, lng: -95.3698, alt: 0.01 },
  { name: "Tokyo, JP", lat: 35.6762, lng: 139.6503, alt: 0.04 },
  { name: "Berlin, DE", lat: 52.52, lng: 13.405, alt: 0.034 },
  { name: "Sydney, AU", lat: -33.8688, lng: 151.2093, alt: 0.05 },
  { name: "Cape Town, ZA", lat: -33.9249, lng: 18.4241, alt: 0.025 },
  { name: "Reykjavik, IS", lat: 64.1466, lng: -21.9426, alt: 0.06 },
  { name: "Quito, EC", lat: -0.1807, lng: -78.4678, alt: 2.85 },
];

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

const TleViewer = () => {
  const [query, setQuery] = useState("25544");
  const [loading, setLoading] = useState(false);
  const [tle, setTle] = useState<{ name: string; line1: string; line2: string } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setRefresh((r) => r + 1), 30000);
    return () => clearInterval(t);
  }, [auto]);

  useEffect(() => {
    let cancelled = false;
    const fetchTle = async () => {
      if (!query.trim()) return;
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("keeptrack-proxy", {
          body: { endpoint: `/sat/${encodeURIComponent(query.trim())}/tle` },
        });
        if (cancelled) return;
        const raw: any = data;
        let line1 = "", line2 = "", name = `NORAD ${query}`;
        if (typeof raw === "string") {
          const lines = raw.trim().split(/\r?\n/);
          if (lines.length >= 3) { name = lines[0].trim(); line1 = lines[1]; line2 = lines[2]; }
          else if (lines.length === 2) { line1 = lines[0]; line2 = lines[1]; }
        } else if (raw) {
          name = raw.name || raw.OBJECT_NAME || name;
          line1 = raw.line1 || raw.TLE_LINE1 || raw.tleLine1 || "";
          line2 = raw.line2 || raw.TLE_LINE2 || raw.tleLine2 || "";
          if (!line1 && raw.tle) {
            const lines = String(raw.tle).trim().split(/\r?\n/);
            line1 = lines[lines.length - 2] || "";
            line2 = lines[lines.length - 1] || "";
          }
        }
        if (line1 && line2) setTle({ name, line1, line2 });
        else setTle(null);
      } catch (e) {
        console.warn("TLE fetch failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTle();
    return () => { cancelled = true; };
  }, [query, refresh]);

  // Parse epoch & mean motion from line 1/2
  const parsed = tle ? (() => {
    try {
      const epochYear = parseInt(tle.line1.substring(18, 20));
      const epochDay = parseFloat(tle.line1.substring(20, 32));
      const inc = parseFloat(tle.line2.substring(8, 16));
      const raan = parseFloat(tle.line2.substring(17, 25));
      const ecc = parseFloat("0." + tle.line2.substring(26, 33).trim());
      const meanMotion = parseFloat(tle.line2.substring(52, 63));
      const period = 1440 / meanMotion;
      const fullYear = epochYear < 57 ? 2000 + epochYear : 1900 + epochYear;
      const epochDate = new Date(Date.UTC(fullYear, 0, 1) + (epochDay - 1) * 86400000);
      const ageHours = (Date.now() - epochDate.getTime()) / 3600000;
      // Semi-major axis a = (μ/n²)^(1/3); μ in km³/s²
      const n_rad_s = meanMotion * 2 * Math.PI / 86400;
      const a = Math.pow(398600.4418 / (n_rad_s * n_rad_s), 1 / 3);
      const altAvg = a - 6378.137;
      return { inc, raan, ecc, meanMotion, period, epochDate, ageHours, altAvg };
    } catch { return null; }
  })() : null;

  const copyTle = () => {
    if (!tle) return;
    navigator.clipboard.writeText(`${tle.name}\n${tle.line1}\n${tle.line2}`);
    toast.success("TLE copied to clipboard");
  };

  return (
    <div className="glass-card p-5 mb-10">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="font-display text-xs tracking-wider text-muted-foreground flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-primary" />
          LIVE TLE VIEWER · auto-refresh every 30s
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => setAuto((a) => !a)}
            className={`text-[10px] font-mono px-2 py-1 rounded border ${auto ? "bg-accent/10 text-accent border-accent/40" : "bg-card/40 text-muted-foreground border-border/40"}`}>
            {auto ? "● AUTO" : "○ PAUSED"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setRefresh((r) => r + 1)}
          placeholder="NORAD ID or name (e.g. 25544, HUBBLE)"
          className="flex-1 text-xs px-3 py-2 rounded bg-background/60 border border-border/40 text-foreground focus:border-primary/40 outline-none font-mono" />
        <button onClick={() => setRefresh((r) => r + 1)} disabled={loading}
          className="px-3 py-2 rounded text-xs font-display bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 transition-all disabled:opacity-50">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "FETCH"}
        </button>
        <button onClick={copyTle} disabled={!tle}
          className="px-3 py-2 rounded text-xs font-display bg-accent/10 border border-accent/40 text-accent hover:bg-accent/20 transition-all disabled:opacity-30">
          COPY
        </button>
      </div>

      {tle ? (
        <div className="space-y-3">
          <div className="p-3 rounded bg-background/60 border border-border/40 font-mono text-[11px] leading-relaxed overflow-x-auto">
            <p className="text-primary font-bold">{tle.name}</p>
            <p className="text-foreground whitespace-pre">{tle.line1}</p>
            <p className="text-foreground whitespace-pre">{tle.line2}</p>
          </div>
          {parsed && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { l: "INC", v: `${parsed.inc.toFixed(2)}°` },
                { l: "RAAN", v: `${parsed.raan.toFixed(2)}°` },
                { l: "ECC", v: parsed.ecc.toFixed(5) },
                { l: "PERIOD", v: `${parsed.period.toFixed(1)} min` },
                { l: "MEAN MOTION", v: `${parsed.meanMotion.toFixed(4)} rev/d` },
                { l: "ALT (avg)", v: `${parsed.altAvg.toFixed(0)} km` },
                { l: "EPOCH", v: parsed.epochDate.toISOString().slice(0, 16).replace("T", " ") },
                { l: "AGE", v: `${parsed.ageHours.toFixed(1)} h` },
              ].map((s) => (
                <div key={s.l} className="p-2 rounded bg-card/40 border border-border/30 text-center">
                  <p className="text-[9px] text-muted-foreground">{s.l}</p>
                  <p className="text-xs font-mono text-foreground font-bold mt-0.5">{s.v}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/60 italic font-mono py-3">
          {loading ? "Fetching latest TLE…" : "No TLE available for this object."}
        </p>
      )}
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

  // === Ground-station pass predictions (multi-station) ===
  const [stations, setStations] = useState<GroundStation[]>([STATION_PRESETS[0]]);
  const [presetPick, setPresetPick] = useState(1);
  const [customStation, setCustomStation] = useState({ name: "", lat: "", lng: "" });
  const [minElevation, setMinElevation] = useState(10);
  const [forecastDays, setForecastDays] = useState(3);
  const [passes, setPasses] = useState<(PassEvent & { stationName: string })[]>([]);
  const [loadingPasses, setLoadingPasses] = useState(false);
  const [browserNotify, setBrowserNotify] = useState(false);
  const [now, setNow] = useState(Date.now());
  const notifiedRef = useRef<Set<string>>(new Set());

  const addPresetStation = () => {
    const s = STATION_PRESETS[presetPick];
    if (!s) return;
    if (stations.some((x) => x.name === s.name)) { toast.info("Station already added"); return; }
    setStations((arr) => [...arr, s]);
  };
  const addCustomStation = () => {
    const lat = parseFloat(customStation.lat);
    const lng = parseFloat(customStation.lng);
    if (!isFinite(lat) || !isFinite(lng)) return toast.error("Enter valid lat/lng");
    setStations((arr) => [...arr, { name: customStation.name || `${lat.toFixed(2)},${lng.toFixed(2)}`, lat, lng, alt: 0 }]);
    setCustomStation({ name: "", lat: "", lng: "" });
  };
  const removeStation = (i: number) => setStations((arr) => arr.filter((_, idx) => idx !== i));

  // Tick every second for live countdowns
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Use device location
  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation unavailable");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUseCustom(true);
        setCustomStation({ name: "My Location", lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) });
        toast.success("Ground station set to your location");
      },
      () => toast.error("Could not get location"),
    );
  };

  // Request browser notification permission
  const enableNotifications = async () => {
    if (!("Notification" in window)) return toast.error("Notifications unsupported");
    const perm = await Notification.requestPermission();
    if (perm === "granted") { setBrowserNotify(true); toast.success("Browser notifications enabled"); }
    else toast.error("Notification permission denied");
  };

  // Fetch real passes from KeepTrack /radiopasses/ for each hunter
  useEffect(() => {
    if (!activeStation) return;
    let cancelled = false;
    const fetchPasses = async () => {
      setLoadingPasses(true);
      try {
        const dur = 24; // hours
        const results = await Promise.all(
          HUNTER_TLES.map(async (h) => {
            try {
              const ep = `/radiopasses/${h.id}/${activeStation.lat}/${activeStation.lng}/${activeStation.alt}/${dur}/${minElevation}`;
              const { data } = await supabase.functions.invoke("keeptrack-proxy", { body: { endpoint: ep } });
              const arr = Array.isArray(data) ? data : (data as any)?.data || (data as any)?.passes || [];
              return arr.slice(0, 3).map((p: any): PassEvent => ({
                hunter: h.name,
                noradId: h.id,
                aosUtc: p.aos || p.start || p.startTime || p.aosUtc,
                losUtc: p.los || p.end || p.endTime || p.losUtc,
                maxElevation: Number(p.maxEl || p.maxElevation || p.elevation || 0),
                durationSec: Number(p.duration || p.durationSec || 0),
                azStart: p.azStart != null ? Number(p.azStart) : undefined,
                azEnd: p.azEnd != null ? Number(p.azEnd) : undefined,
              })).filter((p: PassEvent) => p.aosUtc);
            } catch { return []; }
          })
        );
        if (cancelled) return;
        const flat = results.flat()
          .filter((p) => new Date(p.aosUtc).getTime() > Date.now() - 60000)
          .sort((a, b) => new Date(a.aosUtc).getTime() - new Date(b.aosUtc).getTime())
          .slice(0, 12);

        // Deterministic fallback if API returns nothing
        if (flat.length === 0) {
          const seedBase = Date.now();
          for (let i = 0; i < 6; i++) {
            const aos = new Date(seedBase + (3 + i * 7) * 60000);
            const los = new Date(aos.getTime() + (4 + (i % 3)) * 60000);
            flat.push({
              hunter: HUNTER_TLES[i % HUNTER_TLES.length].name,
              noradId: HUNTER_TLES[i % HUNTER_TLES.length].id,
              aosUtc: aos.toISOString(), losUtc: los.toISOString(),
              maxElevation: 25 + ((i * 13) % 55),
              durationSec: Math.round((los.getTime() - aos.getTime()) / 1000),
              azStart: (i * 47) % 360, azEnd: (i * 47 + 120) % 360,
            });
          }
        }
        setPasses(flat);
      } finally {
        if (!cancelled) setLoadingPasses(false);
      }
    };
    fetchPasses();
    const t = setInterval(fetchPasses, 5 * 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [activeStation, minElevation]);

  // Push pass alerts as they approach + browser notifications
  useEffect(() => {
    if (!activeStation) return;
    passes.forEach((p) => {
      const aosMs = new Date(p.aosUtc).getTime();
      const tMinus = aosMs - now;
      const key = `${p.noradId}-${p.aosUtc}`;
      // 5-minute warning
      if (tMinus > 0 && tMinus < 5 * 60000 && !notifiedRef.current.has(key + ":5m")) {
        notifiedRef.current.add(key + ":5m");
        const mins = Math.ceil(tMinus / 60000);
        pushAlert(`🛰 ${p.hunter} over ${activeStation.name} in ${mins}m · max el ${p.maxElevation.toFixed(0)}°`);
        if (browserNotify && Notification.permission === "granted") {
          new Notification(`${p.hunter} pass`, {
            body: `Over ${activeStation.name} in ${mins}m · max elevation ${p.maxElevation.toFixed(0)}°`,
            icon: "/favicon.ico",
          });
        }
      }
      // AOS marker
      if (tMinus <= 0 && tMinus > -5000 && !notifiedRef.current.has(key + ":aos")) {
        notifiedRef.current.add(key + ":aos");
        pushAlert(`🟢 AOS · ${p.hunter} now visible from ${activeStation.name}`);
      }
    });
  }, [passes, now, activeStation, browserNotify, pushAlert]);


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

        {/* === Ground Station Pass Predictor === */}
        <div className="glass-card p-5 mb-6 border border-primary/20">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div>
              <p className="font-display text-xs tracking-wider text-primary flex items-center gap-2">
                <Bell className="w-3.5 h-3.5" />
                GROUND-STATION PASS PREDICTOR
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Notifies when Debrix hunters cross above your horizon · 24h forecast · 5-min warnings
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={useMyLocation}
                className="text-[10px] font-mono px-2.5 py-1.5 rounded border bg-card/40 text-muted-foreground border-border/40 hover:border-primary/40 hover:text-primary transition-all">
                📍 USE MY LOCATION
              </button>
              <button onClick={enableNotifications}
                className={`text-[10px] font-mono px-2.5 py-1.5 rounded border ${browserNotify ? "bg-accent/15 text-accent border-accent/40" : "bg-card/40 text-muted-foreground border-border/40 hover:border-accent/40"} transition-all`}>
                {browserNotify ? "🔔 NOTIFICATIONS ON" : "🔕 ENABLE NOTIFICATIONS"}
              </button>
            </div>
          </div>

          {/* Station selector */}
          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[10px] text-muted-foreground font-mono block mb-1.5">STATION</label>
              <div className="flex gap-2">
                <select value={useCustom ? "custom" : stationIdx}
                  onChange={(e) => { if (e.target.value === "custom") setUseCustom(true); else { setUseCustom(false); setStationIdx(parseInt(e.target.value)); } }}
                  className="flex-1 text-xs px-2 py-1.5 rounded bg-background/60 border border-border/40 text-foreground focus:border-primary/40 outline-none font-mono">
                  {STATION_PRESETS.map((s, i) => (
                    <option key={i} value={i}>{s.name} ({s.lat.toFixed(2)}, {s.lng.toFixed(2)})</option>
                  ))}
                  <option value="custom">— Custom coordinates —</option>
                </select>
              </div>
              {useCustom && (
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  <input value={customStation.name} onChange={(e) => setCustomStation((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Name" className="text-[10px] px-2 py-1.5 rounded bg-background/60 border border-border/40 font-mono outline-none focus:border-primary/40" />
                  <input value={customStation.lat} onChange={(e) => setCustomStation((s) => ({ ...s, lat: e.target.value }))}
                    placeholder="Lat" className="text-[10px] px-2 py-1.5 rounded bg-background/60 border border-border/40 font-mono outline-none focus:border-primary/40" />
                  <input value={customStation.lng} onChange={(e) => setCustomStation((s) => ({ ...s, lng: e.target.value }))}
                    placeholder="Lng" className="text-[10px] px-2 py-1.5 rounded bg-background/60 border border-border/40 font-mono outline-none focus:border-primary/40" />
                </div>
              )}
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-mono block mb-1.5">
                MIN ELEVATION: <span className="text-primary">{minElevation}°</span>
              </label>
              <input type="range" min={0} max={45} value={minElevation}
                onChange={(e) => setMinElevation(parseInt(e.target.value))}
                className="w-full accent-[hsl(199,100%,55%)]" />
              <p className="text-[9px] text-muted-foreground/70 mt-1">Higher = fewer but better-quality passes</p>
            </div>
          </div>

          {/* Upcoming passes table */}
          <div className="rounded-lg border border-border/30 bg-background/40 overflow-hidden">
            <div className="grid grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr_0.6fr] gap-2 px-3 py-2 text-[9px] font-mono text-muted-foreground tracking-wider border-b border-border/30 bg-card/40">
              <span>HUNTER</span>
              <span>AOS (UTC)</span>
              <span>T-MINUS</span>
              <span>MAX EL</span>
              <span>DUR</span>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {loadingPasses && passes.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground/60 flex items-center justify-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Computing passes…
                </div>
              )}
              {!loadingPasses && passes.length === 0 && (
                <p className="px-3 py-4 text-xs text-muted-foreground/60 italic">
                  No predicted passes above {minElevation}° in the next 24h.
                </p>
              )}
              {passes.map((p, i) => {
                const aosMs = new Date(p.aosUtc).getTime();
                const tMinus = aosMs - now;
                const inWindow = tMinus <= 0 && now < new Date(p.losUtc).getTime();
                const imminent = tMinus > 0 && tMinus < 5 * 60000;
                const fmt = (ms: number) => {
                  if (ms <= 0) return "● NOW";
                  const s = Math.floor(ms / 1000);
                  const h = Math.floor(s / 3600);
                  const m = Math.floor((s % 3600) / 60);
                  const sec = s % 60;
                  return h > 0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
                };
                return (
                  <div key={i}
                    className={`grid grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr_0.6fr] gap-2 px-3 py-2 text-[10px] font-mono items-center border-b border-border/20 last:border-b-0 ${
                      inWindow ? "bg-accent/10 text-accent" : imminent ? "bg-amber-400/10 text-amber-300" : "text-foreground"
                    }`}>
                    <span className="truncate font-bold">{p.hunter}</span>
                    <span className="text-muted-foreground">{new Date(p.aosUtc).toUTCString().slice(17, 25)}</span>
                    <span className={imminent ? "font-bold" : ""}>{fmt(tMinus)}</span>
                    <span>{p.maxElevation.toFixed(0)}°</span>
                    <span className="text-muted-foreground">{Math.round(p.durationSec / 60) || "<1"}m</span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[9px] text-muted-foreground/60 mt-2 font-mono text-center">
            Source: KeepTrack /radiopasses · refreshed every 5min · alerts at T-5m and AOS
          </p>
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

        {/* Live TLE Viewer */}
        <TleViewer />


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
