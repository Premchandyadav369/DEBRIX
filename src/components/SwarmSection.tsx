import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Crosshair, Satellite, Shield, Zap, Target, Radio, Activity } from "lucide-react";

const SWARM_STATS = [
  { icon: Satellite, label: "Debrix Hunters", value: "8", desc: "Active formation satellites", color: "text-primary" },
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
interface Debris { x: number; y: number; vx: number; vy: number; size: number; targeted: boolean; }

const SwarmCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState({ captured: 0, tracking: 218, scanning: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const cx = W / 2;
    const cy = H / 2;
    const earthR = Math.min(W, H) * 0.18;
    const orbitR = Math.min(W, H) * 0.38;

    const hunters: Hunter[] = Array.from({ length: 8 }).map((_, i) => ({
      angle: (i / 8) * Math.PI * 2,
      radius: orbitR,
      speed: 0.006,
    }));

    const debris: Debris[] = Array.from({ length: 60 }).map(() => {
      const a = Math.random() * Math.PI * 2;
      const r = orbitR + (Math.random() - 0.5) * 80;
      return {
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.6,
        targeted: false,
      };
    });

    let captured = 0;
    let frame = 0;
    let raf: number;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);

      // Starfield backdrop
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

      // Atmosphere glow
      ctx.strokeStyle = "hsla(190, 80%, 60%, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, earthR + 4, 0, Math.PI * 2);
      ctx.stroke();

      // Orbit ring
      ctx.strokeStyle = "hsla(160, 70%, 50%, 0.15)";
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Update + draw debris
      let scanning = 0;
      debris.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        // Wrap
        if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
        if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
        ctx.fillStyle = d.targeted ? "hsl(0, 80%, 60%)" : "hsla(30, 30%, 70%, 0.7)";
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Update + draw hunters
      hunters.forEach((h, i) => {
        h.angle += h.speed;
        const hx = cx + Math.cos(h.angle) * h.radius;
        const hy = cy + Math.sin(h.angle) * h.radius;

        // Scan cone — find nearest debris within range
        let nearest: Debris | null = null;
        let nearestDist = 80;
        debris.forEach((d) => {
          const dx = d.x - hx;
          const dy = d.y - hy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = d;
          }
        });

        // Scan beam
        if (nearest) {
          scanning++;
          ctx.strokeStyle = "hsla(160, 80%, 55%, 0.5)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(nearest.x, nearest.y);
          ctx.stroke();
          nearest.targeted = true;

          // Capture
          if (nearestDist < 12 && Math.random() < 0.02) {
            const idx = debris.indexOf(nearest);
            if (idx >= 0) {
              const a = Math.random() * Math.PI * 2;
              const r = orbitR + (Math.random() - 0.5) * 80;
              debris[idx] = {
                x: cx + Math.cos(a) * r,
                y: cy + Math.sin(a) * r,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                size: Math.random() * 2 + 0.6,
                targeted: false,
              };
              captured++;
            }
          }
        }

        // Hunter body
        ctx.fillStyle = "hsl(160, 80%, 55%)";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "hsl(160, 80%, 55%)";
        ctx.beginPath();
        ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Hunter label
        ctx.fillStyle = "hsla(160, 80%, 70%, 0.7)";
        ctx.font = "8px monospace";
        ctx.fillText(`H${i + 1}`, hx + 5, hy - 5);
      });

      // Reset targeted flags each frame, set anew
      debris.forEach((d) => (d.targeted = false));

      // Update HUD periodically
      if (frame % 30 === 0) {
        setStats({ captured, tracking: debris.length, scanning });
      }

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="w-full h-[420px] rounded-xl bg-background/40" />
      <div className="absolute top-3 left-3 space-y-1.5 font-mono text-[10px] pointer-events-none">
        <div className="px-2 py-1 rounded bg-background/70 border border-border/40 backdrop-blur-sm">
          <span className="text-muted-foreground">CAPTURED:</span>{" "}
          <span className="text-accent font-bold">{stats.captured}</span>
        </div>
        <div className="px-2 py-1 rounded bg-background/70 border border-border/40 backdrop-blur-sm">
          <span className="text-muted-foreground">TRACKING:</span>{" "}
          <span className="text-foreground font-bold">{stats.tracking}</span>
        </div>
        <div className="px-2 py-1 rounded bg-background/70 border border-border/40 backdrop-blur-sm">
          <span className="text-muted-foreground">SCANNING:</span>{" "}
          <span className="text-primary font-bold">{stats.scanning}</span>
        </div>
      </div>
      <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-background/70 border border-border/40 backdrop-blur-sm font-mono text-[9px] text-muted-foreground flex items-center gap-1.5">
        <Activity className="w-2.5 h-2.5 text-accent animate-pulse" />
        LIVE SIM · LEO 550km
      </div>
    </div>
  );
};

const SwarmSection = () => {
  return (
    <section id="swarm" className="relative z-10">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Formation</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Swarm vs Debris Field</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Watch 8 Debrix hunters orbit Earth in real time, scanning a debris cloud and locking onto fragments for capture.
          </p>
        </motion.div>

        {/* Live simulation canvas */}
        <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-4 mb-8">
          <SwarmCanvas />
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {SWARM_STATS.map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card p-5 text-center"
            >
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
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-card p-5 flex gap-4"
            >
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
